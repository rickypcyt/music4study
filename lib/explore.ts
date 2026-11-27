// SOLO SERVIDOR. Datos públicos para /explore, /u/[username] y /combinations/[id].
// Reglas de privacidad: solo links y combinaciones con is_public = true, y de cada persona únicamente su
// username (nunca correo, nombre real, foto ni id interno). Todo va cacheado 30 s: muchas visitas = pocas consultas.
import { and, desc, eq } from 'drizzle-orm';
import { combinationLinks, combinations, db, links } from '@/db';

import { serializeLink } from '@/db/serialize';
import { sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { user } from '@/db/auth-schema';

export interface PublicLink {
  id: string;
  url: string;
  type: string;
  genre: string;
  username: string;
  title: string;
  date_added: string;
  user_id: string | null;
  is_public: boolean;
}

export interface ExploreCombo {
  id: string;
  name: string;
  tracks: number;
  /** URLs de hasta 4 tracks, para la portada en mosaico */
  covers: string[];
}

export interface ExploreUser {
  username: string;
  tracks: number;
  combinations: number;
  topGenre: string | null;
  lastActive: string | null;
  /** Los 4 últimos tracks públicos */
  latest: PublicLink[];
  /** Hasta 4 combinaciones públicas con tracks, las más recientes */
  combos: ExploreCombo[];
}

export interface ExploreData {
  users: ExploreUser[];
  totals: { users: number; tracks: number; combinations: number };
}

const rowsOf = <T,>(result: unknown) => (result as { rows: T[] }).rows;

type LatestRow = { id: string; url: string; title: string | null; genre: string | null; type: string | null; date_added: string | null };

async function queryExplore(): Promise<ExploreData> {
  const [usersRes, totalsRes] = await Promise.all([
    db.execute(sql`
      select * from (
        select u.username,
          (select count(*) from links l where l.user_id = u.id and l.is_public)::int as tracks,
          (select count(*) from combinations c where c.user_id = u.id and c.is_public)::int as combos,
          (select l.genre from links l where l.user_id = u.id and l.is_public and coalesce(l.genre, '') <> ''
             group by l.genre order by count(*) desc limit 1) as top_genre,
          (select max(l.date_added) from links l where l.user_id = u.id and l.is_public) as last_active,
          coalesce((
            select json_agg(t) from (
              select l.id, l.url, l.title, l.genre, l.type, l.date_added from links l
              where l.user_id = u.id and l.is_public
              order by l.date_added desc nulls last limit 4
            ) t
          ), '[]'::json) as latest,
          coalesce((
            select json_agg(c) from (
              select c.id, c.name,
                (select count(*) from combination_links cl join links l on l.id = cl.link_id
                   where cl.combination_id = c.id and l.is_public)::int as tracks,
                coalesce((
                  select json_agg(x.url) from (
                    select l.url from combination_links cl join links l on l.id = cl.link_id
                    where cl.combination_id = c.id and l.is_public
                    order by cl.created_at limit 4
                  ) x
                ), '[]'::json) as covers
              from combinations c
              where c.user_id = u.id and c.is_public
                and exists (select 1 from combination_links cl join links l on l.id = cl.link_id
                            where cl.combination_id = c.id and l.is_public)
              order by c.created_at desc limit 4
            ) c
          ), '[]'::json) as combo_list
        from "user" u
        where u.username is not null
      ) x
      where x.tracks > 0 or x.combos > 0
      order by x.last_active desc nulls last, x.tracks desc
      limit 30
    `),
    db.execute(sql`
      select
        (select count(*) from "user" where username is not null)::int as users,
        (select count(*) from links where is_public)::int as tracks,
        (select count(*) from combinations where is_public)::int as combos
    `),
  ]);

  const t = rowsOf<{ users: number; tracks: number; combos: number }>(totalsRes)[0];
  type UserRow = {
    username: string; tracks: number; combos: number; top_genre: string | null; last_active: string | null;
    latest: LatestRow[]; combo_list: ExploreCombo[];
  };
  return {
    users: rowsOf<UserRow>(usersRes).map((r) => ({
      username: r.username,
      tracks: r.tracks,
      combinations: r.combos,
      topGenre: r.top_genre,
      lastActive: r.last_active ? new Date(r.last_active).toISOString() : null,
      latest: r.latest.map((l) => ({
        id: l.id,
        url: l.url,
        title: l.title ?? '',
        genre: l.genre ?? '',
        type: l.type ?? '',
        username: r.username,
        date_added: l.date_added ? new Date(l.date_added).toISOString() : new Date(0).toISOString(),
        user_id: null, // nunca se expone el id interno
        is_public: true,
      })),
      combos: r.combo_list,
    })),
    totals: { users: t?.users ?? 0, tracks: t?.tracks ?? 0, combinations: t?.combos ?? 0 },
  };
}

export const getExploreData = unstable_cache(queryExplore, ['explore'], { revalidate: 30 });

// ---------------------------------------------------------------------------------------------------------------

export interface PublicCombo {
  id: string;
  name: string;
  createdAt: string;
  tracks: PublicLink[];
}

export interface PublicProfile {
  username: string;
  memberSince: string;
  totals: { tracks: number; combinations: number };
  topGenres: { name: string; count: number }[];
  tracks: PublicLink[];
  combos: PublicCombo[];
}

const MAX_TRACKS = 120;

async function queryProfile(username: string): Promise<PublicProfile | null> {
  const [u] = await db.select({ id: user.id, username: user.username, createdAt: user.createdAt }).from(user).where(eq(user.username, username)).limit(1);
  if (!u || !u.username) return null;

  const [trackRows, comboRows, totalsRes, genresRes] = await Promise.all([
    db.select().from(links).where(and(eq(links.userId, u.id), eq(links.isPublic, true))).orderBy(desc(links.dateAdded)).limit(MAX_TRACKS),
    db
      .select({ comboId: combinations.id, name: combinations.name, createdAt: combinations.createdAt, link: links })
      .from(combinations)
      .leftJoin(combinationLinks, eq(combinationLinks.combinationId, combinations.id))
      .leftJoin(links, and(eq(links.id, combinationLinks.linkId), eq(links.isPublic, true)))
      .where(and(eq(combinations.userId, u.id), eq(combinations.isPublic, true)))
      .orderBy(desc(combinations.createdAt)),
    db.execute(sql`
      select
        (select count(*) from links where user_id = ${u.id} and is_public)::int as tracks,
        (select count(*) from combinations where user_id = ${u.id} and is_public)::int as combos
    `),
    db.execute(sql`
      select genre as name, count(*)::int as count from links
      where user_id = ${u.id} and is_public and coalesce(genre, '') <> ''
      group by genre order by count(*) desc limit 6
    `),
  ]);

  const byCombo = new Map<string, PublicCombo>();
  for (const r of comboRows) {
    const c = byCombo.get(r.comboId) ?? { id: r.comboId, name: r.name, createdAt: r.createdAt.toISOString(), tracks: [] };
    if (r.link) c.tracks.push(serializeLink(r.link));
    byCombo.set(r.comboId, c);
  }

  const totals = rowsOf<{ tracks: number; combos: number }>(totalsRes)[0];
  return {
    username: u.username,
    memberSince: u.createdAt.toISOString(),
    totals: { tracks: totals?.tracks ?? 0, combinations: totals?.combos ?? 0 },
    topGenres: rowsOf<{ name: string; count: number }>(genresRes),
    tracks: trackRows.map(serializeLink),
    combos: [...byCombo.values()].filter((c) => c.tracks.length > 0),
  };
}

export function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const key = username.toLowerCase();
  return unstable_cache(() => queryProfile(key), ['public-profile', key], { revalidate: 30 })();
}

