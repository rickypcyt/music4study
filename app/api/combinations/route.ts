import { NextResponse } from 'next/server';
import { combinationLinks, combinations, db, links } from '@/db';
import { serializeLink } from '@/db/serialize';
import { desc, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { revalidateTag } from 'next/cache';
import { userStatsTag } from '@/lib/userStats';
import { createCombinationSchema, parseBody } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

/** GET /api/combinations -> combinaciones con sus links */
export async function GET(request: Request) {
  try {
    // Solo las combinaciones de la cuenta con sesión; sin sesión no hay nada que mostrar
    const session = await getSession(request);
    if (!session?.user) return NextResponse.json([]);
    // En paralelo: con neon-http cada consulta es un viaje de red aparte
    const [combos, rel] = await Promise.all([
      db.select().from(combinations).where(eq(combinations.userId, session.user.id)).orderBy(desc(combinations.createdAt)),
      db
        .select({ combinationId: combinationLinks.combinationId, link: links })
        .from(combinationLinks)
        .innerJoin(links, eq(links.id, combinationLinks.linkId))
        .where(eq(links.userId, session.user.id)),
    ]);

    const byCombo = new Map<string, ReturnType<typeof serializeLink>[]>();
    for (const r of rel) {
      if (!r.combinationId) continue;
      const list = byCombo.get(r.combinationId) ?? [];
      list.push(serializeLink(r.link));
      byCombo.set(r.combinationId, list);
    }
    return NextResponse.json(
      combos.map((c) => ({
        id: c.id,
        name: c.name,
        created_at: c.createdAt.toISOString(),
        links: byCombo.get(c.id) ?? [],
      })),
    );
  } catch (error) {
    console.error('GET /api/combinations:', error);
    return NextResponse.json({ error: 'Error al leer combinaciones' }, { status: 500 });
  }
}

/** POST /api/combinations { name } */
export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session?.user) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });

    const parsed = await parseBody(request, createCombinationSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { name } = parsed.data;
    const [row] = await db.insert(combinations).values({ name, userId: session.user.id }).returning();
    revalidateTag(userStatsTag(session.user.id));
    return NextResponse.json({ id: row.id, name: row.name, created_at: row.createdAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error('POST /api/combinations:', error);
    return NextResponse.json({ error: 'Error al crear la combinación' }, { status: 500 });
  }
}
