'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Suspense, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchAndStoreTitle, fetchAndStoreTitles } from '@/lib/fetchAndStoreTitles';
import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import CurrentlyPlayingFloating from '@/components/ui/CurrentlyPlayingFloating';
import { Input } from '@/components/ui/input';
import LinkCard from '@/components/LinkCard';
import LoadingCards from '@/components/ui/LoadingCards';
import Navbar from '@/components/ui/Navbar';
import PasswordDialog from '@/components/ui/PasswordDialog';
import ProfileModal from '@/components/ui/ProfileModal';
import UsernameModal from '@/components/ui/UsernameModal';
import SimpleGrid from '@/components/ui/SimpleGrid';
import { createCombination, fetchAutoLinks, fetchCombinations as fetchCombinationsApi, fetchLinkById, fetchLinksByIds } from '@/lib/dataApi';
import { authClient } from '@/lib/auth-client';
import { pushUrl, replaceUrl } from '@/lib/urlState';
import { useToast } from '@/components/hooks/use-toast';

const GenreCloud = dynamic(() => import('@/components/ui/GenreCloud'), { ssr: false });
const SubmitForm = dynamic(() => import('@/app/submit/SubmitForm'), { ssr: false });

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


// ============================================
// CONSTANTS
// ============================================
const MAX_CACHE_SIZE = 1000;
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB
const CACHE_KEY = 'music4study_links_cache';
// La caché es por cuenta (o 'anon'): así nunca se mezclan los tracks de una sesión con otra
let cacheScope = 'anon';
const SCOPE_KEY = 'music4study_last_scope';
const cacheKey = () => `${CACHE_KEY}_${cacheScope}`;
const CARDS_PER_PAGE = 8;

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
  currentPage: number;
  totalPages: number;
}

type ViewType = 'home' | 'genres' | 'combinations';
type SortType = 'date' | 'genre' | 'username';

// ============================================
// CACHE UTILITIES
// ============================================
const CacheManager = {
  save: (links: Link[], currentPage: number = 1, totalPages: number = 1): void => {
    if (typeof window === 'undefined') return;
    
    try {
      const limitedLinks = links.slice(0, MAX_CACHE_SIZE);
      const cache: LinksCache = {
        links: limitedLinks,
        lastUpdated: new Date().toISOString(),
        currentPage,
        totalPages
      };
      const cacheString = JSON.stringify(cache);
      
      if (cacheString.length > MAX_STORAGE_SIZE) {
        const smallerCache: LinksCache = {
          links: links.slice(0, 500),
          lastUpdated: new Date().toISOString(),
          currentPage,
          totalPages
        };
        localStorage.setItem(cacheKey(), JSON.stringify(smallerCache));
      } else {
        localStorage.setItem(cacheKey(), cacheString);
      }
    } catch (error) {
      console.warn('Error saving to cache:', error);
      try {
        localStorage.removeItem(cacheKey());
      } catch (e) {
        console.error('Failed to clear cache:', e);
      }
    }
  },

  get: (): LinksCache | null => {
    if (typeof window === 'undefined') return null;
    
    const cached = localStorage.getItem(cacheKey());
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
  return 'home';
};

const getInitialSort = (searchParams: URLSearchParams): SortType => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('sort') as SortType | null;
    if (stored) return stored;
  }
  return (searchParams.get('sort') as SortType) || 'date';
};

const getInitialPage = (searchParams: URLSearchParams): number => {
  // Primero intentar obtener de la URL
  const pageFromUrl = searchParams.get('page');
  if (pageFromUrl && !isNaN(Number(pageFromUrl)) && Number(pageFromUrl) > 0) {
    return Number(pageFromUrl);
  }
  
  // Si no hay en la URL, intentar del localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('currentPage');
    return stored ? parseInt(stored, 10) : 1;
  }
  
  return 1;
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
interface HomeContentProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

