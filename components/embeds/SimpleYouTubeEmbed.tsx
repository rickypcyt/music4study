'use client';

import { useEffect, useRef, useState } from 'react';

interface SimpleYouTubeEmbedProps {
  videoId: string;
  title?: string;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
}

export default function SimpleYouTubeEmbed({ 
  videoId, 
  title = 'YouTube video',
  className = '',
  autoplay = false,
  muted = true,
  controls = true
}: SimpleYouTubeEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || isLoaded) return;

    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      mute: muted ? '1' : '0',
      controls: controls ? '1' : '0',
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      widget_referrer: typeof window !== 'undefined' ? window.location.href : '',
    });

    iframe.src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    iframe.onload = () => setIsLoaded(true);
    iframe.onerror = () => setError(true);
  }, [videoId, autoplay, muted, controls, isLoaded]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-4">
          <p className="text-gray-600 text-sm">Error loading video</p>
          <a 
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm underline mt-2 inline-block"
          >
            Watch on YouTube
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        title={title}
        className="w-full h-full border-0"
        style={{ minHeight: '200px' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
