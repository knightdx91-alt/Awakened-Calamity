# Full Tilesheet Generation Checklist — modeled on RPG Maker MZ's RTP

This enumerates **what actually sits on RPG Maker MZ's tilesheets**, sheet by
sheet, so we have an exact reference for what a "complete" tilesheet must cover.
It is modeled on the MZ **Outside** (town/overworld) RTP set; Inside and Dungeon
follow the same sheet structure and are listed at the end.

Each line maps to the `pixellab` skill mode that produces it, with a rough credit
cost. We are NOT copying MZ's art (it's copyrighted) — we're matching its
*coverage* with our own generated tiles.

## How MZ splits a tileset (the 9 sheets)
| Sheet | Pixels | Holds | Autotile? | Our gen mode |
|------|--------|-------|-----------|--------------|
| **A1** | 768×576 | **animated** terrain (water/waterfall/lava) | yes | `tileset` (+manual anim) |
| **A2** | 768×576 | ground/floor terrain | yes (autotile) | `tileset` |
| **A3** | 768×384 | building **roofs & walls** | yes (building) | `mapobject`/`tileset` |
| **A4** | 768×720 | **walls** (wall-top + wall-side) | yes (wall) | `mapobject`/`tileset` |
| **A5** | 384×768 | plain ground, stairs, ledges | no | `image` |
| **B** | 768×768 | objects/decoration (256 cells) | no | `mapobject`/`object` |
| **C** | 768×768 | objects/nature (256 cells) | no | `mapobject`/`object` |
| **D** | 768×768 | extra objects (optional) | no | `mapobject`/`object` |
| **E** | 768×768 | extra objects (optional) | no | `mapobject`/`object` |

Credit costs: `image` = 1 (confirmed); `tileset` ≈ 4 (measured); `mapobject`/
`object` are async multi-step — confirm on first run.

---

## OUTSIDE_A1 — animated terrain autotiles  (`tileset`)
The bottom-most water/lava layers; MZ animates them over 3 frames.
- [x] sea / ocean (deep water)            — have `02` pond water (reuse/adapt)
- [ ] shallow water / shore (over sea)
- [ ] waterfall (vertical, animated)
- [ ] waterfall basin / foam
- [ ] swamp / poison water (tinted)
- [ ] lava (animated)                       — have `09_stone_lava_v2` ✅

## OUTSIDE_A2 — ground/floor autotiles  (`tileset`)
The walkable ground terrains with auto-borders. *Most of our first batch is here.*
- [x] grass (standard)                      — `02/03` grass ✅
- [ ] grass — flowered / variant
- [ ] grass — dark / forest                 — `07_grass_forest` (close) ✅
- [ ] dirt / bare earth                     — ⚠️ redo (came out brick; use `image` A5 instead)
- [ ] dirt path / trail (over grass)        — ⚠️ redo as "muddy trail"
- [ ] stone / cobblestone road             — `05_grass_cobble` (cobble) ✅
- [x] sand / beach                           — `03_grass_sand`, `04_sand_sea` ✅
- [ ] desert sand (dunes)                    — `10` (too orange, redo)
- [ ] farmland / tilled soil
- [ ] snow                                   — `08_snow_ice` (low contrast, redo)
- [ ] wasteland / cracked earth

## OUTSIDE_A3 — building roofs & walls  (autotile pairs)
Buildings in MZ = a **roof autotile** + a **wall autotile**, in color variants.
- [ ] roof — red/orange tile
- [ ] roof — blue tile
- [ ] roof — green / grey
- [ ] roof — thatch / straw
- [ ] wall — brick / stone
- [ ] wall — wood plank / log
- [ ] wall — plaster / stucco (with windows)

## OUTSIDE_A4 — tall walls  (wall-top + wall-side autotile)
- [ ] stone castle wall (tall)
- [ ] rock cliff face (vertical)            — `06_dirt_cliff` partial ✅
- [ ] city/town wall
- [ ] wooden palisade wall

## OUTSIDE_A5 — plain ground & stairs  (`image`, ~1 each)
Non-auto flat fills and steps.
- [ ] flat grass fill
- [ ] flat dirt fill
- [ ] flat sand fill
- [ ] flat stone/pavement fill
- [ ] wooden plank fill
- [ ] stairs (stone, up/down)
- [ ] stairs (wood)
- [ ] ledge / cliff edge strip

