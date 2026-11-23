'use client';

import CurrentlyPlayingFloating from '@/components/ui/CurrentlyPlayingFloating';
import ExploreNavbar from './ExploreNavbar';

/** Marco común de las páginas públicas (explorar, perfiles, combinaciones): navbar + contenido a casi todo el ancho. */
export default function ExploreShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <ExploreNavbar />
      <main className="mx-auto w-full max-w-[1920px] px-3 py-6 sm:px-5 lg:px-8">{children}</main>
      <footer className="border-t border-foreground/10 py-8">
        <div className="mx-auto flex w-full max-w-[1920px] flex-col items-center justify-between gap-3 px-3 text-base text-foreground/60 sm:flex-row sm:px-5 lg:px-8">
          <span>© {new Date().getFullYear()} Music4Study</span>
          <span>Study music, curated by students.</span>
        </div>
      </footer>
      {/* El reproductor global sigue sonando y se controla desde aquí al cambiar de página */}
      <CurrentlyPlayingFloating />
    </div>
  );
}
