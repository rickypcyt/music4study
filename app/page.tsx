'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchAndStoreTitle, fetchAndStoreTitles } from '@/lib/fetchAndStoreTitles';

// ============================================
// UTILITY FUNCTIONS
// ============================================
function isValidTitle(title: string | undefined | null): boolean {
  if (!title || !title.trim()) return false;
  // Don't consider URLs as valid titles
  if (title.includes('youtube.com') || title.includes('youtu.be') || title.startsWith('http')) {
    return false;
  }
  return true;
}
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import GenreCloud from '@/components/ui/GenreCloud';
import { Input } from '@/components/ui/input';
import LinkCard from '@/components/LinkCard';
import LoadingCards from '@/components/ui/LoadingCards';
import Navbar from '@/components/ui/Navbar';
import SimpleGrid from '@/components/ui/SimpleGrid';
import SubmitForm from './submit/SubmitForm';
import ViewTransition from '@/components/ui/ViewTransition';
import { getGenres } from './genres/actions';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/hooks/use-toast';

// ============================================
// CONSTANTS
// ============================================
const MAX_CACHE_SIZE = 1000;
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB
const CACHE_KEY = 'music4study_links_cache';

// ============================================
// TYPES
// ============================================
interface Link {
  id: string;
  title: string;
  url: string;
  genre: string;
  date_added: string;
  type: string;
  username: string;
  titleConfirmedAt?: string; // Timestamp when title was last confirmed
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
type SortType = 'date' | 'genre' | 'username';

// ============================================
// CACHE UTILITIES
// ============================================
const CacheManager = {
  save: (links: Link[]): void => {
    if (typeof window === 'undefined') return;
    
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
        localStorage.setItem(CACHE_KEY, JSON.stringify(smallerCache));
      } else {
        localStorage.setItem(CACHE_KEY, cacheString);
      }
    } catch (error) {
      console.warn('Error saving to cache:', error);
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch (e) {
        console.error('Failed to clear cache:', e);
      }
    }
  },

  get: (): LinksCache | null => {
    if (typeof window === 'undefined') return null;
    
    const cached = localStorage.getItem(CACHE_KEY);
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

const getInitialSort = (searchParams: URLSearchParams): SortType => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('sort') as SortType | null;
    if (stored) return stored;
  }
  return (searchParams.get('sort') as SortType) || 'date';
};

const getInitialTheme = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('theme') || 'coffee';
  }
  return 'coffee';
};

