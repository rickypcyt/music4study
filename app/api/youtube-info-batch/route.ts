import { NextResponse } from 'next/server';
import { allow } from '@/lib/rateLimit';
import { callYouTube } from '@/lib/youtubeApi';
import { db, links } from '@/db';
import { and, ilike, isNull, or, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const MAX_BATCH_SIZE = 50; // YouTube permite hasta 50 ids por petición: 1 sola unidad de cuota para todos
const VIDEO_ID = /^[A-Za-z0-9_-]{6,15}$/;

/**
 * GET /api/youtube-info-batch?videoIds=id1,id2,id3
 * Una sola llamada a YouTube (1 unidad) para varios videos. Además guarda los títulos que faltan en la base
 * de datos desde el servidor, así el cliente no tiene que pedirlos uno a uno ni gastar más cuota.
 */
export async function GET(request: Request) {
  if (!allow(request, 'youtube-batch', 20)) {
    return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 });
  }

  const raw = new URL(request.url).searchParams.get('videoIds');
  const videoIds = (raw ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => VIDEO_ID.test(id))
    .slice(0, MAX_BATCH_SIZE);

  if (videoIds.length === 0) {
    return NextResponse.json({ error: 'No valid video IDs provided' }, { status: 400 });
  }

  const results = await callYouTube(videoIds);
  if (results === null) return NextResponse.json({ error: 'YouTube no disponible' }, { status: 503 });

  // Guardar en la base de datos los títulos que faltan (solo links sin título: nunca se pisa uno existente)
  await Promise.all(
    Object.entries(results).map(([id, v]) =>
      db
        .update(links)
        .set({ title: v.title.trim().slice(0, 300) })
        .where(and(ilike(links.url, `%${id.replace(/[\\%_]/g, '\\$&')}%`), or(isNull(links.title), eq(links.title, ''))))
        .catch(() => undefined),
    ),
  );

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
