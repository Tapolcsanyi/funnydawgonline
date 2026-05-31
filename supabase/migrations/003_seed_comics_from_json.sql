-- Seed comics catalog from data/comics.json (one-time import)
-- Prerequisites: 001_initial.sql, 002_seed_layouts.sql, and at least one signed-up user (profiles row).
-- Page images use site: paths (served from this repo) until you upload to Storage.

do $$
declare
  v_owner uuid;
  v_series_id uuid;
  v_volume_id uuid;
begin
  select id into v_owner from public.profiles order by created_at asc limit 1;
  if v_owner is null then
    raise exception 'No profile found. Sign up at /account/sign-up.html first, then run this script again.';
  end if;

  -- Series: Marrventure
  insert into public.series (owner_id, slug, title, description, artist_name, status, sort_order)
  values (
    v_owner,
    'marrventure',
    'Marrventure',
    'Comics by Ian P. Hoffman.',
    'Ian P. Hoffman',
    'published',
    0
  )
  on conflict (owner_id, slug) do update set
    title = excluded.title,
    description = excluded.description,
    artist_name = excluded.artist_name,
    status = excluded.status,
    sort_order = excluded.sort_order
  returning id into v_series_id;

  insert into public.volumes (series_id, slug, title, layout_id, artist_name, status, sort_order, published_at)
  values (
    v_series_id,
    'ts-dont-go-anywhere',
    'ts dont go anywhere',
    'top-to-bottom',
    'Ian P. Hoffman',
    'published',
    0,
    now()
  )
  on conflict (series_id, slug) do update set
    title = excluded.title,
    layout_id = excluded.layout_id,
    artist_name = excluded.artist_name,
    status = excluded.status,
    sort_order = excluded.sort_order,
    published_at = excluded.published_at
  returning id into v_volume_id;

  insert into public.pages (volume_id, sort_order, storage_path, alt) values
    (v_volume_id, 0, 'site:funnydawgonline-icon.png', 'Page 1'),
    (v_volume_id, 1, 'site:funnydawgonline-icon.png', 'Page 2'),
    (v_volume_id, 2, 'site:funnydawgonline-icon.png', 'Page 3')
  on conflict (volume_id, sort_order) do update set
    storage_path = excluded.storage_path,
    alt = excluded.alt;

  -- Series: Layout demos
  insert into public.series (owner_id, slug, title, description, artist_name, status, sort_order)
  values (
    v_owner,
    'layout-demos',
    'Layout demos',
    'Examples of each reading layout.',
    'Ian P. Hoffman',
    'published',
    1
  )
  on conflict (owner_id, slug) do update set
    title = excluded.title,
    description = excluded.description,
    artist_name = excluded.artist_name,
    status = excluded.status,
    sort_order = excluded.sort_order
  returning id into v_series_id;

  -- Volume: top-to-bottom-demo
  insert into public.volumes (series_id, slug, title, layout_id, artist_name, status, sort_order, published_at)
  values (v_series_id, 'top-to-bottom-demo', 'Demo: Top to Bottom', 'top-to-bottom', 'Ian P. Hoffman', 'published', 0, now())
  on conflict (series_id, slug) do update set
    title = excluded.title, layout_id = excluded.layout_id, artist_name = excluded.artist_name,
    status = excluded.status, sort_order = excluded.sort_order, published_at = excluded.published_at
  returning id into v_volume_id;
  insert into public.pages (volume_id, sort_order, storage_path, alt) values
    (v_volume_id, 0, 'site:comic pages/test/page-1.png', 'Page 1'),
    (v_volume_id, 1, 'site:comic pages/test/page-2.png', 'Page 2'),
    (v_volume_id, 2, 'site:comic pages/test/page-3.png', 'Page 3')
  on conflict (volume_id, sort_order) do update set storage_path = excluded.storage_path, alt = excluded.alt;

  -- Volume: bottom-to-top-demo
  insert into public.volumes (series_id, slug, title, layout_id, artist_name, status, sort_order, published_at)
  values (v_series_id, 'bottom-to-top-demo', 'Demo: Bottom to Top', 'bottom-to-top', 'Ian P. Hoffman', 'published', 1, now())
  on conflict (series_id, slug) do update set
    title = excluded.title, layout_id = excluded.layout_id, artist_name = excluded.artist_name,
    status = excluded.status, sort_order = excluded.sort_order, published_at = excluded.published_at
  returning id into v_volume_id;
  insert into public.pages (volume_id, sort_order, storage_path, alt) values
    (v_volume_id, 0, 'site:comic pages/test/page-1.png', 'Page 1 (start at bottom)'),
    (v_volume_id, 1, 'site:comic pages/test/page-2.png', 'Page 2'),
    (v_volume_id, 2, 'site:comic pages/test/page-3.png', 'Page 3 (top)')
  on conflict (volume_id, sort_order) do update set storage_path = excluded.storage_path, alt = excluded.alt;

  -- Volume: left-to-right-demo
  insert into public.volumes (series_id, slug, title, layout_id, artist_name, status, sort_order, published_at)
  values (v_series_id, 'left-to-right-demo', 'Demo: Left to Right', 'left-to-right', 'Ian P. Hoffman', 'published', 2, now())
  on conflict (series_id, slug) do update set
    title = excluded.title, layout_id = excluded.layout_id, artist_name = excluded.artist_name,
    status = excluded.status, sort_order = excluded.sort_order, published_at = excluded.published_at
  returning id into v_volume_id;
  insert into public.pages (volume_id, sort_order, storage_path, alt) values
    (v_volume_id, 0, 'site:comic pages/test/page-1.png', 'Panel 1 (left)'),
    (v_volume_id, 1, 'site:comic pages/test/page-2.png', 'Panel 2'),
    (v_volume_id, 2, 'site:comic pages/test/page-3.png', 'Panel 3 (right)')
  on conflict (volume_id, sort_order) do update set storage_path = excluded.storage_path, alt = excluded.alt;

  -- Volume: right-to-left-demo
  insert into public.volumes (series_id, slug, title, layout_id, artist_name, status, sort_order, published_at)
  values (v_series_id, 'right-to-left-demo', 'Demo: Right to Left', 'right-to-left', 'Ian P. Hoffman', 'published', 3, now())
  on conflict (series_id, slug) do update set
    title = excluded.title, layout_id = excluded.layout_id, artist_name = excluded.artist_name,
    status = excluded.status, sort_order = excluded.sort_order, published_at = excluded.published_at
  returning id into v_volume_id;
  insert into public.pages (volume_id, sort_order, storage_path, alt) values
    (v_volume_id, 0, 'site:comic pages/test/page-1.png', 'Panel 1 (right)'),
    (v_volume_id, 1, 'site:comic pages/test/page-2.png', 'Panel 2'),
    (v_volume_id, 2, 'site:comic pages/test/page-3.png', 'Panel 3 (left)')
  on conflict (volume_id, sort_order) do update set storage_path = excluded.storage_path, alt = excluded.alt;

end $$;
