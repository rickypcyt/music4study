'use client';

import { Plus, Search, X } from 'lucide-react';
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
    <div className={cn('space-y-3 rounded-md', hasError && 'outline outline-1 outline-offset-4 outline-destructive')}>
      {genres.length > VISIBLE_BY_DEFAULT && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            placeholder="Search genres"
            aria-label="Search genres"
            className="h-10 w-full rounded-md border border-foreground/15 bg-transparent pl-9 pr-3 text-base text-foreground placeholder:text-foreground/30 focus-visible:outline-none focus:border-foreground/40"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Genre">
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
                'flex items-baseline gap-1.5 rounded-md border px-3 py-1.5 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-foreground/15 text-foreground/75 hover:border-foreground/40 hover:text-foreground',
              )}
            >
              <span>{g.value}</span>
              <span className={cn('text-sm tabular-nums', selected ? 'text-background/60' : 'text-foreground/35')}>{g.count}</span>
            </button>
          );
        })}

        {/* Género nuevo */}
        {creating ? (
          <div className="flex items-center rounded-md border border-foreground pl-3">
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
              className="w-32 !border-0 !bg-transparent py-1.5 text-base text-foreground !shadow-none outline-none placeholder:text-foreground/30"
            />
            <button type="button" onClick={submitDraft} disabled={draft.trim().length < 2} className="px-2 text-sm font-medium text-foreground disabled:opacity-30">
              Add
            </button>
            <button type="button" onClick={() => { setCreating(false); setDraft(''); }} aria-label="Cancel" className="pr-2 text-foreground/50 hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-base text-foreground/50 transition-colors hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> New
          </button>
        )}
      </div>

      {!q && filtered.length > VISIBLE_BY_DEFAULT && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm text-foreground/50 underline-offset-4 hover:text-foreground hover:underline">
          {showAll ? 'Show fewer' : `Show all (${hidden > 0 ? `${hidden} more` : filtered.length})`}
        </button>
      )}
      {q && filtered.length === 0 && <p className="text-sm text-foreground/50">No genres match “{query}”. Use “New” to create it.</p>}
    </div>
  );
}
