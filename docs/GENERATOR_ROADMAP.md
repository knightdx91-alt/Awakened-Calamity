# GENERATOR ROADMAP — "generate better stuff" (next few sessions)

Owner asked to keep these queued and be reminded at the start of every session
(wired into `.claude/hooks/session-start.sh`). These are the upgrades that make the
procedural content read as a real, varied world instead of recolored rectangles.

Priority order:

1. ✅ **DONE 2026-06-19 — Port `mapgen` to JS for RUNTIME generation.** `src/systems/mapgen.js`
   (`GameMapGen`, pure/deterministic) ports the Python dungeon path: seeded room/corridor carve,
   reachability guarantee (ensureConnected + repairPropConnectivity), 9-slice walls + side-view
   north faces (baked `dun_props` gids), and the gameplay layer (Entrance, StairsDown/Alpha boss,
   roamers, chests, relic cache, traps). Floor-kind aware: normal floors get a StairsDown(`descend`),
   the last floor an Alpha(battle→despawn→descend). Engine injection via `GameMap.loadGenerated`
   (in-memory layout, no fetch); the descent (`main.js`) grows a fresh floor per descent from
   `run.seed + floor` (tier ramps with depth) when `run.json runtimeGen` is on (pool kept as
   fallback); `_purgeRunFloors` clears the reused `RunGenF*` names so chests refill each run.
   `tools/test_mapgen.mjs` = 12 checks (determinism / reachability / events); browser-verified a
   generated floor loads + renders (walls, faces, props, events) with 0 real errors.

2. **Biome system.** One biome def per region = palette + autotile set + prop tables +
   **enemy roster** + hazard + mini-boss, driving every floor archetype so
   Verdara/Halveth/Calderra/Vael actually read as different places (not recolors).
   Spec already in `MAPGEN_SPEC.md`.

3. **Run/act composer (Slay-the-Spire map model).** Compose floors into a PACED act —
   normal → elite → treasure → rest → boss — instead of a flat pool. Pacing is where
   roguelite runs get their shape.

4. **Data-driven templates / recipes (`MAPGEN_SPEC §3` pending #3).** Author intent in
   JSON (`{biome, anchors, enemy_table, hazard, hook}`); the generator fills detail.
   Enables hybrid authoring (hand-place quest spots, generate the filler) and bridges
   to the World Bible (`data/world/<region>.json`).

5. **Room-shape variety.** Dungeons are all rectangles. Add cave/organic blobs
   (cellular-automata carve), big pillared halls, merged/blocked rooms. (`MAPGEN_SPEC §6`.)

6. **Smarter enemy/encounter placement.** Telegraphed packs, elite rooms, ambushes,
   placement scaled by depth — not random scatter.

(See also the gameplay assessment: the real game-completeness blockers are enemy/boss
variety, relics, in-run story, audio/juice, and a human playtest — tracked in FIX_LIST.)
