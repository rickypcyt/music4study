import { supabase } from '@/lib/supabase';

export async function getGenres() {
  const { data: links } = await supabase.from('links').select('genre');

  // Count genres
  const genreCounts = links?.reduce((acc: { [key: string]: number }, link) => {
    acc[link.genre] = (acc[link.genre] || 0) + 1;
    return acc;
  }, {}) || {};

  // Convert to array format for TagCloud
  return Object.entries(genreCounts)
    .map(([genre, count]) => ({ value: genre, count }))
    .sort((a, b) => b.count - a.count);
} 