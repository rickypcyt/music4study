'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from './dropdown-menu';

import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'date', label: 'Date added' },
  { value: 'genre', label: 'Genre' },
  { value: 'username', label: 'Uploader' },
];

interface SortMenuProps {
  value: string;
  onChange: (sort: string) => void;
  /** 'compact' = barra de escritorio (solo icono hasta lg); 'full' = menú móvil (siempre con texto) */
  variant?: 'compact' | 'full';
}

/** Menú desplegable para ordenar (reemplaza al modal "Sort by"). */
export default function SortMenu({ value, onChange, variant = 'compact' }: SortMenuProps) {
  const compact = variant === 'compact';
  const current = OPTIONS.find((o) => o.value === value)?.label ?? 'Date added';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Sort: ${current}`}
          title={`Sort: ${current}`}
          className={cn(
            'inline-flex items-center justify-center rounded-md font-medium text-foreground/80 transition-colors duration-200 hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent/50 data-[state=open]:text-foreground',
            compact ? 'px-2 lg:px-4 py-2 text-base lg:text-lg' : 'px-3 py-2 text-base',
          )}
        >
          <ArrowUpDown className={cn(compact ? 'h-5 w-5 lg:h-6 lg:w-6 lg:mr-2' : 'h-5 w-5 mr-2')} />
          <span className={cn(compact && 'hidden lg:inline')}>Sort</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? 'end' : 'start'} sideOffset={8} className="min-w-[12rem] border-border/40 bg-background/95 backdrop-blur-md">
        <DropdownMenuLabel className="text-base font-normal text-foreground/60">Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {OPTIONS.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className="cursor-pointer py-2 text-base">
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
