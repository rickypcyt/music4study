import { supabase } from '@/lib/supabase';

export async function getGenres() {
  try {
    const { data, error } = await supabase
      .from('links')
      .select('genre')
      .order('genre');

    if (error) throw error;

    // Count occurrences of each genre
    const genreCounts = data.reduce((acc: { [key: string]: number }, item) => {
      acc[item.genre] = (acc[item.genre] || 0) + 1;
      return acc;
    }, {});

    // Convert to array of objects with value and count
    return Object.entries(genreCounts).map(([value, count]) => ({
      value,
      count
    }));
  } catch (error) {
    console.error('Error fetching genres:', error);
    return [];
  }
} 