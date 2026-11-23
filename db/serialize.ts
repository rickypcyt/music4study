import type { links } from './schema';

type LinkRow = typeof links.$inferSelect;

/** El front espera snake_case y strings no nulos (como el tipo Link de la UI). */
export function serializeLink(r: LinkRow) {
  return {
    id: r.id,
    url: r.url,
    type: r.type ?? '',
    genre: r.genre ?? '',
    username: r.username ?? '',
    title: r.title ?? '',
    date_added: r.dateAdded ? r.dateAdded.toISOString() : new Date(0).toISOString(),
    user_id: r.userId,
    is_public: r.isPublic,
  };
}
