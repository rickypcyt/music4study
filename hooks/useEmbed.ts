import { useState, useEffect, useCallback } from 'react';
import { cache } from '@/lib/cache';

interface UseEmbedOptions {
  url: string;
  type: 'youtube' | 'spotify' | 'soundcloud';
  ttl?: number;
}

interface UseEmbedResult {
  embedUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  thumbnailUrl?: string;
}

export function useEmbed({ url, type, ttl = 1000 * 60 * 60 }: UseEmbedOptions): UseEmbedResult {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>();

  const getYouTubeEmbedUrl = useCallback((url: string): string => {
    const videoId = url.includes('youtu.be') 
      ? url.split('/').pop() 
      : new URL(url).searchParams.get('v');
    return `https://www.youtube.com/embed/${videoId}`;
  }, []);

  const getSpotifyEmbedUrl = useCallback((url: string): string => {
    const parts = url.split('/');
    const type = parts[parts.length - 2];
    const id = parts[parts.length - 1].split('?')[0];
    return `https://open.spotify.com/embed/${type}/${id}`;
  }, []);

  const getSoundCloudEmbedUrl = useCallback((url: string): string => {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
  }, []);

  const getYouTubeThumbnail = useCallback((url: string): string => {
    const videoId = url.includes('youtu.be') 
      ? url.split('/').pop() 
      : new URL(url).searchParams.get('v');
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }, []);

  useEffect(() => {
    const fetchEmbed = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check cache first
        const cachedUrl = cache.getEmbed(url);
        if (cachedUrl) {
          setEmbedUrl(cachedUrl);
          setIsLoading(false);
          return;
        }

        let finalUrl: string;

        switch (type) {
          case 'youtube':
            finalUrl = getYouTubeEmbedUrl(url);
            setThumbnailUrl(getYouTubeThumbnail(url));
            break;
          case 'spotify':
            finalUrl = getSpotifyEmbedUrl(url);
            break;
          case 'soundcloud':
            finalUrl = getSoundCloudEmbedUrl(url);
            break;
          default:
            throw new Error(`Unsupported embed type: ${type}`);
        }

        // Cache the result
        cache.setEmbed(url, finalUrl, ttl);
        setEmbedUrl(finalUrl);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load embed'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmbed();
  }, [url, type, ttl, getYouTubeEmbedUrl, getSpotifyEmbedUrl, getSoundCloudEmbedUrl, getYouTubeThumbnail]);

  return {
    embedUrl,
    isLoading,
    error,
    thumbnailUrl,
  };
} 