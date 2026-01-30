"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import CachedEmbed from './embeds/CachedEmbed';
import { Plus } from "lucide-react";
import { fetchAndStoreTitle } from "@/lib/fetchAndStoreTitles";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/hooks/use-toast";
import { useAudio } from "@/contexts/AudioContext";
import { extractYouTubeId } from "./embeds/LazyYouTubeEmbed";

interface Link {
  id: string;
  title: string;
  url: string;
  genre: string;
  type: string;
  username: string;
  date_added: string;
  titleConfirmedAt?: string; // Timestamp when title was last confirmed
}

interface LinkCardProps {
  link: Link;
  onRemoved?: (id: string) => void;
  index?: number; // Index in the grid for priority loading
}

interface Combination {
  id: string;
  name: string;
}

// Función para formatear la fecha
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};



function LinkCard({ link, onRemoved, index }: LinkCardProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCombinationName, setNewCombinationName] = useState("");
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [selectedCombination, setSelectedCombination] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [youtubeTitle, setYoutubeTitle] = useState<string | null>(null);
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const { isPlaying, currentVideoId } = useAudio();

  const fetchCombinations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('combinations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCombinations(data || []);
    } catch (error) {
      console.error('Error fetching combinations:', error);
      toast({
        title: "Error",
        description: "Failed to load combinations. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (isAddModalOpen) {
      fetchCombinations();
    }
  }, [isAddModalOpen, fetchCombinations]);

  // Fetch title immediately for YouTube videos if title is null or invalid
  // Only fetch if: YouTube link AND title needs fetching AND not already confirmed
  useEffect(() => {
    let cancelled = false;
    const isYouTube = link.url.includes('youtube.com') || link.url.includes('youtu.be');

    // Skip if title was recently confirmed (within last hour)
    if (link.titleConfirmedAt) {
      const confirmedAge = Date.now() - new Date(link.titleConfirmedAt).getTime();
      const ONE_HOUR = 60 * 60 * 1000;
      if (confirmedAge < ONE_HOUR) {
        console.log('⏭️ LinkCard: Skipping confirmed link', {
          id: link.id,
          title: link.title,
          confirmedAge: Math.round(confirmedAge / 1000) + 's ago'
        });
        return;
      }
    }

    // Check if title needs fetching
    const needsTitleFetch = !isValidTitle(link.title) && !youtubeTitle;

    // Only fetch if: YouTube AND needs title AND not already fetched
    if (isYouTube && needsTitleFetch) {
      console.log('🔄 LinkCard: Fetching title');

      fetchAndStoreTitle(link).then((fetchedTitle) => {
        if (!cancelled && fetchedTitle) {
          console.log('✅ LinkCard: Got title');
          setYoutubeTitle(fetchedTitle);
        }
      }).catch(err => {
        if (!cancelled) {
          console.error('❌ LinkCard: Error fetching title', err);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [link, youtubeTitle]); // Only run when link changes

  const handleAddToCombination = async () => {
    if (!selectedCombination) return;

    setLoading(true);
    try {
      // First check if the link is already in the combination
      const { data: existingLink, error: checkError } = await supabase
        .from('combination_links')
        .select('id')
        .eq('combination_id', selectedCombination)
        .eq('link_id', link.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw checkError;
      }

      if (existingLink) {
        toast({
          title: "Already Added",
          description: "This track is already in the combination.",
          variant: "destructive",
        });
        return;
      }

      const { error: insertError } = await supabase
        .from('combination_links')
        .insert([{
          combination_id: selectedCombination,
          link_id: link.id
        }]);

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }

      toast({
        title: "Success!",
        description: "Track added to combination successfully.",
      });

      setIsAddModalOpen(false);
      setSelectedCombination(null);
    } catch (error: unknown) {
      console.error('Error adding to combination:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add track to combination. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCombination = async () => {
    if (!newCombinationName.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('combinations')
        .insert([{ name: newCombinationName.trim() }])
        .select('id')
        .single();

      if (error) throw error;

      setSelectedCombination(data.id);
      setNewCombinationName("");
      setIsCreateModalOpen(false);
      toast({
        title: "Success!",
        description: "Combination created successfully.",
      });
    } catch (error) {
      console.error('Error creating combination:', error);
      toast({
        title: "Error",
        description: "Failed to create combination. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isSpotify = link.url.includes('spotify.com');
  const isYouTube = link.url.includes('youtube.com') || link.url.includes('youtu.be');
  const isSoundCloud = link.url.includes('soundcloud.com');
  
  // Check if title is valid (not a URL)
  const isValidTitle = (title: string | undefined | null): boolean => {
    if (!title || !title.trim()) return false;
    if (title.includes('youtube.com') || title.includes('youtu.be') || title.startsWith('http')) {
      return false;
    }
    return true;
  };
  
  // Determine display title: prefer link.title if valid and confirmed, otherwise youtubeTitle
  const displayTitle = isYouTube
    ? (isValidTitle(link.title) ? link.title : (youtubeTitle || ''))
    : link.title;
  
  const extractVideoId = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return extractYouTubeId(url);
    }
    // For other platforms, return null for now
    return null;
  };

  const isCurrentlyPlaying = Boolean(isPlaying && currentVideoId && currentVideoId === extractVideoId(link.url));

  return (
    <>
      <Card
        className={`overflow-hidden relative group hover:shadow-lg hover:shadow-[#e6e2d9]/5 transition-all duration-300 min-h-[400px] flex flex-col ${
          isCurrentlyPlaying ? '!border-2 !border-primary/80' : ''
        }`}
        ref={cardRef}
      >
        <CardContent className="p-2 flex flex-col flex-1">
          {(isSpotify || isYouTube || isSoundCloud) ? (
            <div className="w-full">
          <CachedEmbed 
                url={link.url}
                linkId={link.id}
                initialTitle={link.title || ''}
                priority={index !== undefined && index < 8} // Priority for first 8 images (LCP)
                onLoad={() => {
                  // You can add any additional logic here when the embed loads
                }}
            onError={async () => {
              toast({
                title: "Error",
                description: "Failed to load embed. You can still open the link in a new tab.",
                variant: "destructive",
              });
            }}
            onUnavailable={() => {
              // Remover del estado superior cuando YouTube esté no disponible
              onRemoved?.(link.id);
              toast({
                title: "Removed",
                description: "Unavailable YouTube video was removed.",
              });
            }}
            onTitleFetched={(title) => {
              if (isYouTube) {
                setYoutubeTitle(title);
              }
            }}
              />
            </div>
          ) : (
            <div className="w-full aspect-video bg-gray-100 flex items-center justify-center text-gray-500">
              Unsupported URL format
            </div>
          )}
          <div className="p-4 space-y-3 flex flex-col flex-1">
            {/* Show title for all videos, including YouTube */}
            {displayTitle && displayTitle.trim() && (
              <div className="flex-shrink-0">
                <h3 className="text-lg text-[#e6e2d9] line-clamp-2 leading-tight font-semibold">
                  {displayTitle}
                </h3>
              </div>
            )}
            
            {/* Spacer that pushes footer to bottom */}
            <div className="flex-1 min-h-0"></div>
            
            {/* Footer - always at bottom */}
            <div className="flex-shrink-0 flex items-center justify-between pt-2 border-t border-[#e6e2d9]/10">
              <div className="flex flex-col items-start">
                <span className="text-sm text-[#e6e2d9]/50">{formatDate(link.date_added)}</span>
                <span className="text-sm text-[#e6e2d9]/70">by {link.username}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 text-sm font-medium bg-indigo-500/10 text-indigo-400 rounded-full">
                    {link.genre}
                  </span>
                  <span className="px-3 py-1 text-sm font-medium bg-[#e6e2d9]/10 text-[#e6e2d9]/70 rounded-full">
                    {link.type}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-[#e6e2d9]/10 hover:bg-[#e6e2d9]/20 text-[#e6e2d9] hover:text-indigo-400 transition-all duration-200"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-[#e6e2d9]">Add to Combination</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              className="bg-[#e6e2d9]/10 text-[#e6e2d9] hover:bg-[#e6e2d9]/20 hover:text-indigo-400 transition-all duration-200"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create New
            </Button>
          </DialogHeader>
          <div className="space-y-4">
            {combinations.length > 0 ? (
              <div className="space-y-2">
                {combinations.map((combination) => (
                  <button
                    key={combination.id}
                    onClick={() => setSelectedCombination(combination.id)}
                    className={`w-full p-3 text-left rounded-lg transition-colors duration-150 ${
                      selectedCombination === combination.id
                        ? 'bg-[#e6e2d9]/10 text-[#e6e2d9] border border-indigo-500'
                        : 'bg-[#e6e2d9]/10 text-[#e6e2d9] hover:bg-[#e6e2d9]/20'
                    }`}
                  >
                    {combination.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-[#e6e2d9]/70">No combinations found. Create one first!</p>
            )}
            <Button
              onClick={handleAddToCombination}
              disabled={!selectedCombination || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-indigo-500/25 transition-all duration-200"
            >
              {loading ? 'Adding...' : 'Add to Combination'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10">
          <DialogHeader>
            <DialogTitle className="text-[#e6e2d9]">Create New Combination</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="text"
              value={newCombinationName}
              onChange={(e) => setNewCombinationName(e.target.value)}
              placeholder="Enter combination name"
              className="w-full p-2 rounded-lg bg-[#e6e2d9]/10 text-[#e6e2d9] border border-[#e6e2d9]/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <Button
              onClick={handleCreateCombination}
              disabled={!newCombinationName.trim() || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-indigo-500/25 transition-all duration-200"
            >
              {loading ? 'Creating...' : 'Create Combination'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Memoize to prevent unnecessary re-renders but allow remounting
export default memo(LinkCard, (prevProps, nextProps) => {
  // Only prevent re-render if absolutely identical data
  return (
    prevProps.link.id === nextProps.link.id &&
    prevProps.link.title === nextProps.link.title &&
    prevProps.link.url === nextProps.link.url &&
    prevProps.link.genre === nextProps.link.genre &&
    prevProps.link.type === nextProps.link.type &&
    prevProps.link.username === nextProps.link.username &&
    prevProps.link.date_added === nextProps.link.date_added
  );
}); 