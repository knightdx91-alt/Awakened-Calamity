# FIX_LIST — what needs fixing (data-driven, from the tools)

Compiled from the simulators (`sim_balance`/`sim_run`/`sim_buildspace`/`sim_economy`),
the validators (`mapcheck`/`content_lint`/`dashboard`), and the design harness
(`validate_design`). Ordered by leverage. Re-run the tools after each fix to confirm.

## P0 — core loop / keystone (DONE — verified in-engine 2026-06-18)
- ✅ **System Intervention dilemma** — lethal-save (temptation) + Surveillance→Corruption
  collection (cost). Harness: ❌→🟡, ★ dilemma PASS. (combat.js, corruption.js/json)
- ✅ **Run loop BUILT & verified in-engine.** The roguelite descent runs end-to-end:
  Dawnhearth **DescentGate** (tethered/untethered choice) → `descend` chains the
  `RunFloor*` pool → `RunBoss*` → clear/death/collection → back to the hub with carry-over
  (Memory Fragments, deepest floor), and a **Remembrance** NPC spends fragments (`meta`).
  Pure controller `GameRun` (`src/systems/run.js`) + wiring in `main.js` (`descend`/`meta`
  commands, `_runReact`, `_endRun`, `_metaMenu`). Headless-verified: start→3 floors→boss→
  **cleared**, meta `runs/clears/deepest/fragments` all update; combat inits clean.
