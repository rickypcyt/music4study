'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface LazyYouTubeEmbedProps {
  videoId: string;
  title: string;
  thumbnailQuality?: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault';
}

export default function LazyYouTubeEmbed({ 
  videoId, 
  title,
  thumbnailQuality = 'hqdefault' 
}: LazyYouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/${thumbnailQuality}.jpg`;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;

  useEffect(() => {
    if (!isLoaded) return;

    const checkEmbed = async () => {
      try {
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (!response.ok) {
          setLoadError(true);
        }
      } catch (error) {
        console.error('Error checking video availability:', error);
        setLoadError(true);
      }
    };

    checkEmbed();
  }, [isLoaded, videoId]);

  const handleIframeError = () => {
    setIsBlocked(true);
    setLoadError(true);
  };

  if (isBlocked || loadError) {
    return (
      <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
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
    <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
      {!isLoaded ? (
        <div 
          className="relative w-full h-full cursor-pointer"
          onClick={() => setIsLoaded(true)}
        >
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-black bg-opacity-70 rounded-full flex items-center justify-center">
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
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={handleIframeError}
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