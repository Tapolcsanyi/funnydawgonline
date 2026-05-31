-- Seed layout definitions (matches data/comics.json)
insert into public.layouts (id, label, viewer) values
  ('top-to-bottom', 'Top to bottom', '{"mode":"stacked","reverseStack":false,"scrollToBottomOnLoad":false,"carouselRtl":false}'::jsonb),
  ('bottom-to-top', 'Bottom to top', '{"mode":"stacked","reverseStack":true,"scrollToBottomOnLoad":true,"carouselRtl":false}'::jsonb),
  ('left-to-right', 'Left to right', '{"mode":"carousel","reverseStack":false,"scrollToBottomOnLoad":false,"carouselRtl":false}'::jsonb),
  ('right-to-left', 'Right to left', '{"mode":"carousel","reverseStack":false,"scrollToBottomOnLoad":false,"carouselRtl":true}'::jsonb)
on conflict (id) do update set
  label = excluded.label,
  viewer = excluded.viewer;