function HomeContent({ searchParams: initialSearchParams }: HomeContentProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();

  // Usar searchParams del hook o los props iniciales
  const effectiveSearchParams = useMemo(() => {
    if (searchParams) return searchParams;
    return new URLSearchParams(initialSearchParams?.toString() || '');
  }, [searchParams, initialSearchParams]);

  // State
  const [currentView, setCurrentView] = useState<ViewType>(() => getInitialView(pathname));
  const [allLinks, setAllLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  // El username se pide solo cuando ya hay sesión confirmada (nunca antes del login ni mientras carga)
  const needsUsername = !isSessionPending && Boolean(session?.user) && !session?.user?.username;
  const [isCreateCombinationModalOpen, setIsCreateCombinationModalOpen] = useState(false);
  const [newCombinationName, setNewCombinationName] = useState('');
  const [combinations, setCombinations] = useState<CombinationWithLinks[]>([]);
  const [currentSort, setCurrentSort] = useState<SortType>(() => getInitialSort(effectiveSearchParams));
  const [currentTheme, setCurrentTheme] = useState(getInitialTheme);
  const [currentPage, setCurrentPage] = useState(() => getInitialPage(effectiveSearchParams));

  // Refs
  const isInitialLoadRef = useRef(true);
  const hasInitialFetchRunRef = useRef(false);
  // Ámbito ('anon' o id de usuario) de los links que hay ahora en pantalla
  const lastFetchedScopeRef = useRef<string | null>(null);

  const selectedGenre = searchParams.get('genre');

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const genres = useMemo(() => {
    const genreCounts = allLinks.reduce((acc: Record<string, number>, link) => {
      acc[link.genre] = (acc[link.genre] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(genreCounts).map(([value, count]) => ({ value, count }));
  }, [allLinks]);

  const filteredAndSortedLinks = useMemo(() => {
    if (!selectedGenre) return sortLinks(allLinks, currentSort);
    
    const normalized = normalizeGenre(selectedGenre);
    const filtered = allLinks.filter(link => normalizeGenre(link.genre) === normalized);
    return sortLinks(filtered, currentSort);
  }, [allLinks, selectedGenre, currentSort]);

  const paginatedLinks = useMemo(() => {
  // Return all links instead of paginated
  return filteredAndSortedLinks;
}, [filteredAndSortedLinks]);

  // Reset page when filters change (but not on initial load)
  // No longer needed since we're showing all content
  // useEffect(() => {
  //   if (isInitialLoadRef.current) return; // Skip during initial load

  //   setCurrentPage(1);
  //   if (typeof window !== 'undefined') {
  //     localStorage.setItem('currentPage', '1');
  //     // Update URL to reflect page reset
  //     const url = new URL(window.location.href);
  //     url.searchParams.set('page', '1');
  //     window.history.replaceState({}, '', url);
  //   }
  // }, [selectedGenre, currentSort]);

  // Validate current page is within bounds (only after data is loaded)
  // No longer needed since we're showing all content
  // useEffect(() => {
  //   if (!loading && currentPage > totalPages && totalPages > 0) {
  //     const correctedPage = Math.max(1, totalPages);
  //     setCurrentPage(correctedPage);
  //     if (typeof window !== 'undefined') {
  //       localStorage.setItem('currentPage', correctedPage.toString());
  //       // Also update URL to reflect the correction
  //       const url = new URL(window.location.href);
  //       url.searchParams.set('page', correctedPage.toString());
  //       window.history.replaceState({}, '', url);
  //     }
  //   }
  // }, [totalPages, currentPage, loading]);

  // ============================================
  // DATA FETCHING CALLBACKS
  // ============================================
  const fetchTitlesInBackground = useCallback(async (links: Link[]) => {
    if (links.length === 0) return;
    
    const scheduleUpdate = (callback: () => void) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 2000 });
      } else {
        setTimeout(callback, 100);
      }
    };

    scheduleUpdate(async () => {
      const tt0 = performance.now();
      try {
        await fetchAndStoreTitles(links);
        console.log(`[perf] fetchAndStoreTitles: ${Math.round(performance.now() - tt0)}ms for ${links.length} links`);

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
            if (confirmedAge < ONE_HOUR) return false;
          }

          // Check if the link was added very recently (within last 30 seconds)
          const linkAge = Date.now() - new Date(link.date_added).getTime();
          const THIRTY_SECONDS = 30 * 1000;
          if (linkAge < THIRTY_SECONDS) return false;

          return true;
        });

        if (youtubeLinksWithoutTitles.length > 0) {
          const linkIds = youtubeLinksWithoutTitles.map(l => l.id);
          const { data, error } = await fetchLinksByIds(linkIds);

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
              const calculatedTotalPages = Math.ceil(updatedLinks.length / CARDS_PER_PAGE);
              CacheManager.save(updatedLinks, currentPage, calculatedTotalPages);
              return updatedLinks;
            });
          }
        }
      } catch (err) {
        console.error('Error fetching titles in background:', err);
      }
    });
  }, [currentPage]);

  const fetchLinksData = useCallback(async (useCache: boolean = true) => {
    const t0 = performance.now();
    try {
      // Try cache first if requested
      if (useCache) {
        const cachedData = CacheManager.get();
        if (cachedData?.links) {
          console.log(`[perf] cache hit: ${cachedData.links.length} links, ${Math.round(performance.now() - t0)}ms`);
          setAllLinks(cachedData.links);
          setLoading(false);
          // Fetch fresh data in background
          fetchLinksData(false);
          return;
        }
        console.log('[perf] cache miss, fetching from API');
      }

      const t1 = performance.now();
      // Una sola petición que el servidor resuelve según la cookie de sesión (no espera al cliente)
      const { data, error, scope: loadedScope } = await fetchAutoLinks();
      cacheScope = loadedScope;
      lastFetchedScopeRef.current = loadedScope;
      try { localStorage.setItem(SCOPE_KEY, loadedScope); } catch {}
      console.log(`[perf] links query: ${Math.round(performance.now() - t1)}ms, ${data?.length ?? 0} rows`);

      if (error) throw error;
      
      if (data) {
        const t2 = performance.now();
        setAllLinks(data);
        console.log(`[perf] setAllLinks render: ${Math.round(performance.now() - t2)}ms`);
        const calculatedTotalPages = Math.ceil(data.length / CARDS_PER_PAGE);
        CacheManager.save(data, currentPage, calculatedTotalPages);
        
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
        console.log(`[perf] total fetchLinksData: ${Math.round(performance.now() - t0)}ms`);
      }
    }
  }, [fetchTitlesInBackground, currentPage]);

  const fetchCombinations = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: combinationsData, error: combinationsError } = await fetchCombinationsApi();

      if (combinationsError) throw new Error(combinationsError.message);
      setCombinations((combinationsData ?? []) as unknown as CombinationWithLinks[]);
      return;

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
    replaceUrl(`/?${params.toString()}`);
  }, [searchParams]);

  const handleHomeClick = useCallback(() => {
    replaceUrl('/');
  }, []);

  const handleGenresClick = useCallback(() => {
    const params = new URLSearchParams();
    params.set('view', 'genres');
    replaceUrl(`/?${params.toString()}`);
  }, []);

  const handleCombinationsClick = useCallback(() => {
    const params = new URLSearchParams();
    params.set('view', 'combinations');
    replaceUrl(`/?${params.toString()}`);
  }, []);

  const handleSortChange = useCallback((sortBy: string) => {
    const newSort = sortBy as SortType;
    setCurrentSort(newSort);
    localStorage.setItem('sort', newSort);
    
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('sort', newSort);
    pushUrl(`/?${newParams.toString()}`);
  }, [searchParams]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
      if (error) throw new Error(error.message);
    } catch (err) {
      console.error('Error during Google login:', err);
      toast({
        title: "Error de Login",
        description: "Hubo un problema al iniciar sesión con Google.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleLogout = useCallback(async () => {
    // No dejar la biblioteca de esta cuenta en el navegador
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(CACHE_KEY) || k === SCOPE_KEY).forEach((k) => localStorage.removeItem(k));
    } catch {}
    await authClient.signOut();
    window.location.assign('/'); // el servidor ahora mostrará la landing
  }, []);

  const handleLinkRemoved = useCallback((removedId: string) => {
    setAllLinks(prevLinks => {
      const updated = prevLinks.filter(l => l.id !== removedId);
      const calculatedTotalPages = Math.ceil(updated.length / CARDS_PER_PAGE);
      CacheManager.save(updated, currentPage, calculatedTotalPages);
      return updated;
    });
  }, [currentPage]);

  const handleCreateCombination = useCallback(async () => {
    if (!newCombinationName.trim()) return;

    try {
      const { error } = await createCombination(newCombinationName.trim());

      if (error) throw new Error(error.message);

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
    // First, get the title
    const updatedTitle = await fetchAndStoreTitle(newLink);

    // Small delay to ensure DB update is complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Double-check: Fetch the link from DB to ensure we have the latest title
    const { data: freshLink, error } = await fetchLinkById(newLink.id);

    if (error || !freshLink) {
      // Fall back to the title we got
      const linkWithTitle = updatedTitle
        ? { ...newLink, title: updatedTitle, titleConfirmedAt: new Date().toISOString() }
        : { ...newLink, titleConfirmedAt: new Date().toISOString() };

      setAllLinks(prevLinks => {
        const updatedLinks = [linkWithTitle, ...prevLinks];
        const calculatedTotalPages = Math.ceil(updatedLinks.length / CARDS_PER_PAGE);
        CacheManager.save(updatedLinks, currentPage, calculatedTotalPages);
        return updatedLinks;
      });
      return;
    }

    const finalTitle = freshLink.title || updatedTitle || '';
    const linkWithTitle = {
      ...freshLink,
      title: finalTitle,
      titleConfirmedAt: new Date().toISOString()
    };

    setAllLinks(prevLinks => {
      const updatedLinks = [linkWithTitle, ...prevLinks];
      const calculatedTotalPages = Math.ceil(updatedLinks.length / CARDS_PER_PAGE);
      CacheManager.save(updatedLinks, currentPage, calculatedTotalPages);
      return updatedLinks;
    });
  }, [currentPage]);

  const handleSubmitSuccess = useCallback(() => {
    setIsSubmitModalOpen(false);
    toast({
      title: "¡Éxito!",
      description: "Tu enlace ha sido enviado correctamente.",
    });
  }, [toast]);

  // Con sesión iniciada se abre el formulario; sin sesión se abre el login
  const handleSubmitClick = useCallback(() => {
    if (session?.user) setIsSubmitModalOpen(true);
    else setIsLoginModalOpen(true);
  }, [session?.user]);

  // Pagination handlers - no longer needed since we're showing all content
  // const handlePageChange = useCallback((page: number) => {
  //   setCurrentPage(page);
  //   if (typeof window !== 'undefined') {
  //     localStorage.setItem('currentPage', page.toString());
      
  //     // Actualizar la URL sin recargar la página
  //     const url = new URL(window.location.href);
  //     url.searchParams.set('page', page.toString());
  //     window.history.pushState({}, '', url);
  //   }
  //   window.scrollTo({ top: 0, behavior: 'smooth' });
  // }, []);

  // const handlePreviousPage = useCallback(() => {
  //   if (currentPage > 1) {
  //     handlePageChange(currentPage - 1);
  //   }
  // }, [currentPage, handlePageChange]);

  // const handleNextPage = useCallback(() => {
  //   if (currentPage < totalPages) {
  //     handlePageChange(currentPage + 1);
  //   }
  // }, [currentPage, totalPages, handlePageChange]);

  // ============================================
  // EFFECTS
  // ============================================

  // Keyboard navigation for pagination - no longer needed since we're showing all content
  // useEffect(() => {
  //   const handleKeyPress = (event: KeyboardEvent) => {
  //     // Handle numeric keys 1-5 for direct page navigation
  //     const key = parseInt(event.key);
  //     if (key >= 1 && key <= 5 && key <= totalPages) {
  //       event.preventDefault();
  //       handlePageChange(key);
  //       return;
  //     }

  //     // Handle arrow keys for previous/next navigation
  //     if (event.key === 'ArrowLeft') {
  //       event.preventDefault();
  //       handlePreviousPage();
  //       return;
  //     }

  //     if (event.key === 'ArrowRight') {
  //       event.preventDefault();
  //       handleNextPage();
  //       return;
  //     }
  //   };

  //   // Add event listener
  //   window.addEventListener('keydown', handleKeyPress);

  //   // Cleanup
  //   return () => {
  //     window.removeEventListener('keydown', handleKeyPress);
  //   };
  // }, [totalPages, handlePageChange, handlePreviousPage, handleNextPage]);

  // 1) Al montar: pinta al instante la caché de la última sesión y pide datos frescos SIN esperar a la sesión.
  useEffect(() => {
    if (hasInitialFetchRunRef.current) return;
    hasInitialFetchRunRef.current = true;
    try {
      cacheScope = localStorage.getItem(SCOPE_KEY) ?? 'anon';
    } catch {}
    const cached = CacheManager.get();
    if (cached?.links) {
      lastFetchedScopeRef.current = cacheScope;
      setAllLinks(cached.links);
      setLoading(false);
    }
    setError(null);
    fetchLinksData(!cached?.links);
    isInitialLoadRef.current = false;
  }, [fetchLinksData]);

  // 2) Si la sesión resuelta no coincide con lo que hay en pantalla (login / logout), recarga.
  const sessionUserId = session?.user?.id ?? null;
  useEffect(() => {
    if (isSessionPending || !hasInitialFetchRunRef.current) return;
    const scope = sessionUserId ?? 'anon';
    if (lastFetchedScopeRef.current === null || lastFetchedScopeRef.current === scope) return;
    lastFetchedScopeRef.current = scope;
    setAllLinks([]);
    setLoading(true);
    fetchLinksData(false).finally(() => setLoading(false));
  }, [isSessionPending, sessionUserId, fetchLinksData]);

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

  // Update current page from URL search params (sync from URL only; omit currentPage to avoid extra runs)
  useEffect(() => {
    const pageFromUrl = effectiveSearchParams.get('page');
    if (pageFromUrl && !isNaN(Number(pageFromUrl)) && Number(pageFromUrl) > 0) {
      const newPage = Number(pageFromUrl);
      setCurrentPage((prev) => {
        if (prev === newPage) return prev;
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentPage', newPage.toString());
        }
        return newPage;
      });
    }
  }, [effectiveSearchParams]);

  // Fetch combinations when in combinations view
  useEffect(() => {
    if (currentView === 'combinations' && combinations.length === 0) {
      fetchCombinations();
    }
  }, [currentView, fetchCombinations, combinations.length]);

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
        onSubmitClick={handleSubmitClick}
        user={session?.user ? { name: session.user.name, username: session.user.username ?? null, image: session.user.image ?? null } : null}
        authLoading={isSessionPending}
        onLoginClick={() => setIsLoginModalOpen(true)}
        onProfileClick={() => setIsProfileModalOpen(true)}
        onCombinationsClick={handleCombinationsClick}
        onSortChange={handleSortChange}
        currentSort={currentSort}
        onThemeChange={setCurrentTheme}
        currentTheme={currentTheme}
      />
      
      <main className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 flex-1 flex flex-col">
          {/* Genres view — always mounted, hidden when not active */}
          <div className={currentView === 'genres' ? 'flex-1 flex flex-col gap-6 pb-4' : 'hidden'}>
            <div className="text-center">
              <h1 className="text-5xl font-serif text-[#e6e2d9] mb-4 tracking-wide">Genres</h1>
              <p className="text-[#e6e2d9]/70 max-w-3xl mx-auto text-lg leading-relaxed">
                Explore music by genre. Each genre has its own unique characteristics and mood.
              </p>
            </div>
            <GenreCloud 
              tags={genres} 
              onGenreClick={handleGenreClick}
              isActive={currentView === 'genres'}
            />
          </div>
          {/* Combinations view — solo se monta cuando está activa */}
          {currentView === 'combinations' && (
            <div className="space-y-8">
              <div className="text-center space-y-2 pt-6">
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
                      <h3 className="text-2xl font-serif text-foreground">{combination.name}</h3>
                      {combination.links.length > 0 ? (
                        <SimpleGrid
                          items={combination.links}
                          renderItem={(link: Link) => <LinkCard key={`combo-${combination.id}-${link.id}`} link={link} />}
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
          )}
          {/* Home view — always mounted, hidden when not active */}
          {/* No usar display:none: pausaría el iframe de YouTube que vive dentro de la card */}
          <div
            aria-hidden={currentView !== 'home'}
            className={currentView === 'home'
              ? 'flex-1 flex flex-col'
              : 'fixed top-0 left-[-200vw] w-screen h-screen overflow-hidden pointer-events-none'}
          >
              {/* Biblioteca vacía (con sesión) */}
              {!isSessionPending && session?.user && !loading && allLinks.length === 0 && (
                <div className="text-center py-16 space-y-4">
                  <p className="text-foreground/70 text-lg">Your library is empty. Submit your first track!</p>
                  <Button onClick={handleSubmitClick} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Submit Track
                  </Button>
                </div>
              )}

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
                <>
                  <SimpleGrid
                    items={paginatedLinks}
                    renderItem={(link: Link, index: number) => (
                      <LinkCard 
                        key={link.id}
                        link={link} 
                        onRemoved={handleLinkRemoved} 
                        index={index} 
                      />
                    )}
                    columns={4}
                    className="pb-2 md:pb-4 lg:pb-6"
                  />
                </>
              )}
          </div>
      </main>

      {/* Submit Modal */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10 w-[calc(100%-1rem)] sm:w-full sm:max-w-[560px] max-h-[90dvh] overflow-hidden grid-rows-[auto_minmax(0,1fr)] p-4 sm:p-6">
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
            onSuccess={handleSubmitSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Username obligatorio tras el primer login */}
      <UsernameModal
        open={needsUsername}
        onSaved={async () => {
          // La sesión va en cookie cacheada: forzar lectura fresca para ver el username nuevo
          await authClient.getSession({ query: { disableCookieCache: true } });
          authClient.$store.notify('$sessionSignal');
        }}
        onSignOut={handleLogout}
      />

      {/* Profile Modal */}
      {session?.user && (
        <ProfileModal
          open={isProfileModalOpen}
          onOpenChange={setIsProfileModalOpen}
          onSignOut={handleLogout}
          user={{ name: session.user.name, image: session.user.image ?? null }}
        />
      )}

      {/* Login Modal */}
      <Dialog open={isLoginModalOpen && !session?.user} onOpenChange={setIsLoginModalOpen}>
        <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10">
          <DialogHeader>
            <DialogTitle className="sr-only">Sign In</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Sign in with Google to submit tracks to your library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button 
              onClick={handleGoogleLogin} 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Sign in with Google
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

      {/* Password Dialog */}
      <PasswordDialog
        isOpen={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
        onSuccess={() => setIsSubmitModalOpen(true)}
      />

      {/* Currently Playing — floating bottom-right, independent of pagination */}
      <CurrentlyPlayingFloating />
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function AppHome({ searchParams }: PageProps) {
  const params = use(searchParams);
  return (
    <Suspense fallback={<LoadingCards />}>
      <HomeContent searchParams={params} />
    </Suspense>
  );
}