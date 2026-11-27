import { memo } from 'react';
import { Layers } from 'lucide-react';

import LinkCard from '@/components/LinkCard';

type Track = { id: string; url: string; title: string; genre: string; type: string; username: string; date_added: string };
type Combination = { id: string; name: string; links: Track[] };

/** Una combinación: cabecera con nombre y resumen, y debajo sus tracks. */
function CombinationSection({ combination }: { combination: Combination }) {
  const { name, links } = combination;
  const genres = [...new Set(links.map((l) => l.genre).filter(Boolean))];
  const headingId = `combination-${combination.id}`;

  return (
    <section aria-labelledby={headingId} className="overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.03]">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-foreground/10 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-4 py-4 sm:px-6">
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Layers className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="break-words text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
            {name}
          </h3>
          <p className="mt-1 text-sm text-foreground/60">
            {links.length} {links.length === 1 ? 'track' : 'tracks'}
          </p>
        </div>
        {genres.length > 0 && (
          <ul aria-label="Genres in this combination" className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <li key={genre} className="rounded-full border border-foreground/15 px-3 py-1 text-sm text-foreground/70">
                {genre}
              </li>
            ))}
          </ul>
        )}
      </header>

      {links.length > 0 ? (
        // auto-fill: las tarjetas mantienen un ancho cómodo con 1 o con 20 tracks
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4 p-4 sm:p-6">
          {links.map((link) => (
            <LinkCard key={link.id} link={link} compact />
          ))}
        </div>
      ) : (
        <p className="px-6 py-10 text-center text-foreground/60">No tracks in this combination yet.</p>
      )}
    </section>
  );
}

export default memo(CombinationSection);
