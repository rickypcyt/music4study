'use client';

import { useAudio } from '@/contexts/AudioContext';
import { useEffect, useRef, useState, useCallback } from 'react';

interface GlobalYouTubePlayerProps {
  ownerId?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function GlobalYouTubePlayer({ ownerId, className = '', style }: GlobalYouTubePlayerProps) {
  const { isPlaying, currentVideoId, volume, isMuted, iframeOwner } = useAudio();
  const [isLoaded, setIsLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentEmbedUrl, setCurrentEmbedUrl] = useState<string>('');

  // Solo mostrar el iframe si este componente es el owner o si no hay owner definido
  const shouldShowIframe = !iframeOwner || iframeOwner === ownerId;

  // Generate embed URL
  const generateEmbedUrl = useCallback((videoId: string) => {
    const autoplay = isPlaying ? '1' : '0';
    const mute = isMuted ? '1' : '0';
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay}&rel=0&modestbranding=1&enablejsapi=1&playsinline=1&mute=${mute}`;
  }, [isPlaying, isMuted]);

  // Load/unload iframe based on playback state
  useEffect(() => {
    if (isPlaying && currentVideoId && !isLoaded) {
      setIsLoaded(true);
      setCurrentEmbedUrl(generateEmbedUrl(currentVideoId));
    } else if (!isPlaying && isLoaded) {
      setIsLoaded(false);
    } else if (isPlaying && currentVideoId && isLoaded && currentEmbedUrl !== generateEmbedUrl(currentVideoId)) {
      // Video changed, update URL
      setCurrentEmbedUrl(generateEmbedUrl(currentVideoId));
    }
  }, [isPlaying, currentVideoId, isLoaded, generateEmbedUrl, currentEmbedUrl]);

  // Handle volume and mute changes by updating the iframe src
  useEffect(() => {
    if (isPlaying && currentVideoId && isLoaded) {
      const newUrl = generateEmbedUrl(currentVideoId);
      if (newUrl !== currentEmbedUrl) {
        setCurrentEmbedUrl(newUrl);
      }
    }
  }, [volume, isMuted, isPlaying, currentVideoId, isLoaded, generateEmbedUrl, currentEmbedUrl]);

  if (!isLoaded || !currentVideoId || !shouldShowIframe) {
    return null;
  }

  return (
    <iframe
      ref={iframeRef}
      className={className}
      style={style}
      src={currentEmbedUrl}
      title="YouTube Music Player"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      sandbox="allow-scripts allow-same-origin allow-presentation"
      onLoad={() => {
        // Handle iframe load if needed
      }}
      onError={() => {
        console.warn('YouTube player iframe failed to load');
        setIsLoaded(false);
      }}
    />
  );
}