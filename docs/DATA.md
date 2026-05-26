# Comics database

## File

All comic data lives in **`data/comics.json`**.

## Structure

```json
{
  "layouts": [
    { "id": "top-to-bottom", "label": "Top to bottom" }
  ],
  "series": {
    "0": {
      "title": "Marrventure",
      "artistName": "Ian P. Hoffman",
      "artistId": null,
      "description": "Optional series blurb",
      "volumes": {
        "0": {
          "title": "Volume title",
          "artistName": "Ian P. Hoffman",
          "artistId": null,
          "layout": "top-to-bottom",
          "images": [
            { "src": "assets/comics/.../001.png", "alt": "Page 1" }
          ]
        }
      }
    }
  }
}
```

### Levels

| Level | JSON path | Page |
|-------|-----------|------|
| **Series list** | `series` | `comics/` |
| **Volume list** | `series["0"].volumes` | `comics/series/0/` |
| **Reader** | `series["0"].volumes["1"]` | `comics/series/0/volume/1/` |

### IDs

- **Series** and **volume** ids are numeric strings: `"0"`, `"1"`, …
- Lookup: `database.series[seriesId].volumes[volumeId]`
- Comic **0** is valid — use `id == null` checks, not `if (!id)`

### Layouts

- Allowed values are listed in `layouts[]`.
- Each volume sets `layout` to one of those ids.
- The viewer validates against `layouts` before rendering.

### Artists

- Default artist on the **series**; override on a **volume** with `volume.artistName`.
- `artistId` is reserved for future lookup in `data/artists.json`.

## Site pages & scripts

| Page | Script | Shared module |
|------|--------|----------------|
| `comics/index.html` | `comics-list.js` | `comics-db.js` |
| `comics/series/N/index.html` | `series-page.js` | `comics-db.js` |
| `comics/series/N/volume/M/index.html` | `media-viewer.js` | `comics-db.js` |

`body` attributes on volume pages:

```html
data-site-root="../../../../.."
data-series-id="0"
data-volume-id="0"
data-media-type="comic"
```

## Adding content

1. **New volume** in an existing series: add `"1": { ... }` under `series["0"].volumes`.
2. **New series**: add `"2": { title, volumes: { "0": { ... } } }` under `series`.
3. Copy an existing `comics/series/0/volume/0/index.html` folder, update `data-series-id` / `data-volume-id` (and paths if depth matches).

## Images

Paths in `images[].src` are relative to the **site root**.

## Local preview

```bash
npx serve .
```

Open `http://localhost:3000/comics/` and click through series → volumes → reader.
