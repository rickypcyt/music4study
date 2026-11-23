'use client';

import Link from 'next/link';
import LinkCard from '@/components/LinkCard';
import type { PublicCombinationPage } from '@/lib/explore';
import SimpleGrid from '@/components/ui/SimpleGrid';

/** Una combinación pública: sus tracks, para escucharlos juntos. */
export default function CombinationView({ combination }: { combination: PublicCombinationPage }) {
  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-base text-foreground/60">
        <Link href="/explore" className="hover:text-foreground">Explore</Link> <span aria-hidden="true">/</span>{' '}
        <Link href={`/u/${encodeURIComponent(combination.owner)}`} className="hover:text-foreground">@{combination.owner}</Link>{' '}
        <span aria-hidden="true">/</span> <span className="text-foreground/80">{combination.name}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">{combination.name}</h1>
        <p className="text-lg text-foreground/70">
          A combination by{' '}
          <Link href={`/u/${encodeURIComponent(combination.owner)}`} className="font-bold text-foreground hover:text-primary">@{combination.owner}</Link>
          {' · '}
          <span className="font-bold text-foreground">{combination.tracks.length}</span> {combination.tracks.length === 1 ? 'track' : 'tracks'}
        </p>
        <p className="max-w-2xl text-base text-foreground/60">Press play on several tracks to listen to them together.</p>
      </header>

      {combination.tracks.length === 0 ? (
        <p className="py-10 text-center text-lg text-foreground/60">This combination has no public tracks.</p>
      ) : (
        <SimpleGrid items={combination.tracks} columns={4} renderItem={(link, index) => <LinkCard key={link.id} link={link} index={index} />} />
      )}
    </div>
  );
}
