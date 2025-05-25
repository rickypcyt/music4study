import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cache implementation
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
}

export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = CACHE_TTL
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key) as CacheEntry | undefined;

  if (cached && now - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await queryFn();
  cache.set(key, { data, timestamp: now });
  return data;
}

// Helper function to clear cache for a specific key
export function clearCache(key: string) {
  cache.delete(key);
}

// Helper function to clear all cache
export function clearAllCache() {
  cache.clear();
}

// Example usage:
// const getLinks = async () => {
//   return cachedQuery('links', async () => {
//     const { data, error } = await supabase
//       .from('links')
//       .select('*')
//       .order('date_added', { ascending: false });
//     if (error) throw error;
//     return data;
//   });
// }; 