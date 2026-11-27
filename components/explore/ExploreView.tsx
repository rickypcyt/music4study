'use client';

import { ChevronRight, Search } from 'lucide-react';
import type { ExploreCombo, ExploreData, ExploreUser } from '@/lib/explore';
import { useMemo, useState } from 'react';

import Link from 'next/link';
import LinkCard from '@/components/LinkCard';
import { extractYouTubeId } from '@/lib/youtubeId';

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

const PAGE = 6;

export default function ExploreView({ data }: { data: ExploreData }) {
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const q = query.trim().toLowerCase().replace(/^@/, '');

  const users = useMemo(() => {
    if (!q) return data.users;
    const has = (v: string | null | undefined) => Boolean(v && v.toLowerCase().includes(q));
    return data.users.filter(
      (u) =>
        has(u.username) ||
        has(u.topGenre) ||
        u.combos.some((c) => has(c.name)) ||
        u.latest.some((l) => has(l.title) || has(l.genre)),
    );
  }, [data.users, q]);

  const visible = q ? users : users.slice(0, shown);

  return (
    <div className="space-y-12">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Explore</h1>
          <p className="text-foreground/60">
            {data.totals.users.toLocaleString()} libraries · {data.totals.tracks.toLocaleString()} tracks ·{' '}
            {data.totals.combinations.toLocaleString()} combinations
          </p>
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, tracks or genres"
            aria-label="Search"
            className="h-11 w-full rounded-full border border-foreground/15 bg-foreground/5 pl-10 pr-4 text-base text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus:border-foreground/40"
          />
        </div>
      </header>

      {visible.length === 0 ? (
        <p className="text-foreground/60">{q ? `Nothing matches “${query}”.` : 'No public libraries yet.'}</p>
      ) : (
        <div className="space-y-14">
          {visible.map((u) => (
            <UserShelf key={u.username} user={u} />
          ))}
        </div>
      )}

      {!q && users.length > shown && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="rounded-full border border-foreground/20 px-6 py-2.5 text-base font-medium text-foreground/80 transition-colors hover:border-foreground/50 hover:text-foreground"
          >
            Show more libraries
          </button>
        </div>
      )}
    </div>
  );
}

/** Una biblioteca: cabecera con el usuario, sus 4 últimos tracks y hasta 4 combinaciones. */
function UserShelf({ user: u }: { user: ExploreUser }) {
  const href = `/u/${encodeURIComponent(u.username)}`;
  const headingId = `shelf-${u.username}`;

  return (
    <section aria-labelledby={headingId} className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href={href} tabIndex={-1} aria-hidden>
          <Avatar name={u.username} />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="truncate text-2xl font-bold tracking-tight text-foreground">
            <Link href={href} className="hover:underline">@{u.username}</Link>
          </h2>
          <p className="truncate text-sm text-foreground/55">
            {u.tracks.toLocaleString()} {u.tracks === 1 ? 'track' : 'tracks'}
            {u.combinations > 0 && ` · ${u.combinations} ${u.combinations === 1 ? 'combination' : 'combinations'}`}
            {u.topGenre && ` · Mostly ${u.topGenre}`}
            {u.lastActive && ` · Active ${timeAgo(u.lastActive)}`}
          </p>
        </div>
        <Link
          href={href}
          className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-foreground/60 hover:text-foreground sm:inline-flex"
        >
          Show all <ChevronRight className="h-4 w-4" />
        </Link>
      </header>

      {u.latest.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground/60">Latest uploads</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {u.latest.map((link) => (
              <LinkCard key={link.id} link={link} compact />
            ))}
          </div>
        </div>
      )}

      {u.combos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground/60">Combinations</h3>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {u.combos.map((c) => (
              <li key={c.id}>
                <ComboTile combo={c} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* En móvil el enlace de la cabecera está oculto */}
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-foreground/60 hover:text-foreground sm:hidden">
        Open @{u.username}&apos;s library <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

/** Combinación con portada en mosaico de sus primeros tracks, como una playlist. */
function ComboTile({ combo }: { combo: ExploreCombo }) {
  const covers = combo.covers.slice(0, 4);
  const mosaic = covers.length >= 4;

  return (
    <Link href={`/combinations/${combo.id}`} className="group block space-y-2">
      <div className={`grid aspect-square overflow-hidden rounded-lg bg-foreground/10 ${mosaic ? 'grid-cols-2' : ''}`}>
        {(mosaic ? covers : covers.slice(0, 1)).map((url, i) => (
          <Cover key={i} url={url} />
        ))}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground group-hover:underline">{combo.name}</p>
        <p className="text-sm text-foreground/55">
          {combo.tracks} {combo.tracks === 1 ? 'track' : 'tracks'}
        </p>
      </div>
    </Link>
  );
}

function Cover({ url }: { url: string }) {
  const id = extractYouTubeId(url);
  if (id) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
    );
  }
  const label = url.includes('spotify.com') ? 'Spotify' : url.includes('soundcloud.com') ? 'SoundCloud' : '♪';
  return (
    <div className="flex h-full w-full items-center justify-center bg-primary/20 text-sm font-semibold text-foreground/70">{label}</div>
  );
}
