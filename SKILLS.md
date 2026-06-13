# Skills — Tiers, Ranks & XP

> Math for individual skill progression: skills have **Tiers** (the same Basic→Legendary ladder as
> classes) and **Ranks inside each Tier**, and level **by use**. Also defines how attribute/stat
> gains scale per level (cross-ref `PROGRESSION.md §2`). Companion to `PROGRESSION.md`, `CLASSES.md`.
> **Status:** brainstorming / pre-implementation. Constants are starting values to playtest.

---

## 1. Structure — Tier × Rank

A skill has two coordinates:
- **Tier** — `Basic → Advanced → Master → Grandmaster → Heroic → Legendary` (same ladder as class
  Tiers, `CLASSES.md §3.5`).
- **Rank** — `1 → 10` inside the current Tier.

**Breakthrough:** at **Rank 10**, a skill can advance to the **next Tier at Rank 1** — gated by a
trainer / skill manual / quest / Insight check (a milestone, not automatic).

> Full path: Basic R1…R10 → Advanced R1…R10 → … → Legendary R10.
> **Rank** = incremental power within a Tier. **Tier** = a power step, often unlocking a new sub-effect.

---

## 1.5 The Skill Library — shared pool + unique sets (feeds `CLASSES.md §1.5`)

Classes are **assembled from skills** (`CLASSES.md §1.5`: each grants ~6–10, ~half unique). So the
library must be **large and data-driven** — the class roster and the skill library are **co-authored
one Tier at a time** (build the Base 50 classes' shared + unique skills together, then Advanced, …).

### Categories
**Combat · Affinity Arts · Crafting · Gathering · Espionage · Survival · Social.**

### Shared pool vs. signature
- **Shared pool** — common skills many classes can hold (*Power Strike, First Aid, basic gathering*).
  The "~half shared" per class; keeps the library buildable.
- **Signature / class-unique** — tied to one class or lineage (only Reaver gets *Bloodlust*, only
  Systemancer gets *UI Hijack*). The "~half unique" that make each class **play distinctly**.

### Skill record schema (data-driven)
```
Skill = { id, name, category, tier, ranksMax:10,
          shared:true|false,        // pool vs. class-unique
          effectPerRank, subEffectPerTier,
          evolvesInto:[…],          // §4.5 — branches at Rank 10
          synergyFrom:[…],          // skills/stats that amplify or gate an evolution
          claimedBy:null|'<order>'} // unique evolutions from Claimed lineages (CLASSES.md §3.6)
```

### Acquisition
Class-granted (on pick / evolution), **bought** (Shop / guild trainers), **found** (manuals / relics),
or **taught** (NPCs). Claimed-lineage skills follow the §3.6 sanction rules.

### Active vs. Passive vs. Reactive — and the loadout
Every skill has a **kind** (`kind: 'passive'|'active'|'reactive'|'utility'`):
- **Passive** — always-on (stat buffs, resistances, % mods: *Toughness* +HP, *Pathfinding* −Exposure).
  **Always active, never counted against the cap.** This is what makes cumulative class climbing
  *good*: you stack dozens of passives from every class you've evolved through and always benefit.
- **Active** — explicitly used; a battle action / out-of-battle check. These fill the **capped loadout**.
- **Reactive / triggered** — auto-fire on a condition (counter-on-hit, on-low-HP burst). Each costs a
  loadout slot (they're "equipped" automatons).
- **Utility** — out-of-battle actions (lockpick, craft, gather). **Don't compete for battle slots** —
  used contextually, effectively always available.

**The loadout** = **N active/reactive slots**, set at a **Camp / Safe Zone** (a prep decision, not
swappable mid-fight). Base **~5**, +1 at milestones / attribute thresholds → ~8–10 lategame. So
**build identity = stacked passives (broad) + the chosen active loadout (specialised per run)**.
Feeds the limited-action Tempo + Intervention combat (`DESIGN.md §1`).

### Affinity Arts — the 9 affinities AS skills
Each affinity (Ember · Tide · Verdant · Storm · Stone · Frost · Toxin · Umbral · Lumen) has its own
**Art tree** of personal affinity attacks (the Channeler / Affinity-Knight core; anyone can learn some).
- **Dual role** (`DESIGN.md §2`): an Art is **offense AND Exposure defense** in its domain — ranking
  your **Ember** Arts also hardens you vs. **Heat**. One investment, two payoffs.
- Same Tier × Rank × evolve structure; the **Affinity Arts** category of the library.

---

## 2. Skill XP — cost to rank up

Same curve *shape* as the class XP model, with its own constants:
```
SkillXP_to_next(R, Tier) = b * R^s * M(Tier)
```
- **b = 50** (base)
- **s ≈ 1.5** (ranks get harder within a Tier; tunable)
- **M(Tier)** ≈ ×2.5 per Tier (independently tunable from class multipliers):

| Tier | M(Tier) | XP to max the Tier (R1→10) |
|---|---|---|
| Basic | 1 | ~7,130 |
| Advanced | 2.5 | ~17,800 |
| Master | 6 | ~42,800 |
| Grandmaster | 15 | ~107,000 |
| Heroic | 40 | ~285,000 |
| Legendary | 100 | ~713,000 |

(Maxing a Tier ≈ `50 · Σ_{R=1..10} R^1.5 · M ≈ 7,130 · M`.)

---

## 3. Skill XP — gain per use (level by use, not spam)

```
gain = u * (1 + diffBonus)        // with a per-encounter soft cap (diminishing returns)
```
- **u ≈ 10** base XP per meaningful activation.
- **diffBonus** from the **level-difference HUD color** (`PROGRESSION.md §5`):
  **Red +1.0 · Yellow +0.5 · White +0.2 · Grey ≈ 0.**
- **Per-encounter soft cap** — repeated use on the same target yields diminishing gains, so you
  can't farm one dummy.

> Trivial use ≈ no growth — you rank a skill by using it on **real challenges**, mirroring the mob-XP
> rule. This also means high-Tier skills naturally advance in high-Tier content (where targets are
> Yellow/Red), self-balancing the larger M(Tier) costs.

### What "use" means per skill category
| Category | "Use" trigger | diffBonus source |
|---|---|---|
| **Class Skills / Affinity Arts** | activating in battle | target level-diff color |
| **Gathering** | harvesting a node | node tier vs. skill Tier |
| **Crafting** (Smith/Alchemy/etc.) | crafting an item | recipe tier vs. skill Tier |
| **Espionage** (Lockpick/Stealth/Encryption…) | a successful check | lock/cone/cipher difficulty vs. skill Tier |

---

## 4. Skill Power per Rank/Tier (note; tuning deferred)
- **Each Rank** adds incremental effect (e.g., +% damage/effect/duration per rank).
- **Each Tier** is a larger step and may add a **new sub-effect** or evolve the skill's behavior.
- Exact per-rank/per-tier power numbers are a **separate balance pass** — this doc defines the XP/
  growth math, not the damage tables.

---

## 4.5 Skill Evolutions — skills branch, like classes

At **Rank 10**, a skill has two forward paths (mirrors `CLASSES.md` evolution):
- **Breakthrough** — advance to the **next Tier, same skill** (§1). Linear power.
- **Evolve** — branch into a **different skill** entirely: *Power Strike → Cleave* or *→ Sunder*.
  Evolving keeps the skill's accrued investment as the new skill's starting Tier/Rank.

**Synergy / prerequisites** (same idea as class foundation skills): an evolution can require **other
skills or stats** — *Speed ≥ X + Stealth → Shadowstep* — so foundation skills amplify evolutions here
too. Hidden-objective offers apply (`CLASSES.md §1.5`): hit a buried condition and the System offers
a skill evolution you didn't know existed.

**Untethered skill evolutions** (`DESIGN.md §6.5`): every skill tree has a hidden branch reachable
**only in Original-System mode** (or deep OWPS) — the darker/stronger evolution the assisted System
never offers. With class Untethered branches, this is what makes the permadeath choice pay off
*continuously*, not once.

> So skills are **trees, not ladders** — the breakthrough/evolve fork at every Rank 10 gives skill
> growth the same branching identity the class system has.

---

## 5. Stat Gains Through Levels

Three sources (cross-ref `PROGRESSION.md §2`):

1. **Per-level attribute points:** `points_per_level = 3 + (Tier rank above Basic)`
   → Basic 3 · Advanced 4 · Master 5 · Grandmaster 6 · Heroic 7 · Legendary 8.
   Higher-Tier classes grant more per level (each level matters more) but level far slower → power is
   **front-loaded**, not strictly more total stats. **Player-allocated.**
2. **Milestone bonuses:** a bonus point lump (and often a **Perk**) every **25 levels**, plus a chunk
   of points on each **class evolution / Tier-up**.
3. **Optional training nudges:** sustained activity gives tiny attribute XP (e.g., heavy running →
   Finesse), **hard-capped** so it's flavor, not a grind path.

> **Four independent growth tracks** make up total power: attributes (levels) + skill Ranks/Tiers
> (use) + class abilities (class Tier/evolution) + gear (crafting). No single grind dominates.

---

## 6. Interlock Summary
- **Progression:** skill Tiers reuse the class ladder; diffBonus reuses the level-diff HUD; stat math
  lives alongside §2.
- **World/Encounters:** skills advance on Yellow/Red content → pushes appropriate-danger play
  (danger-by-depth).
- **Crafting/Espionage/Hidden Layer:** non-combat skills rank via action difficulty, so the survival
  and secret layers feed skill growth too.
- **Classes:** breakthroughs can be gated by guild trainers/manuals (guild rep) — like Tier-ups.

---

## 7. Scope Honesty
- **Cheap / early:** Tier×Rank as data on each skill; the SkillXP cost formula + use-gain formula;
  per-level attribute points.
- **Medium:** diffBonus + per-encounter soft cap, breakthrough gating, milestone Perks, per-category
  use triggers.
- **Defer:** per-rank/per-tier power tables, optional training nudges, Legendary-tier skill content.

## 8. Decisions (resolved)
1. **Ranks per Tier — 10.**
2. **Breakthrough gate:** Rank 10 makes a skill **eligible**; the actual Tier-up needs a
   **trainer / manual / Insight check** (a milestone gated behind guild/world content — earned, not auto).
3. **Skill slots/cap — LOCKED:** **Known/passive skills = UNLIMITED** (you keep everything via
   cumulative class evolution); **active/reactive skills = a capped loadout** (~5 slots base → ~8–10
   lategame, set at a Camp / Safe Zone). Builds matter without punishing cumulative skills, and it
   feeds the limited-action Tempo + Intervention combat (`DESIGN.md §1`).
4. **M(Tier) for skills = ×2.5** (skills level by use — more frequent than class XP, so a gentler
   per-Tier multiplier than the class ×3).
