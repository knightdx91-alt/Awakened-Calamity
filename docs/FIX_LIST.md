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
- ⬜ **Ending gates** (`GameCorruption.endingsOpen` / lifetime-Surveillance good/true gates)
  still need an actual ENDING sequence to gate — deferred until there's an ending beat to show.

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
- ⬜ **103/192 skills are INERT** (no combat/passive effect — pure data hooks). Wire the
  ones the launch classes use; cut or defer the rest. `content_lint`/`dashboard`.
- 🟡 **Recovery economy — finding (2026-06-18): it is NOT the lever; untethered is meta-gated
  BY DESIGN.** Measured untethered (System-OFF, honest-skill) descents across recovery rates
  0→0.6: clear stays **0%, avg depth ~1/8 at every rate**. You die *inside* a fight at depth
  (player under-levels the floor + enemy growth > player growth), so between-floor recovery
  can't save you — refusing the System is meant to be brutal until accumulated meta-progression
  (HP unlocks, potions, fragments) makes it viable. This is coherent with the core "you need
  the System, and that's the horror" design, and `validate_design` already blesses the tethered
  curve. Deeper tuning (save-trigger %, per-tier difficulty, the careful/reckless tethered mix)
  needs **human playtest** — the sims confirm mechanical soundness but can't read fun. Deferred.

## P2 — economy & progression
- ⬜ **Credit income is undefined** — wire a credit drop to encounters/chests so shop
  prices mean something (target: potion ≈ 1 fight, class ≈ a run). `sim_economy`.
- ⬜ **Tier XP multipliers extreme** (legendary 270× → ~1589 kills for L2). Review against
  the roguelite run length; high tiers may want to be run-unlocks, not in-run grinds.

## P3 — systems still to build (the gap list)
- ⬜ **Meta-progression model** — what carries across deaths (memory fragments, unlocks,
  meta-currency). Design before run scaffolding.
- ⬜ **Relic/item system** — the roguelite reward layer (replaces crafting-sprawl); ~80
  hand-tuned relics + extend `content_lint` to cover them.
- ⬜ **Run-seed / reproducibility** — a seed → a fixed run (sharing, daily challenges,
  debugging). Small.
- ⬜ **Biome system** — the 5 regions as biome recipes (palette + props + roster + hazard
  + mini-boss) the generator recombines into run acts.
- ⬜ **Telemetry** — only after a live demo (the sole automated read on *fun*).

## P4 — content / structure
- ⬜ **Redo the beginning for the roguelite framing** (see below). The current Dawnhearth
  opening was built for the open-world version.
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
