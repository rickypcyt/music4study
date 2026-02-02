'use client';

import '@/lib/suppressConsoleWarnings';

import { checkVideoAvailability, removeUnavailableVideo } from '@/lib/videoAvailability';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import Image from 'next/image';
import { useAudio } from '@/contexts/AudioContext';
import { useIframeTarget } from '@/contexts/IframeTargetContext';
import { youtubeCache } from '@/lib/youtubeCache';

// Extend window interface for debug logging
declare global {
  interface Window {
    __youtubeTitleLogged?: Set<string>;
  }
}

interface LazyYouTubeEmbedProps {
  videoId: string;
  title: string;
  linkId: string;
  className?: string;
  thumbnailQuality?: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault';
  onUnavailable?: () => void;
  onTitleFetched?: (title: string, channelTitle?: string) => void;
  onVideoClick?: () => void;
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
  onVideoClick,
  priority = false
}: LazyYouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isThumbnailLoaded, setIsThumbnailLoaded] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const { isPlaying, currentVideoId, iframeOwner, setIframeOwner, relocatePlayerToGlobal } = useAudio();
  const { registerTarget, unregisterTarget } = useIframeTarget();
  const instanceId = useId();
  /** Clave única por instancia: evita que el video de una card aparezca en otra cuando hay linkId duplicado */
  const slotKey = `${linkId}-${instanceId}`;
  const shouldPlay = Boolean(isPlaying && currentVideoId && currentVideoId === videoId);
  const isOwner = iframeOwner === slotKey;
  const isOwnerRef = useRef(false);
  const slotRef = useRef<HTMLDivElement>(null);
  /** En el primer click mostramos el slot de inmediato sin esperar a que el contexto ponga isOwner */
  const justClaimedOwnerRef = useRef(false);

  // Keep ref in sync so cleanup on unmount knows if we owned the iframe
  useEffect(() => {
    isOwnerRef.current = isOwner;
  }, [isOwner]);

  // Limpiar "just claimed" cuando el contexto ya nos tiene como owner
  useEffect(() => {
    if (isOwner) justClaimedOwnerRef.current = false;
  }, [isOwner]);

  // Al desmontar (ej. al cambiar de página), mover el player al slot global de forma síncrona
  // y luego liberar posesión; así el reproductor no se pierde cuando React quite el DOM de la card.
  useEffect(() => {
    return () => {
      if (isOwnerRef.current) {
        relocatePlayerToGlobal();
        setIframeOwner(null);
      }
    };
  }, [relocatePlayerToGlobal, setIframeOwner]);

  // Registrar el slot con clave única por instancia (evita video en card equivocada si hay linkId duplicado)
  useLayoutEffect(() => {
    const showingSlot = isLoaded && (isOwner || justClaimedOwnerRef.current);
    if (!showingSlot) return;
    const el = slotRef.current;
    if (el) registerTarget(slotKey, el);
    return () => unregisterTarget(slotKey);
  }, [isLoaded, isOwner, slotKey, registerTarget, unregisterTarget]);
  
  // Load iframe when showPlayer is true
  useEffect(() => {
    if (!showPlayer || !iframeRef.current) return;

    const params = new URLSearchParams({
      autoplay: '1',
      mute: '0',
      controls: '1',
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      widget_referrer: typeof window !== 'undefined' ? window.location.href : '',
    });

    iframeRef.current.src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }, [showPlayer, videoId]);

  // Reset state when linkId changes (new page or different video)
  // No resetear isLoaded si acabamos de hacer click (justClaimedOwnerRef) para que el embed muestre el video de inmediato.
  useEffect(() => {
    if (!shouldPlay) {
      if (!justClaimedOwnerRef.current) {
        setIsLoaded(false);
        setShowPlayer(false);
      }
      if (isOwner) setIframeOwner(null);
    }
    setVideoInfo(null);
    setIsThumbnailLoaded(false);
    // Reset thumbnail state when video changes
    setThumbnailError(false);
    setCurrentThumbnailAttempt(0);
    setThumbnailUrl(`https://i.ytimg.com/vi/${videoId}/${thumbnailQuality}.jpg`);
  }, [linkId, shouldPlay, isOwner, setIframeOwner, videoId, thumbnailQuality]);
  
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
  
  // Debug in development - only log if we actually have missing data
  if (process.env.NODE_ENV === 'development' && !displayTitle && videoId) {
    // Only log once per videoId to reduce spam
    if (!window.__youtubeTitleLogged?.has(videoId)) {
      window.__youtubeTitleLogged = window.__youtubeTitleLogged || new Set();
      window.__youtubeTitleLogged.add(videoId);
      console.log('LazyYouTubeEmbed: No title available', { videoId, initialTitle, videoInfo, displayTitle });
    }
  }
  const [thumbnailError, setThumbnailError] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(`https://i.ytimg.com/vi/${videoId}/${thumbnailQuality}.jpg`);
  const [currentThumbnailAttempt, setCurrentThumbnailAttempt] = useState(0);

  const thumbnailFallbacks = [
    `${thumbnailQuality}.jpg`, // Original quality
    'mqdefault.jpg',          // Medium quality
    'default.jpg',            // Default quality
    '0.jpg',                  // 480x360
    '1.jpg',                  // 120x90
    '2.jpg',                  // 120x90
    '3.jpg',                  // 120x90
  ];

  const handleThumbnailError = () => {
    console.warn(`No se pudo cargar la miniatura para el video ${videoId} (attempt ${currentThumbnailAttempt})`);
    
    const nextAttempt = currentThumbnailAttempt + 1;
    if (nextAttempt < thumbnailFallbacks.length) {
      setCurrentThumbnailAttempt(nextAttempt);
      setThumbnailUrl(`https://i.ytimg.com/vi/${videoId}/${thumbnailFallbacks[nextAttempt]}`);
    } else {
      // Si todas las miniaturas fallan, marca como error
      setThumbnailError(true);
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
          await removeUnavailableVideo(linkId);
          onUnavailable?.();
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error checking video availability:', err instanceof Error ? err.message : 'Unknown error');
        }
      }
    };

    checkAvailability();

    return () => {
      isMounted = false;
    };
  }, [videoId, linkId, onUnavailable, onTitleFetched]);

  // Slot cuando somos owner o recién clickeamos (un solo click para empezar)
  const showSlot = isLoaded && (isOwner || justClaimedOwnerRef.current);

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
      {showPlayer ? (
        // Mostrar el iframe de YouTube directamente
        <iframe
          ref={iframeRef}
          title={displayTitle || 'YouTube video'}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      ) : !showSlot ? (
        <div
          className="relative w-full h-full cursor-pointer group"
          onClick={(e) => {
            e.preventDefault();
            if (onVideoClick) {
              onVideoClick();
            } else {
              // Mostrar el reproductor de YouTube con iframe
              setShowPlayer(true);
            }
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
              onLoad={() => setIsThumbnailLoaded(true)}
              onError={handleThumbnailError}
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <span className="text-gray-400 text-sm">Miniatura no disponible</span>
                <p className="text-gray-500 text-xs mt-1">Video ID: {videoId}</p>
              </div>
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
        // Slot: el iframe único se portal aquí solo cuando somos owner (click en esta card)
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
