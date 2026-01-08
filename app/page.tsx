'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchAndStoreTitle, fetchAndStoreTitles } from '@/lib/fetchAndStoreTitles';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import GenreCloud from '@/components/ui/GenreCloud';
import { Input } from '@/components/ui/input';
import LinkCard from '@/components/LinkCard';
import LoadingCards from '@/components/ui/LoadingCards';
import Navbar from '@/components/ui/Navbar';
import SubmitForm from './submit/SubmitForm';
import ViewTransition from '@/components/ui/ViewTransition';
import VirtualizedGrid from '@/components/ui/VirtualizedGrid';
import { getGenres } from './genres/actions';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/hooks/use-toast';

const ITEMS_PER_PAGE = 12;
const MAX_CACHE_SIZE = 1000;
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

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

interface LinksCache {
  links: Link[];
  lastUpdated: string;
}

type ViewType = 'home' | 'genres' | 'combinations';

// ============================================
// CACHE UTILITIES
// ============================================
const CacheManager = {
  save: (links: Link[]): void => {
    try {
      const limitedLinks = links.slice(0, MAX_CACHE_SIZE);
      const cache: LinksCache = {
        links: limitedLinks,
        lastUpdated: new Date().toISOString()
      };
      const cacheString = JSON.stringify(cache);
      
      if (cacheString.length > MAX_STORAGE_SIZE) {
        const smallerCache: LinksCache = {
          links: links.slice(0, 500),
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('music4study_links_cache', JSON.stringify(smallerCache));
      } else {
        localStorage.setItem('music4study_links_cache', cacheString);
      }
    } catch (error) {
      console.warn('Error saving to cache:', error);
      try {
        localStorage.removeItem('music4study_links_cache');
        const smallerCache: LinksCache = {
          links: links.slice(0, 500),
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('music4study_links_cache', JSON.stringify(smallerCache));
      } catch (e) {
        console.error('Failed to save cache:', e);
      }
    }
  },

  get: (): LinksCache | null => {
    const cached = localStorage.getItem('music4study_links_cache');
    if (!cached) return null;
    
    try {
      const cache: LinksCache = JSON.parse(cached);
      const cacheAge = Date.now() - new Date(cache.lastUpdated).getTime();
      
      if (cacheAge < CACHE_EXPIRY_MS) {
        return cache;
      }
      return null;
    } catch (error) {
      console.error('Error parsing cache:', error);
      return null;
    }
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const normalizeGenre = (genre: string): string => {
  return genre.trim().toLowerCase().replace(/\s+/g, ' ');
};

const getInitialView = (pathname: string): ViewType => {
  if (pathname === '/genres') return 'genres';
  if (pathname === '/combinations') return 'combinations';
  return 'home';
};

const getInitialSort = (searchParams: URLSearchParams): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sort') || searchParams.get('sort') || 'date';
  }
  return searchParams.get('sort') || 'date';
};

const getInitialTheme = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('theme') || 'coffee';
  }
  return 'coffee';
};

