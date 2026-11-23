-- Fase 1: bibliotecas por usuario (propiedad + RLS + perfiles).
-- SOLO para el NUEVO proyecto de Supabase de Music4Study (nunca en el proyecto compartido con la otra app:
-- ahí ya existe `profiles` con datos ajenos). Orden: 0001_base_schema -> importar backup -> este archivo.

begin;

-- Quitar las políticas abiertas temporales de 0001
drop policy if exists "temp open links" on public.links;
drop policy if exists "temp open combinations" on public.combinations;
drop policy if exists "temp open combination_links" on public.combination_links;

-- 1) Perfiles públicos (username único para URLs /u/[username]) ----------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are public to read"
  on public.profiles for select using (true);
create policy "users insert their own profile"
  on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "users update their own profile"
  on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Crear perfil automáticamente al registrarse (username provisional único)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 10),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- 2) Propiedad y visibilidad ----------------------------------------------------
-- default auth.uid(): los inserts desde el cliente no necesitan enviar user_id.
alter table public.links
  add column if not exists user_id uuid references auth.users(id) on delete set null default auth.uid(),
  add column if not exists is_public boolean not null default true;

alter table public.combinations
  add column if not exists user_id uuid references auth.users(id) on delete set null default auth.uid(),
  add column if not exists is_public boolean not null default true;

create index if not exists links_user_id_idx on public.links(user_id);
create index if not exists combinations_user_id_idx on public.combinations(user_id);

-- Backfill: los links actuales quedan sin dueño (user_id null) y siguen visibles.
-- Para asignarlos a tu cuenta, ejecuta una vez (con tu UUID de auth.users):
--   update public.links set user_id = '<TU-UUID>' where user_id is null;
--   update public.combinations set user_id = '<TU-UUID>' where user_id is null;

-- 3) RLS: links ------------------------------------------------------------------
alter table public.links enable row level security;

create policy "links: read public or own"
  on public.links for select
  using (is_public or user_id = auth.uid());

create policy "links: insert as self"
  on public.links for insert to authenticated
  with check (user_id = auth.uid());

create policy "links: update own"
  on public.links for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "links: delete own"
  on public.links for delete to authenticated
  using (user_id = auth.uid());

-- 4) RLS: combinations y combination_links ---------------------------------------
alter table public.combinations enable row level security;

create policy "combinations: read public or own"
  on public.combinations for select
  using (is_public or user_id = auth.uid());
create policy "combinations: insert as self"
  on public.combinations for insert to authenticated with check (user_id = auth.uid());
create policy "combinations: update own"
  on public.combinations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "combinations: delete own"
  on public.combinations for delete to authenticated using (user_id = auth.uid());

alter table public.combination_links enable row level security;

create policy "combination_links: read if parent readable"
  on public.combination_links for select
  using (exists (
    select 1 from public.combinations c
    where c.id = combination_id and (c.is_public or c.user_id = auth.uid())
  ));
create policy "combination_links: write if parent owned"
  on public.combination_links for all to authenticated
  using (exists (select 1 from public.combinations c where c.id = combination_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.combinations c where c.id = combination_id and c.user_id = auth.uid()));

commit;

-- IMPORTANTE tras aplicar esto, el código actual deja de funcionar para:
--  * Añadir links como invitado (SubmitForm hace insert con la clave anónima): ahora exige sesión.
--  * Guardar títulos (fetchAndStoreTitles hace update con la clave anónima).
--  * Borrar videos muertos (removeUnavailableVideo, desde el navegador).
-- Esas dos últimas deben moverse a un endpoint de servidor con SUPABASE_SERVICE_ROLE_KEY.
