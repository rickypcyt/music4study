'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GenreCloud from '@/components/ui/GenreCloud';
import { getGenres } from './actions';
import { useToast } from '@/components/hooks/use-toast';

export default function GenresPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [genres, setGenres] = useState<{ value: string; count: number }[]>([]);

  const handleGenreClick = (genre: string) => {
    router.push(`/?genre=${encodeURIComponent(genre)}`, { scroll: false });
  };

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const genresData = await getGenres();
        setGenres(genresData);
      } catch (error) {
        console.error('Error fetching genres:', error);
        toast({
          title: "Error",
          description: "Failed to load genres. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchGenres();
  }, [toast]);

  return (
    <main className="w-full px-2 sm:px-4 lg:px-3 py-6">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-serif text-[#e6e2d9] mb-4 tracking-wide">Genres</h1>
        <p className="text-[#e6e2d9]/70 max-w-3xl mx-auto text-lg leading-relaxed">
          Explore music by genre. Each genre has its own unique characteristics and mood.
        </p>
      </div>
      <div className="flex justify-center items-center min-h-[60vh]">
        <GenreCloud tags={genres} onGenreClick={handleGenreClick} />
      </div>
    </main>
  );
} 