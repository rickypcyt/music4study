'use client';

import { useEffect } from 'react';

interface ResourcePreloaderProps {
  fonts?: string[];
  domains?: string[];
}

export default function ResourcePreloader({ 
  fonts = [
    // Add critical fonts here if needed
    // Note: Geist fonts are handled by Next.js font optimization
  ],
  domains = [
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
    'https://i.ytimg.com',
    'https://fonts.gstatic.com',
    'https://open.spotify.com',
    'https://w.soundcloud.com'
  ]
}: ResourcePreloaderProps) {
  useEffect(() => {
    // Preconnect to critical domains
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // Preload critical fonts
    fonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = font;
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // Cleanup function
    return () => {
      document.querySelectorAll('link[rel="preconnect"], link[rel="preload"]').forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, [fonts, domains]);

  return null;
} 