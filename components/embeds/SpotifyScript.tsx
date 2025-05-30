'use client';

import Script from 'next/script';

export default function SpotifyScript() {
  return (
    <>
      <link 
        rel="preconnect" 
        href="https://open.spotify.com" 
        crossOrigin="anonymous"
      />
      <link 
        rel="dns-prefetch" 
        href="https://open.spotify.com" 
      />
      <Script 
        src="https://open.spotify.com/embed/iframe-api/v1" 
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Spotify API loaded');
        }}
        onError={(e) => {
          console.error('Error loading Spotify API:', e);
        }}
      />
    </>
  );
} 