// ============================================
// MAIN COMPONENT
// ============================================
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();

  // State
  const [currentView, setCurrentView] = useState<ViewType>(() => getInitialView(pathname));
  const [links, setLinks] = useState<Link[]>([]);
  const [genres, setGenres] = useState<{ value: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [username] = useState<string>('');
  const [isCreateCombinationModalOpen, setIsCreateCombinationModalOpen] = useState(false);
  const [newCombinationName, setNewCombinationName] = useState('');
  const [combinations, setCombinations] = useState<CombinationWithLinks[]>([]);
  const [currentSort, setCurrentSort] = useState(() => getInitialSort(searchParams));
  const [currentTheme, setCurrentTheme] = useState(getInitialTheme);
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Refs
  const allLinksRef = useRef<Link[]>([]);
  const isInitialLoadRef = useRef(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const genresCacheRef = useRef<{ value: string; count: number }[]>([]);

  const selectedGenre = searchParams.get('genre');

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const filteredAndSortedLinks = useMemo(() => {
    let filtered = [...allLinksRef.current];

    // Filter by genre
    if (selectedGenre) {
      const normalized = normalizeGenre(selectedGenre);
      filtered = filtered.filter(link => normalizeGenre(link.genre) === normalized);
    }

    // Sort
    filtered.sort((a, b) => {
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

    return filtered;
  }, [selectedGenre, currentSort]);

  // ============================================
  // CALLBACKS
  // ============================================
  const updateDisplayedLinks = useCallback(() => {
    setLinks(filteredAndSortedLinks);
  }, [filteredAndSortedLinks]);

  const fetchGenres = useCallback(async () => {
    if (genresCacheRef.current.length > 0) {
      setGenres(genresCacheRef.current);
      return;
    }

    try {
      const genresData = await getGenres();
      genresCacheRef.current = genresData;
      setGenres(genresData);
    } catch (err) {
      console.error('Error fetching genres:', err);
      toast({
        title: "Error",
        description: "Failed to load genres. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchTitlesInBackground = useCallback(async (links: Link[]) => {
    const scheduleUpdate = (callback: () => void) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 2000 });
      } else {
        setTimeout(callback, 100);
      }
    };

    scheduleUpdate(async () => {
      try {
        await fetchAndStoreTitles(links);
        
        const youtubeLinksWithoutTitles = links.filter(link => {
          const isYouTube = link.url.includes('youtube.com') || link.url.includes('youtu.be');
          return isYouTube && (!link.title || link.title.includes('youtube.com') || link.title.includes('youtu.be'));
        });

        if (youtubeLinksWithoutTitles.length > 0) {
          const linkIds = youtubeLinksWithoutTitles.map(l => l.id);
          const { data, error } = await supabase
            .from('links')
            .select('*')
            .in('id', linkIds);
          
          if (!error && data) {
            const updatedLinks = [...allLinksRef.current];
            data.forEach(updatedLink => {
              const index = updatedLinks.findIndex(l => l.id === updatedLink.id);
              if (index !== -1) {
                updatedLinks[index] = updatedLink;
              }
            });
            
            allLinksRef.current = updatedLinks;
            CacheManager.save(updatedLinks);
            updateDisplayedLinks();
          }
        }
      } catch (err) {
        console.error('Error fetching titles in background:', err);
      }
    });
  }, [updateDisplayedLinks]);

  const fetchFreshData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('date_added', { ascending: false });

      if (!error && data) {
        allLinksRef.current = data;
        CacheManager.save(data);
        updateDisplayedLinks();
        
        if (data.length > 0) {
          fetchTitlesInBackground(data);
        }
      }
    } catch (err) {
      console.error('Error fetching fresh data:', err);
    }
  }, [updateDisplayedLinks, fetchTitlesInBackground]);

  const fetchCombinations = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: combinationsData, error: combinationsError } = await supabase
        .from('combinations')
        .select('*')
        .order('created_at', { ascending: false });

      if (combinationsError) throw combinationsError;
      if (!combinationsData?.length) {
        setCombinations([]);
        return;
      }

      const combinationIds = combinationsData.map(c => c.id);
      const { data: fetchedLinks, error: linksError } = await supabase
        .from('combination_links')
        .select(`
          combination_id,
          link:link_id (*)
        `)
        .in('combination_id', combinationIds);

      if (linksError) {
        console.error('Error fetching combination links:', linksError);
      }

      const linksByCombination = (fetchedLinks || []).reduce<Record<string, Link[]>>((acc, { combination_id, link }) => {
        if (!acc[combination_id]) {
          acc[combination_id] = [];
        }
        if (link) {
          const linkArray = Array.isArray(link) ? link : [link];
          acc[combination_id].push(...linkArray);
        }
        return acc;
      }, {});

      const combinationsWithLinks = combinationsData.map(combination => ({
        ...combination,
        links: linksByCombination[combination.id] || []
      }));

      setCombinations(combinationsWithLinks);
    } catch (err) {
      console.error('Error fetching combinations:', err);
      toast({
        title: "Error",
        description: "No se pudieron cargar las combinaciones.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleGenreClick = useCallback((genre: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('genre', genre);
    params.delete('view');
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleHomeClick = useCallback(() => {
    setCurrentView('home');
    router.replace('/', { scroll: false });
  }, [router]);

  const handleGenresClick = useCallback(() => {
    setCurrentView('genres');
    const params = new URLSearchParams();
    params.set('view', 'genres');
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router]);

  const handleCombinationsClick = useCallback(() => {
    setCurrentView('combinations');
    const params = new URLSearchParams();
    params.set('view', 'combinations');
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router]);

  const handleSortChange = useCallback((sortBy: string) => {
    setCurrentSort(sortBy);
    localStorage.setItem('sort', sortBy);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('sort', sortBy);
    router.push(`/?${newParams.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      
      if (error) throw error;
    } catch (err) {
      console.error('Error during Google login:', err);
      toast({
        title: "Error de Login",
        description: "Hubo un problema al iniciar sesión con Google.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleLinkRemoved = useCallback((removedId: string) => {
    const updated = allLinksRef.current.filter(l => l.id !== removedId);
    allLinksRef.current = updated;
    CacheManager.save(updated);
    updateDisplayedLinks();
  }, [updateDisplayedLinks]);

  const handleCreateCombination = useCallback(async () => {
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
    } catch (err) {
      console.error('Error creating combination:', err);
      toast({
        title: "Error",
        description: "Failed to create combination.",
        variant: "destructive",
      });
    }
  }, [newCombinationName, toast, fetchCombinations]);

  const handleSubmitClick = useCallback(() => {
    setIsSubmitModalOpen(true);
  }, []);

  const handleNewLinkAdded = useCallback(async (newLink: Link) => {
    const updatedTitle = await fetchAndStoreTitle(newLink);
    if (updatedTitle) {
      newLink.title = updatedTitle;
    }
    
    const updatedLinks = [newLink, ...allLinksRef.current];
    allLinksRef.current = updatedLinks;
    CacheManager.save(updatedLinks);
    updateDisplayedLinks();
  }, [updateDisplayedLinks]);

  // ============================================
  // EFFECTS
  // ============================================
  
  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!isInitialLoadRef.current) return;
      
      setError(null);
      
      const cachedData = CacheManager.get();
      if (cachedData?.links) {
        allLinksRef.current = cachedData.links;
        updateDisplayedLinks();
        setLoading(false);
        isInitialLoadRef.current = false;
        fetchFreshData();
        return;
      }
      
      setLoading(true);
      try {
        const { data, error: linksError } = await supabase
          .from('links')
          .select('*')
          .order('date_added', { ascending: false });

        if (linksError) throw linksError;
        
        if (data) {
          allLinksRef.current = data;
          CacheManager.save(data);
          updateDisplayedLinks();
          
          if (data.length > 0) {
            fetchTitlesInBackground(data);
          }
        }

        isInitialLoadRef.current = false;
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [updateDisplayedLinks, fetchFreshData, fetchTitlesInBackground]);

  // Fetch genres on mount
  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);

  // Update displayed links when filters change
  useEffect(() => {
    if (!isInitialLoadRef.current) {
      updateDisplayedLinks();
    }
  }, [updateDisplayedLinks]);

  // Update view from search params
  useEffect(() => {
    const view = searchParams.get('view');
    if (searchParams.has('genre')) {
      setCurrentView('home');
    } else if (view === 'genres' || view === 'combinations') {
      setCurrentView(view);
    } else {
      setCurrentView('home');
    }
  }, [searchParams]);

  // Fetch combinations when in combinations view
  useEffect(() => {
    if (currentView === 'combinations') {
      fetchCombinations();
    }
  }, [currentView, fetchCombinations]);

  // Infinite scroll observer
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (allLinksRef.current.length > MAX_CACHE_SIZE) {
        allLinksRef.current = allLinksRef.current.slice(0, MAX_CACHE_SIZE);
      }
    };
  }, []);

  // ============================================
  // RENDER
  // ============================================
  
  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1814] flex items-center justify-center">
        <div className="text-center text-[#e6e2d9]">
          <h2 className="text-2xl mb-4">Error</h2>
          <p>{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Retry
          </Button>
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
        onThemeChange={setCurrentTheme}
        currentTheme={currentTheme}
      />
      
      <main className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 flex-1 flex flex-col h-full">
        <ViewTransition viewKey={currentView} className="flex-1 flex flex-col h-full">
          {currentView === 'genres' ? (
            <div className="flex flex-col h-full">
              <div className="text-center mb-8">
                <h1 className="text-5xl font-serif text-[#e6e2d9] mb-4 tracking-wide">Genres</h1>
                <p className="text-[#e6e2d9]/70 max-w-3xl mx-auto text-lg leading-relaxed">
                  Explore music by genre. Each genre has its own unique characteristics and mood.
                </p>
              </div>
              <GenreCloud 
                tags={genres} 
                onGenreClick={handleGenreClick}
              />
            </div>
          ) : currentView === 'combinations' ? (
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
                      <VirtualizedGrid
                        items={combination.links}
                        renderItem={(link) => <LinkCard key={link.id} link={link} />}
                        columns={4}
                        className="min-h-[200px]"
                      />
                    ) : (
                      <p className="text-foreground/70">No tracks in this combination yet.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              {selectedGenre && (
                <div className="text-center mb-1 flex-shrink-0">
                  <h1 className="text-5xl font-serif text-foreground mb-4 tracking-wide pt-6">
                    {selectedGenre} Music
                  </h1>
                  <p className="text-foreground/70 max-w-3xl mx-auto text-lg leading-relaxed pb-6">
                    Explore our collection of {selectedGenre.toLowerCase()} music for studying.
                  </p>
                </div>
              )}

              {loading ? (
                <div className="min-h-[60vh] flex items-center justify-center flex-1">
                  <LoadingCards />
                </div>
              ) : links.length > 0 ? (
                <VirtualizedGrid
                  items={links}
                  renderItem={(link, index) => (
                    <LinkCard link={link} onRemoved={handleLinkRemoved} index={index} />
                  )}
                  estimateSize={450}
                  overscan={3}
                  columns={4}
                  className="flex-1 h-full"
                />
              ) : (
                <div className="text-center text-foreground/70 py-12 flex-1 flex items-center justify-center">
                  No tracks found. Be the first to add one!
                </div>
              )}
            </div>
          )}
        </ViewTransition>
      </main>

      {/* Submit Modal */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent
          className="bg-[#1a1814] border-[#e6e2d9]/10 min-h-[300px]"
          aria-describedby="submit-dialog-description"
        >
          <DialogDescription id="submit-dialog-description" className="sr-only">
            Formulario para enviar un nuevo enlace de música
          </DialogDescription>
          <DialogHeader>
            <DialogTitle>Submit Track</DialogTitle>
          </DialogHeader>
          <SubmitForm 
            onClose={() => setIsSubmitModalOpen(false)} 
            genres={genres} 
            onNewLinkAdded={handleNewLinkAdded}
            username={username || 'Guest'}
            onSuccess={() => {
              setIsSubmitModalOpen(false);
              toast({
                title: "¡Éxito!",
                description: "Tu enlace ha sido enviado correctamente.",
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Login Modal */}
      <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
        <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10">
          <DialogHeader>
            <DialogTitle className="sr-only">Sign In</DialogTitle>
            <div className="text-sm text-muted-foreground">
              You can submit tracks as a guest, or sign in to use your personal username.
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <Button 
              onClick={handleGoogleLogin} 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3"
            >
              Sign in with Google
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue as
                </span>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsLoginModalOpen(false);
                setIsSubmitModalOpen(true);
              }}
              className="w-full"
            >
              Guest
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Combination Modal */}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCombinationName.trim()) {
                  handleCreateCombination();
                }
              }}
              className="bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-400 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Button
              onClick={handleCreateCombination}
              disabled={!newCombinationName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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