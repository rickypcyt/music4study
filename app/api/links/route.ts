import { NextResponse } from 'next/server';
import { db, links } from '@/db';
import { serializeLink } from '@/db/serialize';
import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { revalidateTag } from 'next/cache';
import { userStatsTag } from '@/lib/userStats';
import { createLinkSchema, idListSchema, parseBody } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

/** 'mix' / 'MIX' -> 'Mix' (evita duplicados por mayúsculas) */
const normalizeType = (t: string | null) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t);

/** GET /api/links?scope=public&limit=8  -> muestra de links públicos (más recientes), sin sesión
 *  GET /api/links?scope=mine            -> la biblioteca del usuario con sesión
 *  GET /api/links?ids=a,b,c             -> esos ids, solo si son públicos o propios */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const session = await getSession(request);
    const me = session?.user?.id;
    const visible = me ? or(eq(links.isPublic, true), eq(links.userId, me)) : eq(links.isPublic, true);

    const ids = params.get('ids');
    if (ids) {
      const parsedIds = idListSchema.safeParse(ids);
      if (!parsedIds.success) return NextResponse.json({ error: 'id inválido' }, { status: 400 });
      const rows = await db.select().from(links).where(and(inArray(links.id, parsedIds.data), visible));
      return NextResponse.json(rows.map(serializeLink));
    }

    // scope=auto: con sesión devuelve tu biblioteca; sin sesión, la muestra pública. Una sola petición,
    // sin que el cliente tenga que esperar a conocer la sesión. X-Links-Scope dice cuál de las dos es.
    if (params.get('scope') === 'auto') {
      const rows = me
        ? await db.select().from(links).where(eq(links.userId, me)).orderBy(desc(links.dateAdded))
        : await db.select().from(links).where(eq(links.isPublic, true)).orderBy(desc(links.dateAdded)).limit(8);
      return NextResponse.json(rows.map(serializeLink), { headers: { 'X-Links-Scope': me ?? 'anon' } });
    }

    if (params.get('scope') === 'mine') {
      if (!me) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
      const rows = await db.select().from(links).where(eq(links.userId, me)).orderBy(desc(links.dateAdded));
      return NextResponse.json(rows.map(serializeLink));
    }

    // Por defecto: muestra pública y limitada (no se expone todo el catálogo)
    const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '8', 10) || 8, 1), 50);
    const rows = await db.select().from(links).where(eq(links.isPublic, true)).orderBy(desc(links.dateAdded)).limit(limit);
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

    const parsed = await parseBody(request, createLinkSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { url, type, genre, title } = parsed.data;

    // Duplicados (sin distinguir mayúsculas). Se escapan % y _ para que ilike sea una comparación exacta.
    const escaped = url.replace(/[\\%_]/g, (c: string) => `\\${c}`);
    const existing = await db.select({ id: links.id }).from(links).where(ilike(links.url, escaped)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'This link already exists' }, { status: 409 });
    }

    // El link queda asociado a la cuenta con sesión y usa su nombre
    const [row] = await db
      .insert(links)
      .values({
        url,
        type: normalizeType(type),
        genre,
        username: (session.user.username ?? session.user.name).slice(0, 100),
        userId: session.user.id,
        title,
        dateAdded: new Date(),
      })
      .returning();
    revalidateTag(userStatsTag(session.user.id)); // el modal de perfil mostrará el track nuevo
    return NextResponse.json(serializeLink(row), { status: 201 });
  } catch (error) {
    console.error('POST /api/links:', error);
    return NextResponse.json({ error: 'Error al crear el link' }, { status: 500 });
  }
}
