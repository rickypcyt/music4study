'use client';

import { Play, Square } from 'lucide-react';

import { useEffect, useState } from 'react';

import YouTubeThumb from '@/components/YouTubeThumb';

type Track = { id: string; title: string; username: string; dateAdded: string };

function timeAgo(iso: string, now: number): string {
  const m = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${Math.max(m, 1)} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d} d ago` : new Date(iso).toLocaleDateString('en-US');
}

const TRACKS: Track[] = [
  { id: 'Q6MemVxEquE', title: 'Deep Layered Brown Noise ( 12 Hours )', username: 'rickypcyt', dateAdded: '2025-03-30T00:22:26.431Z' },
  { id: 'q76bMs-NwRk', title: '3 Hours of Gentle Night Rain, Rain Sounds for Sleeping - Dark Screen to Beat insomnia, Relax, Study', username: 'rickypcyt', dateAdded: '2025-03-30T00:22:26.431Z' },
  { id: 'bn9F19Hi1Lk', title: 'Sleep For 11 Hours Straight, High Quality Stereo Ocean Sounds Of Rolling Waves For Deep Sleeping', username: 'rickypcyt', dateAdded: '2025-03-30T00:22:26.431Z' },
];

function Tile({ track, playing, onPlay, now }: { track: Track; playing: boolean; onPlay: () => void; now: number | null }) {
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
            <YouTubeThumb videoId={track.id} className="absolute inset-0 h-full w-full object-cover" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white">
              <Play className="ml-1 h-7 w-7" fill="currentColor" />
            </span>
          </button>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 text-base font-medium leading-snug text-foreground">{track.title}</p>
        <p className="truncate text-base text-foreground/60">@{track.username}{now !== null && ` · ${timeAgo(track.dateAdded, now)}`}</p>
      </div>
    </li>
  );
}

/** Demo reproducible: un track real de cada plataforma, para probar a escuchar varios a la vez. */
export default function TryIt() {
  const [playing, setPlaying] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
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
          <Tile key={t.id} track={t} now={now} playing={Boolean(playing[t.id])} onPlay={() => setPlaying((p) => ({ ...p, [t.id]: true }))} />
        ))}
      </ul>
    </section>
  );
}
