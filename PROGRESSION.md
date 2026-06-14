# Progression & Stats — Levels, Attributes, the Soft Cap

> Design for player/creature leveling, the LitRPG attribute model, XP, skill growth, and the ~450
> soft cap. Sets the **level scale** every zone, encounter, and recipe hangs on. Companion to
> `DESIGN.md`, `WORLD.md`, `ENCOUNTERS.md`. **Status:** brainstorming / pre-implementation.
> Built **fresh** (not from the old Drive crafting/loot docs, which are tied to the original dex).

---

## 1. Two leveled entities: Player & Creatures

- **The player levels** (LitRPG core) — you are a character with attributes and skills, not just a
  trainer. This is what makes non-Tamer classes viable (Combat/Crafter/Espionage builds rely on
  *player* power, `CLASSES.md`).
- **Creatures level** independently — your Bound party has its own levels/stats (the catch-and-battle
  pillar).
- Both share the **1 → 500+** scale and the **level tiers** (T1 1–125 · T2 126–250 · T3 251–375 ·
  T4 376–500+) used by zones and recipes.

---

## 2. Player Attributes (conventional LitRPG set — 8)

The System grants attribute points on level-up; you allocate them (class nudges the spread).
**Standard LitRPG-readable names** — a System screen anyone instantly understands.

| Attribute | Governs |
|---|---|
| **Strength** | Physical self-combat damage, carry capacity |
| **Agility** | Tempo regen/speed, accuracy, stealth |
| **Constitution** | **Vigor pool (HP) + its regen/min**, Stamina pool & drain resistance, Exposure resistance |
| **Intelligence** | **Affinity-Energy pool size**, affinity/arcane power, Bind strength |
| **Wisdom** | **Affinity-Energy regen/min**, damage resistances, resistance to System effects (Surveillance, conversion) |
| **Perception** | Skill effectiveness, crafting quality, detection range, Appraisal |
| **Charisma** | NPC disposition, persuasion/dialogue options, **reputation gain rate**, shop prices (haggling), creature **trust/loyalty & Free-Bond**, party morale/leadership in lane battles |
| **Luck** | Drop quality/quantity, crit chance, rare-spawn odds, Appraisal windfalls, favorable System rolls |

> **8 attributes.** Charisma is the social/leadership stat (Envoy/Broker, guilds, multi-species,
> economy, creature bonding). **Luck** is its own stat (split out from the old Insight) — drops, crits,
> rare spawns. Constitution and Wisdom are the **survival/anti-System** stats — they tie attributes
> directly into the survival layer and the Surveillance theme, not just combat.
>
> *Naming note:* renamed from the original might/finesse/endurance/focus/resolve/insight/presence set;
> mechanics are unchanged except luck splitting from Perception into its own attribute.

### Two-pool model — size vs. regen are separate stats
Each resource pool has one attribute for its **size** and another for its **regen-per-minute**, so
power and recovery are independent:
- **Vigor (HP):** size + regen both from **Constitution**.
- **Affinity-Energy (the "mana" you spend on abilities):** size from **Intelligence**, regen from **Wisdom**.

### Vigor = System-embedded energy, not flesh (theme mechanic)
Your "HP" is **Vigor** — the System's energy woven into your body. It works as a **damage-absorption
buffer**: incoming hits are blunted by spending Vigor, and the pool drains as it absorbs. It won't
stop a true instakill, but a large pool defrays ordinary damage.
- **Thematic weight:** losing health = running out of the thing the System put in you. Hitting zero
  Vigor is the "downed" state (`ENCOUNTERS.md §4`), not literal death.
- Vigor (defensive, embedded) is **separate** from Affinity-Energy (offensive, spent on abilities) —
  two different energies, two different pools.

### Allocation
- **Points per level = `3 + (Tier rank above Basic)`** → Basic 3 … Legendary 8. Higher-Tier classes
  grant more per level (each level matters more) but level far slower → power is **front-loaded**, not
  strictly more total stats.
- **Milestone bonuses:** a bonus lump (+ often a **Perk**) every **25 levels**, plus a chunk on each
  **class evolution / Tier-up**.
- *(Optional)* **training nudges:** sustained activity gives tiny attribute XP (running → Agility),
  hard-capped — flavor, not a grind path.
- **Player-assigned** (LitRPG agency). Class sets a recommended spread and small starting bonuses.
- Framing: *the System "awards" your points* — another act of it classifying/shaping you.
- Full stat + **skill Tier/Rank** math: `SKILLS.md`.

---

## 2.5 Abilities — Class Skills, Affinity Arts, Perks

Three categories of acquired power:

