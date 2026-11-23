// SOLO SERVIDOR. Estadísticas de la biblioteca de un usuario para el modal de perfil.
// Una sola consulta SQL (antes eran 4 seguidas) y caché de 30 s por usuario; se invalida al añadir tracks o combinaciones.
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

export interface UserStats {
  totalLinks: number;
  lastAdded: string | null;
  combinations: number;
  topGenres: { name: string; count: number }[];
  platforms: { name: string; count: number }[];
}

export const userStatsTag = (userId: string) => `user-stats-${userId}`;

async function queryUserStats(userId: string): Promise<UserStats> {
  const result = await db.execute(sql`
    select
      (select count(*) from links where user_id = ${userId})::int as total,
      (select max(date_added) from links where user_id = ${userId}) as last_added,
      (select count(*) from combinations where user_id = ${userId})::int as combos,
      coalesce((
        select json_agg(t) from (
          select genre as name, count(*)::int as count from links
          where user_id = ${userId} and genre is not null and genre <> ''
          group by genre order by count(*) desc limit 5
        ) t
      ), '[]'::json) as top_genres,
      coalesce((
        select json_agg(t) from (
          select type as name, count(*)::int as count from links
          where user_id = ${userId} and type is not null and type <> ''
          group by type order by count(*) desc
        ) t
      ), '[]'::json) as platforms
  `);

  const row = (result as unknown as {
    rows: { total: number; last_added: string | null; combos: number; top_genres: UserStats['topGenres']; platforms: UserStats['platforms'] }[];
  }).rows[0];

  return {
    totalLinks: row.total,
    lastAdded: row.last_added ? new Date(row.last_added).toISOString() : null,
    combinations: row.combos,
    topGenres: row.top_genres,
    platforms: row.platforms,
  };
}

export function getUserStats(userId: string): Promise<UserStats> {
  return unstable_cache(() => queryUserStats(userId), ['user-stats', userId], {
    revalidate: 30,
    tags: [userStatsTag(userId)],
  })();
}
