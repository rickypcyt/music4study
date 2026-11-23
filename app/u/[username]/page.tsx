import ExploreShell from '@/components/explore/ExploreShell';
import type { Metadata } from 'next';
import ProfileView from '@/components/explore/ProfileView';
import { getPublicProfile } from '@/lib/explore';
import { notFound } from 'next/navigation';

export const revalidate = 30;

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(decodeURIComponent(username));
  if (!profile) return { title: 'Library not found', robots: { index: false } };

  const genres = profile.topGenres.slice(0, 3).map((g) => g.name).join(', ');
  return {
    title: `@${profile.username}'s study music library`,
    description: `${profile.totals.tracks} study music tracks${genres ? ` (${genres})` : ''} and ${profile.totals.combinations} combinations by @${profile.username} on Music4Study.`,
    alternates: { canonical: `/u/${encodeURIComponent(profile.username)}` },
    // Un perfil sin tracks públicos no aporta contenido: que no se indexe
    robots: profile.totals.tracks > 0 ? undefined : { index: false, follow: true },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await getPublicProfile(decodeURIComponent(username));
  if (!profile) notFound();

  return (
    <ExploreShell>
      <ProfileView profile={profile} />
    </ExploreShell>
  );
}