| Category | What it is | Source | Cost |
|---|---|---|---|
| **Class Skills** | Active abilities that break ordinary physics (conjure flame, plate your body, blink a step). The "cool" toolkit. | Class + Designation Grade (`CLASSES.md`) | Affinity-Energy |
| **Affinity Arts** | The caster magic — ranged/utility affinity effects for Arcane builds | Class/Intelligence, learned/scrolls | Affinity-Energy |
| **Perks** | **Passive** edges — small or large advantages | Quests, relics (`HIDDEN_LAYER.md`), discovery, "wrong place at the wrong time" | none (passive) |

> We deliberately keep Skills and Arts as **one fuel** (Affinity-Energy) and don't over-split them —
> the active/caster distinction is flavor, not two economies. **Perks** are the discovery-reward
> hook: hidden-layer relics and odd events grant them, so exploration literally makes you stronger.

---

## 3. XP & Skill Growth

- **XP sources:** combat (creature + self), **surviving expeditions** (extraction bonus), discovery
  milestones, crafting, quests/bounties. No daily-quest grind (matches the lean economy).
- **XP-per-level scales with class Tier** — see the full curve model in §3.7.
- **Skills level by use** (espionage/craft/survival skills improve as you use them — the System
  tracks your activity). Separate from character level. Skills have **Tiers (Basic→Legendary) and
  Ranks (1–10)** with their own use-based XP math — full model in `SKILLS.md`.
- **Creature XP** from battles; sharing/route rules TBD (see open calls).

---

## 3.7 The XP Curve — how leveling actually works

Defined as a **formula** so it scales cleanly across 1→500 and any class Tier. Constants below are
**starting values tuned to the ~60h pacing** — playtest-adjustable, not final.

### Cost: XP to go from level L → L+1
```
XP_needed(L, Tier) = B * L^p * m(Tier)
```
- **B = 100** (base; makes a Basic Lv1 cost 100).
- **p ≈ 2.2** (curve steepness; tunable 2.0–2.5 — higher = harsher late grind). Power curve, NOT
  exponential (exponential overflows long before Lv500).
- **m(Tier)** = class-Tier multiplier (`CLASSES.md §3.5`):

| Tier | m(Tier) | Lv1 cost | Why |
|---|---|---|---|
| Basic | 1.0 | 100 | default, fast |
| Advanced | 3.5 | 350 | the worked example |
| Master | 10 | 1,000 | realistic starting ceiling |
| Grandmaster | 30 | 3,000 | pickable but **glacial** |
| Heroic | 90 | 9,000 | quest/rep |
| Legendary | 270 | 27,000 | quest/relic |

(~×3 per Tier. A Grandmaster pays 30× a Basic's cost *from level 1* — that's the "takes forever.")

### Income: mob XP must scale SLOWER than cost
```
mob_XP(mobLevel, species) = K * mobLevel^q * speciesXpYield   // q ≈ 1.6 (vs cost's p ≈ 2.2)
```
- **K = 17** (income base; with `B=100` this makes a *standard* creature take **~6 kills for level 1**).
- **q ≈ 1.6** — income scales slower than cost (`p ≈ 2.2`), so kills-per-level rises as `L^0.6`:
  early levels are quick (~6), the late game is a real wall, **with no hard cap**.
- **`speciesXpYield`** — a **per-species stat** baked into each creature's data (like a base XP yield).
  **A Lv5 spider ≠ a Lv5 wolf** — XP is a *species AND level* thing, not level alone. Set per species,
  often (not always) correlated with rarity/build:

| Species class | speciesXpYield |
|---|---|
| Common / weak (grazers, swarmers) | ~0.6 |
| Standard | 1.0 |
| Tanky / elite / rare | ~1.6 |
| **Apex / Alpha** (high System-resistance) | ~3–5 |

**Kills-per-level (standard species, before the level-diff modifier):** L1 ~6 · L10 ~23 · L50 ~62 ·
L100 ~93 · L400 ~215. The Lv400 wall is tunable down by nudging `q` up. The **level-difference
modifier** layers on top:
- Red/lethal-gap kill → **bonus XP** · White/matched → full · Grey/trivial → **near-zero**.
This kills low-mob farming and pushes you into appropriate-danger zones (feeds danger-by-depth).

### Auto-level
Leveling is automatic when the XP threshold is met; each level grants attribute points (§2). Total XP
to reach level L ≈ `B/(p+1) · L^(p+1) · m(Tier)`.

### Evolution interaction
On class evolution (`CLASSES.md §3.5`) you **keep your current level**, but **future** levels use the
**new (higher) Tier's multiplier**. Evolving = more power/skills now, slower leveling after. This is
what keeps "start high" balanced against "start low + climb": a fresh high-Tier is stronger per level
with its full base kit immediately; an evolved character has more *total* skills but climbed at cheap
Tiers. (Power-per-level numbers are a separate tuning pass; this section defines the XP side only.)

