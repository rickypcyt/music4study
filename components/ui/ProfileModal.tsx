'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { useEffect, useState } from 'react';

import { Button } from './button';
import { LogOut } from 'lucide-react';

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
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function ProfileModal({ open, onOpenChange, onSignOut, user }: ProfileModalProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setFailed(false);
    fetch('/api/me/stats')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Stats) => !cancelled && setStats(d))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const maxGenre = Math.max(1, ...(stats?.topGenres.map((g) => g.count) ?? [1]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10 sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="sr-only">Profile</DialogTitle>
          <DialogDescription className="sr-only">Your profile and library stats</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" referrerPolicy="no-referrer" className="h-16 w-16 rounded-full" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl text-foreground">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-2xl font-serif text-foreground truncate">{stats?.user.username ? `@${stats.user.username}` : user.name}</h2>
            {stats?.user.username && <p className="text-base text-foreground/70 truncate">{user.name}</p>}
            <p className="text-base text-foreground/60 truncate">{stats?.user.email ?? ' '}</p>
          </div>
        </div>

        {failed ? (
          <p className="text-base text-foreground/60 py-4">Could not load your stats.</p>
        ) : !stats ? (
          <div className="grid grid-cols-3 gap-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="m4s-shimmer rounded-lg h-20" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-foreground/10 p-3">
                <div className="text-2xl font-semibold text-foreground">{stats.totalLinks}</div>
                <div className="text-base text-foreground/60">Tracks</div>
              </div>
              <div className="rounded-lg border border-foreground/10 p-3">
                <div className="text-2xl font-semibold text-foreground">{stats.combinations}</div>
                <div className="text-base text-foreground/60">Combinations</div>
              </div>
              <div className="rounded-lg border border-foreground/10 p-3">
                <div className="text-base font-semibold text-foreground pt-1.5">{fmtDate(stats.user.memberSince)}</div>
                <div className="text-base text-foreground/60 pt-1">Member since</div>
              </div>
            </div>

            {stats.topGenres.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-base font-medium text-foreground/80">Top genres</h3>
                {stats.topGenres.map((g) => (
                  <div key={g.name} className="space-y-1">
                    <div className="flex justify-between text-base text-foreground/70">
                      <span className="truncate">{g.name}</span>
                      <span>{g.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(g.count / maxGenre) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {stats.platforms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {stats.platforms.map((p) => (
                  <span key={p.name} className="rounded-full border border-foreground/15 px-3 py-1 text-base text-foreground/80">
                    {p.name} · {p.count}
                  </span>
                ))}
              </div>
            )}

            {stats.totalLinks === 0 ? (
              <p className="text-base text-foreground/60">No tracks in your library yet. Submit your first one!</p>
            ) : (
              <p className="text-base text-foreground/50">Last added: {fmtDate(stats.lastAdded)}</p>
            )}
          </div>
        )}

        <Button
          variant="outline"
          onClick={() => {
            onOpenChange(false);
            onSignOut();
          }}
          className="w-full mt-2"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </DialogContent>
    </Dialog>
  );
}
