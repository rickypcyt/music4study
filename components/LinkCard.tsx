"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Spotify } from 'react-spotify-embed';
import LazyYouTubeEmbed from './embeds/LazyYouTubeEmbed';
import { extractYouTubeId } from './embeds/LazyYouTubeEmbed';
import { useEmbed } from '@/hooks/useEmbed';
import { useAuth } from '@/hooks/useAuth';
import EditLinkDialog from './EditLinkDialog';
import SoundCloudEmbed from './embeds/SoundCloudEmbed';
import { Input } from "@/components/ui/input";
import AddToCombination from './AddToCombination';

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
          <SoundCloudEmbed
            url={link.url}
            title={link.title || 'SoundCloud Track'}
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
    <Card ref={cardRef} className="flex flex-col h-full bg-background border-border">
      <CardContent className="flex-1 p-4">
        {/* Title */}
        <h3 className="text-lg font-medium text-foreground line-clamp-2">
          {link.title}
        </h3>

        {/* Genre, Date and Username */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {link.genre}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatDate(link.date_added)}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {link.username}
            </span>
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditModalOpen(true)}
                className="flex-shrink-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Embed Container */}
        <div className="relative w-full aspect-video mb-3 rounded-lg overflow-hidden">
          {isVisible && (
            <>
              {isYouTube && embedUrl && (
                <LazyYouTubeEmbed 
                  videoId={extractYouTubeId(link.url) || ''} 
                  title={link.title}
                />
              )}
              {isSpotify && embedUrl && (
                <Spotify link={embedUrl} />
              )}
              {isSoundCloud && embedUrl && (
                <SoundCloudEmbed 
                  url={embedUrl} 
                  title={link.title}
                />
              )}
            </>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full mt-auto"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add to Combination
        </Button>
      </CardContent>

      <AddToCombination
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        linkId={link.id}
        onSuccess={() => onUpdate?.()}
      />

      <EditLinkDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        link={link}
        genres={genres}
        onUpdate={() => onUpdate?.()}
      />
    </Card>
  );
});

export default LinkCard; 