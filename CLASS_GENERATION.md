# Class Generation — the Discovery Layer (designed, NOT yet built)

> **Status: DESIGN DECISION LOCKED, implementation deferred.** Captures the 2026-06-13 decision on
> how the class roster scales beyond the hand-authored set. Companion to `CLASSES.md`, `SKILLS.md`,
> `ARCHITECTURE.md`, `BUILD_SPACE.md`.

---

## 0. The decision in one line
The **planned/authored classes stay as the backbone.** Beyond them we do **not** hand-author the
permutation space. Instead a **deterministic generator** mints a class **on demand** the first time a
player meets an **exact condition-set** that no existing class claims, **stores it in a registry**, and
**offers that same class to anyone who later meets the same exact conditions.**

This is **lazy, memoized, deterministic generation with a persistent registry** — *not* fuzzy "close
enough" matching. Conditions must be met **exactly**.

---

## 1. Why this shape (vs. the alternatives)
- **vs. hand-authoring every permutation:** impossible (`BUILD_SPACE.md` ≈ 10²⁰¹). The authored set is
  the *soul/backbone*; generation fills the long tail.
- **vs. fuzzy/similarity generation:** harder to code, non-deterministic, feels mushy. Exact-match is
  just **memoization** — a `Map<conditionKey → class>`. Low-risk, well-understood, easy to get right.
- **Only what's reached is ever created.** The 10²⁰¹ space is never materialized; the registry grows
  organically to cover the builds people *actually play* (thousands over the game's life, not
  astronomically many). Unreached permutations simply never come into existence.
- **On-theme:** the System literally **catalogues new classifications as subjects discover them** —
  *"Anomalous pattern detected. Generating designation…"* The System learns from the population; the
  registry growing over time is the world becoming more defined by what players do. The horror premise
  works *for* us.

---

## 2. How it works (mechanism)
1. **Condition-set = the key.** A player's "build" reduces to a canonical, sorted set of **discrete
   predicates that are TRUE** (see §3). Sorted so order-of-acquisition never changes the key; hashed to
   a stable `conditionKey`.
2. **Match.** At an evolution/classification gate, look up `conditionKey` against the registry
   (authored classes first, then previously-generated). **Exact match → assign that class.**
3. **Mint.** No match → the **generator** (pure function of the condition-set + version seed) produces a
   class record: tier from total investment, `grantsSkills` drawn from the tags in the conditions,
   stat-lean from the build, a themed name, tier-normalized power.
4. **Persist.** The new class is written to the registry and is now a **permanent, real class**.
5. **Share.** The next player who meets the **exact** same conditions is offered the **same stored
   class** (same id, same name — the canonical discovered designation).

> Because the class is a **pure function** of the exact condition-set, persistence isn't needed for
> *correctness* (it would regenerate identically) — it's needed for the good reasons: a **codex of
> discovered classifications**, **first-discoverer credit/lore**, performance, and a shared evolving meta.

We already have the inputs: skill **`tags`** (the feature vocabulary) and the path-gated
**`requires:{skillTags, minCount}`** form (`CLASSES.md §1.5`) **are already an exact-condition
language.** The generator extends it: *if a coherent condition-set is satisfied that no class
`requires`, mint one.*

---

## 3. The hard part — condition GRANULARITY (the real design work)
The key must be **discrete predicates**, never raw values (STR=437 would make everyone unique → the
registry becomes meaningless noise). Conditions are booleans that are true, e.g.:
- holds skill **tags** `{rune, fire, heal}` each **≥ rank 5**,
- **STR ≥ 50** (thresholds, bucketed — not the exact number),
- **killed ≥ 100 undead**, completed **quest X**, **affinity ≥ tier 3** in Ember.

**Tuning the dial is the craft:** too fine → everyone mints junk classes; too coarse → nobody ever
does. The goal: **distinctive** builds generate a class; **trivial** variations don't. This is tuning,
not hard engineering — but it's where the quality lives, and it needs playtest feedback.

---

## 4. Open constraints to resolve before building
- **Shared registry = server feature.** "Add it for the future / others get it too" implies a **global
  registry shared across players** — server-side, lands in the **3D multiplayer build**. In the 2D
  prototype it persists **locally** (per save / cloud-save seed); 2D proves the *mechanism*, 3D adds the
  *shared* part.
- **Power normalization.** A minted class needs its power scaled to its tier (function over component
  skill `weight`s — `ARCHITECTURE.md` already treats cost as abstract weight) so generation can't yield
  broken classes.
- **Canonical hashing.** Condition-set sorted + versioned so the same build always hashes identically
  across clients and the Unity port.
- **Naming.** Lower-stakes than for the authored set (these are rare, earned, off-map classes where
  "you found a designation almost no one has" is cool even with a systemic name) — but still needs a
  real themed naming system (word-pools by domain × affinity × tier), and **must follow the naming
  convention** (`CLASSES.md §1.5` — vary roots, don't lean on one suffix).
- **Governance.** Decide: do generated classes become canon automatically, or pass a review/curation
  queue first? (Open.)
- **Authored-only categories stay authored.** Story/identity classes — **Claimed** (Blood Priests of
  Kwaz), **Anomalous** (Null, Revenant), the **Untethered** apexes — carry plot and are **never
  generated.** Generation is for the sanctioned "standard" middle of the roster.

---

## 5. Relationship to authored content (nothing is wasted)
The hand-authored trees (e.g. the full **Smith** lineage) are the **templates/attractors** the generator
draws from — they teach it what a "forge-path Master" should look like. Authoring the iconic, story-
bearing ~50–100 classes is *still the job*; generation is the **discovery layer** layered on top, filling
the continuous space *between* the landmarks on demand.

---

## 6. Build order (when we get to it)
1. Finish the authored backbone + the planned trees (in progress).
2. Prototype the **condition-predicate format + exact-match registry** over real `classes.json` /
   `skills.json` — "match-or-mint-and-store" against sample builds — to tune **granularity** (§3) before
   committing.
3. Pure `src/systems/classgen.js` (deterministic, no DOM) + a local registry in the 2D prototype.
4. Server-backed shared registry in the 3D rebuild.
