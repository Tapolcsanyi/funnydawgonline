-- Funny Dawg Online — portable Postgres schema (Supabase-compatible)
-- Run in Supabase SQL Editor or via CLI.

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reading layouts (matches data/comics.json layouts)
create table if not exists public.layouts (
  id text primary key,
  label text not null,
  viewer jsonb not null default '{}'::jsonb
);

-- Series
create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null,
  title text not null,
  description text default '',
  artist_name text default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create index if not exists series_slug_idx on public.series (slug);
create index if not exists series_status_idx on public.series (status);

-- Volumes
create table if not exists public.volumes (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series (id) on delete cascade,
  slug text not null,
  title text not null,
  layout_id text not null references public.layouts (id),
  artist_name text default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_id, slug)
);

create index if not exists volumes_series_idx on public.volumes (series_id);
create index if not exists volumes_status_idx on public.volumes (status);

-- Pages (comic images)
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  volume_id uuid not null references public.volumes (id) on delete cascade,
  sort_order int not null default 0,
  storage_path text not null,
  alt text default '',
  created_at timestamptz not null default now(),
  unique (volume_id, sort_order)
);

create index if not exists pages_volume_idx on public.pages (volume_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists series_updated_at on public.series;
create trigger series_updated_at
  before update on public.series
  for each row execute function public.set_updated_at();

drop trigger if exists volumes_updated_at on public.volumes;
create trigger volumes_updated_at
  before update on public.volumes
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.layouts enable row level security;
alter table public.series enable row level security;
alter table public.volumes enable row level security;
alter table public.pages enable row level security;

-- Layouts: public read
create policy "layouts_public_read" on public.layouts
  for select using (true);

-- Profiles: own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Series: public read published; owners read/write all
create policy "series_public_read" on public.series
  for select using (status = 'published');

create policy "series_owner_read" on public.series
  for select using (auth.uid() = owner_id);

create policy "series_owner_insert" on public.series
  for insert with check (auth.uid() = owner_id);

create policy "series_owner_update" on public.series
  for update using (auth.uid() = owner_id);

create policy "series_owner_delete" on public.series
  for delete using (auth.uid() = owner_id);

-- Volumes: public read published volumes in published series (or any published volume)
create policy "volumes_public_read" on public.volumes
  for select using (
    status = 'published'
    and exists (
      select 1 from public.series s
      where s.id = volumes.series_id and s.status = 'published'
    )
  );

create policy "volumes_owner_read" on public.volumes
  for select using (
    exists (
      select 1 from public.series s
      where s.id = volumes.series_id and s.owner_id = auth.uid()
    )
  );

create policy "volumes_owner_insert" on public.volumes
  for insert with check (
    exists (
      select 1 from public.series s
      where s.id = series_id and s.owner_id = auth.uid()
    )
  );

create policy "volumes_owner_update" on public.volumes
  for update using (
    exists (
      select 1 from public.series s
      where s.id = volumes.series_id and s.owner_id = auth.uid()
    )
  );

create policy "volumes_owner_delete" on public.volumes
  for delete using (
    exists (
      select 1 from public.series s
      where s.id = volumes.series_id and s.owner_id = auth.uid()
    )
  );

-- Pages: public read when volume+series published; owners full access
create policy "pages_public_read" on public.pages
  for select using (
    exists (
      select 1 from public.volumes v
      join public.series s on s.id = v.series_id
      where v.id = pages.volume_id
        and v.status = 'published'
        and s.status = 'published'
    )
  );

create policy "pages_owner_read" on public.pages
  for select using (
    exists (
      select 1 from public.volumes v
      join public.series s on s.id = v.series_id
      where v.id = pages.volume_id and s.owner_id = auth.uid()
    )
  );

create policy "pages_owner_insert" on public.pages
  for insert with check (
    exists (
      select 1 from public.volumes v
      join public.series s on s.id = v.series_id
      where v.id = volume_id and s.owner_id = auth.uid()
    )
  );

create policy "pages_owner_update" on public.pages
  for update using (
    exists (
      select 1 from public.volumes v
      join public.series s on s.id = v.series_id
      where v.id = pages.volume_id and s.owner_id = auth.uid()
    )
  );

create policy "pages_owner_delete" on public.pages
  for delete using (
    exists (
      select 1 from public.volumes v
      join public.series s on s.id = v.series_id
      where v.id = pages.volume_id and s.owner_id = auth.uid()
    )
  );

-- Storage bucket (run in dashboard or storage API): comic-pages, public read for published paths
-- See supabase/README.md for bucket policies.
