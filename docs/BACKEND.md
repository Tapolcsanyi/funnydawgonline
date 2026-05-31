# Backend architecture

## Overview

- **Public site** reads comics through `ComicsApi` (adapter pattern).
- **Default backend:** `json` → `data/comics.json` (unchanged behavior).
- **Production backend:** `supabase` → Postgres + Auth + Storage (comics live in the database, not `comics.json`).
- `data/comics.json` is only used as the source for the one-time SQL seed (`supabase/migrations/003_seed_comics_from_json.sql`).
- Public **Art** (`/art/`) loads published rows from `art_pieces` via `ComicsApi.listPublicArt()` (not `data/art.json`).

## Volume status

`volumes.status` and `series.status`:

| Value | Meaning |
|-------|---------|
| `draft` | Owner only; not on public catalog |
| `published` | Visible to everyone |
| `archived` | Hidden (future use) |

App helper: `ComicModels.isDraft(status)` / `isPublished(status)`.

## File map

| Path | Role |
|------|------|
| `js/comics-api.js` | Stable API used by pages |
| `js/adapters/json-adapter.js` | Current static JSON |
| `js/adapters/supabase-adapter.js` | Supabase implementation |
| `js/comic-models.js` | Shared types, viewer config, slugs |
| `js/config.js` | Default config (`backend: "json"`) |
| `js/config.local.js` | Your secrets (gitignored) |
| `supabase/migrations/` | Portable SQL schema + RLS |

## Pages

| URL | Purpose |
|-----|---------|
| `/account/login.html` | Sign in |
| `/account/sign-up.html` | Register |
| `/account/` | My series |
| `/comics/read/?series=…&volume=…` | Read a published volume (Supabase) |
| `/comics/series-view/?series=…` | List volumes for a published series |
| `/my-work/` | List your comics (by volume) and art with edit links |
| `/edit/` | Edit art or comic volume (`?type=art&id=…` or `?type=comic&series=…&volume=…`) |
| `/upload/` | Create series/volumes, upload pages, publish |

## Enable Supabase

See `supabase/README.md`.
