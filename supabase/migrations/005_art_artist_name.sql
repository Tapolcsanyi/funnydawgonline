-- Display name on published art (public catalog does not join profiles)
alter table public.art_pieces
  add column if not exists artist_name text default '';
