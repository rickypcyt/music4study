import CombinationView from '@/components/explore/CombinationView';
import ExploreShell from '@/components/explore/ExploreShell';
import type { Metadata } from 'next';
import { getPublicCombination } from '@/lib/explore';
import { notFound } from 'next/navigation';

export const revalidate = 30;

interface Props {
  params: Promise<{ id: string }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const combo = UUID.test(id) ? await getPublicCombination(id) : null;
  if (!combo) return { title: 'Combination not found', robots: { index: false } };
  return {
    title: `${combo.name}: a study music combination by @${combo.owner}`,
    description: `${combo.tracks.length} study music tracks combined by @${combo.owner}. Play them together on Music4Study.`,
    alternates: { canonical: `/combinations/${combo.id}` },
  };
}

export default async function CombinationPage({ params }: Props) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const combo = await getPublicCombination(id);
  if (!combo) notFound();

  return (
    <ExploreShell>
      <CombinationView combination={combo} />
    </ExploreShell>
  );
}
