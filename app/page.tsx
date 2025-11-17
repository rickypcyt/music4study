'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DialogDescription } from '@/components/ui/dialog';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import GenreCloud from '@/components/ui/GenreCloud';
import { Input } from '@/components/ui/input';
import LinkCard from '@/components/LinkCard';
import LoadingCards from '@/components/ui/LoadingCards';
import Navbar from '@/components/ui/Navbar';
import SubmitForm from './submit/SubmitForm';
import VirtualizedGrid from '@/components/ui/VirtualizedGrid';
import ViewTransition from '@/components/ui/ViewTransition';
import { getGenres } from './genres/actions';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/hooks/use-toast';
import { fetchAndStoreTitles, fetchAndStoreTitle } from '@/lib/fetchAndStoreTitles';

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

// Interfaz comentada ya que no se está utilizando actualmente
// interface UsernameModalProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   userId: string;
//   onSaved: (username: string) => void;
// }

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<'home' | 'genres' | 'combinations'>(() => {
    // Initialize view based on pathname
    if (pathname === '/') return 'home';
    if (pathname === '/genres') return 'genres';
    if (pathname === '/combinations') return 'combinations';
    return 'home';
  });
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
  // Limit in-memory links to prevent excessive memory usage
  // Only keep filtered/displayed links in memory, not all links
  const allLinksRef = useRef<Link[]>([]);
  const isInitialLoadRef = useRef(true);
  
  // Cleanup function to limit memory usage
  useEffect(() => {
    return () => {
      // Clear refs on unmount to free memory
      if (allLinksRef.current.length > 1000) {
        allLinksRef.current = allLinksRef.current.slice(0, 1000);
      }
    };
  }, []);
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const genresCacheRef = useRef<{ value: string; count: number }[]>([]);

  const selectedGenre = searchParams.get('genre');

  // Función para obtener los géneros con caché
  const fetchGenres = useCallback(async () => {
    if (genresCacheRef.current.length > 0) {
      setGenres(genresCacheRef.current);
      return;
    }

    try {
      const genresData = await getGenres();
      genresCacheRef.current = genresData;
      setGenres(genresData);
    } catch (error) {
      console.error('Error fetching genres:', error);
      toast({
        title: "Error",
        description: "Failed to load genres. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Cargar géneros al montar el componente
  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);

  // Función para normalizar cadenas de género
  const normalizeGenre = (genre: string) => {
    return genre.trim().toLowerCase().replace(/\s+/g, ' ');
  };

  // Función para actualizar los enlaces mostrados
  const updateDisplayedLinks = useCallback((allLinks: Link[]) => {
    let filteredLinks = [...allLinks];

    // Filtrar por género si hay uno seleccionado
    if (selectedGenre) {
      const selected = normalizeGenre(selectedGenre);
      filteredLinks = filteredLinks.filter(link => 
        normalizeGenre(link.genre) === selected
      );
      
      console.log('Filtrando por género:', selected);
      console.log('Enlaces filtrados:', filteredLinks);
    }

    // Ordenar los enlaces
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

  // Cargar datos iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!isInitialLoadRef.current) return;
      
      setError(null);
      
      // Check cache first and show immediately
      const cachedData = getFromCache();
      if (cachedData && cachedData.links) {
        // Show cached data immediately without loading state
        allLinksRef.current = cachedData.links;
        updateDisplayedLinks(cachedData.links);
        setLoading(false);
        isInitialLoadRef.current = false;
        console.log('Using cached links:', cachedData.links.length);
        
        // Fetch fresh data in background
        fetchFreshData();
        return;
      }
      
      // No cache, show loading and fetch
      setLoading(true);
      try {
        const { data, error: linksError } = await supabase
          .from('links')
          .select('*')
          .order('date_added', { ascending: false });

        if (linksError) {
          throw linksError;
        }
        
        if (data) {
          allLinksRef.current = data;
          saveToCache(data);
          updateDisplayedLinks(data);
        }

        isInitialLoadRef.current = false;
        setLoading(false);
        
        // Fetch titles in background without blocking
        if (data && data.length > 0) {
          fetchTitlesInBackground(data);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to load data. Please try again.');
        setLoading(false);
        isInitialLoadRef.current = false;
      }
    };

    // Helper function to fetch fresh data in background
    const fetchFreshData = async () => {
      try {
        const { data, error } = await supabase
          .from('links')
          .select('*')
          .order('date_added', { ascending: false });

        if (!error && data) {
          allLinksRef.current = data;
          saveToCache(data);
          updateDisplayedLinks(data);
          
          // Fetch titles after updating
          if (data.length > 0) {
            fetchTitlesInBackground(data);
          }
        }
      } catch (err) {
        console.error('Error fetching fresh data:', err);
      }
    };

    // Helper function to fetch titles in background
    const fetchTitlesInBackground = async (links: Link[]) => {
      // Use requestIdleCallback if available, otherwise setTimeout
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
          // Only refresh titles that were actually updated
          // Fetch only links that might have been updated (YouTube links without titles)
          const youtubeLinksWithoutTitles = links.filter(link => {
            const isYouTube = link.url.includes('youtube.com') || link.url.includes('youtu.be');
            return isYouTube && (!link.title || link.title === null || link.title.includes('youtube.com') || link.title.includes('youtu.be'));
          });

          if (youtubeLinksWithoutTitles.length > 0) {
            // Fetch only the updated links instead of all links
            const linkIds = youtubeLinksWithoutTitles.map(l => l.id);
            const { data, error } = await supabase
              .from('links')
              .select('*')
              .in('id', linkIds);
            
            if (!error && data) {
              // Update only the changed links in the current data
              const updatedLinks = [...allLinksRef.current];
              data.forEach(updatedLink => {
                const index = updatedLinks.findIndex(l => l.id === updatedLink.id);
                if (index !== -1) {
                  updatedLinks[index] = updatedLink;
                }
              });
              
              allLinksRef.current = updatedLinks;
              saveToCache(updatedLinks);
              updateDisplayedLinks(updatedLinks);
            }
          }
        } catch (err) {
          console.error('Error fetching titles in background:', err);
        }
      });
    };

    fetchInitialData();
  }, [updateDisplayedLinks]);

  // Actualizar enlaces mostrados cuando cambia el género o el orden
  useEffect(() => {
    if (!isInitialLoadRef.current) {
      updateDisplayedLinks(allLinksRef.current);
    }
  }, [selectedGenre, currentSort, updateDisplayedLinks]);

  const handleGenreClick = useCallback((genre: string) => {
    // No actualizamos currentView para evitar el parpadeo
    // El filtrado se manejará con el parámetro de búsqueda
    const params = new URLSearchParams(searchParams.toString());
    params.set('genre', genre);
    params.delete('view');
    
    // Usamos replace con scroll: false para una transición más suave
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleHomeClick = () => {
    setCurrentView('home');
    router.replace('/', { scroll: false });
  };

  const handleGenresClick = () => {
    setCurrentView('genres');
    const params = new URLSearchParams();
    params.set('view', 'genres');
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  const handleCombinationsClick = () => {
    setCurrentView('combinations');
    const params = new URLSearchParams();
    params.set('view', 'combinations');
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  const handleSortChange = (sortBy: string) => {
    setCurrentSort(sortBy);
    localStorage.setItem('sort', sortBy);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('sort', sortBy);
    router.push(`/?${newParams.toString()}`, { scroll: false });
  };



  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      
      if (error) throw error;
      
      console.log('Google login initiated successfully');
    } catch (err) {
      console.error('Error during Google login:', err);
      // Mostrar error al usuario
      toast({
        title: "Error de Login",
        description: "Hubo un problema al iniciar sesión con Google. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Función de cierre de sesión eliminada ya que no se está utilizar

  // Función para guardar en caché
  const saveToCache = (links: Link[]) => {
    try {
      // Limit cache to most recent 1000 links to prevent excessive memory usage
      const limitedLinks = links.slice(0, 1000);
      const cache: LinksCache = {
        links: limitedLinks,
        lastUpdated: new Date().toISOString()
      };
      const cacheString = JSON.stringify(cache);
      
      // Check if cache would exceed reasonable size (5MB limit)
      if (cacheString.length > 5 * 1024 * 1024) {
        // Reduce to 500 links if too large
        const smallerCache: LinksCache = {
          links: links.slice(0, 500),
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('music4study_links_cache', JSON.stringify(smallerCache));
      } else {
        localStorage.setItem('music4study_links_cache', cacheString);
      }
      console.log('Links saved to cache');
    } catch (error) {
      // If localStorage is full, try to clear old cache entries
      console.warn('Error saving to cache, clearing old entries:', error);
      try {
        localStorage.removeItem('music4study_links_cache');
        // Retry with smaller dataset
        const smallerCache: LinksCache = {
          links: links.slice(0, 500),
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('music4study_links_cache', JSON.stringify(smallerCache));
      } catch (e) {
        console.error('Failed to save cache:', e);
      }
    }
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

  // Cuando un link sea removido por estar unavailable
  const handleLinkRemoved = (removedId: string) => {
    const updated = allLinksRef.current.filter(l => l.id !== removedId);
    allLinksRef.current = updated;
    saveToCache(updated);
    updateDisplayedLinks(updated);
  };

  const fetchCombinations = useCallback(async () => {
    try {
      setLoading(true);
      
      // Primero obtenemos todas las combinaciones
      const { data: combinationsData, error: combinationsError } = await supabase
        .from('combinations')
        .select('*')
        .order('created_at', { ascending: false });

      if (combinationsError) throw combinationsError;
      if (!combinationsData.length) {
        setCombinations([]);
        return;
      }

      // Inicializamos un array vacío para los enlaces de combinaciones
      let linksData: Array<{ combination_id: string; link: Link | Link[] }> = [];
      
      // Solo hacemos la consulta si hay combinaciones
      if (combinationsData.length > 0) {
        const combinationIds = combinationsData.map(c => c.id);
        
        // Obtenemos los enlaces de las combinaciones
        const { data: fetchedLinks, error: linksError } = await supabase
          .from('combination_links')
          .select(`
            combination_id,
            link:link_id (
              *
            )`)
          .in('combination_id', combinationIds);
          
        console.log('Fetched links raw data:', fetchedLinks);

        if (linksError) {
          console.error('Error fetching combination links:', linksError);
          // Continuamos con el array vacío en caso de error
        } else if (fetchedLinks) {
          linksData = fetchedLinks;
        }
      }

      // Creamos un mapa para agrupar los enlaces por combination_id
      const linksByCombination = linksData.reduce<Record<string, Link[]>>((acc, { combination_id, link }) => {
        if (!acc[combination_id]) {
          acc[combination_id] = [];
        }
        if (link) {
          // Aseguramos que link sea un array antes de usar el spread operator
          const linkArray = Array.isArray(link) ? link : [link];
          acc[combination_id].push(...linkArray);
        }
        return acc;
      }, {});

      // Combinamos los datos
      const combinationsWithLinks = combinationsData.map(combination => ({
        ...combination,
        links: linksByCombination[combination.id] || []
      }));

      setCombinations(combinationsWithLinks);
    } catch (error) {
      console.error('Error fetching combinations:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las combinaciones. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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

  const handleSubmitClick = () => {
    // No se requiere inicio de sesión para enviar tracks
    // Si el usuario no está autenticado, usará un nombre de usuario temporal
    setIsSubmitModalOpen(true);
  };

  // Añadir función para actualizar el caché después de añadir un nuevo link
  const handleNewLinkAdded = async (newLink: Link) => {
    const currentLinks = allLinksRef.current;
    
    // Fetch title for new link if it's a YouTube video
    const updatedTitle = await fetchAndStoreTitle(newLink);
    if (updatedTitle) {
      newLink.title = updatedTitle;
    }
    
    const updatedLinks = [newLink, ...currentLinks];
    allLinksRef.current = updatedLinks;
    saveToCache(updatedLinks);
    updateDisplayedLinks(updatedLinks);
  };

  // Función para limpiar el caché cuando no se necesita
  const cleanupCache = useCallback(() => {
    // Mantener caché y datos en memoria para evitar bugs al regresar a Home
  }, []);

  // Limpiar caché cuando cambiamos de vista
  useEffect(() => {
    cleanupCache();
  }, [currentView, cleanupCache]);

  // Update view when search params change
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
        onThemeChange={setCurrentTheme}
        currentTheme={currentTheme}
      />
      
      <main className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 flex-1 flex flex-col h-full">
        <ViewTransition viewKey={currentView} className="flex-1 flex flex-col h-full">
          {currentView === 'genres' ? (
            <>
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
            </>
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

      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent
          className="bg-[#1a1814] border-[#e6e2d9]/10 min-h-[300px]"
          onInteractOutside={() => setIsSubmitModalOpen(false)}
          onEscapeKeyDown={() => setIsSubmitModalOpen(false)}
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
        <DialogContent
          className="bg-[#1a1814] border-[#e6e2d9]/10"
          onInteractOutside={() => setIsLoginModalOpen(false)}
          onEscapeKeyDown={() => setIsLoginModalOpen(false)}
        >
          <DialogHeader>
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



      <Dialog open={isCreateCombinationModalOpen} onOpenChange={setIsCreateCombinationModalOpen}>
        <DialogContent
          className="bg-[#1a1814] border-[#e6e2d9]/10"
          onInteractOutside={() => setIsCreateCombinationModalOpen(false)}
          onEscapeKeyDown={() => setIsCreateCombinationModalOpen(false)}
        >
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
