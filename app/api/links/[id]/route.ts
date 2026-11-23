import { NextResponse } from 'next/server';
import { db, links } from '@/db';
import { serializeLink } from '@/db/serialize';
import { eq } from 'drizzle-orm';
import { extractYouTubeId } from '@/lib/youtubeId';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  const [row] = await db.select().from(links).where(eq(links.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json(serializeLink(row));
}

/**
 * PATCH /api/links/[id]  { title }
 * - Links de YouTube: el título lo obtiene el SERVIDOR de YouTube (el valor del cliente se ignora),
 *   así cualquier visitante puede completar títulos pero nadie puede escribir texto arbitrario.
 * - Resto de links: solo el dueño puede cambiar el título.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 });

    const [row] = await db.select().from(links).where(eq(links.id, id)).limit(1);
    if (!row) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const videoId = extractYouTubeId(row.url);
    const key = process.env.YOUTUBE_API_KEY;
    let title = '';

    if (videoId && key) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${key}`,
        { cache: 'no-store' },
      );
      const data = res.ok ? await res.json() : null;
      title = (data?.items?.[0]?.snippet?.title ?? '').toString().trim().slice(0, 300);
      if (!title) return NextResponse.json({ error: 'Título no disponible' }, { status: 404 });
    } else {
      const session = await getSession(request);
      if (!session?.user) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
      if (row.userId !== session.user.id) return NextResponse.json({ error: 'No es tu link' }, { status: 403 });
      const body = await request.json().catch(() => null);
      title = typeof body?.title === 'string' ? body.title.trim().slice(0, 300) : '';
      if (!title) return NextResponse.json({ error: 'title requerido' }, { status: 400 });
    }

    const [updated] = await db.update(links).set({ title }).where(eq(links.id, id)).returning();
    return NextResponse.json(serializeLink(updated));
  } catch (error) {
    console.error('PATCH /api/links/[id]:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
