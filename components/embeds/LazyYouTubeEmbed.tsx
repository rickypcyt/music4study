'use client';

import { checkVideoAvailability, removeUnavailableVideo } from '@/lib/videoAvailability';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LazyYouTubeEmbedProps {
  videoId: string;
  title: string;
  linkId: string;
  className?: string;
  thumbnailQuality?: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault';
  onUnavailable?: () => void;
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
  onUnavailable
}: LazyYouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isThumbnailLoaded, setIsThumbnailLoaded] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(`https://i.ytimg.com/vi/${videoId}/${thumbnailQuality}.jpg`);
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;

  const handleThumbnailError = () => {
    console.warn(`No se pudo cargar la miniatura para el video ${videoId}`);
    setThumbnailError(true);
    // Intenta con una calidad de miniatura diferente como respaldo
    if (thumbnailQuality !== 'default') {
      setThumbnailUrl(`https://i.ytimg.com/vi/${videoId}/default.jpg`);
    }
  };

  useEffect(() => {
    const fetchVideoInfo = async () => {
      try {
        const response = await fetch(`/api/youtube-info?videoId=${videoId}`);
        if (!response.ok) throw new Error('Failed to fetch video info');
        const data = await response.json();
        setVideoInfo(data);
      } catch (err) {
        console.error('Error fetching video info:', err instanceof Error ? err.message : 'Unknown error');
        // Fallback to initial title if fetch fails
        setVideoInfo({ title: initialTitle, channelTitle: '' });
      }
    };

    const checkAvailability = async () => {
      try {
        const { isAvailable } = await checkVideoAvailability(videoId);
        if (!isAvailable) {
          // Mark as load error (will show "Video Unavailable")
          setLoadError(true);
          await removeUnavailableVideo(linkId);
          onUnavailable?.();
        } else {
          // Only fetch video info if the video is available
          fetchVideoInfo();
        }
      } catch (err) {
        console.error('Error checking video availability:', err instanceof Error ? err.message : 'Unknown error');
        setLoadError(true);
      }
    };

    checkAvailability();
  }, [videoId, linkId, initialTitle, onUnavailable]);

  const handleIframeError = () => {
    setIsBlocked(true);
    setLoadError(true);
  };

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
    <div className={`relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      {!isLoaded ? (
        <div 
          className="relative w-full h-full cursor-pointer group"
          onClick={(e) => {
            e.preventDefault();
            recordLastPlayed();
            setIsLoaded(true);
            // Forzar el enfoque en el iframe después de que se monte
            setTimeout(() => {
              const iframe = document.querySelector<HTMLIFrameElement>(`iframe[src*="${videoId}"]`);
              if (iframe) {
                iframe.focus();
              }
            }, 100);
          }}
        >
            {!isThumbnailLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
          )}

          {!thumbnailError ? (
            <Image
              src={thumbnailUrl}
              alt={initialTitle || 'Miniatura del video'}
              className={`w-full h-full object-cover ${isThumbnailLoaded ? 'opacity-100' : 'opacity-0'}`}
              width={480}
              height={360}
              loading="lazy"
              onLoadingComplete={() => setIsThumbnailLoaded(true)}
              onError={handleThumbnailError}
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Miniatura no disponible</span>
            </div>
          )}

          {/* Video info overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-white text-lg font-semibold line-clamp-2">
                {videoInfo?.title || initialTitle}
              </h3>
              {videoInfo?.channelTitle && (
                <p className="text-white/80 text-sm mt-1">
                  {videoInfo.channelTitle}
                </p>
              )}
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-black bg-opacity-70 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      ) : (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={embedUrl}
          title={videoInfo?.title || initialTitle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={handleIframeError}
          loading="lazy"
        />
      )}
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