---

## OUTSIDE_B — town objects & structure props  (`mapobject` / `object`)
The big decoration sheet. Actual MZ Outside_B inventory:
- [ ] door — wood (closed / open)
- [ ] door — double / large
- [ ] window (lit / unlit)
- [ ] awning / shop canopy
- [ ] signboard / hanging sign
- [ ] signpost (directional)
- [ ] fence — wood (straight + corners)
- [ ] fence — hedge
- [ ] gate
- [ ] well
- [ ] lamp post / street lantern
- [ ] barrel
- [ ] crate / box
- [ ] jar / pot / urn
- [ ] sacks / bags
- [ ] market stall / vendor table
- [ ] cart / wagon
- [ ] bench
- [ ] mailbox / post
- [ ] flag / banner
- [ ] bridge — wood (horizontal/vertical)
- [ ] bridge — stone
- [ ] dock / pier planks
- [ ] tent
- [ ] campfire
- [ ] hay bale / haystack
- [ ] fountain
- [ ] statue / monument
- [ ] flower bed / planter

## OUTSIDE_C — nature objects  (`mapobject`)
Actual MZ Outside_C inventory (trees, rocks, foliage):
- [ ] tree — broadleaf (small / medium / large)
- [ ] tree — pine/fir (small / medium / large)
- [ ] tree — palm
- [ ] tree — dead / bare
- [ ] tree — autumn / colored variant
- [ ] bush / shrub
- [ ] hedge clump
- [ ] flowers (clusters, 3–4 colors)
- [ ] tall grass tuft
- [ ] reeds / cattails (waterside)
- [ ] rock — small
- [ ] rock — large / boulder
- [ ] stone pile / rubble
- [ ] stump
- [ ] fallen log
- [ ] mushrooms
- [ ] cactus / desert plant
- [ ] snow-covered tree / bush (winter variants)
- [ ] gravestone / cross

## OUTSIDE_D / E — extras (optional)  (`mapobject`)
MZ leaves these for expansion; ours could hold:
- [ ] ruins / broken pillars
- [ ] crops (rows: wheat, corn, etc.)
- [ ] ship / boat pieces
- [ ] large landmark buildings (church, tower, windmill)
- [ ] System-themed props (your setting: terminals, glyphs, anomalies)

---

## OTHER SETS (same 9-sheet structure, future)
- [ ] **Inside** — A1 (none/animated), A2 floors/carpets, A4 inside walls, A5
  floors; B/C = furniture (beds, tables, chairs, shelves, fireplaces, rugs,
  doors, stairs, kitchen, clutter).
- [ ] **Dungeon** — A1 lava/water, A2 cave floor, A4 cave/stone walls, A5 floors;
  B/C = pillars, torches, chests, traps, bones, crystals, statues, doors.
- [ ] **World map** — A1 sea, A2 grass/forest/desert/snow/mountain autotiles,
  B = town/cave/castle map icons.

---

## Budgets (with our gen modes)
- **Outside_A (terrain, A1–A5):** ~20 autotiles+fills. Autotiles ≈ 12 × ~4 +
  fills ≈ 8 × 1 → **~55 generations**.
- **Outside_B+C (objects/nature):** ~55 items × (1–3 rolls) → **~80–150**.
- **One complete Outside set:** **~135–205 generations** → comfortably inside a
  single ~$9 PixelLab month's credit allotment.
- **Town MVP (subset that builds one playable town):** see list below ≈ **35–45**.

### Town MVP (do first)
Terrain: grass↔water, grass↔path, grass↔cobble · Fills: grass, dirt, plank,
stone · Buildings: small/medium/large house (roof+wall), door, window ·
Props: fence, well, lamp, barrel, signpost, market stall · Nature: tree ×2,
bush, flowers, rock · Interactable: chest.

---

## After generation — engine integration (my side, no credits)
1. `tileset` output → pack into a sheet + write `<tileset>.autotile.json`
   (`wang8_lut`); register in `data/tilesets/_index.json`.
2. Buildings/props → import as overlay tiles / map-editor stamps.
3. Place into a real map (layout + map JSON), deploy to Pages, walk it.

## Sources (structure reference)
- RPG Maker MV/MZ tileset sheet specs (A1–A5 dims & roles, B–E objects):
  community guide + RPG Maker Wiki.
