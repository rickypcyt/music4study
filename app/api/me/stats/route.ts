import { NextResponse } from 'next/server';
import { combinations, db, links } from '@/db';
import { count, desc, eq, max } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/me/stats -> estadísticas de la biblioteca del usuario con sesión */
export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const userId = session.user.id;

    const [totals] = await db
      .select({ total: count(), lastAdded: max(links.dateAdded) })
      .from(links)
      .where(eq(links.userId, userId));

    const byGenre = await db
      .select({ genre: links.genre, n: count() })
      .from(links)
      .where(eq(links.userId, userId))
      .groupBy(links.genre)
      .orderBy(desc(count()))
      .limit(5);

    const byPlatform = await db
      .select({ type: links.type, n: count() })
      .from(links)
      .where(eq(links.userId, userId))
      .groupBy(links.type)
      .orderBy(desc(count()));

    const [combos] = await db.select({ n: count() }).from(combinations).where(eq(combinations.userId, userId));

    return NextResponse.json({
      user: {
        name: session.user.name,
        username: session.user.username ?? null,
        email: session.user.email,
        image: session.user.image ?? null,
        memberSince: session.user.createdAt,
      },
      totalLinks: totals?.total ?? 0,
      lastAdded: totals?.lastAdded ? totals.lastAdded.toISOString() : null,
      combinations: combos?.n ?? 0,
      topGenres: byGenre.filter((g) => g.genre).map((g) => ({ name: g.genre as string, count: g.n })),
      platforms: byPlatform.filter((p) => p.type).map((p) => ({ name: p.type as string, count: p.n })),
    });
  } catch (error) {
    console.error('GET /api/me/stats:', error);
    return NextResponse.json({ error: 'Error al leer las estadísticas' }, { status: 500 });
  }
}
