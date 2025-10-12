'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import CombinationsGrid from '@/app/components/combinations/CombinationsGrid';

export default function CombinationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchCombinations = useCallback(async () => {
    try {
      setLoading(true);
      
      // Obtener las combinaciones del usuario
      const { data: combinationsData, error: combinationsError } = await supabase
        .from('combinations')
        .select('*')
        .order('created_at', { ascending: false });

      if (combinationsError) throw combinationsError;

      // Obtener los enlaces para cada combinación
      const combinationsWithLinks = await Promise.all(
        combinationsData.map(async (combo: { id: number; name: string; created_at: string }) => {
          const { data: linksData, error: linksError } = await supabase
            .from('combination_links')
            .select('link_id')
            .eq('combination_id', combo.id);

          if (linksError) throw linksError;

          // Obtener los detalles de los enlaces
          const linkIds = linksData.map((item: { link_id: number }) => item.link_id);
          const { data: links, error: linksDetailsError } = await supabase
            .from('links')
            .select('*')
            .in('id', linkIds);

          if (linksDetailsError) throw linksDetailsError;

          return {
            ...combo,
            links: links || [],
          };
        })
      );

      return combinationsWithLinks;
    } catch (err) {
      console.error('Error fetching combinations:', err);
      setError('Error al cargar las combinaciones');
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const loadData = async () => {
      await fetchCombinations();
    };
    loadData();
  }, [fetchCombinations]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // Datos de ejemplo (reemplazar con los datos reales)
  const exampleCombinations = [
    { id: 1, name: 'Clásico', created_at: new Date().toISOString(), links: [] },
    { id: 2, name: 'Jazz', created_at: new Date().toISOString(), links: [] },
    { id: 3, name: 'Ambient', created_at: new Date().toISOString(), links: [] },
    { id: 4, name: 'Lo-Fi', created_at: new Date().toISOString(), links: [] },
    { id: 5, name: 'Piano', created_at: new Date().toISOString(), links: [] },
    { id: 6, name: 'Olas', created_at: new Date().toISOString(), links: [] },
  ];

  return <CombinationsGrid combinations={exampleCombinations} />;
}