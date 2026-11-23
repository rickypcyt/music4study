import { NextResponse } from 'next/server';
import { db, links } from '@/db';
import { serializeLink } from '@/db/serialize';
import { desc, ilike, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/links            -> todos, más recientes primero
 *  GET /api/links?ids=a,b,c  -> solo esos ids */
export async function GET(request: Request) {
  try {
    const ids = new URL(request.url).searchParams.get('ids');
    const rows = ids
      ? await db.select().from(links).where(inArray(links.id, ids.split(',').filter(Boolean)))
      : await db.select().from(links).orderBy(desc(links.dateAdded));
    return NextResponse.json(rows.map(serializeLink));
  } catch (error) {
    console.error('GET /api/links:', error);
    return NextResponse.json({ error: 'Error al leer los links' }, { status: 500 });
  }
}

/** POST /api/links  { url, type?, genre?, username?, title? } */
export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session?.user) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });

    const body = await request.json();
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!url || url.length > 2000 || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    // Duplicados (sin distinguir mayúsculas). Se escapan % y _ para que ilike sea una comparación exacta.
    const escaped = url.replace(/[\\%_]/g, (c: string) => `\\${c}`);
    const existing = await db.select({ id: links.id }).from(links).where(ilike(links.url, escaped)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'This link already exists' }, { status: 409 });
    }

    // El link queda asociado a la cuenta con sesión y usa su nombre
    const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
    const [row] = await db
      .insert(links)
      .values({
        url,
        type: str(body.type, 50),
        genre: str(body.genre, 100),
        username: (session.user.username ?? session.user.name).slice(0, 100),
        userId: session.user.id,
        title: str(body.title, 300),
        dateAdded: new Date(),
      })
      .returning();
    return NextResponse.json(serializeLink(row), { status: 201 });
  } catch (error) {
    console.error('POST /api/links:', error);
    return NextResponse.json({ error: 'Error al crear el link' }, { status: 500 });
  }
}
