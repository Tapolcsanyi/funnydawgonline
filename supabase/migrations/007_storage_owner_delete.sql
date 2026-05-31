-- Allow owners to delete files in their own comic-pages folder (edit page delete).

drop policy if exists "comic_pages_delete_owner" on storage.objects;

create policy "comic_pages_delete_owner" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'comic-pages'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
