'use client';

import { checkVideoAvailability, removeUnavailableVideo } from '@/lib/videoAvailability';
import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';
import { useAudio } from '@/contexts/AudioContext';
import { useIframeTarget } from '@/contexts/IframeTargetContext';
import { youtubeCache } from '@/lib/youtubeCache';

interface LazyYouTubeEmbedProps {
  videoId: string;
  title: string;
  linkId: string;
  className?: string;
  thumbnailQuality?: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault';
  onUnavailable?: () => void;
  onTitleFetched?: (title: string, channelTitle?: string) => void;
  priority?: boolean; // For LCP images above the fold
}

interface VideoInfo {
  title: string;
  channelTitle: string;
}

export default function LazyYouTubeEmbed({ 
  videoId, 
  title: initialTitle,
  linkId,
  className = '',
  thumbnailQuality = 'hqdefault',
  onUnavailable,
  onTitleFetched,
  priority = false
}: LazyYouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isThumbnailLoaded, setIsThumbnailLoaded] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  
  const { isPlaying, currentVideoId, playVideo, iframeOwner, setIframeOwner } = useAudio();
  const { registerTarget, unregisterTarget } = useIframeTarget();
  const shouldPlay = Boolean(isPlaying && currentVideoId && currentVideoId === videoId);
  const isOwner = iframeOwner === linkId;
  const isOwnerRef = useRef(false);
  const slotRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync so cleanup on unmount knows if we owned the iframe
  useEffect(() => {
    isOwnerRef.current = isOwner;
  }, [isOwner]);

  // Al desmontar (ej. al cambiar de página), liberar posesión; el iframe único
  // sigue en el DOM (portaled al slot global) y no se pausa
  useEffect(() => {
    return () => {
      if (isOwnerRef.current) {
        setIframeOwner(null);
      }
    };
  }, [setIframeOwner]);

  // Registrar este slot para que el iframe único se portal aquí cuando somos owner
  useEffect(() => {
    if (!isLoaded) return;
    const el = slotRef.current;
    if (el) registerTarget(linkId, el);
    return () => unregisterTarget(linkId);
  }, [isLoaded, linkId, registerTarget, unregisterTarget]);
  
  // Reset state when linkId changes (new page or different video)
  // But don't reset isLoaded if this video should be playing
  useEffect(() => {
    if (!shouldPlay) {
      setIsLoaded(false);
      // Liberar posesión si este componente la tenía
      if (isOwner) {
        setIframeOwner(null);
      }
    } else if (shouldPlay && !isOwner) {
      // Tomar posesión del iframe si este video debería reproducirse
      setIframeOwner(linkId);
      setIsLoaded(true);
    }
    setIsBlocked(false);
    setLoadError(false);
    setVideoInfo(null);
    setIsThumbnailLoaded(false);
  }, [linkId, shouldPlay, isOwner, setIframeOwner]);
  
  // Use videoInfo title if available, otherwise use initialTitle (from link data)
  // Filter out URLs - if initialTitle is a URL, don't use it as display title
  const isValidTitle = (title: string | undefined): boolean => {
    if (!title || !title.trim()) return false;
    // Don't use URL as title
    if (title.includes('youtube.com') || title.includes('youtu.be') || title.startsWith('http')) {
      return false;
    }
    return true;
  };
  
  const displayTitle = videoInfo?.title || (isValidTitle(initialTitle) ? initialTitle : '');
  
  // Debug in development
  if (process.env.NODE_ENV === 'development') {
    if (!displayTitle) {
      console.log('LazyYouTubeEmbed: No title available', { videoId, initialTitle, videoInfo, displayTitle });
    }
  }
  const [thumbnailError, setThumbnailError] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(`https://i.ytimg.com/vi/${videoId}/${thumbnailQuality}.jpg`);
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const handleThumbnailError = () => {
    console.warn(`No se pudo cargar la miniatura para el video ${videoId}`);
    setThumbnailError(true);
    // Intenta con una calidad de miniatura diferente como respaldo
    if (thumbnailQuality !== 'default') {
      setThumbnailUrl(`https://i.ytimg.com/vi/${videoId}/default.jpg`);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Fetch video info immediately on mount (don't wait for availability check)
    const fetchVideoInfo = async () => {
      // Check cache first
      const cached = youtubeCache.get(videoId);
      if (cached) {
        if (isMounted) {
          setVideoInfo({
            title: cached.title,
            channelTitle: cached.channelTitle || ''
          });
          if (onTitleFetched) {
            onTitleFetched(cached.title, cached.channelTitle);
          }
        }
        return;
      }

      // Check if there's already a pending request for this video (deduplication)
      const pendingRequest = youtubeCache.getPendingRequest(videoId);
      if (pendingRequest) {
        try {
          const cached = await pendingRequest;
          if (isMounted && cached) {
            setVideoInfo({
              title: cached.title,
              channelTitle: cached.channelTitle || ''
            });
            if (onTitleFetched) {
              onTitleFetched(cached.title, cached.channelTitle);
            }
          }
        } catch {
          // If pending request fails, continue to make new request
        }
        return;
      }

      // Create new fetch request
      const fetchPromise = (async () => {
        try {
          const response = await fetch(`/api/youtube-info?videoId=${videoId}`);
          if (!response.ok) {
            // Silently fail if API is not configured or unavailable
            if (response.status === 500) {
              return null;
            }
            // For other errors, log in development only
            if (process.env.NODE_ENV === 'development') {
              const errorData = await response.json().catch(() => null);
              if (errorData?.error) {
                console.warn('YouTube API:', errorData.error);
              }
            }
            return null;
          }
          const data = await response.json();
          if (data.title) {
            // Cache the result
            youtubeCache.set(videoId, data.title, data.channelTitle || '');
            return {
              title: data.title,
              channelTitle: data.channelTitle || '',
              cachedAt: Date.now()
            };
          }
          return null;
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error fetching video info:', err instanceof Error ? err.message : 'Unknown error');
          }
          return null;
        }
      })();

      // Register pending request for deduplication
      youtubeCache.setPendingRequest(videoId, fetchPromise);

      // Wait for result and update state
      const result = await fetchPromise;
      if (isMounted && result) {
        setVideoInfo({
          title: result.title,
          channelTitle: result.channelTitle || ''
        });
        if (onTitleFetched) {
          onTitleFetched(result.title, result.channelTitle);
        }
      }
    };

    // Start fetching video info immediately
    fetchVideoInfo();

    // Check availability in parallel
    const checkAvailability = async () => {
      try {
        const { isAvailable } = await checkVideoAvailability(videoId);
        if (!isMounted) return;
        
        if (!isAvailable) {
          // Mark as load error (will show "Video Unavailable")
          setLoadError(true);
          await removeUnavailableVideo(linkId);
          onUnavailable?.();
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error checking video availability:', err instanceof Error ? err.message : 'Unknown error');
          setLoadError(true);
        }
      }
    };

    checkAvailability();

    return () => {
      isMounted = false;
    };
  }, [videoId, linkId, onUnavailable, onTitleFetched]);

  // Sincronizar la visibilidad del iframe con la posesión
  useEffect(() => {
    if (isOwner && shouldPlay && !isLoaded) {
      setIsLoaded(true);
    } else if ((!isOwner || !shouldPlay) && isLoaded) {
      setIsLoaded(false);
    }
  }, [isOwner, shouldPlay, isLoaded]);

  // Persist last played timestamp per linkId in localStorage
  const recordLastPlayed = () => {
    try {
      const key = 'm4s_last_played';
      const raw = localStorage.getItem(key);
      const map: Record<string, string> = raw ? JSON.parse(raw) : {};
      map[linkId] = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(map));
    } catch {}
  };

  if (isBlocked || loadError) {
    return (
      <div className={`relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <div className="mb-4">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {isBlocked ? 'Content Blocked' : 'Video Unavailable'}
          </h3>
          <p className="text-gray-600 mb-4">
            {isBlocked 
              ? 'YouTube embeds are blocked by your browser.'
              : 'This video cannot be embedded. You can still watch it on YouTube.'}
          </p>
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
            </svg>
            Watch on YouTube
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
      {!isLoaded ? (
        <div
          className="relative w-full h-full cursor-pointer group"
          onClick={(e) => {
            e.preventDefault();
            recordLastPlayed();
            // Tomar posesión del iframe y comenzar reproducción
            setIframeOwner(linkId);
            playVideo(videoId);
            setIsLoaded(true);
          }}
        >
            {!isThumbnailLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
          )}

          {!thumbnailError ? (
            <Image
              src={thumbnailUrl}
              alt={videoInfo?.title || initialTitle || 'Miniatura del video'}
              className={`w-full h-full object-cover ${isThumbnailLoaded ? 'opacity-100' : 'opacity-0'}`}
              width={480}
              height={360}
              priority={priority}
              loading={priority ? undefined : "lazy"}
              onLoadingComplete={() => setIsThumbnailLoaded(true)}
              onError={handleThumbnailError}
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Miniatura no disponible</span>
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                shouldPlay
                  ? 'bg-red-600 bg-opacity-90 border-2 border-red-400'
                  : 'bg-black bg-opacity-70'
              }`}>
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                {shouldPlay && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              {shouldPlay && (
                <div className="bg-black bg-opacity-70 px-3 py-1 rounded-full text-white text-xs font-medium">
                  Reproduciendo en background
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Slot: el iframe único (en ClientProvider) se portal aquí cuando somos owner
        <div ref={slotRef} className="absolute inset-0 w-full h-full" />
      )}
      </div>
    </div>
  );
}

// Utility function to extract YouTube video ID from various URL formats
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
} 