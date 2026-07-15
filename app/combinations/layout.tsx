import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Study Music Combinations - Custom Playlists',
  description: 'Create and explore custom study music combinations. Mix genres like Lo-Fi, Ambient, Classical, and Jazz to build your perfect study playlist.',
  openGraph: {
    title: 'Study Music Combinations - Music4Study',
    description: 'Create and explore custom study music combinations. Mix genres to build your perfect study playlist.',
  },
};

export default function CombinationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
