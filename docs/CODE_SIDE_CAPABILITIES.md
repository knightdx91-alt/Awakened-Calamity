# Code-Side Capabilities — handoff for Claude Design

**Audience:** the *design* assistant (claude.ai/design) + whoever pulls this from
GitHub. It can READ this repo but can't push. This file is the inventory of what the
**code side** (this repo + Claude Code) already has, so design can coordinate and hand
work back. Division of labor: **design = authoritative art & look; code = implement it
into the game engine, generate supplementary content, and assemble maps.**

Repo: `knightdx91-alt/Awakened-Calamity` (vanilla JS + canvas; no build system).

---

## 1. Art-generation pipelines wired up (code can call these)
- **PixelLab** (`.claude/skills/pixellab/pixellab_gen.py`) — text → pixel art, server-side,
  no upload. Modes:
  - `image` — any single sprite/tile/icon/UI panel (returns PNG). *reliable*
  - `tileset` — 16-tile Wang terrain-transition set (lower↔upper) at 16/32px
  - `mapobject` / `character` / `object` — props & multi-direction sprites
  - Key is configured as env `Tripo_Api`? no — PixelLab key is its own env var.
- **Tripo** (`.claude/skills/tripo-text-to-3d/tripo_gen.py`) — text → `.glb` 3D model
  (for the future Unity rebuild). Key in env `Tripo_Api`.
- So: code can MINT new pixel art or 3D on demand. Design's hand-authored art is
  preferred where it exists; PixelLab fills gaps / bulk content.

## 2. Building system (modular, RPG-Maker-style)  `tools/`
- `build_building_tileset.py` — turns a material's 5 source fills (roof_fill, roof_top,
  wall_plain, wall_door, wall_window) into a **full building tilesheet** (roof 9-set with
  corners + inner corners, wall pieces) and bakes an engine tileset (`data/tilesets/bld_*`).
- `build_house.py` — assembles a building of **any footprint**:
  - rectangular, **L-shaped** (autotiled roof, inner corners), **hip roofs**
    (ridge + 4 facets), keep, and **curtain-wall castle** (perimeter + towers + gatehouse).
- **6 materials exist**: cottage, stone, thatch, blue, wood, shop (`data/art/building/*`).
- ⭐ This builder can consume **design's `ac-buildings-16` kit** directly — point it at the
  official roof/wall/door tiles instead of the PixelLab fills.

## 3. Map generation  `tools/gen_zone.py`
- Procedural zone generator: terrain corner-grid (island/lake/coast) → **autotiled** base
  (bakes plain `metatiles[]`) → **object stamping** (overlay layer) → playable `layout`+`map`
  JSON + preview. Handles clean-fill overrides and building placement.
- Designed to consume any 16-corner Wang tileset + object/building sprites.

## 4. UI tooling
- `tools/nine_slice.py` — slices a UI frame into a 9-patch + emits CSS `border-image`
  (so design's panel art scales to any size). Output: `data/art/ui/ui.css`.
- A PixelLab UI kit exists (`data/art/ui/`) but **see the conflict note below** — design's
  "System OS" look supersedes it.

## 5. Assets already generated (code-made; design's official art may replace these)
- Terrain tilesets: `data/tilesets/generated/*`, `data/tilesets/outside/*` (PixelLab Wang sets)
- Objects: `data/art/objects/*` (houses, trees, props)
- Building materials: `data/art/building/*`
- Baked engine sheets: `data/tilesets/bld_*`, `px_*`
- Generated maps: `data/maps/awakened/Gen*.json` (+ previews)

## 6. Installed Claude Code skills (capabilities available to code)
2D/3D/graphics: `pixellab`, `tripo-text-to-3d`, `2d-games`, `game-developer`,
`3d-modeling`, `blender-3d-modeling`, `shader-techniques`, `r3f-best-practices`,
`three-best-practices`, `team3d-*` (animation/rigging/texturing/etc.), `cad-agent`.

## 7. Engine target formats (so design exports map cleanly)
- **tileset**: PNG sheet, 16 tiles/row, + `<name>.json` `{metatiles_per_row, behaviors[], collisions[]}`
- **layout**: `{width,height,tileset, metatiles[], collision[], overlay_tileset?, overlay[]}`
- **map**: `{name,region,layout, warps,npcs,connections,…}`; boot `game.html?map=X&region=Y`
- **autotile**: `<tileset>.autotile.json` `wang8_lut` (9-tile scheme) for the editor brush
- ⏳ **Pending engine task** (design bundle asks for it): variable tile size (16 *and* 32px),
  per design's `map-editor/index.html` reference.

## 8. How design hands work back to code
Design can't push, so: **push to a side branch** (like `design-bundle`) / drop files in the
Drive "Awakened Calamity Design System" folder / or describe it. Code then reconciles with
current `main`. Reverse handoff = this file.

## 9. Open art-direction decision (needs owner)
Today's code generated a **FireRed parchment** PixelLab UI kit; design's bundle mandates a
**dark "System OS" cyan** UI as the *only* chrome. These conflict — owner should confirm we
adopt **System OS** (recommended; it's the authoritative design system) and retire the
parchment kit. Likewise design's **official `ac-*` tilesets** are the source of truth; the
PixelLab terrain sets become supplementary/experimental.
