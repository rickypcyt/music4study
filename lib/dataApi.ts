// Cliente de los endpoints del servidor (/api/links, /api/combinations).
// Devuelve { data, error } para que los llamadores mantengan la forma que tenían con Supabase.

type Result<T> = { data: T | null; error: { message: string; status?: number; details?: string; hint?: string } | null };

async function call<T>(input: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const res = await fetch(input, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { data: null, error: { message: body?.error ?? res.statusText, status: res.status } };
    return { data: body as T, error: null };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : 'Network error' } };
  }
}

export interface ApiLink {
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

export interface ApiCombination {
  id: string;
  name: string;
  created_at: string;
  links: ApiLink[];
}

/** Una sola petición: tu biblioteca si hay sesión, o la muestra pública. Devuelve también el ámbito ('anon' o id de usuario). */
export async function fetchAutoLinks(): Promise<{ data: ApiLink[] | null; error: Result<never>['error']; scope: string }> {
  try {
    const res = await fetch('/api/links?scope=auto');
    const body = await res.json().catch(() => null);
    if (!res.ok) return { data: null, error: { message: body?.error ?? res.statusText, status: res.status }, scope: 'anon' };
    return { data: body as ApiLink[], error: null, scope: res.headers.get('X-Links-Scope') ?? 'anon' };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : 'Network error' }, scope: 'anon' };
  }
}

/** Muestra pública (sin sesión) */
export const fetchPublicSample = (limit = 8) => call<ApiLink[]>(`/api/links?scope=public&limit=${limit}`);
/** Biblioteca del usuario con sesión */
export const fetchMyLinks = () => call<ApiLink[]>('/api/links?scope=mine');
export const fetchLinksByIds = (ids: string[]) => call<ApiLink[]>(`/api/links?ids=${ids.join(',')}`);
export const fetchLinkById = (id: string) => call<ApiLink>(`/api/links/${id}`);
export const createLink = (payload: { url: string; type?: string; genre?: string; username?: string; title?: string }) =>
  call<ApiLink>('/api/links', { method: 'POST', body: JSON.stringify(payload) });
export const updateLinkTitle = (id: string, title: string) =>
  call<ApiLink>(`/api/links/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) });
export const removeLinkIfUnavailable = (id: string) =>
  call<{ removed: boolean; reason?: string }>(`/api/links/${id}/remove-if-unavailable`, { method: 'POST' });
export const fetchCombinations = () => call<ApiCombination[]>('/api/combinations');
export const createCombination = (name: string) =>
  call<{ id: string; name: string; created_at: string }>('/api/combinations', { method: 'POST', body: JSON.stringify({ name }) });
