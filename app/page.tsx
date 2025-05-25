'use client';

import { supabase, cachedQuery } from '@/lib/supabase';
import Navbar from '@/components/ui/Navbar';
import { useEffect, useState, useRef, useCallback, Suspense, memo } from 'react';
import LoadingCards from '@/components/ui/LoadingCards';
import { getGenres } from './genres/actions';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/hooks/use-toast';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '@/hooks/useAuth';
import { Popup } from '@/components/ui/Popup';
import { DynamicGenreCloud, DynamicSubmitForm, DynamicUsernameDialog, DynamicLinkCard } from '@/lib/dynamicImports';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ITEMS_PER_PAGE = 12;

// Optimized Cache Config
const CACHE_CONFIG = {
  GENRES: {
    key: 'cached_genres',
    ttl: 15 * 60 * 1000, // 15 minutes
  },
  LINKS: {
    key: 'cached_links',
    ttl: 5 * 60 * 1000, // 5 minutes
  }
};

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
  const [displayedGenreName, setDisplayedGenreName] = useState<string | null>(null);

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

  // Optimize the fetchMoreLinks function
  const fetchMoreLinks = useCallback(async (page: number, limit: number) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const cacheKey = `links_page_${page}_${limit}_${selectedGenre || 'all'}_${currentSort}`;
      
      const newLinks = await cachedQuery(
        cacheKey,
        async () => {
          let query = supabase
            .from('links')
            .select('*')
            .order(currentSort === 'date' ? 'date_added' : currentSort, { 
              ascending: currentSort === 'date' ? false : true 
            });

          if (selectedGenre) {
            query = query.eq('genre', selectedGenre);
          }

          const { data: newLinks, error } = await query
            .range((page - 1) * limit, page * limit - 1);

          if (error) throw error;
          return newLinks || [];
        },
        2 * 60 * 1000 // 2 minutes cache
      );

      if (newLinks.length > 0) {
        // Deduplicate links by ID before updating state
        setLinks(prevLinks => {
          const existingIds = new Set(prevLinks.map(link => link.id));
          const uniqueNewLinks = newLinks.filter(link => !existingIds.has(link.id));
          return [...prevLinks, ...uniqueNewLinks];
        });
        setCurrentPage(prevPage => prevPage + 1);
        setHasMore(newLinks.length === limit);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching more links:', error);
      toast({
        title: "Error",
        description: "Failed to load more links. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedGenre, currentSort, isLoading, toast]);

  // Handle infinite scroll
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      fetchMoreLinks(currentPage, ITEMS_PER_PAGE);
    }
  }, [inView, hasMore, isLoading, currentPage, fetchMoreLinks]);

  // Reset links when genre or sort changes
  useEffect(() => {
    const resetAndFetch = async () => {
      setLinks([]);
      setCurrentPage(1);
      setHasMore(true);
      await fetchMoreLinks(1, ITEMS_PER_PAGE);
    };
    resetAndFetch();
  }, [selectedGenre, currentSort]);

  // Optimize initial data loading
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!isInitialLoadRef.current) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch genres with cache
        const genresData = await (async () => {
          const cachedGenres = localStorage.getItem(CACHE_CONFIG.GENRES.key);
          if (cachedGenres) {
            const { data, timestamp } = JSON.parse(cachedGenres);
            if (Date.now() - timestamp < CACHE_CONFIG.GENRES.ttl) {
              return data;
            }
          }
          
          const genres = await cachedQuery(
            'genres',
            async () => getGenres(),
            5 * 60 * 1000
          );
          
          localStorage.setItem(CACHE_CONFIG.GENRES.key, 
            JSON.stringify({ data: genres, timestamp: Date.now() })
          );
          
          return genres;
        })();

        setGenres(genresData);
        setHasMore(true);
        
        // Fetch initial links
        await fetchMoreLinks(1, ITEMS_PER_PAGE);
        
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
        isInitialLoadRef.current = false;
      }
    };

    fetchInitialData();
  }, []); // Empty dependency array since this should only run once

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
    setDisplayedGenreName(genre);
    // Explicitly update displayed links with the new filter
    updateDisplayedLinks(allLinksRef.current); 
    router.push(`/?genre=${encodeURIComponent(genre)}`);
  };

  const handleHomeClick = () => {
    setCurrentView('home');
    setDisplayedGenreName(null);
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

  return (
    <div className="min-h-screen bg-background">
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
      
      <main className="container mx-auto px-0 py-6 sm:px-1 lg:px-2">
        <div className="flex flex-col space-y-6">
          {/* Genre Cloud - Only shown in genres view */}
          {currentView === 'genres' && (
            <div className="w-full">
              <div className="text-center mb-6">
                <h1 className="text-4xl font-serif text-foreground mb-4 tracking-wide">
                  Browse by Genre
                </h1>
                <p className="text-foreground/70 max-w-3xl mx-auto text-lg leading-relaxed">
                  Click on a genre to explore music in that category
                </p>
              </div>
              <div className="w-full h-[700px] sm:h-[600px] relative">
                <DynamicGenreCloud 
                  genres={genres} 
                  onGenreClick={handleGenreClick} 
                />
              </div>
            </div>
          )}

          {/* Main Content - Only shown in home view */}
          {currentView === 'home' && (
            <div className="flex flex-col space-y-6">
              {displayedGenreName && (
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-serif text-foreground mb-2 tracking-wide">
                    {displayedGenreName} Music
                  </h2>
                  <p className="text-foreground/70 max-w-2xl mx-auto text-lg leading-relaxed">
                    Explore {displayedGenreName} songs and mixes below.
                  </p>
                </div>
              )}
              
              {/* Loading State */}
              {loading && <LoadingCards />}

              {/* Links Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from(new Map(links.map(link => [link.id, link])).values()).map((link) => (
                  <DynamicLinkCard
                    key={`${link.id}-${link.date_added}`}
                    link={link}
                    genres={genres}
                    onUpdate={() => {
                      // Reset and fetch fresh data
                      setLinks([]);
                      setCurrentPage(1);
                      setHasMore(true);
                      fetchMoreLinks(1, ITEMS_PER_PAGE);
                    }}
                  />
                ))}
              </div>

              {/* Loading More Indicator */}
              {isLoading && !loading && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}

              {/* Load More Trigger */}
              <div ref={loadMoreRef} className="h-10" />
            </div>
          )}

          {/* Combinations View - Only shown in combinations view */}
          {currentView === 'combinations' && (
            <div className="w-full">
              <div className="text-center mb-6">
                <h1 className="text-4xl font-serif text-foreground mb-4 tracking-wide">
                  Your Combinations
                </h1>
                <p className="text-foreground/70 max-w-3xl mx-auto text-lg leading-relaxed">
                  Manage and view your curated music combinations
                </p>
              </div>
              <div className="space-y-4">
                {combinations.length === 0 ? (
                  <p className="text-center text-muted-foreground">No combinations created yet.</p>
                ) : (
                  combinations.map((combination) => (
                    <div key={combination.id} className="border rounded-md p-4 bg-card text-card-foreground shadow-sm">
                      <h2 className="text-xl font-semibold mb-2">{combination.name}</h2>
                      {combination.links.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No tracks in this combination yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {combination.links.map((link) => (
                            <DynamicLinkCard
                              key={link.id}
                              link={link}
                              genres={genres}
                              // onUpdate prop might be needed here if editing links within combinations should refetch data
                              // onUpdate={() => fetchCombinations()}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle>Submit Track</DialogTitle>
          </DialogHeader>
          <DynamicSubmitForm onClose={() => setIsSubmitModalOpen(false)} genres={genres} />
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateCombinationModalOpen} onOpenChange={setIsCreateCombinationModalOpen}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle>Create New Combination</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateCombination(); }} className="space-y-4">
            <Input
              placeholder="Combination name"
              value={newCombinationName}
              onChange={(e) => setNewCombinationName(e.target.value)}
              className="bg-background border-border"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!newCombinationName.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {user && (
        <Dialog open={showUsernameDialog} onOpenChange={setShowUsernameDialog}>
          <DialogContent className="bg-background border-border">
            <DialogHeader>
              <DialogTitle>Set Username</DialogTitle>
            </DialogHeader>
            <DynamicUsernameDialog
              isOpen={showUsernameDialog}
              onClose={() => setShowUsernameDialog(false)}
              userId={user.id}
            />
          </DialogContent>
        </Dialog>
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
