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

## 8. Open Calls
1. **Ranks per Tier:** 10 (assumed) or another count?
2. **Breakthrough gate:** trainer/manual required, or auto at Rank 10 + level threshold?
3. **Skill slots/cap:** can you level unlimited skills, or is there an equipped/active cap?
4. **M(Tier) for skills:** ×2.5/Tier (assumed) vs. matching the class ×3 — tune against use-rates.
