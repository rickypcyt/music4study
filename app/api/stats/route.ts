import { NextResponse } from 'next/server';
import { db, links } from '@/db';
import { user } from '@/db/auth-schema';
import { and, count, countDistinct, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stats — estadísticas PÚBLICAS y agregadas para la portada (sin sesión).
 * Solo cuenta links públicos y expone nombres públicos (username); nunca correos ni ids de usuario.
 */
export async function GET() {
  try {
    const pub = eq(links.isPublic, true);
    const since = (ms: number) => new Date(Date.now() - ms);
    const DAY = 24 * 60 * 60 * 1000;

    const [
      [totals],
      [members],
      [last24],
      [lastWeek],
      topGenres,
      [platforms],
      recent,
      curators,
    ] = await Promise.all([
      db.select({ tracks: count(), genres: countDistinct(links.genre) }).from(links).where(pub),
      db.select({ n: count() }).from(user),
      db.select({ n: count() }).from(links).where(and(pub, gte(links.dateAdded, since(DAY)))),
      db.select({ n: count() }).from(links).where(and(pub, gte(links.dateAdded, since(7 * DAY)))),
      db
        .select({ name: links.genre, n: count() })
        .from(links)
        .where(and(pub, isNotNull(links.genre)))
        .groupBy(links.genre)
        .orderBy(desc(count()))
        .limit(6),
      db
        .select({
          youtube: sql<number>`count(*) filter (where ${links.url} ilike '%youtube.com%' or ${links.url} ilike '%youtu.be%')::int`,
          spotify: sql<number>`count(*) filter (where ${links.url} ilike '%spotify.com%')::int`,
          soundcloud: sql<number>`count(*) filter (where ${links.url} ilike '%soundcloud.com%')::int`,
        })
        .from(links)
        .where(pub),
      db
        .select({
          id: links.id,
          title: links.title,
          genre: links.genre,
          type: links.type,
          username: links.username,
          url: links.url,
          dateAdded: links.dateAdded,
        })
        .from(links)
        .where(pub)
        .orderBy(desc(links.dateAdded))
        .limit(8),
      db
        .select({ name: links.username, n: count() })
        .from(links)
        .where(and(pub, isNotNull(links.username)))
        .groupBy(links.username)
        .orderBy(desc(count()))
        .limit(5),
    ]);

    return NextResponse.json(
      {
        totals: {
          tracks: totals?.tracks ?? 0,
          genres: totals?.genres ?? 0,
          members: members?.n ?? 0,
          last24h: last24?.n ?? 0,
          lastWeek: lastWeek?.n ?? 0,
        },
        topGenres: topGenres.filter((g) => g.name).map((g) => ({ name: g.name as string, count: g.n })),
        platforms: {
          youtube: platforms?.youtube ?? 0,
          spotify: platforms?.spotify ?? 0,
          soundcloud: platforms?.soundcloud ?? 0,
        },
        recent: recent.map((r) => ({
          id: r.id,
          title: r.title ?? '',
          genre: r.genre ?? '',
          type: r.type ?? '',
          username: r.username ?? '',
          url: r.url,
          dateAdded: r.dateAdded ? r.dateAdded.toISOString() : null,
        })),
        curators: curators.filter((c) => c.name).map((c) => ({ name: c.name as string, count: c.n })),
        generatedAt: new Date().toISOString(),
      },
      // Caché corta en CDN: miles de visitantes no se traducen en miles de consultas a la base de datos
      { headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15' } },
    );
  } catch (error) {
    console.error('GET /api/stats:', error);
    return NextResponse.json({ error: 'Error al leer las estadísticas' }, { status: 500 });
  }
}
