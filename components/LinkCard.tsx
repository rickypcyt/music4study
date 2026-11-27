"use client";

import { Card, CardContent } from "@/components/ui/card";
import { memo, useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

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
  compact?: boolean; // Tarjeta más baja y sin autor (vista de combinaciones)
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



function LinkCard({ link, onRemoved, index, compact = false }: LinkCardProps) {
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

  const platform = isYouTube ? 'YouTube' : isSpotify ? 'Spotify' : isSoundCloud ? 'SoundCloud' : null;
  const hasTitle = Boolean(displayTitle && displayTitle.trim());

  return (
      <Card
        ref={cardRef}
        className={`group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card/60 ${
          isCurrentlyPlaying
            ? 'border-primary/70 shadow-[0_0_0_1px_hsl(var(--primary)/0.5),0_12px_32px_-12px_hsl(var(--primary)/0.45)]'
            : 'border-foreground/10'
        }`}
      >
        <CardContent className="flex flex-1 flex-col p-0">
          {platform ? (
            <div className="relative w-full overflow-hidden">
              <CachedEmbed
                url={link.url}
                linkId={link.id}
                initialTitle={link.title || ''}
                priority={index !== undefined && index < 8} // Priority for first 8 images (LCP)
                className="[&>div]:!rounded-none"
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
                  if (isYouTube) setYoutubeTitle(title);
                }}
              />
              {isCurrentlyPlaying && (
                <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                  <span aria-hidden className="flex h-3 items-end gap-[2px]">
                    <span className="m4s-eq-bar !w-[3px]" />
                    <span className="m4s-eq-bar !w-[3px] [animation-delay:-0.3s]" />
                    <span className="m4s-eq-bar !w-[3px] [animation-delay:-0.6s]" />
                  </span>
                  Now playing
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-foreground/5 text-foreground/50">
              Unsupported URL format
            </div>
          )}

          <div className={`flex flex-1 flex-col gap-3 ${compact ? 'p-3' : 'p-4'}`}>
            <div className="flex items-start gap-2">
              {hasTitle ? (
                <h3
                  title={displayTitle}
                  className={`line-clamp-2 flex-1 font-semibold leading-snug text-foreground ${compact ? 'text-base' : 'text-lg'}`}
                >
                  {displayTitle}
                </h3>
              ) : (
                // Título aún cargando: reserva su sitio para que la tarjeta no salte
                <div className="flex-1 space-y-2 pt-1" aria-hidden>
                  <div className="m4s-shimmer h-4 w-11/12 rounded" />
                  <div className="m4s-shimmer h-4 w-2/3 rounded" />
                </div>
              )}
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open on ${platform ?? 'source site'}`}
                title={`Open on ${platform ?? 'source site'}`}
                className="-mr-1 shrink-0 rounded-md p-1.5 text-foreground/40 transition-colors hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              {link.genre && (
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-medium text-primary">{link.genre}</span>
              )}
              {link.type && (
                <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-foreground/70">{link.type}</span>
              )}
            </div>

            <div className="mt-auto flex items-center gap-2 border-t border-foreground/10 pt-3 text-sm text-foreground/50">
              {!compact && link.username && (
                <>
                  <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold uppercase text-foreground/70">
                    {link.username.charAt(0)}
                  </span>
                  <span className="min-w-0 truncate text-foreground/70">{link.username}</span>
                  <span aria-hidden>·</span>
                </>
              )}
              <time dateTime={link.date_added} className="shrink-0">{formatDate(link.date_added)}</time>
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
    prevProps.link.date_added === nextProps.link.date_added &&
    prevProps.compact === nextProps.compact &&
    prevProps.index === nextProps.index &&
    prevProps.onRemoved === nextProps.onRemoved
  );
}); 