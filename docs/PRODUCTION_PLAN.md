# PRODUCTION_PLAN — making Awakened Calamity a game that sells

Senior-dev / technical-director plan. Captures the viability call, the direction
change, the milestones, the automation that makes it tractable solo, the
go-to-market, and the **hard data** the simulators have already produced. This is
the reference for "what we're actually building and why."

---

## 1. Thesis (the sellable game, one line)
**A System-horror roguelite where the System helps you escape its loop — and its
help is what keeps erasing the self that's trying to leave.**

Comps that prove it sells AND that a tiny team can finish it:
- **Inscryption** — "the game/system itself is the horror," meta unfolds through play (near-solo dev, sold huge).
- **Loop Hero** — minimalist system-dread roguelite, tiny team, massive seller.
- **Hades** — story told through death-loops (the narrative-roguelite gold standard).
- **Slay the Spire** — build-craft variety = "one more run."

Keep the hook ("the System helps you, and that's the horror" + **System Intervention**).
Change the **shape**: open-world sandbox → **roguelite loop**. The hook is strong; the
sandbox structure is the content furnace that was sinking it.

## 2. Why roguelite (not sandbox)
The #1 risk was always content VOLUME. Roguelites extract huge play-value from a
small amount of authored content — which is the only way a solo/small team ships
a content-heavy LitRPG. And we're already pointed at it:
- map generator + `mapcheck` (procedural content engine) — **built**.
- permadeath — **designed**.
- the "cycle" lore (Old Bram's déjà vu, the title) — **seeded**.
- 126 classes — stop being an unfillable tree, become **run-start build variety**.

The horror gets *tighter*: the System wants you to keep looping comfortably, so it hands
you power freely — and its help eats your memory. Core tension: get strong enough to
escape the loop, but each use of the System erodes the memory that lets you remember why.

## 3. What changes (cut / keep / rebuild)
**Cut / hard-defer:** open-world streaming + 5 regions → one region, run-based; the
bind/creature-collector system (a whole second game); crafting-discovery sprawl →
a tight **relic/item system** (Slay-the-Spire model, ~80 hand-tuned relics).
126-class completion tree → **~10–15 combat-viable launch classes** as run seeds.

**Keep:** System Intervention; map gen + mapcheck; the pure deterministic combat/
progression cores (perfect for simulation); the cycle lore + Dawnhearth opening.

**Rebuild around the loop:** death → reset with carry-over (death IS the loop);
the System shop → in-run reward *choices* (power-now vs keep-your-self); meters →
run resources with teeth (Surveillance/Memory = the corruption bar; max = you forget
why you're running); endings gated by lifetime System-help taken.

## 4. Run length (decided)
**Shipping run = 30–45 min** (multi-floor descent, rising Intervention stakes, a build
that matures) — *Hades*/*Spire* pacing, not *Vampire Survivors*. The ~15-min figure is
only the **vertical-slice** size (smallest unit that proves the feel is fun), not the
shipping run.

## 5. Milestones (vertical-slice-first)
- **M0 — prove the loop is fun (internal).** 1 biome, ~8 classes, 1 dungeon, the
  Intervention dilemma wired, death→reset + 1 carry-over unlock, 1 story fragment.
  GATE: *is one run fun?* Nothing else matters until yes.
- **M1 — Steam page up + private demo.** Page goes up the moment the slice is fun;
  wishlists compound for months.
- **M2 — public demo tuned for Next Fest.** The demo IS the marketing; ends on the hook.
- **M3 — Early Access.** Meta-progression spine, more biomes/classes/relics, story-through-runs.
- **M4 — 1.0.** Full loop-breaking narrative + all endings, balance pass, juice/audio complete.

## 6. Automation (the force multiplier — "generate → validate → simulate")
A roguelite is a simulation; balance it by code, not by hand. Build order:
1. ✅ **Map gen + `mapcheck`** (generate + validate; reachability guarantee) — DONE.
2. ✅ **Combat balance simulator** (`tools/sim_balance.mjs`) — class×creature×level →
   win-rate/turns, flags UNWINNABLE/DOMINANT — DONE.
3. ✅ **Full-run bot** (`tools/sim_run.mjs`) — simulates a descent (vitals carry, a
   `--rest` recovery knob), reports clear% / depth per class — DONE.
4. **Build-space analyzer** — auto-hunt degenerate combos (infinite/unkillable/one-shot).
5. **Content lint** — every class/skill/relic/quest/shop/map ref resolves; every run
   completable; no dead content. On every commit.
6. **Meta/economy tuner** — simulate the unlock-currency curve so the meta hooks.
7. **Telemetry** (once the demo's live) — where players quit/die, build picks → data-driven balance.
8. **Content/health dashboard** — one readout of what's real vs designed-but-inert.

Tooling lives in `tools/`; sims share `tools/sim_core.mjs` (loads the pure combat core).

## 7. Go-to-market (how it actually sells)
- **Wishlists are the currency.** Steam page early; demo = the ad; Next Fest is the beat.
- **Loud, legible identity.** "The System helps you, and that's the horror" is a trailer
  line — one screenshot should sell the whole pitch.
- **Build variety = streamer/Let's-Play fuel** (once wired + balanced via the sims).
- **Juice & readability** — roguelites live on combat feel; budget real time for it.
- **Story-through-runs** (Hades-style short reactive text keyed to state — cheap, high impact;
  the event system already does it).

## 8. Hard blockers (don't skip)
- **Art is a shipping wall.** RTP / Pixel Fantasy art is EULA-gated, prototype-only —
  NOT shippable. Need a cohesive commercial/original set (commission or licensed pack).
  Long-pole; start before EA.
- **Pick one engine.** For *selling*, ship the **2D** game (GBA-style pixel roguelites
  sell fine). The "logic = portable data + rules" architecture means 2D doesn't waste the
  systems work; defer 3D to "if it succeeds."
- **Scope the narrative** — Hades-style snippets keyed to state, not full branching VO.

---

## 9. What the simulators already told us (real data — 2026-06-18)
First runs of `sim_balance` + `sim_run` produced concrete, previously-unknown findings:

- **Combat balance is bimodal & needs work.** Of 125 classes: **37 are UNWINNABLE at L1**
  (0% vs the starter creature — the craft/lifestyle classes; their stat profiles can't fight
  even with the Strike/Jab/Guard basic kit). A large block of advanced→legendary combat
  classes are **DOMINANT (100%/100%** — overtuned, no challenge). A healthy **mid-band exists**
  (rogue/scout/hunter/brawler/lancer/fencer ≈ 50–89%) — *that band is the launch-roster shortlist.*
- **The descent curve is currently UNWINNABLE.** `sim_run` (10-floor descent): even the
  strongest classes (paladin/champion) die by depth ~2–4; **nobody clears**, even with a 25–50%
  between-fight recovery knob. Enemy level scaling outpaces player growth, and the
  multi-enemy fights from floor 5 compound it. **Implication:** the combat/progression math
  must be rebalanced for runs — the run needs (a) a flatter enemy curve or faster player
  growth, AND (b) a real recovery economy (potions/lifesteal relics). We now have the
  instrument to iterate the numbers (`progression.json` / `combat.json` / class `statProfile`)
  and re-test to convergence.

### Immediate next actions
1. **Rebalance pass driven by the sims:** flatten the enemy curve / lift player growth until
   the mid-band roster lands in a 20–85% clear band at the target depth; decide the floor for
   craft classes (a survivable minimum, or formally "non-combat — needs an ally").
2. **Lock the single-run loop on paper** (one 30–45 min descent: Dawnhearth → dungeon floors →
   Intervention choices → memory fragment → death/reset → 1 carry-over).
3. Then build the run scaffolding + relic system, validated by `sim_run` as it's tuned.
