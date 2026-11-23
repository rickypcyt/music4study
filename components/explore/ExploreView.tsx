'use client';

import Link from 'next/link';
import type { ExploreData } from '@/lib/explore';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const m = Math.floor(s / 60);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d} d ago` : new Date(iso).toLocaleDateString();
}

/** Color estable por usuario para el avatar (sin usar fotos ni datos personales) */
function hueFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${size === 'lg' ? 'h-20 w-20 text-4xl' : 'h-12 w-12 text-xl'}`}
      style={{ background: `hsl(${hueFor(name)} 55% 38%)` }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function ExploreView({ data }: { data: ExploreData }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase().replace(/^@/, '');
  const users = useMemo(() => (q ? data.users.filter((u) => u.username.toLowerCase().includes(q)) : data.users), [data.users, q]);
  const combos = useMemo(
    () => (q ? data.combos.filter((c) => c.name.toLowerCase().includes(q) || c.owner.toLowerCase().includes(q) || c.genres.some((g) => g.toLowerCase().includes(q))) : data.combos),
    [data.combos, q],
  );

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">Explore study music</h1>
        <p className="max-w-3xl text-lg leading-relaxed text-foreground/70">
          See what other students are listening to. Open a library to browse and play their tracks, or jump straight into
          a combination built for a study session.
        </p>
        <ul className="flex flex-wrap gap-3 text-base text-foreground/70">
          <li className="rounded-full border border-foreground/15 px-4 py-1">{data.totals.users.toLocaleString()} members</li>
          <li className="rounded-full border border-foreground/15 px-4 py-1">{data.totals.tracks.toLocaleString()} tracks</li>
          <li className="rounded-full border border-foreground/15 px-4 py-1">{data.totals.combinations.toLocaleString()} combinations</li>
        </ul>
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/50" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, combinations or genres"
            aria-label="Search"
            className="h-12 w-full rounded-md border border-border/40 bg-background/70 pl-10 pr-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary"
          />
        </div>
      </header>

      <section aria-labelledby="libraries" className="space-y-4">
        <h2 id="libraries" className="text-2xl font-bold text-foreground">Libraries</h2>
        {users.length === 0 ? (
          <p className="text-base text-foreground/60">{q ? `No one matches “${query}”.` : 'No public libraries yet.'}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {users.map((u) => (
              <li key={u.username}>
                <Link
                  href={`/u/${encodeURIComponent(u.username)}`}
                  className="group flex items-center gap-4 rounded-xl border border-foreground/10 bg-background/40 p-4 transition-colors hover:border-foreground/30 hover:bg-background/60"
                >
                  <Avatar name={u.username} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-foreground group-hover:text-primary">@{u.username}</p>
                    <p className="text-base text-foreground/70">
                      <span className="font-bold text-foreground">{u.tracks.toLocaleString()}</span> {u.tracks === 1 ? 'track' : 'tracks'}
                      {u.combinations > 0 && <> · {u.combinations} {u.combinations === 1 ? 'combination' : 'combinations'}</>}
                    </p>
                    <p className="truncate text-base text-foreground/50">
                      {u.topGenre ? `Mostly ${u.topGenre}` : ''}
                      {u.topGenre && u.lastActive ? ' · ' : ''}
                      {u.lastActive ? `active ${timeAgo(u.lastActive)}` : ''}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="combos" className="space-y-4">
        <h2 id="combos" className="text-2xl font-bold text-foreground">Combinations</h2>
        {combos.length === 0 ? (
          <p className="text-base text-foreground/60">{q ? `No combinations match “${query}”.` : 'No public combinations yet.'}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {combos.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/combinations/${c.id}`}
                  className="group flex h-full flex-col gap-3 rounded-xl border border-foreground/10 bg-background/40 p-5 transition-colors hover:border-foreground/30 hover:bg-background/60"
                >
                  <div>
                    <p className="line-clamp-2 text-xl font-bold leading-snug text-foreground group-hover:text-primary">{c.name}</p>
                    <p className="text-base text-foreground/60">by @{c.owner}</p>
                  </div>
                  <p className="text-base text-foreground/80">
                    <span className="font-bold text-foreground">{c.tracks}</span> {c.tracks === 1 ? 'track' : 'tracks'}
                  </p>
                  {c.genres.length > 0 && (
                    <ul className="mt-auto flex flex-wrap gap-2">
                      {c.genres.map((g) => (
                        <li key={g} className="rounded-full bg-primary/15 px-3 py-0.5 text-base text-foreground/90">{g}</li>
                      ))}
                    </ul>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
