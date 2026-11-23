import { NextResponse } from 'next/server';
import { db, links } from '@/db';
import { eq } from 'drizzle-orm';
import { extractYouTubeId } from '@/lib/youtubeId';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/links/[id]/remove-if-unavailable
 * El servidor comprueba con la API de YouTube que el video NO existe antes de borrar;
 * así el cliente no puede usarlo para borrar links válidos.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 });

    const [row] = await db.select().from(links).where(eq(links.id, id)).limit(1);
    if (!row) return NextResponse.json({ removed: true }); // ya no existe

    const videoId = extractYouTubeId(row.url);
    const key = process.env.YOUTUBE_API_KEY;
    if (!videoId || !key) return NextResponse.json({ removed: false, reason: 'no verificable' });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${key}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return NextResponse.json({ removed: false, reason: 'error de YouTube' });
    const data = await res.json();
    if (data.items?.length) return NextResponse.json({ removed: false, reason: 'disponible' });

    await db.delete(links).where(eq(links.id, id)); // combination_links se borra en cascada
    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error('remove-if-unavailable:', error);
    return NextResponse.json({ removed: false, reason: 'error' }, { status: 500 });
  }
}