// ---------------------------------------------------------------------------------------------------------------

export interface PublicCombinationPage {
  id: string;
  name: string;
  owner: string;
  createdAt: string;
  tracks: PublicLink[];
}

async function queryCombination(id: string): Promise<PublicCombinationPage | null> {
  const rows = await db
    .select({ id: combinations.id, name: combinations.name, createdAt: combinations.createdAt, owner: user.username, link: links })
    .from(combinations)
    .innerJoin(user, eq(user.id, combinations.userId))
    .leftJoin(combinationLinks, eq(combinationLinks.combinationId, combinations.id))
    .leftJoin(links, and(eq(links.id, combinationLinks.linkId), eq(links.isPublic, true)))
    .where(and(eq(combinations.id, id), eq(combinations.isPublic, true)));

  if (rows.length === 0 || !rows[0].owner) return null;
  return {
    id: rows[0].id,
    name: rows[0].name,
    owner: rows[0].owner,
    createdAt: rows[0].createdAt.toISOString(),
    tracks: rows.filter((r) => r.link).map((r) => serializeLink(r.link!)),
  };
}

export function getPublicCombination(id: string): Promise<PublicCombinationPage | null> {
  return unstable_cache(() => queryCombination(id), ['public-combination', id], { revalidate: 30 })();
}

/** Usernames con contenido público, para el sitemap */
export async function listPublicUsernames(limit = 500): Promise<string[]> {
  const res = await db.execute(sql`
    select u.username from "user" u
    where u.username is not null and exists (select 1 from links l where l.user_id = u.id and l.is_public)
    order by u.created_at desc limit ${limit}
  `);
  return rowsOf<{ username: string }>(res).map((r) => r.username);
}
