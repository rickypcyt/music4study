'use client';

import { Play, Square } from 'lucide-react';

import { useState } from 'react';

type Track = { id: string; title: string; subtitle: string; color: string };

const TRACKS: Track[] = [
  { id: '2jsLtO9zRcM', title: 'Brown noise', subtitle: 'Deep, steady focus sound', color: '#8b5a2b' },
  { id: '8plwv25NYRo', title: 'Rain', subtitle: 'Soft rain for studying', color: '#3b82f6' },
  { id: 'VDIvQ2XYcxs', title: 'Ocean waves', subtitle: 'Waves on the shore', color: '#06b6d4' },
];

function Tile({ track, playing, onPlay }: { track: Track; playing: boolean; onPlay: () => void }) {
  return (
    <li className="overflow-hidden rounded-xl border border-foreground/10 bg-background/40">
      <div className="relative aspect-video bg-gradient-to-br from-primary/30 to-[#7C3AED]/30">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${track.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={`YouTube: ${track.title}`}
            allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button type="button" onClick={onPlay} aria-label={`Play ${track.title}`} className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${track.id}/mqdefault.jpg`}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
            />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white">
              <Play className="ml-1 h-7 w-7" fill="currentColor" />
            </span>
          </button>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 text-base font-medium leading-snug text-foreground">{track.title}</p>
        <p className="truncate text-base text-foreground/60">{track.subtitle}</p>
      </div>
    </li>
  );
}

/** Demo reproducible: un track real de cada plataforma, para probar a escuchar varios a la vez. */
export default function TryIt() {
  const [playing, setPlaying] = useState<Record<string, boolean>>({});
  const count = TRACKS.filter((t) => playing[t.id]).length;

  return (
    <section id="try-it" className="scroll-mt-24 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Try it: play them together</h2>
          <p className="text-lg leading-relaxed text-foreground/70">
            Press play on two or three at once: Brown noise, rain and ocean
            waves keep playing side by side, just like in your own library.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-base text-foreground/60" aria-live="polite">
            {count === 0 ? 'Nothing playing' : `${count} playing`}
          </span>
          <button
            type="button"
            onClick={() => setPlaying({})}
            disabled={count === 0}
            className="inline-flex items-center gap-2 rounded-md border border-foreground/20 px-3 py-2 text-base text-foreground/80 transition-colors hover:bg-accent/40 hover:text-foreground disabled:opacity-40"
          >
            <Square className="h-4 w-4" fill="currentColor" /> Stop all
          </button>
        </div>
      </div>

      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {TRACKS.map((t) => (
          <Tile key={t.id} track={t} playing={Boolean(playing[t.id])} onPlay={() => setPlaying((p) => ({ ...p, [t.id]: true }))} />
        ))}
      </ul>
    </section>
  );
}
