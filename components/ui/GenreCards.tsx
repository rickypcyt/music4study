'use client';

import { Check, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

interface GenreOption {
  value: string;
  count: number;
}

interface GenreCardsProps {
  genres: GenreOption[];
  value: string;
  /** Se llama con el género elegido (existente o nuevo); '' al deseleccionar */
  onChange: (genre: string) => void;
  hasError?: boolean;
}

const VISIBLE_BY_DEFAULT = 12;

// Normaliza para buscar sin importar mayúsculas ni acentos
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Géneros como tarjetas pequeñas: click para elegir, "New" para crear uno, y búsqueda si hay muchos. */
export default function GenreCards({ genres, value, onChange, hasError }: GenreCardsProps) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');

  const sorted = useMemo(
    () => [...genres].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
    [genres],
  );

  const q = norm(query);
  const filtered = q ? sorted.filter((g) => norm(g.value).includes(q)) : sorted;
  // El género elegido siempre se ve, aunque quede fuera de los primeros
  const base = showAll || q ? filtered : filtered.slice(0, VISIBLE_BY_DEFAULT);
  const visible = value && !base.some((g) => g.value === value) && filtered.some((g) => g.value === value)
    ? [filtered.find((g) => g.value === value)!, ...base]
    : base;
  const hidden = filtered.length - visible.length;

  const submitDraft = () => {
    const name = draft.trim();
    if (name.length < 2) return;
    // Si ya existe (sin importar mayúsculas), se elige el existente en vez de duplicarlo
    const existing = genres.find((g) => norm(g.value) === norm(name));
    onChange(existing ? existing.value : name);
    setDraft('');
    setCreating(false);
  };

  return (
    <div className={cn('space-y-3 rounded-md', hasError && 'ring-1 ring-destructive p-2')}>
      {genres.length > VISIBLE_BY_DEFAULT && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            placeholder="Search genres"
            aria-label="Search genres"
            className="h-10 w-full rounded-md border border-border/40 bg-background/70 pl-9 pr-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Genre">
        {visible.map((g) => {
          const selected = g.value === value;
          return (
            <button
              key={g.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(selected ? '' : g.value)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2 text-base transition-colors',
                selected
                  ? 'border-primary bg-primary/20 text-foreground'
                  : 'border-border/40 bg-background/40 text-foreground/80 hover:border-foreground/40 hover:bg-accent/40 hover:text-foreground',
              )}
            >
              {selected && <Check className="h-4 w-4 text-primary" />}
              <span>{g.value}</span>
              <span className="text-foreground/40">{g.count}</span>
            </button>
          );
        })}

        {/* Género nuevo */}
        {creating ? (
          <div className="flex items-center gap-1 rounded-lg border border-primary/60 bg-background/60 pl-3 pr-1">
            <input
              autoFocus
              value={draft}
              maxLength={30}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitDraft();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setCreating(false);
                  setDraft('');
                }
              }}
              placeholder="New genre"
              aria-label="New genre name"
              className="w-32 bg-transparent py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
            />
            <button type="button" onClick={submitDraft} disabled={draft.trim().length < 2} aria-label="Add genre" className="rounded p-1.5 text-primary disabled:opacity-40 hover:bg-accent/40">
              <Check className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => { setCreating(false); setDraft(''); }} aria-label="Cancel" className="rounded p-1.5 text-foreground/60 hover:bg-accent/40">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 rounded-lg border border-dashed border-border/60 px-3 py-2 text-base text-foreground/70 transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> New
          </button>
        )}
      </div>

      {!q && filtered.length > VISIBLE_BY_DEFAULT && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="text-base text-primary hover:underline">
          {showAll ? 'Show fewer' : `Show all (${hidden > 0 ? `${hidden} more` : filtered.length})`}
        </button>
      )}
      {q && filtered.length === 0 && <p className="text-foreground/60">No genres match “{query}”. Use “New” to create it.</p>}
    </div>
  );
}
