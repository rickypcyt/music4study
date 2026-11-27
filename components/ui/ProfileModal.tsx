'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { useEffect, useState } from 'react';

import { ArrowUpRight, LogOut } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  user: { name: string; username: string | null; email: string; image: string | null; memberSince: string };
  totalLinks: number;
  lastAdded: string | null;
  combinations: number;
  topGenres: { name: string; count: number }[];
  platforms: { name: string; count: number }[];
}

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: () => void;
  /** Datos básicos para pintar algo mientras cargan las estadísticas */
  user: { name: string; image: string | null };
  /** Id de la cuenta: separa la caché de una sesión de la de otra */
  userId: string;
}

// Caché en memoria del último resultado (por usuario). El modal se abre al instante con esto
// y se actualiza en segundo plano; AppHome llama a prefetchProfileStats() al cargar la app.
let cache: { userId: string; data: Stats } | null = null;
const inflight = new Map<string, Promise<Stats | null>>();

export function prefetchProfileStats(userId: string): Promise<Stats | null> {
  const running = inflight.get(userId);
  if (running) return running;
  const p = fetch('/api/me/stats')
    .then((r) => (r.ok ? (r.json() as Promise<Stats>) : null))
    .then((data) => {
      if (data) cache = { userId, data };
      return data;
    })
    .catch(() => null)
    .finally(() => inflight.delete(userId));
  inflight.set(userId, p);
  return p;
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtMonth = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

export default function ProfileModal({ open, onOpenChange, onSignOut, user, userId }: ProfileModalProps) {
  const [stats, setStats] = useState<Stats | null>(() => (cache?.userId === userId ? cache.data : null));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setFailed(false);
    // Con caché: se muestra al momento y se refresca sin spinner. Sin caché: skeleton hasta que llegue.
    if (cache?.userId === userId) setStats(cache.data);
    prefetchProfileStats(userId).then((d) => {
      if (cancelled) return;
      if (d) setStats(d);
      else if (!(cache?.userId === userId)) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const maxGenre = Math.max(1, ...(stats?.topGenres.map((g) => g.count) ?? [1]));

  const username = stats?.user.username ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 border-foreground/10 bg-background p-0 sm:max-w-[440px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>Your profile and library stats</DialogDescription>
        </DialogHeader>

        {/* Cabecera */}
        <div className="flex items-center gap-4 p-6 pb-5 pr-12">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" referrerPolicy="no-referrer" className="h-14 w-14 shrink-0 rounded-full" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xl font-semibold text-foreground">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">{user.name}</h2>
            <p className="truncate text-sm text-foreground/50">
              {username ? `@${username}` : stats?.user.email ?? '\u00a0'}
              {stats && ` · Joined ${fmtMonth(stats.user.memberSince)}`}
            </p>
          </div>
        </div>

        <div className="border-t border-foreground/10 px-6 py-5">
          {failed ? (
            <p className="text-sm text-foreground/60">Could not load your stats.</p>
          ) : !stats ? (
            <div className="space-y-4" aria-busy="true">
              <div className="m4s-shimmer h-12 rounded" />
              <div className="m4s-shimmer h-24 rounded" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Números principales, sin cajas */}
              <dl className="grid grid-cols-3 divide-x divide-foreground/10">
                {[
                  { label: 'Tracks', value: stats.totalLinks },
                  { label: 'Combinations', value: stats.combinations },
                  { label: 'Last added', value: stats.lastAdded ? fmtDate(stats.lastAdded) : '—', small: true },
                ].map((item) => (
                  <div key={item.label} className="px-3 first:pl-0">
                    <dt className="text-sm text-foreground/50">{item.label}</dt>
                    <dd className={`mt-1 font-semibold tabular-nums text-foreground ${item.small ? 'text-base leading-7' : 'text-2xl'}`}>
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {stats.totalLinks === 0 ? (
                <p className="text-sm text-foreground/60">Your library is empty. Add your first track to see your stats here.</p>
              ) : (
                <>
                  {stats.topGenres.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-medium text-foreground/60">Top genres</h3>
                      <ol className="space-y-1">
                        {stats.topGenres.map((g, i) => (
                          <li key={g.name} className="relative flex items-center gap-3 overflow-hidden rounded px-2 py-1.5">
                            {/* Barra de fondo proporcional al número de tracks */}
                            <span
                              aria-hidden
                              className="absolute inset-y-0 left-0 bg-foreground/[0.06]"
                              style={{ width: `${(g.count / maxGenre) * 100}%` }}
                            />
                            <span className="relative w-4 text-sm tabular-nums text-foreground/40">{i + 1}</span>
                            <span className="relative min-w-0 flex-1 truncate text-foreground">{g.name}</span>
                            <span className="relative text-sm tabular-nums text-foreground/50">{g.count}</span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}

                  {/* La API lo llama "platforms", pero son los tipos de track (Mix, Video…) */}
                  {stats.platforms.length > 0 && (() => {
                    const total = stats.platforms.reduce((n, p) => n + p.count, 0) || 1;
                    // Del más usado al menos usado: de color principal a tonos cada vez más tenues
                    const shade = (i: number) => `hsl(var(--primary) / ${Math.max(0.2, 1 - i * 0.22)})`;
                    return (
                      <section>
                        <h3 className="mb-3 text-sm font-medium text-foreground/60">Types</h3>
                        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                          {stats.platforms.map((p, i) => (
                            <span key={p.name} style={{ width: `${(p.count / total) * 100}%`, background: shade(i) }} />
                          ))}
                        </div>
                        <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                          {stats.platforms.map((p, i) => (
                            <li key={p.name} className="flex items-center gap-2">
                              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: shade(i) }} />
                              <span className="min-w-0 flex-1 truncate text-foreground/80">{p.name}</span>
                              <span className="tabular-nums text-foreground/50">{Math.round((p.count / total) * 100)}%</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-between border-t border-foreground/10 px-6 py-4">
          {username ? (
            <Link
              href={`/u/${username}`}
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1 text-sm font-medium text-foreground/70 hover:text-foreground"
            >
              Public profile <ArrowUpRight className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSignOut();
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