- ✅ **Corruption wired into actual play.** Run-level **collection** (Surveillance ≥ threshold
  → reclaimed → hub, the bad reset) + the **tier atk penalty** now applied in LIVE combat
  (`combatview.buildPlayer` reads the active run's Surveillance → `GameCorruption.atkMod`),
  so leaning on the System's saves has a felt, mounting in-combat cost — not just collection.
- ✅ **Ending gates LIVE (2026-06-18).** The full Act-IV finale (Vael/Exile/Distortion) isn't
  built, but the gates now have teeth as a roguelite EPILOGUE: clearing a descent triggers a
  System verdict gated by LIFETIME Surveillance via `GameCorruption.endingsOpen` — clean play
  (≤40) keeps the **true** ending open ("too clean to read… a way OUT"), ≤120 = **good**, else
  **submit** (only SUBMIT remains). Stored as `meta.endingTier`. Browser-verified. Also wired the
  meta **lore unlocks** (recall1/recall2) to reveal their buried-cycle memory text on purchase.

## P1 — combat & class balance (the sims' hit-list)
- ✅ **Balance pass DONE (2026-06-18) — `validate_design` now ✅ MECHANICALLY SOUND** (was 🟡,
  2 WARN). Auto-tuned the 19 overtuned advanced/master combat classes' stat profiles
  (atk/hp scaled down) into the fair band → build diversity 35→53/101 fair, 19→0 stat-blob
  dominant; fixed the lone one-shot (`the_unmade` given a dignified non-degenerate profile,
  150hp/28atk/45def — wins but takes real damage). Difficulty curve still PASS (avg depth
  5.4/8, 21% clear); Intervention dilemma still PASS (+4.67 depth tempting / +701 Surv costly).
- ✅ **Craft-class floor DECIDED + classified in data (2026-06-18).** Every class now carries
  a `combatRole` in `classes.json`: **75 combatant** (fair solo, clears the L4 untethered
  win-band), **44 support** (weak solo, viable with bonded allies / recovery), **6 noncombat**
  (no real kit — needs an ally to descend). Surfaced in creation: support/noncombat picks show
  a caution line ("weak in solo descents — pair with a bonded ally"); the choice is allowed,
  not hard-gated. (`_meta.combatRoleDoc`.)
- ✅ **Launch roster PICKED (2026-06-18).** `classes.json _meta.launchRoster` = 12 curated fair
  basics spanning archetypes: warrior, brawler, monk, fencer, lancer (melee/martial), scout,
  hunter, archer (ranged), rogue (stealth), spellblade (magic), cleric (support), vanguard
  (tank). Marked with a ★ "Recommended start" badge + detail line in the creation screen.
  Browser-verified.
- ✅ **Launch-class skills WIRED (2026-06-18).** Of the 38 skills the 12 launch classes use,
  34 were already active; the 4 inert ones were world-utility (`track`/`set_snare`/`sneak`/
  `pick_lock`) and are now reframed into combat-usable effects the engine supports — Track→mark,
  Set Snare→slow, Sneak→self def-up, Pick Lock ("Find the Gap")→sunder. **0 inert among launch
  classes**; verified they appear in the FIGHT menu. (The remaining ~99 globally-inert skills are
  on non-launch classes — defer/cut later; the world-utility layer for track/sneak/etc. can be
  re-added as a separate hook.)
- 🟡 **Recovery economy — finding (2026-06-18): it is NOT the lever; untethered is meta-gated
  BY DESIGN.** Measured untethered (System-OFF, honest-skill) descents across recovery rates
  0→0.6: clear stays **0%, avg depth ~1/8 at every rate**. You die *inside* a fight at depth
  (player under-levels the floor + enemy growth > player growth), so between-floor recovery
  can't save you — refusing the System is meant to be brutal until accumulated meta-progression
  (HP unlocks, potions, fragments) makes it viable. This is coherent with the core "you need
  the System, and that's the horror" design, and `validate_design` already blesses the tethered
  curve. Deeper tuning (save-trigger %, per-tier difficulty, the careful/reckless tethered mix)
  needs **human playtest** — the sims confirm mechanical soundness but can't read fun. Deferred.

## Collision / spawn fixes (2026-06-18)
- ✅ **Spawn-in-wall on descent FIXED.** `descend` entered floors with no coords, so `_enterMap`
  dropped the player at the map CENTRE — solid wall in 4/6 run floors → "descended, can't move".
  `_enterMap` now uses `_mapStart()` (map `start` field → Entrance/StairsUp event → centre) AND
  always snaps to the nearest walkable tile (`_findWalkable`). Verified: all descents spawn walkable.
- ✅ **Collision checker over ALL maps:** `python3 tools/mapcheck.py all` validates every committed
  map (collision/reachability/spawn). New **spawn validator** flags a spawn in a wall or an isolated
  pocket. Current state: active run pool (RunFloor*/RunBoss*) + Dawnhearth = clean; ~20 OLD prototype
  maps FAIL (spawn-in-wall on no-Entrance interiors, unreachable Entrance/Alpha in some named
  dungeons) — surfaced for authoring cleanup; the runtime walkable-snap prevents soft-locks meanwhile.
- ✅ **Generator self-check:** `tools/mapgen_indoor.py write()` now adds an explicit `start` field and
  runs `mapcheck.validate` on every generated map (prints ✓/⚠/❌ for spawn + reachability).
- ✅ **Editor collision tool FIXED (two bugs):** (1) rectangle/ellipse fill painted collision onto the
  ACTIVE layer, but only GROUND collision is exported → lost; now always targets ground (matching the
  single-tile paint + the red overlay + the exporter). (2) The engine `isWalkable` returned walkable on
  grass/cave behaviors BEFORE checking the collision byte, so painted collision on grass/cave was
  ignored in-game; now **authored collision wins** (water still blocks, grass/cave walkable only when
  collision is 0). So the red collision you paint actually blocks now.

## P2 — economy & progression
- ✅ **Credit income WIRED (2026-06-18).** Defeating enemies now drops credits
  (`combatview._finish`): `perKill = base(15) × level × creditYield × variance`, summed over the
  fight and added to `player.money` on a win (shown in the result: "+N XP · +M Cr"). Tuning lives in
  `progression.json.credits`; creatures gained `creditYield` (emberling 1.0 / thornwolf 1.3 / dummy 0).
  An early single-foe fight ≈ 30–45 Cr ≈ a Potion (50) ✓ (target met). `sim_economy` now models the
  income: a full 8-floor descent ≈ ~1.6k Cr (combat ~860 + baked chests ~720) ≈ 3× a class/run —
  generous & chest-dominated; chest values are baked in the run maps, so tuning the full-run total +
  class cost is a human-playtest feel call.
- ⬜ **Tier XP multipliers extreme** (legendary 270× → ~1589 kills for L2). Review against
  the roguelite run length; high tiers may want to be run-unlocks, not in-run grinds.

## P3 — systems still to build (the gap list)
- ⬜ **Meta-progression model** — what carries across deaths (memory fragments, unlocks,
  meta-currency). Design before run scaffolding.
- ✅ **Relic/item system BUILT (2026-06-18).** The roguelite per-run reward layer:
  `data/systems/relics.json` (16 relics, common/rare/epic) + pure `src/systems/relics.js`
  (`GameRelics`: weighted seeded roll / grant / effects-aggregate). Relics live on `run.relics`
  (wiped each run via `GameRun.start`). Combat reads them in `combatview.buildPlayer` — stat
  multipliers scale the build; a data-driven `bonuses` bundle (crit/evade/lifesteal/thorns/
  defBonus) feeds the pure combat core (new `_mkActor` merge + lifesteal/thorns in `_attack`).
  Dilemma relics (`survPerSaveMult`/`collectionBonus`) fold into the threshold + Surveillance
  accrual. New **`relic` event command** (choice of 3 rolled, or `guaranteed:<id>`); a **RelicCache**
  placed one-per-floor (generator `place_relic_cache` + `migrate_relic_caches.py` for the existing
  6 floors). Held relics shown on the STATUS screen. `tools/test_relics.mjs` (10 checks) + browser-
  verified end-to-end. (Future: ~60 more relics; editor `relic` command; relic icons.)
- ⬜ **Run-seed / reproducibility** — a seed → a fixed run (sharing, daily challenges,
  debugging). Small.
- ⬜ **Biome system** — the 5 regions as biome recipes (palette + props + roster + hazard
  + mini-boss) the generator recombines into run acts.
- ⬜ **Telemetry** — only after a live demo (the sole automated read on *fun*).

## P4 — content / structure
- ✅ **Opening reframed for the roguelite loop (2026-06-18).** The `awakening` quest + Dawnhearth
  events already taught the loop (meet_mira → awaken_crystal → first_descent → the_cycle; Mira's
  stage-gated dialogue reveals the cycle on return; the DescentGate offers tethered/untethered).
  Added the missing pivot: a **one-time first-descent return beat** in `_endRun` — death is not a
  game-over but the cycle revealing itself, framed by how you went down (tethered = the System
  "kept" you, warm and absolute → dread; untethered = the dark took you, yet you woke anyway →
  the question it doesn't want you to ask; cleared = the worn, rehearsed déjà-vu). Fires once
  (keyed off `meta.runs===0`), then normal returns take over. Browser-verified: shows on run 1,
  not run 2, 0 errors. The TutorialFiend remains an optional combat warm-up (not a gate).
- ⬜ **Wire the rest of the cast to `GameVoice`** (reactive, Surveillance-aware).
- ⬜ **Normalize `evolvesInto`** — two forms (string vs {class,requires}); the engine
  tolerates both, but unify for sanity. 32 classes affected. `content_lint`.

## P5 — shipping blockers (start before EA, not now)
- ⬜ **Commercial/original art** — all RTP/Pixel Fantasy art is EULA-gated, NOT shippable.
- ⬜ **Audio + juice pass** — combat feel, feedback, sound; roguelites live on this.

---

## Does the beginning need to be redone? — YES
The current opening (cold-open → Mira → crystal → first fight → return, in a hand-built
Dawnhearth) was authored for the **open-world** framing: a tutorial that drops you into a
persistent town you then explore outward from. The roguelite reframes it:

- **Dawnhearth becomes the HUB** (the *Hades* House), not the first step of an outward
  journey. You return here between runs; meta-progression and the (now reactive) townsfolk
  live here.
- **The opening must teach the LOOP, not the world:** Awaken → the System's "help" → your
  first **descent** → **death/collection → reset** → wake in Dawnhearth again, remembering a
  little more. The first death is a scripted story beat (the cycle revealed), not a game over.
- **The Intervention dilemma must be taught front-and-center** — the first time the System
  saves you from death should land as both relief and dread, with the Surveillance cost shown.
- **Mira's tutorial still works** as the hub intro, but the "go fight the field monster and
  come back" beat becomes "take your first descent" — and the return is a *reset*, not a walk
  back to her.

So: keep the cast, the tone, and most of the writing (it's good and on-theme); **re-scaffold
the structure** around the hub + first-run + first-death-reset. It's a re-frame, not a rewrite.
Best done *after* the run loop exists (P0), so the opening can teach a loop that actually runs.

## Sweep finding (2026-06-18) — collection mix is a PLAYER-CHOICE axis, not a sweep knob
`tools/sweep_tether.mjs` re-run after the P1 balance pass: tethered runs STILL end in
Collection ~96-99% at every (perSave × threshold) setting. Root cause is now understood and
is NOT a balance bug: the sweep bot uses a single **always-accept-the-save** policy, and the
System save fires at ≤35% HP (`helpThreshold`), so a leaning bot racks up 7-14 saves/run and
always blows past the threshold. That is the INTENDED punishment for leaning — lean on the
System and you get collected, every time. The meaningful careful-vs-reckless **mix is a
player-choice axis** (accept vs refuse each save in-game) that a one-policy bot can't model;
it is instead validated by `validate_design`'s ★ Intervention-dilemma check (REFUSE vs ACCEPT
arms): accepting reaches +4.67 deeper (tempting) and costs +701 Surveillance/run (costly) →
PASS. Settings kept at perSave 10 + collectionThreshold 300. To make a *careful-accept* run
survivable in the sweep itself you'd lower the save trigger (e.g. lethal-only) or add a
recovery economy so HP stays above 35% — deferred (needs the run loop in-engine, P0).
