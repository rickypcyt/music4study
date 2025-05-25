'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const LoadingFallback = () => (
  <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
);

// Dynamically import heavy components
export const DynamicTagCloud = dynamic(
  () => import('react-tagcloud'),
  {
    ssr: false,
    loading: () => <LoadingFallback />,
  }
);

export const DynamicBubbleUI = dynamic(
  () => import('react-bubble-ui'),
  {
    ssr: false,
    loading: () => <LoadingFallback />,
  }
);

// Add more dynamic imports as needed
export const DynamicSpotifyEmbed = dynamic(
  () => import('react-spotify-embed').then((mod) => mod.Spotify),
  {
    ssr: false,
    loading: () => <LoadingFallback />,
  }
);

// Add more dynamic imports for heavy components
export const DynamicGenreCloud = dynamic(
  () => import('@/components/ui/GenreCloud'),
  {
    ssr: false,
    loading: () => <LoadingFallback />,
  }
);

export const DynamicSubmitForm = dynamic(
  () => import('@/app/submit/SubmitForm'),
  {
    ssr: false,
    loading: () => <LoadingFallback />,
  }
);

export const DynamicUsernameDialog = dynamic(
  () => import('@/components/UsernameDialog'),
  {
    ssr: false,
    loading: () => <LoadingFallback />,
  }
);

export const DynamicLinkCard = dynamic(
  () => import('@/components/LinkCard'),
  {
    ssr: false,
    loading: () => <LoadingFallback />,
  }
);

// Utility function for lazy loading images
export const lazyLoadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve();
    img.onerror = reject;
  });
}; 