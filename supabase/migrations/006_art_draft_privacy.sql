-- Block draft art from other accounts (RLS + storage).
-- Run after 004/005. Safe to re-run.

-- Restrictive SELECT: published for everyone; drafts only for owner (when signed in).
drop policy if exists "art_draft_restrict" on public.art_pieces;

create policy "art_draft_restrict" on public.art_pieces
  as restrictive
  for select
  using (
    status = 'published'
    or (auth.uid() is not null and owner_id = auth.uid())
  );

-- Storage: do not allow public read on the whole bucket (draft images live under {user_id}/...).
-- Owners can read their own folder; everyone can read files tied to published art/comics in Postgres.

drop policy if exists "comic_pages_select_owner" on storage.objects;
drop policy if exists "comic_pages_select_published_art" on storage.objects;
drop policy if exists "comic_pages_select_published_comic_pages" on storage.objects;

create policy "comic_pages_select_owner" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'comic-pages'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "comic_pages_select_published_art" on storage.objects
  for select
  using (
    bucket_id = 'comic-pages'
    and exists (
      select 1
      from public.art_pieces ap
      where ap.storage_path = name
        and ap.status = 'published'
    )
  );

create policy "comic_pages_select_published_comic_pages" on storage.objects
  for select
  using (
    bucket_id = 'comic-pages'
    and exists (
      select 1
      from public.pages p
      join public.volumes v on v.id = p.volume_id
      join public.series s on s.id = v.series_id
      where p.storage_path = name
        and p.storage_path not like 'site:%'
        and v.status = 'published'
        and s.status = 'published'
    )
  );
