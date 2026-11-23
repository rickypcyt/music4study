import ExploreShell from '@/components/explore/ExploreShell';
import ExploreView from '@/components/explore/ExploreView';
import type { Metadata } from 'next';
import { getExploreData } from '@/lib/explore';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Explore study music libraries and playlists',
  description:
    'Browse the study music libraries and combinations other students have built. Open a library to play lo-fi, ambient, classical and jazz tracks from YouTube, Spotify and SoundCloud.',
  alternates: { canonical: '/explore' },
};

export default async function ExplorePage() {
  const data = await getExploreData();
  return (
    <ExploreShell>
      <ExploreView data={data} />
    </ExploreShell>
  );
}
