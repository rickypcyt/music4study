// SOLO SERVIDOR. Único punto de salida hacia la API de YouTube Data v3.
//
// Cuota: cada petición a videos.list cuesta 1 unidad (hasta 50 ids por petición) y el límite por defecto es de
// 10.000 unidades al día. Esta capa:
//   1. cuenta cada llamada en la tabla api_usage (para saber el uso real, ver /api/admin/youtube-usage),
//   2. corta las llamadas al llegar a un presupuesto diario (YOUTUBE_DAILY_BUDGET, por defecto 8.000),
//   3. cachea 24 h por video, así repetir un video no cuesta nada.
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

const API_KEY = process.env.YOUTUBE_API_KEY;
export const DAILY_BUDGET = Number(process.env.YOUTUBE_DAILY_BUDGET ?? 8000);

export interface VideoSnippet {
  title: string;
  channelTitle: string;
}

export type VideoLookup =
  | { status: 'ok'; title: string; channelTitle: string }
  | { status: 'missing' } // YouTube dice que el video no existe o es privado
  | { status: 'unavailable' }; // sin clave, sin presupuesto o error de red/YouTube: NO se sabe nada del video

export async function usageToday(): Promise<number> {
  const r = await db.execute(sql`select coalesce(sum(calls), 0)::int as n from api_usage where service = 'youtube' and day = current_date`);
  return ((r as unknown as { rows: { n: number }[] }).rows[0]?.n) ?? 0;
}

export async function usageHistory(days = 7): Promise<{ day: string; calls: number }[]> {
  const r = await db.execute(sql`
    select day::text as day, calls from api_usage
    where service = 'youtube' and day > current_date - ${days}::int order by day desc
  `);
  return (r as unknown as { rows: { day: string; calls: number }[] }).rows;
}

async function recordCall(): Promise<void> {
  await db.execute(sql`
    insert into api_usage (day, service, calls) values (current_date, 'youtube', 1)
    on conflict (day, service) do update set calls = api_usage.calls + 1
  `);
}

/** Una petición real a YouTube (1 unidad). Devuelve null si no se puede (sin clave, sin presupuesto, error). */
export async function callYouTube(ids: string[]): Promise<Record<string, VideoSnippet> | null> {
  if (!API_KEY || ids.length === 0) return null;
  const unique = [...new Set(ids)].slice(0, 50);

  if ((await usageToday()) >= DAILY_BUDGET) {
    console.warn(`[youtube] presupuesto diario agotado (${DAILY_BUDGET}); se omite la llamada`);
    return null;
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${unique.map(encodeURIComponent).join(',')}&key=${API_KEY}`,
      { cache: 'no-store' },
    );
    await recordCall().catch(() => {}); // contar aunque falle; si el contador falla, no romper la petición
    if (!res.ok) {
      console.error(`[youtube] error ${res.status}`);
      return null;
    }
    const data = await res.json();
    const out: Record<string, VideoSnippet> = {};
    for (const item of data.items ?? []) {
      if (item?.snippet) out[item.id] = { title: item.snippet.title, channelTitle: item.snippet.channelTitle ?? '' };
    }
    return out;
  } catch (e) {
    console.error('[youtube] fallo de red', e);
    return null;
  }
}

// Caché por video (24 h). Solo se cachean respuestas fiables: ante cualquier fallo se lanza error,
// y unstable_cache no guarda los errores (así un fallo puntual no queda "congelado" un día).
const cachedLookup = unstable_cache(
  async (id: string): Promise<{ status: 'ok'; title: string; channelTitle: string } | { status: 'missing' }> => {
    const result = await callYouTube([id]);
    if (result === null) throw new Error('youtube unavailable');
    const v = result[id];
    return v ? { status: 'ok', ...v } : { status: 'missing' };
  },
  ['youtube-video'],
  { revalidate: 86400 },
);

export async function getVideo(id: string): Promise<VideoLookup> {
  try {
    return await cachedLookup(id);
  } catch {
    return { status: 'unavailable' };
  }
}
