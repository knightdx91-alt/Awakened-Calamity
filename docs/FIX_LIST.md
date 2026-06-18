# FIX_LIST — what needs fixing (data-driven, from the tools)

Compiled from the simulators (`sim_balance`/`sim_run`/`sim_buildspace`/`sim_economy`),
the validators (`mapcheck`/`content_lint`/`dashboard`), and the design harness
(`validate_design`). Ordered by leverage. Re-run the tools after each fix to confirm.

## P0 — core loop / keystone (mostly DONE this pass)
- ✅ **System Intervention dilemma** — lethal-save (temptation) + Surveillance→Corruption
  collection (cost). Harness: ❌→🟡, ★ dilemma PASS. (combat.js, corruption.js/json)
- ⬜ **Wire corruption into actual play.** Rules exist (`GameCorruption`) but only the
  combat-level Surveillance + lethal-save run in-engine. Still need: the **run-level
  collection** (you're reclaimed → bad ending), the **tier atk penalties**, and the
  **ending gates** applied during a real run. Blocked on the run loop (below).
- ⬜ **Build the run loop in-engine.** The roguelite descent (biome floors → boss →
  death/reset → carry-over) exists only in the sims. This is the single biggest build
  and what "a simple run" will eventually exercise. Until then the game = the Dawnhearth
  opening only.

## P1 — combat & class balance (the sims' hit-list)
- ⬜ **37 classes UNWINNABLE at L1** (craft/lifestyle). Decide the floor: a survivable
  minimum kit, OR formally "non-combat — needs an ally" (and then the tutorial fight
  must not hard-gate them). `sim_balance`.
- ⬜ **High-tier classes overtuned**: 24 NO-KIT classes win 100% on stat inflation with
  ZERO combat skills of their own; 6 UNKILLABLE, 1 ONE-SHOT (`the_unmade`). Give them
  real kits or rein in stat profiles. `sim_buildspace`.
- ⬜ **Pick the launch roster** (~10–15) from the fair mid-band (rogue/scout/hunter/
  brawler/lancer/fencer…) — `validate_design` build-diversity band.
- ⬜ **103/192 skills are INERT** (no combat/passive effect — pure data hooks). Wire the
  ones the launch classes use; cut or defer the rest. `content_lint`/`dashboard`.
- ⬜ **Recovery economy** — descents need potions/lifesteal/relics tuned so the curve is
  fair with skill (not just corruption-gated). `sim_run --rest`.

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

## Sweep finding (2026-06-18) — collection is BALANCE-GATED
`tools/sweep_tether.mjs` swept collectionThreshold x surveillancePerSave: tethered runs end
in Collection ~87-98% at EVERY setting (clears max 13%). The threshold is not the lever —
the descent is so hard that tethered players are FORCED to lean on saves (8-13/run) and
always get collected. Collection numbers can't be tuned until P1 (combat curve / recovery)
is fixed. Interim set to perSave 10 + threshold 300 (most grace). Re-run the sweep after
the balance pass; target a meaningful mix (careful=clear, reckless=collected).
