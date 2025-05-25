'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import Script from 'next/script';

interface SoundCloudEmbedProps {
  url: string;
  title: string;
}

const SoundCloudEmbed = memo(function SoundCloudEmbed({ url, title }: SoundCloudEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const maxRetries = 3;

  // Validate and format SoundCloud URL
  const formatSoundCloudUrl = useCallback((url: string) => {
    try {
      // Remove any trailing slashes and clean the URL
      const cleanUrl = url.trim().replace(/\/$/, '');
      
      // Check if it's a valid SoundCloud URL
      if (!cleanUrl.includes('soundcloud.com')) {
        throw new Error('Invalid SoundCloud URL');
      }

      // Handle different SoundCloud URL formats
      let formattedUrl = cleanUrl;
      
      // If it's a track URL, ensure it's in the correct format
      if (cleanUrl.includes('/tracks/')) {
        // Extract the track ID if present
        const trackIdMatch = cleanUrl.match(/\/tracks\/(\d+)/);
        if (trackIdMatch) {
          formattedUrl = `https://soundcloud.com/tracks/${trackIdMatch[1]}`;
        }
      }
      // If it's a set/playlist URL, ensure it's in the correct format
      else if (cleanUrl.includes('/sets/')) {
        // Extract the set ID if present
        const setIdMatch = cleanUrl.match(/\/sets\/(\d+)/);
        if (setIdMatch) {
          formattedUrl = `https://soundcloud.com/sets/${setIdMatch[1]}`;
        }
      }
      // If it's a user URL, ensure it's in the correct format
      else if (cleanUrl.includes('/users/')) {
        const userMatch = cleanUrl.match(/\/users\/([^\/]+)/);
        if (userMatch) {
          formattedUrl = `https://soundcloud.com/users/${userMatch[1]}`;
        }
      }

      return formattedUrl;
    } catch (error) {
      console.error('Error formatting SoundCloud URL:', error);
      return null;
    }
  }, []);

  const formattedUrl = formatSoundCloudUrl(url);
  const embedUrl = formattedUrl 
    ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(formattedUrl)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`
    : null;

  useEffect(() => {
    // Reset states when URL changes
    setIsLoaded(false);
    setIsError(false);
    setRetryCount(0);
  }, [url]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setIsError(false);
  }, []);

  const handleError = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setIsError(false);
      // Force iframe reload
      const iframe = document.querySelector(`iframe[src*="${encodeURIComponent(url)}"]`) as HTMLIFrameElement;
      if (iframe) {
        iframe.src = embedUrl || '';
      }
    } else {
      setIsError(true);
    }
  }, [retryCount, url, embedUrl]);

  const handleScriptLoad = useCallback(() => {
    setIsScriptLoaded(true);
  }, []);

  const handleScriptError = useCallback(() => {
    console.error('Error loading SoundCloud API');
    handleError();
  }, [handleError]);

  if (!formattedUrl) {
    return (
      <div className="w-full aspect-[16/9] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-500 p-4">
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
        <h3 className="text-lg font-semibold mb-2">Invalid SoundCloud URL</h3>
        <p className="text-sm text-center mb-4">
          Please provide a valid SoundCloud track, set, or user URL.
        </p>
        <a
          href="https://soundcloud.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Visit SoundCloud
        </a>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full aspect-[16/9] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-500 p-4">
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
        <h3 className="text-lg font-semibold mb-2">Failed to load SoundCloud embed</h3>
        <p className="text-sm text-center mb-4">
          The track might be private or unavailable for embedding.
        </p>
        <a
          href={formattedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Listen on SoundCloud
        </a>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://w.soundcloud.com/player/api.js"
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
        onError={handleScriptError}
      />
      <div className="w-full aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden">
        {!isLoaded && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        )}
        <iframe
          src={embedUrl || ''}
          className="w-full h-full"
          scrolling="no"
          frameBorder="no"
          allow="autoplay"
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          title={title}
        />
      </div>
    </>
  );
});

export default SoundCloudEmbed; 