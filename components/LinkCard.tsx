"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Spotify } from 'react-spotify-embed';
import LazyYouTubeEmbed from './embeds/LazyYouTubeEmbed';
import { extractYouTubeId } from './embeds/LazyYouTubeEmbed';
import { useEmbed } from '@/hooks/useEmbed';
import { useAuth } from '@/hooks/useAuth';
import EditLinkDialog from './EditLinkDialog';

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
  genres: { value: string; count: number }[];
  onUpdate?: () => void;
}

interface Combination {
  id: string;
  name: string;
}

const LinkCard = memo(function LinkCard({ link, genres, onUpdate }: LinkCardProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newCombinationName, setNewCombinationName] = useState("");
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [selectedCombination, setSelectedCombination] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { user } = useAuth();

  const isOwner = user?.email === link.username;

  // Intersection Observer para lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const fetchCombinations = useCallback(async () => {
    if (!isAddModalOpen) return;
    
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
  }, [isAddModalOpen, toast]);

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
  
  const { embedUrl, isLoading, error, thumbnailUrl } = useEmbed({
    url: link.url,
    type: isYouTube ? 'youtube' : isSpotify ? 'spotify' : 'soundcloud',
  });

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const renderEmbed = useCallback(() => {
    if (isLoading) {
      return (
        <div className="w-full aspect-video bg-gray-100 rounded-lg animate-pulse" />
      );
    }

    if (error) {
      return (
        <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
          Failed to load embed
        </div>
      );
    }

    if (isSpotify) {
      return (
        <div className="pt-4">
          <div className="aspect-video relative">
            <div className="absolute inset-0">
              <Spotify 
                wide
                link={link.url}
                style={{ height: '100%' }}
              />
            </div>
          </div>
        </div>
      );
    } else if (isYouTube && embedUrl) {
      const videoId = extractYouTubeId(link.url);
      if (!videoId) return null;
      return (
        <div className="pt-4">
          <LazyYouTubeEmbed
            videoId={videoId}
            title={link.title || 'YouTube Video'}
            thumbnailQuality="hqdefault"
          />
        </div>
      );
    } else if (isSoundCloud && embedUrl) {
      return (
        <div className="pt-4">
          <iframe
            src={embedUrl}
            className="w-full aspect-[16/9]"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            loading="lazy"
          />
        </div>
      );
    }

    return (
      <div className="w-full aspect-[16/10] bg-gray-100 flex items-center justify-center text-gray-500">
        Unsupported URL format
      </div>
    );
  }, [isLoading, error, isSpotify, isYouTube, isSoundCloud, embedUrl, link.url, link.title]);

  const handleDoubleClick = () => {
    if (isOwner) {
      setIsEditModalOpen(true);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isOwner) {
      e.preventDefault();
      setIsEditModalOpen(true);
    }
  };

  return (
    <div 
      ref={cardRef} 
      className="relative"
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {isVisible ? (
        <div className="card-content">
          <Card className="overflow-hidden relative group hover:shadow-lg hover:shadow-[#e6e2d9]/5 transition-all duration-300">
            <CardContent className="p-2">
              {renderEmbed()}
              <div className="p-4">
                <h3 className="font-medium text-foreground mb-3 line-clamp-2">{link.title}</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-foreground/70">
                    <span>{link.username}</span>
                    <span>•</span>
                    <span>{link.genre}</span>
                    <span>•</span>
                    <span>{formatDate(link.date_added)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="transition-opacity hover:bg-foreground/10"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10">
              <DialogHeader>
                <DialogTitle>Add to Combination</DialogTitle>
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
                <DialogTitle>Create New Combination</DialogTitle>
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

          <EditLinkDialog
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            link={link}
            genres={genres}
            onUpdate={() => onUpdate?.()}
          />
        </div>
      ) : (
        <div className="card-placeholder">
          <div className="aspect-video bg-gray-200 animate-pulse" />
          <div className="p-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
          </div>
        </div>
      )}
    </div>
  );
});

export default LinkCard; 