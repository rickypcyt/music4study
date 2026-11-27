'use client';

import { Suspense, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';
import ProfileModal from '@/components/ui/ProfileModal';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

// Mismas claves que AppHome: al cerrar sesión no se deja la biblioteca de la cuenta en el navegador
const CACHE_KEY = 'music4study_links_cache';
const SCOPE_KEY = 'music4study_last_scope';

/**
 * Navbar de las páginas públicas (explorar, perfiles, combinaciones).
 * Con sesión (o mientras se comprueba) usa la misma barra que la app, para que nada cambie al entrar en Explore.
 * Sin sesión muestra una barra sencilla con "Sign in".
 */
export default function ExploreNavbar() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  if (user || isPending) {
    // Navbar usa useSearchParams: en páginas estáticas necesita un límite de Suspense
    return (
      <Suspense fallback={<div className="navbar sticky top-0 z-50 h-16" />}>
        <AppNavbar
          user={user ? { id: user.id, name: user.name, username: user.username ?? null, image: user.image ?? null } : null}
          loading={isPending}
        />
      </Suspense>
    );
  }
  return <PublicNavbar />;
}

function AppNavbar({
  user,
  loading,
}: {
  user: { id: string; name: string; username: string | null; image: string | null } | null;
  loading: boolean;
}) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  const signOut = async () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(CACHE_KEY) || k === SCOPE_KEY)
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    await authClient.signOut();
    window.location.assign('/');
  };

  return (
    <>
      <Navbar
        currentView="explore"
        onHomeClick={() => router.push('/')}
        onGenresClick={() => router.push('/?view=genres')}
        onCombinationsClick={() => router.push('/?view=combinations')}
        // La biblioteca abre el formulario al llegar (ver AppHome, parámetro ?submit=1)
        onSubmitClick={() => router.push('/?submit=1')}
        user={user ? { name: user.name, username: user.username, image: user.image } : null}
        authLoading={loading}
        onProfileClick={() => setProfileOpen(true)}
      />
      {user && (
        <ProfileModal
          open={profileOpen}
          onOpenChange={setProfileOpen}
          onSignOut={signOut}
          user={{ name: user.name, image: user.image }}
          userId={user.id}
        />
      )}
    </>
  );
}

function PublicNavbar() {
  const pathname = usePathname();
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
            Home
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
          <Button onClick={signIn} disabled={busy} className="ml-1 bg-primary text-base text-primary-foreground hover:bg-primary/90 lg:text-lg">
            {busy ? 'Redirecting…' : 'Sign in'}
          </Button>
        </div>
      </nav>
    </header>
  );
}
