'use client';

import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';
import LazyYouTubeEmbed from '@/components/embeds/LazyYouTubeEmbed';
import { Skeleton } from '@/components/ui/skeleton';
import { embedManager } from '@/lib/embedManager';
import { extractYouTubeId } from '@/components/embeds/LazyYouTubeEmbed';

interface CachedEmbedProps {
  url: string;
  linkId: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export default function CachedEmbed({ 
  url, 
  linkId,
  className = '', 
  onLoad, 
  onError 
}: CachedEmbedProps) {
  const [embedData, setEmbedData] = useState<{ html: string; error?: boolean; thumbnailUrl?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const embedRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadEmbed = async () => {
      try {
        const data = await embedManager.getEmbed(url);
        if (mounted) {
          setEmbedData(data);
          setIsLoading(false);
          if (data.error) {
            onError?.();
          } else {
            onLoad?.();
          }
        }
      } catch (error) {
        console.error('Error loading embed:', error);
        if (mounted) {
          setEmbedData({ html: '', error: true });
          setIsLoading(false);
          onError?.();
        }
      }
    };

    // Set up intersection observer for lazy loading
    if ('IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              loadEmbed();
              observerRef.current?.disconnect();
            }
          });
        },
        { 
          rootMargin: '50px 0px',
          threshold: 0.1 
        }
      );

      if (embedRef.current) {
        observerRef.current.observe(embedRef.current);
      }
    } else {
      // Fallback for browsers that don't support IntersectionObserver
      loadEmbed();
    }

    return () => {
      mounted = false;
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [url, onLoad, onError]);

  const handleThumbnailClick = () => {
    setShowThumbnail(false);
  };

  if (isLoading) {
    return (
      <div ref={embedRef} className={`w-full aspect-video ${className}`}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (embedData?.error) {
    return (
      <div className={`w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-4"
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
          <p className="text-gray-600">Failed to load embed</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline mt-2 inline-block"
          >
            Open in new tab
          </a>
        </div>
      </div>
    );
  }

  if (showThumbnail && embedData?.thumbnailUrl) {
    return (
      <div 
        ref={embedRef}
        className={`w-full aspect-video relative cursor-pointer ${className}`}
        onClick={handleThumbnailClick}
      >
        <Image
          src={embedData.thumbnailUrl}
          alt="Video thumbnail"
          fill
          className="object-cover rounded-lg"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 hover:bg-opacity-30 transition-opacity">
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
    );
  }

  // For YouTube videos, use LazyYouTubeEmbed
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      return (
        <LazyYouTubeEmbed
          videoId={videoId}
          title={url}
          linkId={linkId}
          className={className}
        />
      );
    }
  }

  return (
    <div 
      ref={embedRef}
      className={`w-full aspect-video ${className}`}
      dangerouslySetInnerHTML={{ __html: embedData?.html || '' }}
    />
  );
} 