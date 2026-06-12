# Making custom maps & regions

The game renders maps from three kinds of files — all authentic GBA data, so
anything you build looks identical in fidelity to the real games (it's the same
16×16 metatile art, just rearranged).

## The three layers

1. **Tileset** — `data/tilesets/<name>.png` + `.json`. A pre-rendered sheet of
   16×16 metatiles (16 per row) plus per-metatile `behaviors`/`collisions`.
   ~537 already exist (Kanto/Hoenn/Sinnoh towns, routes, caves, interiors).
2. **Layout** — `data/layouts/[<region>/]<LAYOUT_ID>.json`. The actual grid:
   `width`, `height`, a flat `metatiles` array of tile IDs, a parallel
   `collision` array (0 = walkable, 1 = blocked), and the `tileset` name.
3. **Map** — `data/maps/<region>/<Name>.json`. Metadata wrapper: which layout to
   use, plus `warps`, `connections`, `npcs`, `music`, `weather`, `map_type`.

A region also needs an index `data/maps/<region>_index.json` mapping
`MAP_CONST → filename`, and the region registered in `INDEX_FILES` in
`src/engine/map.js`.

## The map editor

Open **`map-editor.html`** (served over http, e.g. via GitHub Pages or a local
server — not `file://`). It's also launchable from the **RetroPlay hub**
(`index.html`) via the "Map Editor" tile under **Create**. You can:

- Pick any existing tileset and see its full metatile palette.
- Paint with Pencil / Fill (bucket) / Rect / Pick (eyedropper).
- Toggle **Collision** mode to mark blocked tiles (red).
- Toggle **Warp** mode and click tiles to add warps, then set destinations.
- **Export** → downloads `<LAYOUT_ID>.json` and `<Name>.json`.
- **☁ Save to repo** → commits the map to the **`maps`** branch on GitHub
  (Contents API). Files go to the mirrored `data/` paths
  (`data/layouts/<region>/…`, `data/maps/<region>/…`, plus the region index),
  so they can be copied/merged into `main` directly. The `maps` branch is a
  dedicated storage branch for created maps — no game code.
- **☁ Load from repo** → lists every map saved on the `maps` branch and re-opens
  the one you pick (restores tileset, grid, collision, and warps) so you can
  keep editing it.

To install an exported (or repo-saved) map into the game:

1. Put `<LAYOUT_ID>.json` in `data/layouts/<region>/`.
2. Put `<Name>.json` in `data/maps/<region>/`.
3. Add `"MAP_<NAME>": "<Name>"` (and `"<Name>": "<Name>"`) to
   `data/maps/<region>_index.json`.
4. If it's a new region, add it to `INDEX_FILES` in `src/engine/map.js` and run
   `python3 tools/build_tileset_index.py` is **not** needed for this — that's
   only for refreshing the editor's tileset list.

## Jumping into a map to test it

The game honors a startup override:

```
game.html?map=VerdantHollow&region=custom
```

This loads any map directly instead of Pallet Town — handy for testing a map you
just built.

## Generating maps from a description

`tools/make_example_map.py` is the seed of the "describe → generate" workflow:
it composes a layout from named primitives (`rect`, border, scatter) using a
small palette of verified metatile IDs, writes the layout + map + index, and
renders a PNG preview. `VerdantHollow` (the `custom` region) was built this way —
visit `game.html?map=VerdantHollow&region=custom` to walk it.

## Helper tools

- `tools/build_tileset_index.py` — refresh `data/tilesets/_index.json` (the
  editor's tileset dropdown) after adding tilesets.
- `tools/make_example_map.py` — generate the VerdantHollow example map.
