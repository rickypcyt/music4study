"use client";

import { Card, CardContent } from "@/components/ui/card";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import CachedEmbed from './embeds/CachedEmbed';
import { extractYouTubeId } from "./embeds/LazyYouTubeEmbed";
import { fetchAndStoreTitle } from "@/lib/fetchAndStoreTitles";
import { useAudio } from "@/contexts/AudioContext";
import { useToast } from "@/components/hooks/use-toast";

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

// Función para formatear la fecha
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Check if title is valid (not a URL)
const isValidTitle = (title: string | undefined | null): boolean => {
  if (!title || !title.trim()) return false;
  if (title.includes('youtube.com') || title.includes('youtu.be') || title.startsWith('http')) {
    return false;
  }
  return true;
};



function LinkCard({ link, onRemoved, index }: LinkCardProps) {
  const [youtubeTitle, setYoutubeTitle] = useState<string | null>(null);
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const { isPlaying, currentVideoId } = useAudio();

  // Fallback: fetch title for YouTube videos if batch fetch failed
  useEffect(() => {
    let cancelled = false;
    const isYouTube = link.url.includes('youtube.com') || link.url.includes('youtu.be');

    if (link.titleConfirmedAt) {
      const confirmedAge = Date.now() - new Date(link.titleConfirmedAt).getTime();
      const ONE_HOUR = 60 * 60 * 1000;
      if (confirmedAge < ONE_HOUR) return;
    }

    const needsTitleFetch = !isValidTitle(link.title) && !youtubeTitle;

    if (isYouTube && needsTitleFetch) {
      const timeoutId = setTimeout(() => {
        if (!cancelled) {
          fetchAndStoreTitle(link).then((fetchedTitle) => {
            if (!cancelled && fetchedTitle) {
              setYoutubeTitle(fetchedTitle);
            }
          }).catch(() => {});
        }
      }, 2000); // 2s delay to let batch fetch try first

      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }
  }, [link, youtubeTitle]);

  const isSpotify = link.url.includes('spotify.com');
  const isYouTube = link.url.includes('youtube.com') || link.url.includes('youtu.be');
  const isSoundCloud = link.url.includes('soundcloud.com');
  
  // Determine display title: prefer link.title if valid, otherwise youtubeTitle as fallback
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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