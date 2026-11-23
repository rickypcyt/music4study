'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

/** Navbar de las páginas públicas. Sirve igual con sesión (vuelves a tu biblioteca) que sin ella (iniciar sesión). */
export default function ExploreNavbar() {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
    if (error) setBusy(false);
  };

  const onExplore = pathname === '/explore' || pathname.startsWith('/u/') || pathname.startsWith('/combinations/');

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-[1920px] items-center justify-between gap-3 px-3 sm:px-5 lg:px-8" aria-label="Main">
        <Link href="/" className="shrink-0 text-xl font-light tracking-wider text-foreground sm:text-2xl md:text-3xl">
          Music4Study
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-base text-foreground/70 transition-colors hover:bg-accent/40 hover:text-foreground lg:text-lg"
          >
            {session?.user ? 'My library' : 'Home'}
          </Link>
          <Link
            href="/explore"
            aria-current={onExplore ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-2 text-base transition-colors hover:bg-accent/40 hover:text-foreground lg:text-lg',
              onExplore ? 'text-foreground' : 'text-foreground/70',
            )}
          >
            Explore
          </Link>

          {isPending ? (
            <div className="m4s-shimmer ml-1 h-10 w-24 rounded-md" role="status" aria-label="Loading account" />
          ) : session?.user ? (
            <Button asChild className="ml-1 bg-primary text-base text-primary-foreground hover:bg-primary/90 lg:text-lg">
              <Link href="/">Open library</Link>
            </Button>
          ) : (
            <Button onClick={signIn} disabled={busy} className="ml-1 bg-primary text-base text-primary-foreground hover:bg-primary/90 lg:text-lg">
              {busy ? 'Redirecting…' : 'Sign in'}
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
