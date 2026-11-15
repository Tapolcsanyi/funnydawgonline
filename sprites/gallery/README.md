# Sprite gallery files

Drop PNG sheets in this folder and register them in `data/sprites.json`.

## Animated GIFs

Drop a `.gif` in this folder and add a manifest row — **no** `rows` / `cols` needed. The vault plays the file as-is (browser loop). `.gif` in the filename is enough; you can also set `"type": "gif"`.

```json
{
  "id": "rook-idle",
  "title": "rook idle",
  "src": "gallery/Rook Idle.gif",
  "tags": ["rook"]
}
```

## Easiest workflow (RPG 4×4 sheets)

For a standard sheet — **4 rows × 4 columns**, rows are:

| Row | Direction |
|-----|-----------|
| 0 | front (toward camera) |
| 1 | left |
| 2 | back |
| 3 | right |

Each row plays **left → right** in a loop on the vault page.

**Minimal JSON** (frame size is detected from the image):

```json
{
  "id": "slime-walk",
  "title": "slime walk",
  "src": "gallery/slime-walk.png",
  "rows": 4,
  "cols": 4,
  "fps": 8,
  "tags": ["enemy"]
}
```

Add one object per sheet. Set `src` to the file under `sprites/` (e.g. `gallery/my-sheet.png`).

## Optional fields

| Field | Default | Meaning |
|-------|---------|---------|
| `src` | required | Path under `sprites/` |
| `rows` | `4` | Grid rows |
| `cols` | `4` | Frames per direction (columns) |
| `fps` | `8` | Playback speed (`0` = frozen on frame 0) |
| `frameWidth` / `frameHeight` | auto | Set only if auto-detect is wrong (rounding) |
| `tags` | `[]` | Optional labels in the UI |

## Other grid sizes

If a sheet is **3×4** or **4×6**, set `rows` and `cols` to match. Directions still use rows **0–3** when `rows >= 4`; extra rows are ignored unless you add more directions later.

## Legacy horizontal strip

Single row strip (no directions):

```json
{
  "id": "fx-spark",
  "title": "spark",
  "src": "gallery/spark.png",
  "rows": 1,
  "cols": 6,
  "fps": 12
}
```