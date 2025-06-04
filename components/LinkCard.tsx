"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import CachedEmbed from './embeds/CachedEmbed';
import { Plus } from "lucide-react";
import { Spotify } from 'react-spotify-embed';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/hooks/use-toast";

interface Link {
  id: string;
  title: string;
  url: string;
  genre: string;
  type: string;
  username: string;
  date_added: string;
}

interface LinkCardProps {
  link: Link;
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

// Componente memoizado para el contenido del embed
const SpotifyEmbed = memo(({ url }: { url: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentEmbedRef = embedRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded) {
            setIsLoaded(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (currentEmbedRef) {
      observer.observe(currentEmbedRef);
    }

    return () => {
      if (currentEmbedRef) {
        observer.unobserve(currentEmbedRef);
      }
    };
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <div 
        ref={embedRef}
        className="w-full aspect-[16/9] bg-[#e6e2d9]/5 animate-pulse rounded-t-lg"
      />
    );
  }

  return (
    <div ref={embedRef} className="w-full aspect-[16/9]">
      <div className="w-full h-full">
        <Spotify link={url} className="w-full h-full" />
      </div>
    </div>
  );
});

SpotifyEmbed.displayName = 'SpotifyEmbed';

export default function LinkCard({ link }: LinkCardProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCombinationName, setNewCombinationName] = useState("");
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [selectedCombination, setSelectedCombination] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

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
  
  return (
    <>
      <Card className="overflow-hidden relative group hover:shadow-lg hover:shadow-[#e6e2d9]/5 transition-all duration-300" ref={cardRef}>
        <CardContent className="p-2">
          {(isSpotify || isYouTube || isSoundCloud) ? (
            <div className="w-full">
              <CachedEmbed 
                url={link.url}
                linkId={link.id}
                onLoad={() => {
                  // You can add any additional logic here when the embed loads
                }}
                onError={() => {
                  toast({
                    title: "Error",
                    description: "Failed to load embed. You can still open the link in a new tab.",
                    variant: "destructive",
                  });
                }}
              />
            </div>
          ) : (
            <div className="w-full aspect-video bg-gray-100 flex items-center justify-center text-gray-500">
              Unsupported URL format
            </div>
          )}
          <div className="p-4 space-y-3">
            <h3 className="font-semibold text-lg text-[#e6e2d9] line-clamp-2">{link.title}</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 text-xs font-medium bg-indigo-500/10 text-indigo-400 rounded-full">
                  {link.genre}
                </span>
                <span className="px-2 py-1 text-xs font-medium bg-[#e6e2d9]/10 text-[#e6e2d9]/70 rounded-full">
                  {link.type}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#e6e2d9]/10">
              <span className="text-xs text-[#e6e2d9]/50">{formatDate(link.date_added)}</span>
              <span className="text-xs text-[#e6e2d9]/70">by {link.username}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-[#e6e2d9]/10 hover:bg-[#e6e2d9]/20 text-[#e6e2d9] hover:text-indigo-400 transition-all duration-200"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="h-3 w-3" />
              </Button>
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