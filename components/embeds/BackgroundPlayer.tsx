'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';

// Declare YouTube API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface BackgroundPlayerProps {
  className?: string;
}

export default function BackgroundPlayer({ className = '' }: BackgroundPlayerProps) {
  const { currentPlayingInfo } = useVideoPlayer();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Mark as client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.YT) {
      window.onYouTubeIframeAPIReady = () => {
        setIsApiReady(true);
      };

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    } else if (window.YT) {
      setIsApiReady(true);
    }
  }, []);

  // Initialize player when iframe is ready and we have a video
  useEffect(() => {
    if (iframeRef.current && isApiReady && currentPlayingInfo && !playerRef.current) {
      playerRef.current = new window.YT.Player(iframeRef.current, {
        events: {
          onReady: () => {
            // Play immediately when ready
            if (playerRef.current && playerRef.current.playVideo) {
              playerRef.current.playVideo();
            }
          },
          onStateChange: (event: any) => {
            // Handle state changes if needed
          },
          onError: (error: any) => {
            console.error('BackgroundPlayer: YouTube player error', error);
          }
        }
      });
    }

    return () => {
      // Don't destroy player on unmount to maintain playback
    };
  }, [isApiReady, currentPlayingInfo]);

  // Only render on client and if we have a video to play
  if (!isClient ||
      !currentPlayingInfo ||
      !currentPlayingInfo.videoId ||
      !currentPlayingInfo.url ||
      typeof currentPlayingInfo.videoId !== 'string' ||
      typeof currentPlayingInfo.url !== 'string' ||
      (!currentPlayingInfo.url.includes('youtube.com') && !currentPlayingInfo.url.includes('youtu.be'))) {
    return null;
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${currentPlayingInfo.videoId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;

  return (
    <div className={`fixed top-[-10000px] left-[-10000px] w-[400px] h-[225px] pointer-events-none z-[-1] ${className}`}>
      <iframe
        ref={iframeRef}
        className="w-full h-full"
        src={embedUrl}
        title={`Background playback: ${currentPlayingInfo.title}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}