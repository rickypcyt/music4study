'use client';

import { supabase, cachedQuery } from '@/lib/supabase';
import Navbar from '@/components/ui/Navbar';
import { useEffect, useState, useRef, useCallback, Suspense, memo } from 'react';
import LinkCard from '@/components/LinkCard';
import LoadingCards from '@/components/ui/LoadingCards';
import GenreCloud from '@/components/ui/GenreCloud';
import { getGenres } from './genres/actions';
import { useRouter, useSearchParams } from 'next/navigation';
import SubmitForm from './submit/SubmitForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/hooks/use-toast';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '@/hooks/useAuth';
import UsernameDialog from '@/components/UsernameDialog';

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

const HomeContent = memo(function HomeContent() {
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
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });
  const { user, signInWithGoogle, signOut, showUsernameDialog, setShowUsernameDialog } = useAuth();

  const selectedGenre = searchParams.get('genre');

  // Memoize the updateDisplayedLinks function
  const updateDisplayedLinks = useCallback((allLinks: Link[]) => {
    console.log('Updating displayed links...');
    console.log('All links:', allLinks.length);
    console.log('Selected genre:', selectedGenre);
    console.log('Current sort:', currentSort);

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

    setLinks(filteredLinks);
  }, [selectedGenre, currentSort]);

  // Memoize the fetchMoreLinks function with cache
  const fetchMoreLinks = useCallback(async (page: number, limit: number) => {
    return cachedQuery(
      `links_page_${page}_${limit}`,
      async () => {
        const { data: newLinks, error } = await supabase
          .from('links')
          .select('*')
          .order('date_added', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (error) throw error;
        return newLinks || [];
      },
      2 * 60 * 1000 // 2 minutes cache
    );
  }, []);

  // Memoize the loadMoreLinks function
  const loadMoreLinks = useCallback(async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    try {
      const newLinks = await fetchMoreLinks(currentPage, ITEMS_PER_PAGE);
      if (newLinks.length > 0) {
        setLinks(prevLinks => [...prevLinks, ...newLinks]);
        setCurrentPage(prevPage => prevPage + 1);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more links:', error);
      toast({
        title: "Error",
        description: "Failed to load more links. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, currentPage, fetchMoreLinks, toast]);

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

  // Fetch all data on initial load with cache
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!isInitialLoadRef.current) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching initial data...');
        
        // Fetch genres with cache
        const genresData = await cachedQuery(
          'genres',
          async () => {
            const genres = await getGenres();
            return genres;
          },
          5 * 60 * 1000 // 5 minutes cache
        );
        setGenres(genresData);

        // Fetch all links with cache
        const allLinksData = await cachedQuery(
          'all_links',
          async () => {
            const { data, error } = await supabase
              .from('links')
              .select('*')
              .order('date_added', { ascending: false });

            if (error) throw error;
            return data;
          },
          2 * 60 * 1000 // 2 minutes cache
        );
        
        if (allLinksData) {
          const processedLinks = allLinksData.map(link => {
            let username = link.username;
            if (!username && user && link.user_id === user.id) {
              username = user.user_metadata?.full_name || user.email?.split('@')[0] || 'anonymous';
            } else if (!username) {
              username = 'anonymous';
            }
            return {
              ...link,
              type: link.type || 'generic',
              username
            };
          });
          allLinksRef.current = processedLinks;
          updateDisplayedLinks(processedLinks);
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

  // Configurar virtualización
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(links.length / 4), // Dividir por el número máximo de columnas
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, // Altura estimada de cada fila
    overscan: 5, // Número de elementos a renderizar fuera de la vista
  });

  // Función para obtener los enlaces de una fila
  const getRowLinks = (rowIndex: number) => {
    const startIndex = rowIndex * 4;
    return links.slice(startIndex, startIndex + 4);
  };

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMoreLinks();
    }
  }, [inView, hasMore, isLoading]);

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

  const handleUpdate = useCallback(() => {
    // Refetch data after update
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch genres with cache
        const genresData = await cachedQuery(
          'genres',
          async () => {
            const genres = await getGenres();
            return genres;
          },
          5 * 60 * 1000 // 5 minutes cache
        );
        setGenres(genresData);

        // Fetch all links with cache
        const allLinksData = await cachedQuery(
          'all_links',
          async () => {
            const { data, error } = await supabase
              .from('links')
              .select('*')
              .order('date_added', { ascending: false });

            if (error) throw error;
            return data;
          },
          2 * 60 * 1000 // 2 minutes cache
        );
        
        if (allLinksData) {
          const processedLinks = allLinksData.map(link => {
            let username = link.username;
            if (!username && user && link.user_id === user.id) {
              username = user.user_metadata?.full_name || user.email?.split('@')[0] || 'anonymous';
            } else if (!username) {
              username = 'anonymous';
            }
            return {
              ...link,
              type: link.type || 'generic',
              username
            };
          });
          allLinksRef.current = processedLinks;
          updateDisplayedLinks(processedLinks);
        } else {
          console.log('No links data received');
          setLinks([]);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Error loading data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [updateDisplayedLinks]);

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
        user={user}
        onSignIn={signInWithGoogle}
        onSignOut={signOut}
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {combination.links.map((link) => (
                          <LinkCard key={link.id} link={link} genres={genres} onUpdate={handleUpdate} />
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
              <div 
                ref={parentRef}
                className="h-[calc(100vh-12rem)] overflow-y-auto"
              >
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const rowLinks = getRowLinks(virtualRow.index);
                      return (
                        <div
                          key={virtualRow.index}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                          className="px-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                        >
                          {rowLinks.map((link) => (
                            <LinkCard 
                              key={link.id} 
                              link={link} 
                              genres={genres}
                              onUpdate={handleUpdate}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div ref={loadMoreRef} className="h-4" />
              </div>
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
          <SubmitForm onClose={() => setIsSubmitModalOpen(false)} genres={genres} />
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

      {user && (
        <UsernameDialog
          isOpen={showUsernameDialog}
          onClose={() => setShowUsernameDialog(false)}
          userId={user.id}
        />
      )}
    </div>
  );
});

export default function Home() {
  return (
    <Suspense fallback={<LoadingCards />}>
      <HomeContent />
    </Suspense>
  );
}
