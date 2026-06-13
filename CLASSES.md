# Player Classes — System Classification

> Design for the class system chosen during the tutorial (when the System comes online). The class
> defines *how you survive the System's world* — creatures are one pillar among many, so this is
> deliberately **not** just catch-and-battle. Companion to `DESIGN.md`, `WORLD.md`, `HIDDEN_LAYER.md`,
> `LIVING_WORLD.md`. **Status:** brainstorming / pre-implementation.

---

## 0. The Hook — the class screen is the System classifying you

When the System comes online in the tutorial, it presents *"Subject classification: select."* Your
class is the System sorting you into its framework. This means:
- **Standard classes** are sanctioned roles the System offers.
- **Obscure / hidden classes** are loopholes, glitches, or off-book categories the System didn't
  intend — several are buried-truth flags (see §3). Picking one is itself a story signal.
- Ties to the tutorial glitch (*"Welcome, [SUBJECT 4471]"*): you are a *subject* being categorized.

---

## 1. What a Class Defines
- **Starting skill(s)** — espionage/craft/combat skills you begin with (others are learned/bought later).
- **Affinity lean** — a nudge toward one of the 9 affinities (not a hard lock).
- **Signature mechanic** — the unique thing only this class does.
- **Creature-reliance level** — how much you lean on a Bound party (creature-centric ↔ self-centric).
  *Everyone CAN Bind creatures; classes scale how central they are.* This is what makes the game more
  than catch-and-battle.
- **Guild synergy** — which of the 16 guilds the class naturally pairs with.
- **Surveillance interaction** — some classes raise/lower Surveillance or change how the System sees you.