### Tuning methodology
To finalize constants: pick target hours per tier band (T1 ~0–12h … T4 ~38–60h), estimate kills/hour
from encounter rates (`ENCOUNTERS.md`), then solve B, p, K, q so cumulative XP at each band boundary
(Lv125/250/375/500) lands on the target hours for a reference Basic playthrough.

---

## 4. The Soft Cap (~450) — the System's leash

- **Soft cap at ~450.** You *can* push past it, but the System starts treating you as a threat:
  - Approaching it: Calamity death-line warnings surface (*"Don't level past 450"*).
  - Past it: **Surveillance spikes hard**, elite Audits escalate, and a **conversion risk** begins —
    the System tries to remake you into a construct (the lore behind every Calamity Boss).
- **Endings hook:** pushing past the cap unprotected is the path to the *Submit* ending (you become
  next cycle's boss). Surviving past it requires Off-Grid / Wisdom / hidden-layer protection —
  which ties the cap into the finale rather than being a flat wall.
- It is a **soft** cap (consistent with the soft-survival philosophy): not a hard stop, a rising danger.
- **XP past 450** uses the same §3.7 formula — the barrier is **conversion risk (narrative)**, not a
  grind wall. (Optional: a steepening XP penalty past 450, but keep the real wall story-driven.)
- **Class Tiers** (`CLASSES.md §3.5`) climb alongside level via evolution; the top Tiers (**Heroic /
  Legendary**) push you toward the soft cap — top-Tier power is exactly where conversion risk peaks.
- **Classes have NO hard level cap** (`CLASSES.md §1.7`). You may level any class indefinitely without
  evolving; the **~450 character soft cap above is the only ceiling**, and it's a story/Surveillance
  pressure on the *character*, never a per-class "must evolve" wall. Staying in a low-Tier class stays
  worthwhile because low Tiers level fast → more attribute points + deeper skill ranks, while
  in-class **Specializations** (`CLASSES.md §1.7` axis 2) give focus bonuses for not leaving.

---

## 5. Level Differential — danger telegraphing

Player/creature level vs. zone/enemy level drives the **HUD color** (from `DESIGN.md`/`WORLD.md`):
- **Red** = lethal gap (one-shot territory past +100) · **Yellow** = challenging · **White** =
  matched · **Grey** = trivial.
This is the readout that makes "danger by depth" legible and lets a player judge an expedition.

---

## 6. Interlock Summary
- **Survival:** Constitution scales Stamina/Exposure; Wisdom resists System effects. Stats *are* part
  of survival.
- **Classes:** attribute spreads + the player-leveling track make non-creature builds real.
- **World/Encounters:** the 1–500 scale + level tiers + level-diff coloring define every zone's danger.
- **Surveillance/Endings:** the soft cap turns "max level" into a story/Surveillance decision.

---

## 7. Scope Honesty
- **Cheap / early:** level + XP counters, the 6 attributes as data, level-diff HUD coloring.
- **Medium:** attribute effects wired into combat/survival, skill-by-use leveling, allocation UI.
- **Defer:** soft-cap conversion mechanic + elite Audits, ending-tilt bookkeeping.

## 8. Open Calls

**LOCKED:**
1. **XP curve** — pinned in `data/systems/progression.json`: `cost = B·Lᵖ` (B=100, p=2.2) × class
   **tierMult** (Basic 1.0 → Legendary 270×); mob yield K=17, q=1.6. Shape done; numbers tune in playtest.
2. **Creature XP = active-only, each creature earns its OWN.** No sharing of any kind. A creature is
   treated like a party member: it gains XP **only if it was in the fight**. Combined with permanent
   creature death (`ENCOUNTERS §4`), fielding a creature is the only way to grow it *and* the only way
   it can die — so committing a creature to combat is a genuine risk/reward decision.
3. **Attribute points per level** — pinned in `progression.json`: scales with Tier (`base 3 + 1 per
   tier above Basic`, Basic 3 → Legendary 8).

4. **Attribute SET = conventional 8-stat LitRPG spread** (§2): **Strength, Agility, Constitution,
   Intelligence, Wisdom, Perception, Charisma, Luck**. Renamed from the original might/finesse/… set;
   mechanics unchanged except **Luck** split out into its own attribute. Pinned in `progression.json`.
5. **Respec = NONE.** There is **no respec** of any kind — no Shop token, no item, no System service.
   Allocated attributes, chosen class path, and skill choices are **permanent**. Your build *is* your
   character; every choice carries weight and is lived with (consistent with permanent creature death
   and everything-at-risk-on-death). Mistakes are part of the run. *(Implication: `ECONOMY.md` must
   drop the respec-token catalog entry; class **change** — the lateral axis in `CLASSES.md §1.7` that
   keeps your skills — remains the only way to shift direction, and it is a forward growth choice, not
   an undo.)*
