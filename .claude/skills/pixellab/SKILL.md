---
name: pixellab
description: Generate ANY 2D pixel-art graphic for the game from text via the PixelLab API — menus/UI, icons, single sprites/props, seamless Wang terrain tilesets, map objects/buildings, and 8-direction characters/creatures. Use whenever the game needs new pixel art of any kind. Requires PIXELLAB_API_KEY in the environment. Runs fully server-side — no app install, no file upload.
license: MIT
metadata:
  author: Awakened Calamity (in-repo)
---

# PixelLab — all-purpose pixel-art generator

One script, `pixellab_gen.py`, generates every graphical asset the game needs by
calling PixelLab's REST API v2. Generation happens on PixelLab's servers; this
skill orchestrates the request, polls async jobs, and saves the result. Headless
/ browser-only — nothing installs locally and no files are uploaded.

## Requirements
- `PIXELLAB_API_KEY` in the environment (get a token at https://www.pixellab.ai).
- Outbound HTTPS to `api.pixellab.ai` (verified reachable here).
- Python 3 (stdlib only).

## How generation works (the mental model)
You give a **text description** (a prompt) plus a size; PixelLab's model renders
pixel art that follows it. You steer it with optional controls:
- `--view` (e.g. `high top-down`, `low top-down`, `side`) — camera angle.
- `--no-background` (image mode) — transparent background for sprites/icons.
- `--seed N` — same seed + same prompt = reproducible result.
- Style consistency across many assets is done by reusing seeds/prompts and
  (in the API) color/style reference images — important when you want a whole
  town or a creature set to look like one coherent style.
Costs a small per-asset fee in PixelLab credits; expect to re-roll for quality.

## Subcommands
```
# Menus / UI / icons / single props / backgrounds (synchronous)
python3 pixellab_gen.py image --description "fantasy RPG menu panel, ornate wood frame, parchment" \
  --width 240 --height 160 --out data/art/menu_panel.png
python3 pixellab_gen.py image --description "health potion icon" --no-background \
  --width 32 --height 32 --out data/art/icons/potion.png

# Seamless Wang terrain tileset (feeds the wang8_lut autotiler)
python3 pixellab_gen.py tileset --lower "grass" --upper "dirt path" --size 16 \
  --outdir data/tilesets/generated/grass_dirt

# Map object / building / prop
python3 pixellab_gen.py mapobject --description "thatched-roof cottage" \
  --width 64 --height 64 --outdir data/art/objects

# Creature / character, 8 directions (downloads each rotation sprite)
python3 pixellab_gen.py character --description "stylized goblin warrior" \
  --width 48 --height 48 --outdir data/art/characters

# Standalone 8-direction object
python3 pixellab_gen.py object --description "wooden treasure chest" --size 64 \
  --outdir data/art/objects
```
Always run with the key in the env: `PIXELLAB_API_KEY=xxx python3 ...`.

## Outputs by mode
- **image** → one PNG at `--out`.
- **tileset** → one PNG per corner-named Wang tile + `manifest.json`.
- **mapobject / object / character** → one PNG per direction (rotation) plus a
  `*.json` with the full PixelLab detail (urls, animations, metadata).

## Wiring into the game (manual, after review)
This skill produces raw art. Integrating it is a second step done deliberately
so the art can be reviewed first:
- Tilesets → pack into a sheet + write `<tileset>.autotile.json` (wang8_lut),
  per `tools/build_ac_ground.py`; register in `data/tilesets/_index.json`.
- Map objects/buildings → use as overlay tiles/stamps in the map editor.
- Characters/creatures → assemble rotation/animation sprite sheets for the
  renderer / NPC system.
- Menus/UI/icons → drop into `src/assets/` (replacing placeholder chrome).

## Notes
- Never hardcode the key; pass it via the environment per run.
- More PixelLab endpoints exist (4-dir characters, animations, isometric tiles,
  sidescroller tilesets, inpaint/edit, background removal) — extend the script if
  needed; they follow the same create → poll → download pattern.