### Not a 60-hour trap
- **Respec** exists (the Shop's Re-spec Token).
- Classes **branch into advanced subclasses** at guild-reputation milestones (e.g., Skirmisher →
  Bladedancer / Tempo-Reaver). Picking opens a tree, it doesn't close doors.

---

## 1.5 The Class Framework — counts, schema & uniqueness (locked)

The roster is **large and authored as DATA**, not bespoke code — a class is a record built from a
shared schema, drawing skills from a shared library plus its own unique ones. This is the only way
the counts below are buildable; uniqueness comes from the *combination* (stat profile + skill set +
signature + synergy + unlock), not from every skill being one-of-a-kind.

### Hard targets (built one Tier at a time, synergy-first)
- **50 Base classes** — offered at the tutorial (browsable, filtered by family).
- **~50 classes at EACH Tier** above Base (Advanced, Master, Grandmaster, Heroic, Legendary) —
  reached by branching evolution. Each lineage offers up to ~50 reachable end-states across the tree.
- **50 Special / Anomalous** classes — never on the start list; found via the hidden layer, hidden
  objectives, or claimed-class events (§3.6).
- **Build order:** lock the **Base 50 + their foundation skills first**, then design Advanced as
  evolutions those foundations amplify, and so on up. Author per Tier, never all at once.

### Class record schema (data-driven)
```
Class = { id, name, tier, family, affinityLean, statProfile,
          grantsSkills:[…],          // ~6–10; ~half UNIQUE to this class/lineage, ~half shared pool
          signature,                 // the one thing only this class does
          evolvesInto:[…],           // tier-up branches
          synergyFrom:[…],           // prior classes whose skills AMPLIFY this one (see below)
          unlock:{ type:'tier'|'stat'|'quest'|'item'|'affinity'|'claimed', … },
          claimedBy: null|'<order/race/world>' }   // null = open; else see §3.6
```

### Uniqueness rule
- Every class grants **~6–10 skills, of which ~3–5 are unique** to it (or its lineage); the rest are
  shared-pool. Enough genuinely-own skills that each class **plays distinctly**. (This unique-skill
  demand sets the size of the Skills library — designed next.)
- Every class also has its own **stat-bonus profile** (`PROGRESSION.md §2`) and **one signature**.

### Cumulative synergy — foundation skills (every class has it)
- Each class plants **foundation skills** that act as **prerequisites AND amplifiers** for what it
  evolves into. A **Warrior → Paladin keeps Warrior + bought skills**, and the Warrior foundations
  make the Paladin *measurably stronger* than picking Paladin cold.
- So **the journey beats the shortcut** at every step (it already did via cumulative skills; synergy
  makes it true *mechanically*, not just in kit size). Each evolution lists `synergyFrom` — the prior
  classes whose skills boost it. **No dead-end lineages.**

### Hidden-objective evolution unlocks
- Beyond the normal tree, classes are **offered** by meeting buried conditions:
  - **a stat threshold hit before a level-up** (e.g. Rogue + Speed ≥ X → **Ninja** offered),
  - a **quest** completed or **item** acquired,
  - an **affinity / kill-count** milestone.
- These are the discovery thrill — you back into a class you didn't know existed.

---

## 1.6 Lifestyles, class change, and optional combat (the game is not just killing)

**Classes are lifestyles, not just combat roles.** A full, viable life is possible as a **crafter,
healer, merchant, scholar, or townsperson** — combat is *one* pillar, not the spine.

- **Class CHANGE ≠ class EVOLUTION.**
  - **Evolution** = climbing *within a lineage* (Warrior → Paladin), gated by Trials/level, with
    foundation-skill synergy (§1.5).
  - **Change** = a lateral **life/career choice** — a warrior tired of killing **switches to Smith**
    to live away from violence. Distinct mechanic, fully supported.
  - **You KEEP your accumulated skills across a change.** A former Warriorturned-Smith is *still
    dangerous* — he just **grows as a Smith now** (new growth focus, signature, stat lean). You don't
    forget how to swing a sword because you took up the forge. (Still **single active class** at a
    time — no *simultaneous* multiclass; skills simply accumulate across changes + evolutions.)
- **Combat is universal but optional.** *Anyone* can fight — a peaceful crafter can **borrow/pick up
  a weapon** to fend off a monster. **No class is locked out of combat**, but most aren't *built*
  around it; non-combat classes acquire combat skills **by other means** (taught / bought / found).
- **Progression is NOT gated on killing.** Craft / gather / espionage / social skills level **by use**
  (`SKILLS.md §3`); expeditions + survival grant XP. A pacifist advances fully. **Fights are organic**
  — self-defense, an Overflow Break (`OVERFLOW.md`), a chosen hunt — never a forced kill-grind.

> The world reads as a real society under the System: the brave roam and risk the wilds; the
> cautious build, craft, and heal — and *both* are real, full ways to play.

---

## 2. Standard Class Families

### Combat (you fight)
| Class | Signature | Lean |
|---|---|---|
| **Vanguard** | Tank/defense, holds the front lane | Stone |
| **Skirmisher** | Tempo manipulation — act faster/more often | Storm |
| **Reaver** | Berserk; trades recovery for burst | Ember |
| **Affinity-Knight** | Channels personal affinity strikes (you, not a creature) | any |

### Tamer / Beastbond (creature-centric — the classic feel)
| Class | Signature | Lean |
|---|---|---|
| **Warden** | Bigger party + Bind-chance bonuses | any |
| **Beastmaster** | Buffs/commands creatures, weak self-combat | any |
| **Packlord** | Excels at multi-creature Surge-lane fights | any |
| **Soulbinder** | Deep bonds; early **Free-Bond** affinity (no-Surveillance capture) | Lumen |

### Arcane / Scholar
| Class | Signature | Lean |
|---|---|---|
| **Channeler** | Affinity caster — personal ranged affinity attacks | any |
| **Runesmith** | Inscribes affinity buffs onto gear/party | Stone |
| **Loreseeker** | Encryption + lore bonuses; reads ruins faster | Umbral |
| **Systemancer** *(obscure-ish)* | Manipulates the System's own **Intervention** UI in battle | Corruption-adjacent |

### Crafter / Artificer
| Class | Signature | Lean |
|---|---|---|
| **Smith** | Master gear crafting | Stone/Ember |
| **Alchemist** | Potions, tonics, hazard cures | Toxin/Verdant |
| **Engineer** | Deploys constructs/turrets in battle | Storm |
| **Cook** | Stamina/food mastery — survival powerhouse | Verdant |
| **Tinkerer** | Crafted battle drones + gadget utility | Storm |

### Survivalist / Ranger
| Class | Signature | Lean |
|---|---|---|
| **Ranger** | Exposure resistance, tracking, biome mastery | any |
| **Scavenger** | Loot/material bonuses + run-away viability | any |
| **Pathfinder** | Camp mastery, cheaper Kits, fast-travel perks | any |
| **Hunter** | Anti-wild specialist; bonus vs. non-construct creatures | any |

### Espionage / Rogue
| Class | Signature | Lean |
|---|---|---|
| **Infiltrator** | Stealth master — slips detection cones | Umbral |
| **Locksmith** | Lockpicking/vaults; opens pre-Awakening doors | Stone |
| **Cipher** | Hidden-layer specialist; Encryption + relic-finding | Umbral |
| **Grifter** | Pickpocket + social leverage | Toxin |

### Social / Support
| Class | Signature | Lean |
|---|---|---|
| **Broker** | Economy/prices, faster guild rep, better bounties | Lumen |
| **Envoy** | NPC + multi-species relations; unlocks dialogue paths | Lumen |
| **Medic** | Healing/support specialist | Tide |
| **Resonant** | Party-wide buffs/auras | Lumen |

---

## 3. Obscure / Hidden / Glitch Classes
The "a LOT, even obscure ones" tier. Some are **unlockable mid-game**, not offered at start. Several
double as **story flags** that interact with the cycle truth.

> **Rarity & how you get a class** (full ladder in `ECONOMY.md §5`): Standard→Legendary classes are
> **buyable/unlockable via the System Shop** (credits + town reputation + sometimes a quest). The
> **Anomalous** glitch tier below (Null, Systemtouched, Revenant…) is **never sold** — found only
> through the hidden layer. Sanctioned power is bought; loopholes are discovered.

| Class | Signature | Story/Surveillance note |
|---|---|---|
| **Null / Unclassed** | Refuse classification. No bonuses, hidden growth path | **Lower Surveillance** — the System can't categorize you. Major OWPS implications |
| **Systemtouched** | Begins with a sliver of admin access (a Console Power) | Starts **flagged (high Surveillance)** — power at a cost |
| **Revenant** | One who "remembers before" — starts owning a buried-truth fragment | Direct buried-truth flag; may recall a *different world's* Awakening (multi-species tie) |
| **Beast-Kin** | You ARE part-creature; can fight *as* a creature yourself | Multi-species/alien-race flavor; blurs Tamer/Combat |
| **Gravekeeper** | Umbral — reanimate fainted creatures mid-battle | dark-affinity niche |
| **Fateweaver** | RNG/Tempo gambling — high-risk Tempo & crit manipulation | chaotic playstyle |
| **Starborn / Hollow** | Alien-race-exclusive classes | gated to non-human origin; unique racial mechanics |
| **Doomsayer** | Believes the System; gains perks for **raising** Surveillance | ironic dark path; leans toward the *Inherit/Submit* endings |

> The obscure tier is where divergence + replayability live. Null, Systemtouched, Revenant, and
> Doomsayer each pull the buried-truth / Surveillance / endings threads, so class choice can
> *foreshadow* the player's eventual stance.

---

## 3.5 Class Tiers, XP Cost & Evolution (the vertical ladder)

Every class has a **Tier** — its inherent power/rarity. The Tier sets three things at once: how
strong the class is, how hard it is to obtain, and **how much XP each level costs**. This is the
single class-power ladder (it replaces the earlier Initiate→Paragon naming; same idea, the names you
wanted).

> **XP per level is a formula** — `XP_needed = 100 · L^2.2 · m(Tier)`. Full model, mob-XP income, and
> tuning methodology in `PROGRESSION.md §3.7`. The per-level costs below are the resulting Lv1 values.

| Tier | XP per level (Lv1) | Obtain | Maps to item rarity |
|---|---|---|---|
| **Basic** | ~100 to reach Lv1 — cheap, fast | default starters | Standard |
| **Advanced** | ~350 — noticeably slower | uncommon / low rep | Uncommon |
| **Master** | much higher | rare; **realistic ceiling for a *starting* pick** | Rare |
| **Grandmaster** | huge | technically pickable from the long start list, but **glacial** to level | Elite |
| **Heroic** | enormous | quest / deep rep / big credits | Legendary |
| **Legendary** | massive | quest / relic only | Mythic |
| **(Anomalous)** | off-book curve | **found via hidden layer, never sold** | Anomalous |

> Higher Tier = stronger **per level** but levels far slower. A Grandmaster gains huge power each
> level — and takes forever to gain one.

### The starting trade-off (the long class list)
- Character creation offers a **LONG list** of classes; you can pick higher Tiers up front
  (realistically up to **Master**; **Grandmaster** is selectable but punishingly slow to level).
- **Starting high is NOT strictly better.** You get the power Tier immediately, but you pay with
  brutal XP *and* you forfeit the accumulated skills you'd get by evolving up (see below). Both
  "start high" and "start low + climb" are valid builds.

### Class Evolution — cumulative skills (the journey wins)
- Classes form **evolution trees** — e.g. **Warrior → Paladin → …** — gated by level + a quest/
  **Classification Trial** (often guild-run, tying advancement to guild reputation).
- **Evolving KEEPS all prior-class skills and ADDS the new class's skills.** A Warrior who evolves to
  Paladin has *Warrior skills + Paladin skills*.
- **So evolving up beats starting at the destination:** a Warrior→Paladin ends up with a **bigger
  total kit** than someone who picked Paladin at creation. The climb is rewarded; the shortcut trades
  breadth for an early power Tier.
- Each evolution/Tier-up also grants new skill(s), an attribute spike, and at branch points a
  **specialization choice** (subclass trees from §1).

### Theme / endings hook
- The top Tiers (**Heroic / Legendary**) push you toward the **~450 soft cap** (`PROGRESSION.md §4`)
  where **conversion risk** peaks. Climbing all the way is the System's bait: the stronger you get,
  the closer you are to becoming its next construct. Off-Grid protection (`HIDDEN_LAYER.md`) is how
  you survive the top Tiers — pulling advancement into the finale.
- **Anomalous (glitch) classes** advance **off-book** through the hidden layer, not Classification
  Trials — the System never sanctioned them.

---

## 3.6 Claimed Classes & the Reckoning (stolen lineages have owners)

Some classes aren't open — they **belong to an order, race, or world** (`claimedBy` in the §1.5
schema): **Blood Priests of Kwaz**, alien **Starborn**, guild-sworn lineages. Only the legitimately
ordained are *meant* to have them.

