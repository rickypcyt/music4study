-- Esquema base de Music4Study para el NUEVO proyecto de Supabase (copia del esquema actual).
-- Ejecutar primero este archivo, luego importar datos (scripts/import-backup.mjs), luego 0002.

create extension if not exists "uuid-ossp" with schema extensions;

create table public.links (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  type text,
  genre text,
  username text,
  date_added timestamptz,
  title text
);

create table public.combinations (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.combination_links (
  id uuid primary key default extensions.uuid_generate_v4(),
  combination_id uuid references public.combinations(id) on delete cascade,
  link_id uuid references public.links(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index combination_links_combination_idx on public.combination_links(combination_id);
create index combination_links_link_idx on public.combination_links(link_id);
create index links_date_added_idx on public.links(date_added desc);

-- Mientras no se aplique 0002 (RLS), la app sigue funcionando con la clave anónima:
alter table public.links enable row level security;
alter table public.combinations enable row level security;
alter table public.combination_links enable row level security;
create policy "temp open links" on public.links for all using (true) with check (true);
create policy "temp open combinations" on public.combinations for all using (true) with check (true);
create policy "temp open combination_links" on public.combination_links for all using (true) with check (true);
-- 0002 elimina estas políticas temporales.
