# Building Tilesheets — full material system (RPG-Maker-style)

Goal: complete, reusable building tilesheets **per material**, so houses, shops,
and castles can be assembled correctly at any size — the way RPG Maker's A3/A4
(+B) building tiles work. We generate the *source fills* with PixelLab and
**synthesize the full edge/corner set** so every piece is consistent.

## Per-material piece inventory
Each material = a small set of generated **fill** tiles, expanded by the
synthesizer (`tools/build_building_tileset.py`) into the full set:

**Roof (9-piece autotile — makes any rectangular roof correct):**
`roof_tl roof_t roof_tr` / `roof_l roof_c roof_r` / `roof_bl roof_b roof_br`
- `roof_t` = ridge (top), `roof_b` = eave overhang (bottom, darkened),
  `roof_l/r` = side slope (shaded), corners combine ridge/eave + side shade,
  `roof_c` = shingle fill.

**Wall (face with height):**
`wall_c` (plain face) · `wall_l` / `wall_r` (shaded side edges) ·
`wall_door` · `wall_window`

**Generated source fills needed per material (PixelLab `image` mode):**
`roof_fill, roof_top, wall_plain, wall_door, wall_window`  (5 gens/material)

## Materials (roadmap)
- [x] **cottage** — red clay roof + beige plaster walls (done)
- [~] **stone keep / castle** — slate + grey stone block, battlement top, gate,
  arrow-slit (in progress)
- [ ] thatch cottage (straw roof + wood wall)
- [ ] blue-roof townhouse
- [ ] wood cabin (log walls + wood roof)
- [ ] shop / inn variants (signage)

## Correct-building status
- [x] **Rectangular** buildings, any W×H, with ridge + eave overhang + tall
      walled face + windows + door + shaded sides/corners.
- [ ] **Hip/pitched** roofs (diagonal ridges where roof sections meet).
- [ ] **L-shaped / multi-wing** buildings (needs inner-corner roof tiles).
- [ ] **Castle features**: towers (round), crenellated wall runs, gatehouse.

## How it's used
1. `tools/build_building_tileset.py --material <dir> --name <ts>` bakes an
   engine tilesheet (`data/tilesets/<ts>.png/.json`, registered) usable in the
   map editor — like an RPG Maker building sheet.
2. `tools/build_house.py` / the zone generator assemble buildings from the
   synthesized pieces and stamp them onto maps (overlay layer).

## Honest scope note
Full RPG-Maker RTP parity is hundreds of tiles across many materials + interiors
+ dungeon + world. This system makes each material cheap to add (5 gens + auto
edge/corner synthesis), but breadth (all materials, hip roofs, towers) is an
incremental rollout, not one batch.
