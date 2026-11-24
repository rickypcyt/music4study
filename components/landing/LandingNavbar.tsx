'use client';

import { Menu, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useState } from 'react';

const LINKS = [
  { href: '/explore', label: 'Explore' },
  { href: '#try-it', label: 'Try it' },
  { href: '#discover', label: 'Discover' },
  { href: '#about', label: 'Why it exists' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#faq', label: 'FAQ' },
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
      <nav className="mx-auto flex h-16 w-full max-w-[1920px] items-center justify-between gap-4 px-3 sm:px-5 lg:px-8" aria-label="Main">
        <a href="#top" className="shrink-0 text-2xl md:text-3xl font-light tracking-wider text-foreground">
          Music4Study
        </a>

        <ul className="hidden items-center gap-1 lg:flex xl:gap-3">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="whitespace-nowrap rounded-md px-3 py-2 text-lg text-foreground/70 transition-colors hover:bg-accent/40 hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <button
            onClick={onSignIn}
            disabled={busy}
            className="hidden whitespace-nowrap rounded-md px-3 py-2 text-lg text-foreground/80 transition-colors hover:bg-accent/40 hover:text-foreground disabled:opacity-60 lg:inline-block"
          >
            Sign in
          </button>
          <Button onClick={onSignIn} disabled={busy} className="hidden whitespace-nowrap bg-primary px-4 text-base text-primary-foreground hover:bg-primary/90 md:inline-flex lg:text-lg">
            {busy ? 'Redirecting…' : 'Get started'}
          </Button>
          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-accent/40 lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-foreground/10 bg-background/95 px-4 py-3 lg:hidden">
          <ul className="grid gap-1 md:grid-cols-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-lg text-foreground/80 hover:bg-accent/40 hover:text-foreground">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <Button onClick={onSignIn} disabled={busy} className="mt-3 w-full bg-primary text-lg md:hidden text-primary-foreground hover:bg-primary/90">
            {busy ? 'Redirecting…' : 'Sign in with Google'}
          </Button>
        </div>
      )}
    </header>
  );
}