const sortLinks = (links: Link[], sortType: SortType): Link[] => {
  return [...links].sort((a, b) => {
    switch (sortType) {
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
  const [allLinks, setAllLinks] = useState<Link[]>([]);
  const [genres, setGenres] = useState<{ value: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCreateCombinationModalOpen, setIsCreateCombinationModalOpen] = useState(false);
  const [newCombinationName, setNewCombinationName] = useState('');
  const [combinations, setCombinations] = useState<CombinationWithLinks[]>([]);
  const [currentSort, setCurrentSort] = useState<SortType>(() => getInitialSort(searchParams));
  const [currentTheme, setCurrentTheme] = useState(getInitialTheme);

  // Refs
  const isInitialLoadRef = useRef(true);
  const genresCacheRef = useRef<{ value: string; count: number }[]>([]);

  const selectedGenre = searchParams.get('genre');

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const filteredAndSortedLinks = useMemo(() => {
    let filtered = allLinks;

    // Filter by genre
    if (selectedGenre) {
      const normalized = normalizeGenre(selectedGenre);
      filtered = allLinks.filter(link => normalizeGenre(link.genre) === normalized);
    }

    // Sort
    return sortLinks(filtered, currentSort);
  }, [allLinks, selectedGenre, currentSort]);

  // ============================================
  // DATA FETCHING CALLBACKS
  // ============================================
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

        // Only update links that still need titles and weren't recently updated
        const youtubeLinksWithoutTitles = links.filter(link => {
          const isYouTube = link.url.includes('youtube.com') || link.url.includes('youtu.be');
          if (!isYouTube) return false;

          // Check if title is valid
          if (!isValidTitle(link.title)) return true;

          // Check if title was recently confirmed (within last hour)
          if (link.titleConfirmedAt) {
            const confirmedAge = Date.now() - new Date(link.titleConfirmedAt).getTime();
            const ONE_HOUR = 60 * 60 * 1000;
            if (confirmedAge < ONE_HOUR) {
              console.log('⏭️ fetchTitlesInBackground: Skipping recently confirmed link', {
                id: link.id,
                title: link.title,
                confirmedAge: Math.round(confirmedAge / 1000) + 's ago'
              });
              return false;
            }
          }

          // Check if the link was added very recently (within last 30 seconds)
          // If so, assume the title was already fetched when the link was added
          const linkAge = Date.now() - new Date(link.date_added).getTime();
          const THIRTY_SECONDS = 30 * 1000;
          if (linkAge < THIRTY_SECONDS) {
            console.log('⏭️ fetchTitlesInBackground: Skipping very recent link', {
              id: link.id,
              title: link.title,
              linkAge: Math.round(linkAge / 1000) + 's ago'
            });
            return false;
          }

          return true;
        });

        if (youtubeLinksWithoutTitles.length > 0) {
          const linkIds = youtubeLinksWithoutTitles.map(l => l.id);
          const { data, error } = await supabase
            .from('links')
            .select('*')
            .in('id', linkIds);

          if (!error && data) {
            setAllLinks(prevLinks => {
              const updatedLinks = [...prevLinks];
              data.forEach(updatedLink => {
                const index = updatedLinks.findIndex(l => l.id === updatedLink.id);
                if (index !== -1) {
                  // Only update if the new title is valid and different from current
                  const currentLink = updatedLinks[index];
                  if (isValidTitle(updatedLink.title) && updatedLink.title !== currentLink.title) {
                    updatedLinks[index] = {
                      ...updatedLink,
                      titleConfirmedAt: new Date().toISOString()
                    };
                  }
                }
              });
              CacheManager.save(updatedLinks);
              return updatedLinks;
            });
          }
        }
      } catch (err) {
        console.error('Error fetching titles in background:', err);
      }
    });
  }, []);

  const fetchLinksData = useCallback(async (useCache: boolean = true) => {
    try {
      // Try cache first if requested
      if (useCache) {
        const cachedData = CacheManager.get();
        if (cachedData?.links) {
          setAllLinks(cachedData.links);
          setLoading(false);
          // Fetch fresh data in background
          fetchLinksData(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('date_added', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setAllLinks(data);
        CacheManager.save(data);
        
        if (data.length > 0) {
          fetchTitlesInBackground(data);
        }
      }
    } catch (err) {
      console.error('Error fetching links:', err);
      if (useCache) {
        setError('Failed to load data. Please try again.');
      }
    } finally {
      if (useCache) {
        setLoading(false);
      }
    }
  }, [fetchTitlesInBackground]);

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
        .select(`combination_id, link:link_id (*)`)
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

  // ============================================
  // EVENT HANDLERS
  // ============================================
  const handleGenreClick = useCallback((genre: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('genre', genre);
    params.delete('view');
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleHomeClick = useCallback(() => {
    router.replace('/', { scroll: false });
  }, [router]);

  const handleGenresClick = useCallback(() => {
    const params = new URLSearchParams();
    params.set('view', 'genres');
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router]);

  const handleCombinationsClick = useCallback(() => {
    const params = new URLSearchParams();
    params.set('view', 'combinations');
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router]);

  const handleSortChange = useCallback((sortBy: string) => {
    const newSort = sortBy as SortType;
    setCurrentSort(newSort);
    localStorage.setItem('sort', newSort);
    
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('sort', newSort);
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
    setAllLinks(prevLinks => {
      const updated = prevLinks.filter(l => l.id !== removedId);
      CacheManager.save(updated);
      return updated;
    });
  }, []);

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

  const handleNewLinkAdded = useCallback(async (newLink: Link) => {
    console.log('🔄 handleNewLinkAdded: Processing new link', {
      id: newLink.id,
      url: newLink.url,
      currentTitle: newLink.title,
      dateAdded: newLink.date_added
    });

    // First, get the title
    const updatedTitle = await fetchAndStoreTitle(newLink);
    console.log('✅ handleNewLinkAdded: Got title for link', {
      id: newLink.id,
      originalTitle: newLink.title,
      updatedTitle: updatedTitle
    });

    // Small delay to ensure DB update is complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Double-check: Fetch the link from DB to ensure we have the latest title
    const { data: freshLink, error } = await supabase
      .from('links')
      .select('*')
      .eq('id', newLink.id)
      .single();

    if (error) {
      console.warn('⚠️ handleNewLinkAdded: Could not fetch fresh link from DB', error);
      // Fall back to the title we got
      const linkWithTitle = updatedTitle
        ? { ...newLink, title: updatedTitle, titleConfirmedAt: new Date().toISOString() }
        : { ...newLink, titleConfirmedAt: new Date().toISOString() };

      setAllLinks(prevLinks => {
        const updatedLinks = [linkWithTitle, ...prevLinks];
        CacheManager.save(updatedLinks);
        return updatedLinks;
      });
      return;
    }

    const finalTitle = freshLink.title || updatedTitle;
    const linkWithTitle = {
      ...freshLink,
      title: finalTitle,
      titleConfirmedAt: new Date().toISOString()
    };

    console.log('📝 handleNewLinkAdded: Adding link to state with final title', {
      id: linkWithTitle.id,
      finalTitle: linkWithTitle.title,
      titleConfirmedAt: linkWithTitle.titleConfirmedAt
    });

    setAllLinks(prevLinks => {
      const updatedLinks = [linkWithTitle, ...prevLinks];
      CacheManager.save(updatedLinks);
      return updatedLinks;
    });
  }, []);

  const handleSubmitSuccess = useCallback(() => {
    setIsSubmitModalOpen(false);
    toast({
      title: "¡Éxito!",
      description: "Tu enlace ha sido enviado correctamente.",
    });
  }, [toast]);

  // ============================================
  // EFFECTS
  // ============================================
  
  // Initial data fetch
  useEffect(() => {
    if (!isInitialLoadRef.current) return;
    
    isInitialLoadRef.current = false;
    setError(null);
    fetchLinksData(true);
  }, [fetchLinksData]);

  // Fetch genres on mount
  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);

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

  // ============================================
  // RENDER
  // ============================================
  
  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1814] flex items-center justify-center">
        <div className="text-center text-[#e6e2d9] space-y-4">
          <h2 className="text-2xl font-semibold">Error</h2>
          <p className="text-[#e6e2d9]/70">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
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
        onSubmitClick={() => setIsSubmitModalOpen(true)}
        onCombinationsClick={handleCombinationsClick}
        onSortChange={handleSortChange}
        currentSort={currentSort}
        onThemeChange={setCurrentTheme}
        currentTheme={currentTheme}
      />
      
      <main className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 flex-1 flex flex-col">
        <ViewTransition viewKey={currentView} className="flex-1 flex flex-col">
          {currentView === 'genres' ? (
            <div className="flex flex-col space-y-8">
              <div className="text-center">
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
              <div className="text-center space-y-2">
                <h2 className="text-5xl font-serif text-foreground">Combinations</h2>
                <p className="text-foreground/70 text-lg max-w-3xl mx-auto">
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
              
              <div className="space-y-8">
                {combinations.length === 0 && !loading ? (
                  <div className="text-center py-12">
                    <p className="text-foreground/70">No combinations yet. Create your first one!</p>
                  </div>
                ) : (
                  combinations.map((combination) => (
                    <div key={combination.id} className="space-y-4 p-6 border border-foreground/10 rounded-lg">
                      <h3 className="text-2xl font-serif text-foreground">
                        {combination.name}
                      </h3>
                      {combination.links.length > 0 ? (
                        <SimpleGrid
                          items={combination.links}
                          renderItem={(link: Link) => <LinkCard key={link.id} link={link} />}
                          columns={4}
                        />
                      ) : (
                        <p className="text-foreground/70">No tracks in this combination yet.</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {selectedGenre && (
                <div className="text-center mb-8 pt-6">
                  <h1 className="text-5xl font-serif text-foreground mb-4 tracking-wide">
                    {selectedGenre} Music
                  </h1>
                  <p className="text-foreground/70 max-w-3xl mx-auto text-lg leading-relaxed">
                    Explore our collection of {selectedGenre.toLowerCase()} music for studying.
                  </p>
                </div>
              )}

              {loading ? (
                <div className="min-h-[60vh] flex items-center justify-center">
                  <LoadingCards />
                </div>
              ) : (
                <SimpleGrid
                  items={filteredAndSortedLinks}
                  renderItem={(link: Link, index: number) => (
                    <LinkCard 
                      link={link} 
                      onRemoved={handleLinkRemoved} 
                      index={index} 
                    />
                  )}
                  columns={4}
                  className="pb-8"
                />
              )}
            </div>
          )}
        </ViewTransition>
      </main>

      {/* Submit Modal */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10">
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
            username="Guest"
            onSuccess={handleSubmitSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Login Modal */}
      <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
        <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10">
          <DialogHeader>
            <DialogTitle className="sr-only">Sign In</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              You can submit tracks as a guest, or sign in to use your personal username.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button 
              onClick={handleGoogleLogin} 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
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
              className="bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-400"
              autoFocus
            />
            <Button
              onClick={handleCreateCombination}
              disabled={!newCombinationName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
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