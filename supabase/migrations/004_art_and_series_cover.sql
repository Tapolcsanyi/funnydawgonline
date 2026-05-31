-- Art uploads + optional comic (series) cover image path

alter table public.series
  add column if not exists cover_storage_path text default '';

create table if not exists public.art_pieces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null,
  title text not null,
  category text default '',
  storage_path text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create index if not exists art_pieces_status_idx on public.art_pieces (status);
create index if not exists art_pieces_owner_idx on public.art_pieces (owner_id);

drop trigger if exists art_pieces_updated_at on public.art_pieces;
create trigger art_pieces_updated_at
  before update on public.art_pieces
  for each row execute function public.set_updated_at();

alter table public.art_pieces enable row level security;

create policy "art_public_read" on public.art_pieces
  for select using (status = 'published');

create policy "art_owner_read" on public.art_pieces
  for select using (auth.uid() = owner_id);

create policy "art_owner_insert" on public.art_pieces
  for insert with check (auth.uid() = owner_id);

create policy "art_owner_update" on public.art_pieces
  for update using (auth.uid() = owner_id);

create policy "art_owner_delete" on public.art_pieces
  for delete using (auth.uid() = owner_id);
