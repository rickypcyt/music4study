'use client';

import { supabase } from '@/lib/supabase';
import Navbar from '@/components/ui/Navbar';
import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
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
    console.log('Updating displayed links...');
    console.log('All links:', allLinks.length);
    console.log('Selected genre:', selectedGenre);
    console.log('Current sort:', currentSort);

    let filteredLinks = [...allLinks];

    // Apply genre filter if selected
    if (selectedGenre) {
      filteredLinks = filteredLinks.filter(link => link.genre === selectedGenre);
      console.log('Filtered links by genre:', filteredLinks.length);
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

  // Fetch all data on initial load
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!isInitialLoadRef.current) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching initial data...');
        
        // Fetch genres
        const genresData = await getGenres();
        console.log('Genres fetched:', genresData);
        setGenres(genresData);

        // Fetch all links
        console.log('Fetching links...');
        const { data: allLinksData, error: linksError } = await supabase
          .from('links')
          .select('*')
          .order('date_added', { ascending: false });

        if (linksError) {
          throw linksError;
        }

        console.log('Links fetched:', allLinksData?.length || 0, 'links');
        
        if (allLinksData) {
          // Add default values for missing properties
          const processedLinks = allLinksData.map(link => ({
            ...link,
            type: link.type || 'generic',
            username: link.username || 'anonymous'
          }));
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
