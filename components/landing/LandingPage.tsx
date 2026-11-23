'use client';

import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FAQ, USE_CASES, WHY } from './content';
import Landing from './Landing';
import LandingNavbar from './LandingNavbar';
import TryIt from './TryIt';
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

      <main className="mx-auto w-full max-w-[1920px] space-y-16 px-3 py-6 sm:px-5 lg:px-8">
        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive">
            {error}
          </p>
        )}

        <Landing initialStats={initialStats} onSignIn={signIn} afterHero={<TryIt />} />

        <section id="about" className="scroll-mt-24 space-y-6">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Why Music4Study exists</h2>
            <p className="text-lg leading-relaxed text-foreground/75">
              I built Music4Study because I wanted my whole music library in a single page. The music I study to is spread
              across YouTube, Spotify and SoundCloud, and each one has its own player and its own tab. I wanted all of it
              side by side, and the freedom to play several tracks at the same time.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {WHY.map((w) => (
              <li key={w.title} className="rounded-xl border border-foreground/10 bg-background/40 p-5">
                <h3 className="text-xl font-bold text-foreground">{w.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-foreground/70">{w.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="use-cases" className="scroll-mt-24 space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Study music for every way you study</h2>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {USE_CASES.map((u) => (
              <li key={u.title} className="rounded-xl border border-foreground/10 bg-background/40 p-5">
                <h3 className="text-xl font-bold text-foreground">{u.title}</h3>
                <p className="mt-1 text-base text-primary">{u.genres}</p>
                <p className="mt-3 text-base leading-relaxed text-foreground/70">{u.text}</p>
              </li>
            ))}
          </ul>
        </section>

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

        <section id="faq" className="scroll-mt-24 space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Frequently asked questions</h2>
          <ul className="mx-auto flex max-w-3xl flex-col gap-3">
            {FAQ.map((f) => (
              <li key={f.q}>
              <details className="group rounded-xl border border-foreground/10 bg-background/40 p-5 open:bg-background/60">
                <summary className="cursor-pointer list-none text-lg font-bold text-foreground marker:hidden">{f.q}</summary>
                <p className="mt-3 text-base leading-relaxed text-foreground/70">{f.a}</p>
              </details>
              </li>
            ))}
          </ul>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-foreground/10 px-6 py-12 text-center">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="m4s-orb left-1/4 top-0 h-56 w-56 bg-primary/25" />
            <div className="m4s-orb bottom-0 right-1/4 h-56 w-56 bg-[#7C3AED]/20" style={{ animationDelay: '-9s' }} />
          </div>
          <div className="relative space-y-5">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Ready to build your library?</h2>
            <p className="mx-auto max-w-xl text-lg text-foreground/70">It takes less than a minute.</p>
            <Button onClick={signIn} disabled={busy} className="bg-primary px-8 py-6 text-lg text-primary-foreground hover:bg-primary/90">
              {busy ? 'Redirecting…' : 'Sign in with Google'}
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/10 py-8">
        <div className="mx-auto flex w-full max-w-[1920px] flex-col items-center justify-between gap-3 px-3 text-base text-foreground/60 sm:flex-row sm:px-5 lg:px-8">
          <span>© {new Date().getFullYear()} Music4Study</span>
          <span>Study music, curated by students.</span>
        </div>
      </footer>
    </div>
  );
}
