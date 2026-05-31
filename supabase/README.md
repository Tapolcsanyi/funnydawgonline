# Supabase setup

## 1. Create project

1. [supabase.com](https://supabase.com) → New project (Free tier).
2. Copy **Project URL** and **anon public** key.

## 2. Run migrations

In **SQL Editor**, run in order:

1. `migrations/001_initial.sql`
2. `migrations/002_seed_layouts.sql`
3. Sign up once on the site (`/account/sign-up.html`) so a `profiles` row exists
4. `migrations/003_seed_comics_from_json.sql` — imports everything from `data/comics.json` into Postgres
5. `migrations/004_art_and_series_cover.sql` — art table + comic cover column (required for `/upload/`)
6. `migrations/005_art_artist_name.sql` — artist name on art for public `/art/` catalog
7. `migrations/006_art_draft_privacy.sql` — draft art hidden from other accounts (RLS + storage)
8. `migrations/007_storage_owner_delete.sql` — lets creators delete their uploads from Storage when using edit **Delete**

Step 4 is safe to re-run (upserts by slug). Page images use `site:` paths from this repo until you upload to Storage.

## 3. Storage bucket

1. **Storage** → New bucket: `comic-pages`
2. Public bucket: **yes** (objects are still gated by storage policies in migration `006`)
3. Run `006_art_draft_privacy.sql` so draft images are not world-readable
4. **Remove** any policy that allows `SELECT` on all of `comic-pages` (e.g. “public read entire bucket”)

Policies from `006` (summary):

- **SELECT (authenticated):** read files under your own `{user_id}/…` folder (draft previews while editing)
- **SELECT (all):** read files referenced by **published** `art_pieces` or **published** comic `pages`
- **INSERT (authenticated):** `bucket_id = 'comic-pages' AND (storage.foldername(name))[1] = auth.uid()::text`

## 4. Site config

```bash
cp js/config.example.js js/config.local.js
```

Edit `js/config.local.js`:

```javascript
window.SiteConfig = {
  backend: "supabase",
  fallbackToJson: false,
  supabase: {
    url: "https://YOUR_PROJECT.supabase.co",
    anonKey: "YOUR_ANON_KEY",
  },
};
```

`config.local.js` is gitignored. With `backend: "supabase"`, comics are read **only** from Supabase (not `comics.json`).

## 5. Auth redirect URLs

**Authentication** → URL configuration → add your site origin, e.g.:

- `http://localhost:8765`
- `https://yourdomain.com`

## Schema notes

- **Volume status:** `draft` | `published` | `archived`
- **Series status:** same (public catalog uses `published` for both series and volumes)
- **Portable:** tables use standard Postgres; only RLS policies are Supabase-specific
