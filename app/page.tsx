'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Suspense, useCallback, useEffect, useRef, useState, memo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import GenreCloud from '@/components/ui/GenreCloud';
import { Input } from '@/components/ui/input';
import LinkCard from '@/components/LinkCard';
import LoadingCards from '@/components/ui/LoadingCards';
import Navbar from '@/components/ui/Navbar';
import SubmitForm from './submit/SubmitForm';
import VirtualizedGrid from '@/components/ui/VirtualizedGrid';
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

interface UsernameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved: (username: string) => void;
}

const UsernameModal = memo(function UsernameModal({ open, onOpenChange, userId, onSaved }: UsernameModalProps) {
  const { toast } = useToast();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue('');
    }
  }, [open]);

  const save = async () => {
    const name = value.trim();
    if (!name || !userId) return;
    setSaving(true);
    try {
      const { data: existing, error: checkError } = await supabase
        .from('profiles_m4s')
        .select('id')
        .ilike('username', name)
        .neq('id', userId)
        .limit(1);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        toast({ title: 'Username taken', description: 'Please choose another.', variant: 'destructive' });
        return;
      }
      const { error } = await supabase
        .from('profiles_m4s')
        .upsert({ id: userId, username: name, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      if (error) throw error;
      localStorage.setItem('m4s_username', name);
      onSaved(name);
      onOpenChange(false);
      toast({ title: 'Saved', description: 'Username saved.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save username.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10">
        <DialogHeader>
          <DialogTitle>Choose your username</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            placeholder="Username"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full h-14 rounded-lg bg-background/80 border-2 border-border/40 px-4 text-lg text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary"
            maxLength={30}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
          />
          <div className="flex gap-3">
            <Button onClick={save} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

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
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
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

  // Función para actualizar los enlaces mostrados
  const updateDisplayedLinks = useCallback((allLinks: Link[]) => {
    let filteredLinks = [...allLinks];

    // Filtrar por género si hay uno seleccionado
    if (selectedGenre) {
      const selected = selectedGenre.trim().toLowerCase();
      filteredLinks = filteredLinks.filter(link => link.genre.trim().toLowerCase() === selected);
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
      
      setLoading(true);
      setError(null);
      
      try {
        // Intentar obtener links del caché primero
        const cachedData = getFromCache();
        let allLinksData: Link[] | null = null;

        if (cachedData) {
          allLinksData = cachedData.links;
          console.log('Using cached links:', allLinksData.length);
        } else {
          // Si no hay caché o está expirado, fetch de la base de datos
          console.log('Fetching all links from database...');
          const { data, error: linksError } = await supabase
            .from('links')
            .select('*')
            .order('date_added', { ascending: false });

          if (linksError) {
            throw linksError;
          }
          
          if (data) {
            allLinksData = data;
            // Guardar en caché
            saveToCache(data);
          }
        }

        if (allLinksData) {
          allLinksRef.current = allLinksData;
          updateDisplayedLinks(allLinksData);
        }

        isInitialLoadRef.current = false;
        setLoading(false);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to load data. Please try again.');
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [updateDisplayedLinks]);

  // Actualizar enlaces mostrados cuando cambia el género o el orden
  useEffect(() => {
    if (!isInitialLoadRef.current) {
      updateDisplayedLinks(allLinksRef.current);
    }
  }, [selectedGenre, currentSort, updateDisplayedLinks]);

  const handleGenreClick = (genre: string) => {
    setCurrentView('home');
    const params = new URLSearchParams(searchParams.toString());
    params.set('genre', genre);
    params.delete('view');
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

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

  // Auth: load user and username from profiles_m4s
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user ?? null;
        if (!mounted) return;
        setIsLoggedIn(!!user);
        setUserId(user?.id ?? null);
        if (user?.id) {
          const { data: prof } = await supabase
            .from('profiles_m4s')
            .select('username')
            .eq('id', user.id)
            .single();
          const nameFromDb = prof?.username || localStorage.getItem('m4s_username') || '';
          setUsername(nameFromDb);
        } else {
          setUsername('');
        }
      } finally {
      }
    };
    initAuth();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      setUserId(session?.user?.id ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    } finally {
    }
  };
  // removed unused usernameInput state

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

  // Cuando un link sea removido por estar unavailable
  const handleLinkRemoved = (removedId: string) => {
    const updated = allLinksRef.current.filter(l => l.id !== removedId);
    allLinksRef.current = updated;
    saveToCache(updated);
    updateDisplayedLinks(updated);
  };

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
    if (!isLoggedIn) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!username) {
      setIsUsernameModalOpen(true);
      return;
    }
    setIsSubmitModalOpen(true);
  };

  // Añadir función para actualizar el caché después de añadir un nuevo link
  const handleNewLinkAdded = (newLink: Link) => {
    const currentLinks = allLinksRef.current;
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
      
      <main className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 py-6">
        <div className="w-full">
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
              <div className="min-h-[60vh] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
                {links.map(link => (
                  <div key={link.id}>
                    <LinkCard link={link} onRemoved={handleLinkRemoved} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-foreground/70 py-12">
                No tracks found. Be the first to add one!
              </div>
            )}
          </>
        )}
        </div>
      </main>

      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10 min-h-[300px]">
          <DialogHeader>
            <DialogTitle>Submit Track</DialogTitle>
          </DialogHeader>
          <SubmitForm 
            onClose={() => setIsSubmitModalOpen(false)} 
            genres={genres} 
            onNewLinkAdded={handleNewLinkAdded}
            username={username}
            onEditUsername={() => {
              setIsSubmitModalOpen(false);
              setIsUsernameModalOpen(true);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Login Modal */}
      <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
        <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10">
          <DialogHeader>
            <DialogTitle>Sign in to share your music</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button onClick={handleGoogleLogin} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3">
              Continue with Google
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UsernameModal
        open={isUsernameModalOpen}
        onOpenChange={setIsUsernameModalOpen}
        userId={userId || ''}
        onSaved={(name) => setUsername(name)}
      />

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
