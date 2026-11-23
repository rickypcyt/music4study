'use client';

import { useState } from 'react';

import { Avatar } from './ExploreView';
import Link from 'next/link';
import LinkCard from '@/components/LinkCard';
import type { PublicProfile } from '@/lib/explore';
import SimpleGrid from '@/components/ui/SimpleGrid';
import { cn } from '@/lib/utils';

const PAGE = 12;

/** Biblioteca pública de una persona: sus tracks (reproducibles) y sus combinaciones. */
export default function ProfileView({ profile }: { profile: PublicProfile }) {
  const [tab, setTab] = useState<'tracks' | 'combinations'>('tracks');
  const [shown, setShown] = useState(PAGE);
  const visible = profile.tracks.slice(0, shown);
  const maxGenre = Math.max(1, ...profile.topGenres.map((g) => g.count));

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-base text-foreground/60">
        <Link href="/explore" className="hover:text-foreground">Explore</Link> <span aria-hidden="true">/</span> <span className="text-foreground/80">@{profile.username}</span>
      </nav>

      <header className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,420px)] lg:items-start">
        <div className="flex items-center gap-5">
          <Avatar name={profile.username} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-bold tracking-tight text-foreground md:text-5xl">@{profile.username}</h1>
            <p className="mt-1 text-lg text-foreground/70">
              <span className="font-bold text-foreground">{profile.totals.tracks.toLocaleString()}</span> {profile.totals.tracks === 1 ? 'track' : 'tracks'}
              {' · '}
              <span className="font-bold text-foreground">{profile.totals.combinations}</span> {profile.totals.combinations === 1 ? 'combination' : 'combinations'}
            </p>
            <p className="text-base text-foreground/50">Member since {new Date(profile.memberSince).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</p>
          </div>
        </div>

        {profile.topGenres.length > 0 && (
          <div className="space-y-2 rounded-xl border border-foreground/10 bg-background/40 p-4">
            <h2 className="text-lg font-bold text-foreground">Top genres</h2>
            <ul className="space-y-2">
              {profile.topGenres.map((g) => (
                <li key={g.name} className="space-y-1">
                  <div className="flex justify-between text-base text-foreground/80">
                    <span className="truncate">{g.name}</span>
                    <span className="tabular-nums text-foreground/60">{g.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(g.count / maxGenre) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <div role="tablist" aria-label="Library sections" className="flex gap-2 border-b border-foreground/10">
        {([
          ['tracks', `Tracks (${profile.totals.tracks})`],
          ['combinations', `Combinations (${profile.combos.length})`],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-3 text-lg transition-colors',
              tab === id ? 'border-primary text-foreground' : 'border-transparent text-foreground/60 hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tracks' ? (
        profile.tracks.length === 0 ? (
          <p className="py-10 text-center text-lg text-foreground/60">No public tracks yet.</p>
        ) : (
          <div className="space-y-6">
            <SimpleGrid items={visible} columns={4} renderItem={(link, index) => <LinkCard key={link.id} link={link} index={index} />} />
            {shown < profile.tracks.length && (
              <div className="text-center">
                <button
                  onClick={() => setShown((n) => n + PAGE)}
                  className="rounded-md border border-foreground/20 px-6 py-3 text-lg text-foreground/80 transition-colors hover:bg-accent/40 hover:text-foreground"
                >
                  Show more ({profile.tracks.length - shown} left)
                </button>
              </div>
            )}
          </div>
        )
      ) : profile.combos.length === 0 ? (
        <p className="py-10 text-center text-lg text-foreground/60">No public combinations yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {profile.combos.map((c) => (
            <li key={c.id}>
              <Link
                href={`/combinations/${c.id}`}
                className="group flex h-full flex-col gap-2 rounded-xl border border-foreground/10 bg-background/40 p-5 transition-colors hover:border-foreground/30 hover:bg-background/60"
              >
                <p className="line-clamp-2 text-xl font-bold leading-snug text-foreground group-hover:text-primary">{c.name}</p>
                <p className="text-base text-foreground/70">
                  <span className="font-bold text-foreground">{c.tracks.length}</span> {c.tracks.length === 1 ? 'track' : 'tracks'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
