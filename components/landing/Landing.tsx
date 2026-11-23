'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LandingStats } from '@/lib/stats';
import { embedSrc } from '@/lib/embedSrc';
import { extractYouTubeId } from '@/lib/youtubeId';

type Stats = LandingStats;

const POLL_MS = 10_000;

/** Número que "cuenta" suavemente hasta su nuevo valor cuando cambia */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(origin + (target - origin) * eased);
      setValue(v);
      from.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function timeAgo(iso: string | null, now: number): string {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d} d ago` : new Date(iso).toLocaleDateString();
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const shown = useCountUp(value);
  return (
    <div className="rounded-xl border border-foreground/10 bg-background/40 p-4 backdrop-blur-sm">
      <div className="text-4xl md:text-5xl font-bold tabular-nums text-foreground">{shown.toLocaleString()}</div>
      <div className="mt-1 text-base text-foreground/70">{label}</div>
      {hint && <div className="text-base text-primary">{hint}</div>}
    </div>
  );
}

export default function Landing({
  initialStats,
  onSignIn,
  afterHero,
}: {
  initialStats: LandingStats;
  onSignIn: () => void;
  /** Contenido que se muestra justo debajo del hero (la demo reproducible) */
  afterHero?: React.ReactNode;
}) {
  // Llega ya calculado desde el servidor: la primera pintura trae los números reales, sin esperar ni parpadeo
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [now, setNow] = useState(() => Date.now());
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState<Record<string, boolean>>({});
  const knownIds = useRef<Set<string> | null>(new Set(initialStats.recent.map((r) => r.id)));

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      if (!res.ok) return;
      const data: Stats = await res.json();
      // Marca como "nuevos" los tracks que no estaban en la carga anterior (para animarlos)
      if (knownIds.current) {
        const added = data.recent.filter((r) => !knownIds.current!.has(r.id)).map((r) => r.id);
        if (added.length) setFresh(new Set(added));
      }
      knownIds.current = new Set(data.recent.map((r) => r.id));
      setStats(data);
      setNow(Date.now());
    } catch {
      /* sin red: se mantiene lo último que se vio */
    }
  }, []);

  // Actualización en vivo: cada 10 s mientras la pestaña está visible (y al volver a ella)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      stop();
      timer = setInterval(load, POLL_MS);
    };
    const stop = () => timer && clearInterval(timer);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        load();
        start();
      } else stop();
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    const clock = setInterval(() => setNow(Date.now()), 30_000); // refresca los "hace X min"
    return () => {
      stop();
      clearInterval(clock);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  const t = stats?.totals;
  const platformTotal = stats ? stats.platforms.youtube + stats.platforms.spotify + stats.platforms.soundcloud || 1 : 1;
  const maxGenre = Math.max(1, ...(stats?.topGenres.map((g) => g.count) ?? [1]));
  const maxCurator = Math.max(1, ...(stats?.curators.map((c) => c.count) ?? [1]));

  return (
    <div className="space-y-12">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl border border-foreground/10 px-5 py-10 md:px-10 md:py-14">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="m4s-orb -left-24 -top-24 h-80 w-80 bg-primary/30" />
          <div className="m4s-orb -right-20 top-10 h-72 w-72 bg-[#7C3AED]/25" style={{ animationDelay: '-6s' }} />
          <div className="m4s-orb bottom-0 left-1/3 h-64 w-64 bg-[#ff5500]/15" style={{ animationDelay: '-12s' }} />
        </div>

        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background/40 px-3 py-1 text-base text-foreground/80">
              <span className="m4s-live-dot" /> Live · updates every 10 seconds
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight text-foreground">
              Study music that
              <br />
              helps you focus.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-foreground/75">
              A music library made by students: lo-fi, ambient, classical, jazz and more from YouTube, Spotify and
              SoundCloud. Save your favorite tracks, build playlists for reading, exams and late-night sessions, and see
              what other students are listening to.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={onSignIn} className="bg-primary px-8 py-6 text-lg text-primary-foreground hover:bg-primary/90">
                Start your library
              </Button>
              <a href="#discover" className="px-4 py-3 text-lg text-foreground/80 hover:text-foreground">
                See what&apos;s new ↓
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3" aria-live="polite">
            <Stat label="Tracks shared" value={t?.tracks ?? 0} />
            <Stat label="Members" value={t?.members ?? 0} />
            <Stat label="Genres" value={t?.genres ?? 0} />
            <Stat label="Added last 24 h" value={t?.last24h ?? 0} hint={t ? `${t.lastWeek.toLocaleString()} this week` : undefined} />
          </div>
        </div>
      </section>

      {afterHero}

      {/* JUST ADDED */}
      <section id="discover" className="scroll-mt-24 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Just added</h2>
          <span className="text-base text-foreground/50">newest first</span>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(stats?.recent ?? Array.from({ length: 8 }, () => null)).map((r, i) => {
            if (!r) return <li key={i} className="m4s-shimmer h-56 rounded-xl" />;
            const vid = extractYouTubeId(r.url);
            const src = embedSrc(r.url);
            const isPlaying = Boolean(playing[r.id]);
            return (
              <li key={r.id} className={`overflow-hidden rounded-xl border border-foreground/10 bg-background/40 ${fresh.has(r.id) ? 'm4s-slide-in' : ''}`}>
                <div className="relative aspect-video bg-gradient-to-br from-primary/30 to-[#7C3AED]/30">
                  {isPlaying && src ? (
                    <iframe
                      src={src}
                      title={r.title || 'Track'}
                      allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  ) : (
                    <>
                      {vid && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                          onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                        />
                      )}
                      {src ? (
                        <button
                          type="button"
                          onClick={() => setPlaying((p) => ({ ...p, [r.id]: true }))}
                          aria-label={`Play ${r.title || 'track'}`}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white">
                            <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
                          </span>
                        </button>
                      ) : (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label="Open track" className="absolute inset-0" />
                      )}
                      {r.genre && (
                        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-background/80 px-2.5 py-0.5 text-base text-foreground">{r.genre}</span>
                      )}
                    </>
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <p className="line-clamp-2 min-h-[3rem] text-base font-medium leading-snug text-foreground">{r.title || r.url}</p>
                  <p className="truncate text-base text-foreground/60">
                    @{r.username || 'unknown'} · {timeAgo(r.dateAdded, now)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* GENRES + CURATORS + PLATFORMS */}
      <section id="community" className="scroll-mt-24 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border border-foreground/10 bg-background/40 p-5">
          <h2 className="text-xl font-bold text-foreground">Top genres</h2>
          <ul className="space-y-3">
            {(stats?.topGenres ?? []).map((g) => (
              <li key={g.name} className="space-y-1">
                <div className="flex justify-between text-base text-foreground/80">
                  <span className="truncate">{g.name}</span>
                  <span className="tabular-nums text-foreground/60">{g.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
                  <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${(g.count / maxGenre) * 100}%` }} />
                </div>
              </li>
            ))}
            {!stats && <li className="m4s-shimmer h-24 rounded-md" />}
          </ul>
        </div>

        <div className="space-y-4 rounded-xl border border-foreground/10 bg-background/40 p-5">
          <h2 className="text-xl font-bold text-foreground">Top curators</h2>
          <ul className="space-y-3">
            {(stats?.curators ?? []).map((c, i) => (
              <li key={c.name} className="space-y-1">
                <div className="flex justify-between text-base text-foreground/80">
                  <span className="truncate">
                    <span className="mr-2 text-foreground/40">{i + 1}</span>@{c.name}
                  </span>
                  <span className="tabular-nums text-foreground/60">{c.count} tracks</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
                  <div className="h-full rounded-full bg-[#7C3AED] transition-[width] duration-700" style={{ width: `${(c.count / maxCurator) * 100}%` }} />
                </div>
              </li>
            ))}
            {!stats && <li className="m4s-shimmer h-24 rounded-md" />}
          </ul>
        </div>

        <div className="space-y-4 rounded-xl border border-foreground/10 bg-background/40 p-5">
          <h2 className="text-xl font-bold text-foreground">Where it plays</h2>
          <div className="flex h-4 overflow-hidden rounded-full bg-foreground/10" role="img" aria-label="Share of tracks by platform">
            <div className="bg-[#ff3333] transition-[width] duration-700" style={{ width: `${((stats?.platforms.youtube ?? 0) / platformTotal) * 100}%` }} />
            <div className="bg-[#1db954] transition-[width] duration-700" style={{ width: `${((stats?.platforms.spotify ?? 0) / platformTotal) * 100}%` }} />
            <div className="bg-[#ff5500] transition-[width] duration-700" style={{ width: `${((stats?.platforms.soundcloud ?? 0) / platformTotal) * 100}%` }} />
          </div>
          <ul className="space-y-2 text-base text-foreground/80">
            {[
              ['YouTube', stats?.platforms.youtube ?? 0, '#ff3333'],
              ['Spotify', stats?.platforms.spotify ?? 0, '#1db954'],
              ['SoundCloud', stats?.platforms.soundcloud ?? 0, '#ff5500'],
            ].map(([name, n, color]) => (
              <li key={name as string} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: color as string }} />
                  {name}
                </span>
                <span className="tabular-nums text-foreground/60">{(n as number).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

    </div>
  );
}
