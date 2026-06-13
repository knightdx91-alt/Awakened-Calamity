# Build Space — how many characters are possible (the "endless" justification)

> Canonical record of the 2026-06-13 computation. Backs the design claim that character diversity is
> effectively endless. Companion to `CLASSES.md`, `SKILLS.md`, `PROGRESSION.md`, `CLASS_GENERATION.md`.
> Reproduce with `node tools/build_space.mjs`.

---

## Headline
A character that **starts as a single class (Smith)** can end up as one of roughly **10²⁰¹** distinct
builds — a 1 followed by ~201 zeros. For scale, there are ~10⁸⁰ atoms in the observable universe, so the
build space is ~**10¹²¹ times larger than every atom in existence**, and it exceeds the number of legal
Go positions (10¹⁷⁰). "Endless" is an undercount, not hyperbole.

**This is emergent, not authored.** Nobody builds 10²⁰¹ of anything. The number is the *product* of a
small amount of **linear, data-driven content** (skills, classes, creatures) multiplied by the systems.
Build space scales **multiplicatively** with content added **linearly** — that's the core feasibility
bet (`ARCHITECTURE.md`).

---

## The model (multiply the independent choice-axes)
Each axis is a factor; the total is their product. Tags: **[DATA]** = from our files today, **[PROJ]** =
full-game target (not all built yet), **[MODEL]** = upper-bound estimate.

| Axis | Options (log₁₀) | Basis |
|---|---|---|
| Class journey — ordered ≤6 classes held, from ~450 | 10¹⁶ | [PROJ] keep-skills changes make order matter |
| Specializations across the journey (3 × ~6) | 10³ | [DATA] `classes.json` |
| **Learned skill set — ~60 of ~1,500 pool** | **10¹⁰⁸** | [PROJ] *dominant term*; self-teach/buy/find/evolve |
| Active loadout — 10 of ~30 known actives | 10⁷·⁵ | [DATA] `SKILLS.md §1.5` |
| Skill-evolution forks — 3-way × ~30 maxed | 10¹⁴ | [DATA] `SKILLS.md §4.5` |
| Attribute spread — ~1,500 pts over 6 stats | 10¹⁴ | [MODEL] |
| Affinity Art investment — 9 trees, rank 0-10 | 10⁹ | [DATA] |
| Bonded party — 6 of ~200 species, each ~10³ builds | 10²⁹ | [PROJ] |
| **TOTAL (product)** | **≈ 10²⁰¹** | |

The dominant driver is **skill composition** (10¹⁰⁸ alone) — a direct consequence of the **self-teaching
rule** (`SKILLS.md §1.5`): because *any* non-signature skill is reachable, the set you know is chosen
from the whole library, not just your class's grants. One design decision turns "large" into
"astronomical."

---

## Honesty
- It's an **upper bound** — evolution gating means not every sequence is legal, so the *reachable* count
  is lower. But even slashing it by 10⁵⁰ leaves ~10¹⁵⁰ — still vastly beyond the atoms in the universe.
  The "endless" feel survives any realistic constraint.
- It **grows with content** — every skill added to the pool and creature added to the roster pushes the
  10¹⁰⁸ and 10²⁹ terms up.
- **Practical consequence:** even ~10% of the target content yields a build space in the 10⁸⁰⁺ range —
  effectively infinite to any player. We get the "endless" feel **long before** content is "done," which
  is why the build strategy is **vertical slice first, widen later** (`CLAUDE.md` next-steps).
