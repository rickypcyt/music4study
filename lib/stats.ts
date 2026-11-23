// SOLO SERVIDOR. Estadísticas públicas de la landing.
// Antes: 8 consultas HTTP a Neon por visita. Ahora: UNA sola consulta SQL + caché de 10 s en el servidor,
// así que miles de visitas cuestan como mucho una consulta cada 10 segundos.
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

export interface LandingStats {
  totals: { tracks: number; genres: number; members: number; last24h: number; lastWeek: number };
  topGenres: { name: string; count: number }[];
  platforms: { youtube: number; spotify: number; soundcloud: number };
  recent: { id: string; title: string; genre: string; type: string; username: string; url: string; dateAdded: string | null }[];
  curators: { name: string; count: number }[];
  generatedAt: string;
}

interface Row {
  tracks: number;
  genres: number;
  members: number;
  last24h: number;
  last_week: number;
  top_genres: { name: string; count: number }[];
  platforms: { youtube: number; spotify: number; soundcloud: number };
  recent: { id: string; title: string | null; genre: string | null; type: string | null; username: string | null; url: string; date_added: string | null }[];
  curators: { name: string; count: number }[];
}

async function queryStats(): Promise<LandingStats> {
  // Solo links públicos y nombres públicos: nunca correos ni ids de usuario
  const result = await db.execute(sql`
    select
      (select count(*) from links where is_public)::int as tracks,
      (select count(distinct genre) from links where is_public)::int as genres,
      (select count(*) from "user")::int as members,
      (select count(*) from links where is_public and date_added >= now() - interval '24 hours')::int as "last24h",
      (select count(*) from links where is_public and date_added >= now() - interval '7 days')::int as last_week,
      coalesce((
        select json_agg(t) from (
          select genre as name, count(*)::int as count from links
          where is_public and genre is not null group by genre order by count(*) desc limit 6
        ) t
      ), '[]'::json) as top_genres,
      (
        select json_build_object(
          'youtube', count(*) filter (where url ilike '%youtube.com%' or url ilike '%youtu.be%'),
          'spotify', count(*) filter (where url ilike '%spotify.com%'),
          'soundcloud', count(*) filter (where url ilike '%soundcloud.com%')
        ) from links where is_public
      ) as platforms,
      coalesce((
        select json_agg(r) from (
          select id, title, genre, type, username, url, date_added from links
          where is_public order by date_added desc limit 8
        ) r
      ), '[]'::json) as recent,
      coalesce((
        select json_agg(c) from (
          select username as name, count(*)::int as count from links
          where is_public and username is not null group by username order by count(*) desc limit 5
        ) c
      ), '[]'::json) as curators
  `);

  const row = (result as unknown as { rows: Row[] }).rows[0];
  return {
    totals: { tracks: row.tracks, genres: row.genres, members: row.members, last24h: row.last24h, lastWeek: row.last_week },
    topGenres: row.top_genres,
    platforms: row.platforms,
    recent: row.recent.map((r) => ({
      id: r.id,
      title: r.title ?? '',
      genre: r.genre ?? '',
      type: r.type ?? '',
      username: r.username ?? '',
      url: r.url,
      dateAdded: r.date_added ? new Date(r.date_added).toISOString() : null,
    })),
    curators: row.curators,
    generatedAt: new Date().toISOString(),
  };
}

export const getLandingStats = unstable_cache(queryStats, ['landing-stats'], { revalidate: 10 });
