'use client';

import { Menu, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useState } from 'react';

const LINKS = [
  { href: '#discover', label: 'Discover' },
  { href: '#community', label: 'Community' },
  { href: '#how-it-works', label: 'How it works' },
];

interface LandingNavbarProps {
  onSignIn: () => void;
  busy?: boolean;
}

/** Navbar propio de la landing: logo, anclas a las secciones y acceso. No es el de la app. */
export default function LandingNavbar({ onSignIn, busy }: LandingNavbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10" aria-label="Main">
        <a href="#top" className="shrink-0 text-2xl md:text-3xl font-light tracking-wider text-foreground">
          Music4Study
        </a>

        <ul className="hidden items-center gap-1 md:flex lg:gap-3">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-md px-3 py-2 text-base lg:text-lg text-foreground/70 transition-colors hover:bg-accent/40 hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={onSignIn}
            disabled={busy}
            className="rounded-md px-3 py-2 text-base lg:text-lg text-foreground/80 transition-colors hover:bg-accent/40 hover:text-foreground disabled:opacity-60"
          >
            Sign in
          </button>
          <Button onClick={onSignIn} disabled={busy} className="bg-primary px-4 text-base lg:text-lg text-primary-foreground hover:bg-primary/90">
            {busy ? 'Redirecting…' : 'Get started'}
          </Button>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-accent/40 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-foreground/10 bg-background/95 px-4 py-3 md:hidden">
          <ul className="space-y-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-lg text-foreground/80 hover:bg-accent/40 hover:text-foreground">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <Button onClick={onSignIn} disabled={busy} className="mt-3 w-full bg-primary text-lg text-primary-foreground hover:bg-primary/90">
            {busy ? 'Redirecting…' : 'Sign in with Google'}
          </Button>
        </div>
      )}
    </header>
  );
}
