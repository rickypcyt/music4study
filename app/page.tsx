'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import GenreCloud from '@/components/ui/GenreCloud';
import { Input } from '@/components/ui/input';
import LinkCard from '@/components/LinkCard';
import LoadingCards from '@/components/ui/LoadingCards';
import Navbar from '@/components/ui/Navbar';
import SubmitForm from './submit/SubmitForm';
import { getGenres } from './genres/actions';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/hooks/use-toast';

const ITEMS_PER_PAGE = 12;

interface Link {
  id: string;
  title: string;
  url: string;
  genre: string;
  date_added: string;
  type: string;
  username: string;
}

interface Combination {
  id: string;
  name: string;
  created_at: string;
}

interface CombinationWithLinks extends Combination {
  links: Link[];
}

// Añadir interfaz para el caché
interface LinksCache {
  links: Link[];
  lastUpdated: string;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<'home' | 'genres' | 'combinations'>('home');
  const [links, setLinks] = useState<Link[]>([]);
  const [genres, setGenres] = useState<{ value: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isCreateCombinationModalOpen, setIsCreateCombinationModalOpen] = useState(false);
  const [newCombinationName, setNewCombinationName] = useState('');
  const [combinations, setCombinations] = useState<CombinationWithLinks[]>([]);
  const [currentSort, setCurrentSort] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sort') || searchParams.get('sort') || 'date';
    }
    return searchParams.get('sort') || 'date';
  });
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'coffee';
    }
    return 'coffee';
  });
  const allLinksRef = useRef<Link[]>([]);
  const isInitialLoadRef = useRef(true);
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const selectedGenre = searchParams.get('genre');

  const updateDisplayedLinks = useCallback((allLinks: Link[]) => {
    const filterStartTime = performance.now();
    
    let filteredLinks = [...allLinks];

    // Apply genre filter if selected
    if (selectedGenre) {
      filteredLinks = filteredLinks.filter(link => link.genre === selectedGenre);
    }

    // Apply sorting
    filteredLinks.sort((a, b) => {
      switch (currentSort) {
        case 'date':
          return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
        case 'genre':
          return a.genre.localeCompare(b.genre);
        case 'username':
          return a.username.localeCompare(b.username);
        default:
          return 0;
      }
    });

    const filterEndTime = performance.now();
    console.log(`Filtering and sorting completed in ${(filterEndTime - filterStartTime).toFixed(2)}ms`);
    console.log(`Displaying ${filteredLinks.length} links out of ${allLinks.length} total links`);

    // Update state with all filtered links
    setLinks(filteredLinks);
  }, [selectedGenre, currentSort]);

  // Update current sort when URL changes
  useEffect(() => {
    const sortParam = searchParams.get('sort');
    if (sortParam) {
      setCurrentSort(sortParam);
    }
  }, [searchParams]);

  // Handle theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-dracula', 'theme-catppuccin', 'theme-solarized', 'theme-monokai', 'theme-gruvbox');
    root.classList.add(`theme-${currentTheme}`);
  }, [currentTheme]);

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    localStorage.setItem('theme', theme);
  };

  // Función para guardar en caché
  const saveToCache = (links: Link[]) => {
    const cache: LinksCache = {
      links,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('music4study_links_cache', JSON.stringify(cache));
    console.log('Links saved to cache');
  };

  // Función para obtener de caché
  const getFromCache = (): LinksCache | null => {
    const cached = localStorage.getItem('music4study_links_cache');
    if (!cached) return null;
    
    try {
      const cache: LinksCache = JSON.parse(cached);
      // Verificar si el caché tiene menos de 1 hora
      const cacheAge = new Date().getTime() - new Date(cache.lastUpdated).getTime();
      const oneHour = 60 * 60 * 1000;
      
      if (cacheAge < oneHour) {
        console.log('Using cached links (age:', Math.round(cacheAge / 1000), 'seconds)');
        return cache;
      } else {
        console.log('Cache expired, fetching fresh data');
        return null;
      }
    } catch (error) {
      console.error('Error parsing cache:', error);
      return null;
    }
  };

  // Modificar el useEffect de carga inicial
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!isInitialLoadRef.current) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const totalStartTime = performance.now();
        console.log('Starting initial data fetch...');
        
        // Fetch genres
        const genresStartTime = performance.now();
        const genresData = await getGenres();
        const genresEndTime = performance.now();
        console.log(`Genres fetched in ${(genresEndTime - genresStartTime).toFixed(2)}ms:`, genresData);
        setGenres(genresData);

        // Intentar obtener links del caché primero
        const cachedData = getFromCache();
        let allLinksData: Link[] | null = null;

        if (cachedData) {
          allLinksData = cachedData.links;
          console.log('Using cached links:', allLinksData.length);
        } else {
          // Si no hay caché o está expirado, fetch de la base de datos
          console.log('Fetching all links from database...');
          const linksStartTime = performance.now();
          const { data, error: linksError } = await supabase
            .from('links')
            .select('*')
            .order('date_added', { ascending: false });

          if (linksError) {
            throw linksError;
          }

          const linksEndTime = performance.now();
          console.log(`Raw links fetched in ${(linksEndTime - linksStartTime).toFixed(2)}ms: ${data?.length || 0} links`);
          
          if (data) {
            allLinksData = data;
            // Guardar en caché
            saveToCache(data);
          }
        }

        if (allLinksData) {
          // Process all links at once
          const processStartTime = performance.now();
          const processedLinks = allLinksData.map(link => ({
            ...link,
            type: link.type || 'generic',
            username: link.username || 'anonymous'
          }));
          
          // Store all links in memory
          allLinksRef.current = processedLinks;
          
          // Update displayed links
          updateDisplayedLinks(processedLinks);
          
          const processEndTime = performance.now();
          console.log(`Links processed and stored in memory in ${(processEndTime - processStartTime).toFixed(2)}ms`);
          
          const totalEndTime = performance.now();
          console.log(`Total initialization time: ${(totalEndTime - totalStartTime).toFixed(2)}ms`);
          console.log(`Memory usage: ${(processedLinks.length * JSON.stringify(processedLinks[0]).length / 1024).toFixed(2)}KB for all links`);
        } else {
          console.log('No links data received');
          setLinks([]);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Error loading data. Please try again.');
      } finally {
        setLoading(false);
        isInitialLoadRef.current = false;
      }
    };

    fetchInitialData();
  }, [updateDisplayedLinks]);

  const fetchCombinations = useCallback(async () => {
    try {
      const { data: combinationsData, error: combinationsError } = await supabase
        .from('combinations')
        .select('*')
        .order('created_at', { ascending: false });

      if (combinationsError) throw combinationsError;

      const combinationsWithLinks = await Promise.all(
        combinationsData.map(async (combination) => {
          const { data: linksData, error: linksError } = await supabase
            .from('combination_links')
            .select(`
              link:links(*)
            `)
            .eq('combination_id', combination.id);

          if (linksError) throw linksError;

          return {
            ...combination,
            links: linksData.map(item => item.link)
          };
        })
      );

      setCombinations(combinationsWithLinks);
    } catch (error) {
      console.error('Error fetching combinations:', error);
      toast({
        title: "Error",
        description: "Failed to load combinations. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Update displayed links when genre or sort changes
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    updateDisplayedLinks(allLinksRef.current);
  }, [selectedGenre, currentSort, updateDisplayedLinks]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const currentRef = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoadingMore && links.length > displayedCount) {
          setIsLoadingMore(true);
          setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
          setIsLoadingMore(false);
        }
      },
      { threshold: 0.1 }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [links.length, displayedCount, isLoadingMore]);

  // Fetch combinations when in combinations view
  useEffect(() => {
    if (currentView === 'combinations') {
      fetchCombinations();
    }
  }, [currentView, fetchCombinations]);

  const handleCreateCombination = async () => {
    if (!newCombinationName.trim()) return;

    try {
      const { error } = await supabase
        .from('combinations')
        .insert([{
          name: newCombinationName.trim(),
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Combination created successfully.",
      });

      setIsCreateCombinationModalOpen(false);
      setNewCombinationName('');
      fetchCombinations();
    } catch (error) {
      console.error('Error creating combination:', error);
      toast({
        title: "Error",
        description: "Failed to create combination. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenreClick = (genre: string) => {
    setCurrentView('home');
    router.push(`/?genre=${encodeURIComponent(genre)}`);
  };

  const handleHomeClick = () => {
    setCurrentView('home');
    router.push('/');
  };

  const handleGenresClick = () => {
    setCurrentView('genres');
  };

  const handleCombinationsClick = () => {
    setCurrentView('combinations');
  };

  const handleSubmitClick = () => {
    setIsSubmitModalOpen(true);
  };

  const handleSortChange = (sortBy: string) => {
    setCurrentSort(sortBy);
    localStorage.setItem('sort', sortBy);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('sort', sortBy);
    router.push(`/?${newParams.toString()}`);
  };

  // Añadir función para actualizar el caché después de añadir un nuevo link
  const handleNewLinkAdded = (newLink: Link) => {
    const currentLinks = allLinksRef.current;
    const updatedLinks = [newLink, ...currentLinks];
    allLinksRef.current = updatedLinks;
    saveToCache(updatedLinks);
    updateDisplayedLinks(updatedLinks);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1814] flex items-center justify-center">
        <div className="text-center text-[#e6e2d9]">
          <h2 className="text-2xl mb-4">Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-[#e6e2d9]/10 hover:bg-[#e6e2d9]/20 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar 
        currentView={currentView}
        onGenresClick={handleGenresClick}
        onHomeClick={handleHomeClick}
        onSubmitClick={handleSubmitClick}
        onCombinationsClick={handleCombinationsClick}
        onSortChange={handleSortChange}
        currentSort={currentSort}
        onThemeChange={handleThemeChange}
        currentTheme={currentTheme}
      />
      
      <main className="w-full px-2 sm:px-4 lg:px-3 py-6">
        {currentView === 'genres' ? (
          <>
            <div className="text-center mb-1">
              <h1 className="text-5xl font-serif text-foreground mb-4 tracking-wide">Genres</h1>
              <p className="text-foreground/70 max-w-3xl mx-auto text-lg leading-relaxed pb-6">
                Explore music by genre. Each genre has its own unique characteristics and mood.
              </p>
            </div>
            <div className="flex justify-center items-center min-h-[60vh]">
              <GenreCloud 
                tags={genres} 
                onGenreClick={handleGenreClick}
              />
            </div>
          </>
        ) : currentView === 'combinations' ? (
          <>
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-5xl font-serif text-foreground mb-2">Combinations</h2>
                <p className="text-foreground/70 text-lg">
                  Create and manage your custom playlists. Find the perfect combination of sounds by mixing different genres.
                </p>
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={() => setIsCreateCombinationModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6"
                >
                  Create Combination
                </Button>
              </div>
              <div className="grid gap-8">
                {combinations.map((combination) => (
                  <div key={combination.id} className="space-y-6 p-6 border border-foreground/10 rounded-lg">
                    <h2 className="text-2xl font-serif text-foreground">
                      {combination.name}
                    </h2>
                    {combination.links.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {combination.links.map((link) => (
                          <LinkCard key={link.id} link={link} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-foreground/70">No tracks in this combination yet.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {selectedGenre && (
              <div className="text-center mb-1">
                <h1 className="text-5xl font-serif text-foreground mb-4 tracking-wide pt-6">
                  {selectedGenre} Music
                </h1>
                <p className="text-foreground/70 max-w-3xl mx-auto text-lg leading-relaxed pb-6">
                  Explore our collection of {selectedGenre.toLowerCase()} music for studying.
                </p>
              </div>
            )}

            {loading ? (
              <div className="min-h-[60vh] flex items-center justify-center">
                <LoadingCards />
              </div>
            ) : links.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {links.slice(0, displayedCount).map((link) => (
                    <LinkCard key={link.id} link={link} />
                  ))}
                </div>
                {links.length > displayedCount && (
                  <div ref={loadMoreRef} className="flex justify-center mt-8">
                    {isLoadingMore ? (
                      <LoadingCards />
                    ) : (
                      <div className="text-foreground/70">Loading more...</div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-foreground/70 py-12">
                No tracks found. Be the first to add one!
              </div>
            )}
          </>
        )}
      </main>

      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10 min-h-[300px]">
          <SubmitForm 
            onClose={() => setIsSubmitModalOpen(false)} 
            genres={genres} 
            onNewLinkAdded={handleNewLinkAdded}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateCombinationModalOpen} onOpenChange={setIsCreateCombinationModalOpen}>
        <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10">
          <DialogHeader>
            <DialogTitle>Create New Combination</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Combination name"
              value={newCombinationName}
              onChange={(e) => setNewCombinationName(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-400 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Button
              onClick={handleCreateCombination}
              disabled={!newCombinationName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Create Combination
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingCards />}>
      <HomeContent />
    </Suspense>
  );
}
