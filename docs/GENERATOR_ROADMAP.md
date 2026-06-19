# GENERATOR ROADMAP — master doc ("generate better stuff")

**Single source of truth for procedural generation.** This combines the old
`GENERATOR_ROADMAP.md` priority queue with the cross-cutting rules from `MAPGEN_SPEC.md` (now the
detailed per-map-type appendix), and folds in the **procgen technique toolkit** (Reddit
roguelike-procgen summary, saved in Drive) and the **mapping quality bar**
(`MAPPING_PRINCIPLES.md`). Owner asked to keep this queued and be reminded at the start of every
session (wired into `.claude/hooks/session-start.sh`).

Detailed references this doc sits on top of:
- **`MAPGEN_SPEC.md`** — full per-map-type rules (town/route/forest/interior/dungeon): RM
  convention vs. our gap vs. target rules. Read before touching a specific map type.
- **`MAPGEN_BUILDINGS.md`** — building/roof/wall/overhang details.
- **`MAPPING_PRINCIPLES.md`** — the "what makes a map good" checklist (condensed below).

---

## ★ The core insight (why upgrades are cheap)

Our runtime generator `src/systems/mapgen.js` (`GameMapGen`, pure/deterministic) is built on a
`Builder` whose entire post-process — `ensureConnected`, `finalizeWalls`, `renderNorthFaces`,
`repairPropConnectivity`, and the whole gameplay layer (Entrance/StairsDown/Alpha boss, roamers,
chests, relic cache, traps) — **operates generically on the `walk[]` boolean grid**. It does not
care HOW cells got carved.

Today only ONE thing fills `walk[]`: `carveRect` (rectangles) + `carveCorridor` (straight
L-corridors). That is procgen **technique #2 only** (rooms-and-corridors), which is exactly why
floors read boxy and samey. **Upgrading = adding new ways to fill `walk[]`; the existing pipeline
handles connectivity, walls, faces, and population for free.**

---

## The procgen toolkit (techniques + where each fits our Builder)

From the Reddit roguelike-procgen consensus. The #1 takeaway: **it's a toolset — combine, don't
pick one** (e.g. random-walk for shape, then cellular-automata to smooth). Ranked by ROI for us:

| Technique | What it gives | Fit to our Builder | Status / priority |
|---|---|---|---|
| **Cellular Automata** | organic cave/ruins | new `caveFill(region)`: seed ~45% random floor, run 4–5 smoothing passes; existing `ensureConnected` stitches caverns | 🟢 **highest ROI, ~30 LOC** |
| **Drunkard's Walk / Random Walkers** | meandering organic passages (bigger "brush" = wider) | random-walk variant of `carveCorridor` toward target | 🟢 **tiny, ~15 LOC** |
| **Rooms & Corridors (Room Accretion)** | structured rooms, connected | what we have now (`carveRect`+`carveCorridor`) | ✅ DONE (only this) |
| **Set Pieces / Prefabs** | hand-authored quality rooms (boss arena, vault, pillar hall); QA-able | tile+event stamp templates placed onto `walk[]`/`over[]`/`events[]` | 🟡 **medium effort, high quality payoff** |
| **Graph / Component ("legos")** | room segments w/ connection points, sector algo guarantees connectivity | alt to "carve then repair"; lower marginal value (we already guarantee connectivity) | 🔴 defer |
| **Wave Function Collapse (WFC)** | flexible tiling from adjacency rules | needs a curated tileset-adjacency ruleset — heavy | 🔴 defer |

**Plan = combine:** keep rooms-and-corridors as the skeleton, add **CA caves** as an alternate/
blended floor type (`style: 'cave' | 'rooms' | 'mixed'` on `generateFloor`), use **drunkard's
walk** for organic links, drop in **prefabs** for set-pieces. A floor can be *both* (room block +
cave wing) — which also fixes the "huge empty square room" failure mode.

---

## Priority order (the queue)

1. ✅ **DONE 2026-06-19 — Port `mapgen` to JS for RUNTIME generation.** `src/systems/mapgen.js`
   (`GameMapGen`, pure/deterministic) ports the Python dungeon path: seeded room/corridor carve,
   reachability guarantee (`ensureConnected` + `repairPropConnectivity`), 9-slice walls +
   side-view north faces (baked `dun_props` gids), and the gameplay layer (Entrance, StairsDown/
   Alpha boss, roamers, chests, relic cache, traps). Floor-kind aware: normal floors get a
   StairsDown(`descend`), the last an Alpha(battle→despawn→descend). Engine injection via
   `GameMap.loadGenerated`; descent (`main.js`) grows a fresh floor from `run.seed + floor` when
   `run.json runtimeGen` is on (pool kept as fallback); `_purgeRunFloors` clears reused `RunGenF*`
   names. `tools/test_mapgen.mjs` = 12 checks; browser-verified.