### Acquiring one illegitimately
You can still get a claimed class **off-book** — a hidden-objective unlock, a looted relic, a rogue
teacher, a glitch. You receive the class and its kit, but it's flagged **unsanctioned**.

### The Reckoning (the consequence — a Living-World event)
While you hold an unsanctioned claimed class, there's a **chance a legitimate member of that order
finds you** — a **roaming Living-World NPC** who *physically travels to your location over real time*
(speed-bounded, `LIVING_WORLD.md §2`), not a scripted spawn. On the encounter, you choose:

1. **Revoke & revert** — surrender the class, take another Basic class. Keep your bought/foundation
   skills (cumulative rule); lose the claimed-specific ones. Clean exit.
2. **Fight** — defeat them. Their order turns **hostile**, faction/**Surveillance** hit, more
   enforcers may come, and (per `LIVING_WORLD.md §4.5`) **killing them is permanent**.
3. **Legitimize** — run the order's **ordination quest line / trials**. Succeed → the class becomes
   **sanctioned** *and* you unlock **their specific evolution tree** — the full lineage only true
   members can climb.

> A "stolen" class is a high-risk seed: flout the rules and you're hunted; earn your place and you
> inherit an exclusive tree. It ties classes to the multi-species world, gives the roaming-NPC sim
> real mechanical teeth, and rhymes with the System-as-classifier theme — you're wearing a
> designation you were never assigned.

---

## 4. Interlock Summary
- **Battle (`DESIGN.md`):** classes set creature-reliance and add personal/gadget/System combat
  styles on top of Tempo + Intervention.
- **Survival (`DESIGN.md §3`):** Ranger/Cook/Pathfinder/Scavenger are survival-first classes — the
  expedition loop has dedicated builds.
- **Hidden Layer (`HIDDEN_LAYER.md`):** Cipher/Locksmith/Systemtouched are the relic/admin builds;
  class is a primary key to the secret layer.
- **Living World (`LIVING_WORLD.md`):** Envoy/Broker leverage the roaming multi-species population;
  Starborn/Beast-Kin express the alien races as playable.
- **Endings:** Null / Doomsayer / Systemtouched foreshadow Destroy/Escape vs. Inherit/Submit.

---

## 5. Scope Honesty
- **Cheap / early:** the class-select screen + a handful of starter classes with stat/skill leans
  (data-driven). Affinity lean + starting skill is mostly a data table.
- **Medium:** signature mechanics per class, advanced subclass branches at rep tiers, respec.
- **Defer:** the obscure/glitch tier (especially Systemtouched admin access, Null's hidden path),
  alien-race-exclusive classes, ending-tilt bookkeeping.

> Build the *framework* (data-driven classes with leans + one signature each) early; the deep/obscure
> classes are content you layer in as the systems they touch (admin layer, endings) come online.

---

## 6. Decisions (resolved)
1. **Creature-optional extreme — YES, with friction.** A pure self/gadget build (Reaver, Affinity-
   Knight, Channeler, Engineer) can reach endgame with **zero** Bound creatures. Creatures stay the
   *easiest* path, and a few Surge-lane / Bind-gated moments favor a party — but each has a self-only
   alternative. The lonely, untethered no-creature run is itself thematic.
2. **Tutorial class count — all 50 Base** offered (browsable, filtered by family); Master+ selectable
   but glacial; obscure/Special are unlock-only.
3. **Multiclass — NO.** Single class + deep evolution trees (breadth comes from evolving up, cumulative
   skills + synergy). Respec available.
4. **Race × class gating — LIGHT.** Only ~2–3 truly race-locked classes (Starborn/Hollow = alien-only,
   Beast-Kin = part-creature races); everything else open. Race = minor affinity lean + a few exclusives.
5. **Original-System exclusive evolutions** (`DESIGN.md §6.5`): every class's tree gains a hidden
   **Untethered branch** reachable only in Original-System mode (or via deep OWPS) — e.g. Warrior →
   Paladin (sanctioned) vs. Warrior → [darker C] (Untethered). Stronger/darker; pulls the buried-truth
   thread; makes the permadeath choice pay off at *every* class milestone.
