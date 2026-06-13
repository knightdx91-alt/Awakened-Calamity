---
name: pixellab-tileset
description: Generate a pixel-art Wang/terrain-transition TILESET from text descriptions using the PixelLab API (lower terrain + upper terrain, e.g. grass↔water, sand↔stone). Use when the user needs new 16x16 or 32x32 tile art for the 2D map system, especially seamless autotile/Wang tiles that feed the engine's wang8_lut autotiler. Requires PIXELLAB_API_KEY in the environment. Runs fully server-side — no app install, no file upload.
license: MIT
metadata:
  author: Awakened Calamity (in-repo)
---

# PixelLab → Wang Tileset

Generate a seamless terrain-transition tileset (the 16-tile corner/Wang set the
map autotiler uses) from two text descriptions — a `lower` terrain and an
`upper` terrain — via the PixelLab REST API v2. Generation runs on PixelLab's
servers; this skill orchestrates create → poll → download and saves each tile
as a PNG plus a manifest. Headless / browser-only friendly.

## Requirements
- `PIXELLAB_API_KEY` in the environment (PixelLab account API token).
  Get one in a browser at https://www.pixellab.ai (API section). Cost is ~$0.02
  per tileset.
- Outbound HTTPS to `api.pixellab.ai` (verified reachable here).
- Python 3 (stdlib only).

## Usage
```
PIXELLAB_API_KEY=xxx python3 .claude/skills/pixellab-tileset/pixellab_tileset.py \
  --lower "deep blue ocean water with gentle waves" \
  --upper "golden sandy beach" \
  --transition "wet sand with foam" \
  --size 16 \
  --outdir data/tilesets/generated/water_sand
```
Flags:
- `--lower` / `--upper` (required) — base terrains the set blends between.
- `--transition` (optional) — describe the boundary band.
- `--size` 16 or 32 (default 16).
- `--seed N` — reproducible generation.
- `--outdir` — where tiles + manifest.json are written.

## Output
- One PNG per tile, named by its corner pattern (e.g. `NW+NE+SW+SE.png`,
  `NE.png`, `none.png`) — these corner names map directly to a Wang/corner
  autotile lookup.
- `manifest.json` listing every tile's id, corner-name, corners {NW,NE,SW,SE},
  and filename, plus tile_size and terrain types.

## Wiring into the engine (next step, not automated here)
The engine autotiler reads `<tileset>.autotile.json` (`wang8_lut`). After
generating, the corner-named tiles + manifest can be packed into a single sheet
and a matching `wang8_lut` written (see `tools/build_ac_ground.py` for the
existing pattern). This skill stops at producing the raw tiles + manifest so you
can review the art before baking it into a tileset.

## Notes
- Never hardcode the key; pass it via the environment per run.
- PixelLab also has `/tilesets-sidescroller` (platformer) and character/sprite
  endpoints — extend the script if you need those.
