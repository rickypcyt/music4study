import { NextResponse } from 'next/server';
import { db, links } from '@/db';
import { eq } from 'drizzle-orm';
import { extractYouTubeId } from '@/lib/youtubeId';
import { allow } from '@/lib/rateLimit';
import { getVideo } from '@/lib/youtubeApi';

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

    if (!allow(_req, 'link-remove', 30)) return NextResponse.json({ removed: false, reason: 'demasiadas peticiones' }, { status: 429 });

    const videoId = extractYouTubeId(row.url);
    if (!videoId) return NextResponse.json({ removed: false, reason: 'no verificable' });

    // Solo se borra si YouTube confirma que el video NO existe. Sin clave, sin presupuesto o con error: no se toca nada.
    const v = await getVideo(videoId);
    if (v.status === 'unavailable') return NextResponse.json({ removed: false, reason: 'no verificable' });
    if (v.status === 'ok') return NextResponse.json({ removed: false, reason: 'disponible' });

    await db.delete(links).where(eq(links.id, id)); // combination_links se borra en cascada
    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error('remove-if-unavailable:', error);
    return NextResponse.json({ removed: false, reason: 'error' }, { status: 500 });
  }
}
