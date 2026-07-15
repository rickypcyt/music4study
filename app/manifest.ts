import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Music4Study - Curated Music for Studying',
    short_name: 'Music4Study',
    description: 'Discover the perfect study music. Browse curated playlists, explore genres, and find the ideal soundtrack for your study sessions.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1814',
    theme_color: '#1a1814',
    icons: [
      {
        src: '/m4spng.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/m4spng.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    categories: ['music', 'education', 'productivity'],
  };
}
