'use client';

import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import Landing from './Landing';
import LandingNavbar from './LandingNavbar';
import type { LandingStats } from '@/lib/stats';
import { authClient } from '@/lib/auth-client';

const STEPS = [
  { n: '1', title: 'Sign in with Google', text: 'One click, no passwords. Pick a username and your library is ready.' },
  { n: '2', title: 'Add what helps you focus', text: 'Paste a YouTube, Spotify or SoundCloud link. We detect the platform and show a preview.' },
  { n: '3', title: 'Organize and share', text: 'Tag tracks by genre, group them in combinations and see what the community is playing.' },
];

/** Landing real: navbar propio + hero con estadísticas en vivo + cómo funciona + llamada a la acción + pie. */
export default function LandingPage({ initialStats }: { initialStats: LandingStats }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
      if (err) throw new Error(err.message);
      // Si todo va bien, el navegador salta a Google y esta línea no llega a verse
    } catch (e) {
      console.error('Sign in failed:', e);
      setError('We could not start the Google sign-in. Please try again.');
      setBusy(false);
    }
  }, []);

  return (
    <div id="top" className="min-h-screen">
      <LandingNavbar onSignIn={signIn} busy={busy} />

      <main className="mx-auto w-full max-w-7xl space-y-16 px-4 py-8 sm:px-6 lg:px-10">
        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive">
            {error}
          </p>
        )}

        <Landing initialStats={initialStats} onSignIn={signIn} />

        <section id="how-it-works" className="scroll-mt-24 space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">How it works</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-xl border border-foreground/10 bg-background/40 p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">{s.n}</span>
                <h3 className="mt-4 text-xl font-bold text-foreground">{s.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-foreground/70">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-foreground/10 px-6 py-12 text-center">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="m4s-orb left-1/4 top-0 h-56 w-56 bg-primary/25" />
            <div className="m4s-orb bottom-0 right-1/4 h-56 w-56 bg-[#7C3AED]/20" style={{ animationDelay: '-9s' }} />
          </div>
          <div className="relative space-y-5">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Ready to build your library?</h2>
            <p className="mx-auto max-w-xl text-lg text-foreground/70">Free, and it takes less than a minute.</p>
            <Button onClick={signIn} disabled={busy} className="bg-primary px-8 py-6 text-lg text-primary-foreground hover:bg-primary/90">
              {busy ? 'Redirecting…' : 'Sign in with Google'}
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/10 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 text-base text-foreground/60 sm:flex-row sm:px-6 lg:px-10">
          <span>© {new Date().getFullYear()} Music4Study</span>
          <span>Music for studying, curated by people.</span>
        </div>
      </footer>
    </div>
  );
}
