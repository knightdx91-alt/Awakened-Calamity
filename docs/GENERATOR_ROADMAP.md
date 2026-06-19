# GENERATOR ROADMAP — "generate better stuff" (next few sessions)

Owner asked to keep these queued and be reminded at the start of every session
(wired into `.claude/hooks/session-start.sh`). These are the upgrades that make the
procedural content read as a real, varied world instead of recolored rectangles.

Priority order:

1. **Port `mapgen` to JS for RUNTIME generation.** Floors are baked offline (Python)
   and reused from a fixed pool of ~6 — so every run repeats the same layouts. Porting
   the carve/scatter logic to JS lets the engine generate a fresh floor per descent.
   Biggest single generator win.

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
