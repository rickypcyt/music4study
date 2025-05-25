'use client';

import { useState, useEffect, memo } from 'react';
import Script from 'next/script';

interface SoundCloudEmbedProps {
  url: string;
  title: string;
}

const SoundCloudEmbed = memo(function SoundCloudEmbed({ url, title }: SoundCloudEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;

  useEffect(() => {
    // Reset states when URL changes
    setIsLoaded(false);
    setIsError(false);
  }, [url]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setIsError(true);
  };

  if (isError) {
    return (
      <div className="w-full aspect-[16/9] bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
        Failed to load SoundCloud embed
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://w.soundcloud.com/player/api.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('SoundCloud API loaded');
        }}
        onError={(e) => {
          console.error('Error loading SoundCloud API:', e);
          handleError();
        }}
      />
      <div className="w-full aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
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