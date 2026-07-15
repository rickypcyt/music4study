import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Study Music Genres - Lo-Fi, Ambient, Classical & More',
  description: 'Discover study music by genre. Explore Lo-Fi beats, Ambient soundscapes, Classical pieces, Jazz, Piano, Nature sounds, and more to find your perfect study soundtrack.',
  openGraph: {
    title: 'Explore Study Music Genres - Music4Study',
    description: 'Discover study music by genre. Explore Lo-Fi, Ambient, Classical, Jazz, Piano, Nature sounds, and more.',
  },
};

export default function GenresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
