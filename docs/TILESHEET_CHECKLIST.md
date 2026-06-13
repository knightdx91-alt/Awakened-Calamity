# Full Tilesheet Generation Checklist (RPG-Maker-MZ-style)

A target list for building a **complete town/outdoor tilesheet** for Awakened
Calamity, organized the way RPG Maker MZ structures its tilesets. Use it as the
"is it complete?" reference when generating art with the `pixellab` skill.

## How to read this
Each item notes the **PixelLab mode** to generate it and a **rough credit cost**
(trial/subscription "generations"):

| PixelLab mode | Use for | ~credits each |
|---|---|---|
| `tileset` | seamless terrain autotiles (A1–A2) | **~4** |
| `image` | flat ground tiles, single props, UI | **~1** |
| `mapobject` | buildings/props placed on the map (B–E, A3) | ~1–? (verify) |
| `object` | multi-direction interactable objects | ~1–? (verify) |

> Credit costs: `image` is confirmed = 1; `tileset` measured ≈ 4. `mapobject`/
> `object` are async multi-step — confirm actual cost on first run.

Prompt tips learned so far:
- The `tileset` generator biases the **upper** terrain toward a *paved/brick*
  pattern. For plain ground (dirt/soil), generate it as a **flat `image` tile**
  (A5 style) instead of forcing it through the Wang transition.
- Use literal material words ("muddy trail", "tilled farmland", "molten lava
  river") rather than generic ones ("dirt", "lava").
- Keep a consistent **style** across assets: reuse `--view "high top-down"`,
  the same detail/shading/outline flags, and (on paid tiers) a color reference.

---

## A. TERRAIN — autotiles & ground  (`tileset` + `image`)
The self-bordering ground layers. *(Our first batch covered most of A1–A2.)*

### A1/A2 — terrain transitions (`tileset`)
- [x] grass ↔ water (pond)            — `02_grass_water` ✅
- [x] sand ↔ sea (shore)              — `04_sand_sea` ✅
- [x] grass ↔ sand                    — `03_grass_sand` ✅
- [x] grass ↔ forest floor            — `07_grass_forest` ✅
- [x] grass ↔ cobblestone             — `05_grass_cobble` ✅
- [x] dirt/ground ↔ cliff/stone       — `06_dirt_cliff` ✅
- [x] stone floor ↔ lava              — `09_stone_lava_v2` ✅
- [ ] grass ↔ deep water (darker)
- [ ] snow ↔ ice (needs more contrast — `08` was low-contrast)
- [ ] grass ↔ muddy trail / path (redo "dirt" — see prompt tips)
- [ ] farmland / tilled soil ↔ grass
- [ ] water ↔ waterfall (animated, optional)

### A5 — plain (non-auto) ground fills (`image`, ~1 each)
- [ ] plain dirt / packed earth floor
- [ ] wooden plank floor
- [ ] stone/brick floor
- [ ] grass fill (flat)
- [ ] cave/dungeon floor fill

---

## B–E. OBJECTS — buildings, props, nature  (`mapobject` / `object`)
The non-tiling stamps placed on top of terrain. **This is the bulk of "a full
sheet"** and what's still entirely to do.

### Buildings & structure parts (`mapobject`)
- [ ] small house (whole)
- [ ] medium house (whole)
- [ ] large house (whole)
- [ ] roof pieces (variants/colors)
- [ ] wall sections (with door gap)
- [ ] door (closed) / door (open)
- [ ] windows (lit / unlit)
- [ ] chimney
- [ ] awning / shopfront
- [ ] stairs (stone / wood)
- [ ] bridge (wood / stone)
- [ ] signpost / shop sign

### Special town buildings (`mapobject`)
- [ ] inn
- [ ] general shop
- [ ] blacksmith / forge
- [ ] temple / shrine
- [ ] town hall
- [ ] barn / stable
- [ ] tower / watchtower
- [ ] market stall

### Town props / furniture (`mapobject` or `object`)
- [ ] fence (straight + corner)
- [ ] gate
- [ ] well
- [ ] lamp post / lantern
- [ ] barrel, crate
- [ ] cart / wagon
- [ ] bench, table, chair
- [ ] fountain
- [ ] statue / monument
- [ ] crops / planter boxes
- [ ] hanging banner / flag

### Nature (`mapobject`)
- [ ] tree — pine (S/M/L)
- [ ] tree — broadleaf (S/M/L)
- [ ] tree — dead/bare
- [ ] bush / shrub
- [ ] flowers (clusters, a few colors)
- [ ] tall grass tuft
- [ ] rock (small / large)
- [ ] stump / fallen log
- [ ] mushrooms

### Interactables (`object`, 8-direction where useful)
- [ ] treasure chest (closed/open)
- [ ] torch / brazier (lit)
- [ ] pot / urn (breakable)
- [ ] lever / switch
- [ ] door (dungeon)

---

## OTHER THEMED SHEETS (future, same structure)
- [ ] **Inside** — floors, walls, furniture, rugs, beds, shelves, fireplaces.
- [ ] **Dungeon** — cave/stone autotiles, pillars, traps, bones, crystals.
- [ ] **World map** — overworld grass/forest/mountain/sea autotiles + town/cave icons.

---

## MVP — a minimal but complete TOWN sheet (do this first)
A focused subset that yields one fully buildable town, in priority order:
1. Terrain: grass↔dirt-path, grass↔water, grass↔cobble  *(have 2 of 3)*
2. Ground fills: grass, dirt, plank, stone  (`image` ×4)
3. Buildings: small/medium/large house, door, window, roof  (`mapobject` ×6)
4. Town props: fence, well, lamp, barrel, signpost, market stall  (`mapobject` ×6)
5. Nature: tree ×2, bush, flowers, rock  (`mapobject` ×5)
6. Interactable: chest  (`object` ×1)

**MVP rough budget:** ~3 tilesets (~12) + ~22 object/image gens (~22+) ≈ **35–45
generations** → about **one ~$9 PixelLab month**.

## Full town sheet budget
Everything in sections A + B–E ≈ **50–70 assets**, and with 2–3 re-rolls each for
quality/consistency, realistically **100–180 generations**. Still well within a
single paid month's credit allotment; the real cost is iteration time + my
assembly of the pieces into engine-ready tilesets/overlays.

---

## After generation — engine integration (my side, no credits)
1. Terrain `tileset` output → pack tiles into a sheet + write
   `<tileset>.autotile.json` (`wang8_lut`), register in `data/tilesets/_index.json`.
2. Buildings/props → import as overlay tiles / map-editor stamps.
3. Wire into a real map (layout + map JSON) and deploy to Pages to walk it.