2. **Room-shape variety — START HERE (procgen toolkit above).** Add `caveFill` (cellular
   automata) + drunkard's-walk corridors + big pillared halls / merged-blocked rooms, behind a
   `style` option on `generateFloor`. Biggest visual-variety win for the least code; slots into
   the existing Builder; headless-testable via `tools/test_mapgen.mjs` (assert caves stay
   connected). *(Was #5; promoted — cheapest high-impact change, unblocks the rest. `MAPGEN_SPEC §6`.)*

3. **Biome system.** One biome def per region = palette + autotile set + prop tables + **enemy
   roster** + hazard + mini-boss, driving every floor archetype so Verdara/Halveth/Calderra/Vael
   read as different places (not recolors). Pairs with #2: a biome picks which room-shape mix +
   prop tables to use. Spec in `MAPGEN_SPEC.md`.

4. **Run/act composer (Slay-the-Spire map model).** Compose floors into a PACED act —
   normal → elite → treasure → rest → boss — instead of a flat pool. Pacing is where roguelite
   runs get their shape; also unlocks onboarding #5 (legible run shape on the Board).

5. **Data-driven templates / recipes (`MAPGEN_SPEC §3`).** Author intent in JSON
   (`{biome, anchors, enemy_table, hazard, hook}`); the generator fills detail. Enables hybrid
   authoring (hand-place quest spots, generate the filler) and bridges to the World Bible
   (`data/world/<region>.json`). This is also where **prefabs/set-pieces** get authored.

6. **Smarter enemy/encounter placement.** Telegraphed packs, elite rooms, ambushes, placement
   scaled by depth — not random scatter.

(See also the gameplay assessment: the real game-completeness blockers are enemy/boss variety,
relics, in-run story, audio/juice, and a human playtest — tracked in `FIX_LIST.md`.)

---

## Mapping quality bar (apply to ALL generated output)

Condensed from `MAPPING_PRINCIPLES.md` (RPG Maker mapping canon) + `MAPGEN_SPEC §0`. Acceptance
criteria — generated floors should pass these by eye:

- **No huge empty square rooms.** Every room earns its space (content or a reason to cross).
  CA caves + room-shape variety (#2) directly attack this.
- **Respect negative space — don't over-clutter.** The old "three-tile rule" (something every
  ~3 tiles) is a *guideline, not gospel*; applied blindly it makes maps messy. Bias prop
  placement toward intentional clusters + deliberate empty space (our current `scatterInRooms`
  is uniform — make it clumpier-but-sparser).
- **Add verticality.** Vary heights; we bake north wall-faces already — extend to elevation
  variation in floor layout, not just walls.
- **Walkable-first composition.** Stake out where the player WALKS first, then decorate.
- **No lines, no grids, no clumps >2.** Scatter with jitter; break straight runs.
- **Consistency of style.** One wall style / roof palette / tile size per map (→ biome system #3).
- **Channel, don't cage.** Steer with soft obstacles; never hard-wall the only route (our
  `repairPropConnectivity` enforces this — keep it).
- **Everything has a reason.** Props match the setting; access to anything interactive.
- **Indoor/outdoor size consistency.** Interior footprints believable vs. their exterior.

---

## Rejected ideas (log — don't revisit without a new reason)

- **"Quantum" map generator** (Medium: *The Dungeon of Collapse / Schrödinger's Dungeon*,
  Cirq + Hadamard gates over 100 qubits → measure each cell to wall/floor). **Verdict: NO.**
  The "quantum" part is just a randomness *source*; the actual map generation is **per-cell
  random fill** — the most primitive technique there is — producing unstructured noise with no
  rooms and **no connectivity guarantee** (unplayable). Strictly *worse* than what we have, and
  worse still for us specifically: a quantum RNG is **non-deterministic**, which would **break
  our replay-safe same-seed→same-floor guarantee** (the Replay Slate feature). Nothing
  algorithmic to borrow. The CA / drunkard's-walk / prefab techniques above are far more valuable.
