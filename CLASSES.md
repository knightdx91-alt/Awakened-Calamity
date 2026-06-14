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
- **No respec** (`PROGRESSION.md §8.5`). You are not undone — instead, **class change** (the lateral
  axis, `§1.7`) lets you shift direction *forward* while keeping your skills, and classes never close
  doors. Your build is permanent; redirection is growth, not an undo.
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
          maxLevel: null,            // null = NO hard cap (the norm); soft cap is the ~450 char ceiling
          specializations:[…],       // in-class focus picks — see schema below (§1.7 axis 2)
          evolvesInto:[…],           // tier-up branches, each PATH-GATED — see below
          synergyFrom:[…],           // prior classes whose skills AMPLIFY this one (see below)
          unlock:{ type:'tier'|'stat'|'quest'|'item'|'affinity'|'claimed', … },
          claimedBy: null|'<order/race/world>' }   // null = open; else see §3.6

// Each evolution branch is PATH-GATED: offered only if the build satisfies `requires`
// (skill composition first, then stat/affinity). `default:true` = the fallback branch.
EvolveBranch  = { class:'<id>', requires:{ skillTags:[…], minCount, stat?, affinity? }, default?:bool }

Specialization = { id, name,
          unlockAtLevel,             // class level where the choice is offered
          focus,                     // the sub-domain it masters (e.g. 'light_armor', 'runes')
          bonuses:[ {type, target, amount} ],  // mastery bonuses (craft quality/speed, combat dmg/def…)
          grantsSkill: null|'<skillId>',       // optional single unique skill
          opensEvolution: null|'<id>',         // hard-points & offers this evolution branch (§1.7 axis 2)
          narrowsTo: null|'<skillTag>' }        // post-evolution skill pool is restricted to this focus
```

**Specialization examples** (focus *within* a class, no Tier change — `§1.7` axis 2):
- **Smith → Light Armorer:** `focus:'light_armor'`, `bonuses:[{type:'craftQuality',target:'light_armor',amount:0.2},{type:'materialEff',target:'light_armor',amount:0.15}]`.
- **Warrior → Two-Handed Master:** `focus:'two_handed'`, `bonuses:[{type:'dmg',target:'two_handed',amount:0.15}]`, `grantsSkill:'cleave'`.
- **Warrior → Guardian:** `focus:'shield'`, `bonuses:[{type:'def',target:'self',amount:0.2}]`, `grantsSkill:'bulwark'`.
- A class typically offers **2–4 specializations**; you pick **one** — **permanent** (no respec). A
  later **class change** can redirect you, but the specialization choice itself is not undone.

### Uniqueness rule
- Every class grants **~6–10 skills, of which ~3–5 are unique** to it (or its lineage); the rest are
  shared-pool. Enough genuinely-own skills that each class **plays distinctly**. (This unique-skill
  demand sets the size of the Skills library — designed next.)
- Every class also has its own **stat-bonus profile** (`PROGRESSION.md §2`) and **one signature**.

### Naming convention (locked)
- **Vary the title roots across a lineage — don't lean on one suffix.** A tree where everything is
  "-wright" / "-smith" reads as lazy. Limit any single suffix to ~2 uses across a tree; reserve an
  obvious profession root (e.g. *-smith*) for the canonical disciplines + base only, then diversify
  (Bladelord, Maulwarden, Plateforger, Glyphcarver, Keenedge, Quicksilver, Runebrand, …). The worked
  **Smith** lineage (Basic→Legendary) is the reference example.
- **Generated classes** (`CLASS_GENERATION.md`) must follow this same convention.

### Cumulative synergy — foundation skills (every class has it)
- Each class plants **foundation skills** that act as **prerequisites AND amplifiers** for what it
  evolves into. A **Warrior → Paladin keeps Warrior + bought skills**, and the Warrior foundations
  make the Paladin *measurably stronger* than picking Paladin cold.
- So **the journey beats the shortcut** at every step (it already did via cumulative skills; synergy
  makes it true *mechanically*, not just in kit size). Each evolution lists `synergyFrom` — the prior
  classes whose skills boost it. **No dead-end lineages.**

### Path-gated evolution offers (your build chooses the branch)
- Reaching the level/Trial gate makes you **eligible to evolve**; **which branch(es) you're *offered*
  depends on the build you've actually played** — primarily your **skill composition**, then
  specialization, stats, and affinity. This is why Warrior→Paladin should feel *earned*: you took the
  healing/protective skills that make a Paladin make sense.
- Each evolution declares its own offer condition (data-driven):
  ```
  evolvesInto: [ { class:'paladin',  requires:{ skillTags:['heal','protect','oath'], minCount:2 } },
                 { class:'reaver',   requires:{ skillTags:['berserk','heavy'],       minCount:2 } } ]
  ```
  At the gate the System offers **every branch whose `requires` you satisfy** (often just one — the one
  your build pointed at). Meet none cleanly → you still get the lineage's **default** branch.
- **Specialization is the strongest steer:** an `opensEvolution` on a Specialization (`§1.7` axis 2)
  hard-points the matching branch *and* flips the post-evolution skill pool to that focus only (Smith→
  runes→**Runecrafter** learns rune skills only).

### Hidden-objective evolution unlocks
- Beyond the normal tree, **off-book** classes are **offered** by meeting buried conditions:
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

## 1.7 The four ways a class grows (level · specialize · evolve · change)

A class is **not** a forced staircase toward evolution. It grows along **four independent axes**, and
a player can lean on any mix of them. The point: **staying in your class is a real, rewarding build**,
not a holding pattern until you can evolve out.

### 1. Level — no forced evolution, no hard max
- You can **keep leveling your current class indefinitely.** There is **no hard level cap**; the only
  ceiling is the **~450 soft cap + conversion risk** (`PROGRESSION.md §4`) that applies to the
  *character*, not the class — and that is a story/Surveillance pressure, never a "you must evolve now"
  wall.
- **Lower-Tier classes level fast** (`§3.5`), so a "lifer" who never evolves still racks up many levels
  → **attribute points** (`PROGRESSION.md §2`) and **deeply-ranked skills** (`SKILLS.md §4` — Rank 10
  breakthroughs). A Basic-class veteran is a master of a *narrow* kit, which is its own power fantasy.
- **"Fast" is relative, and it never stays easy.** Tier only sets the *multiplier* `m(Tier)`; the
  per-level cost still climbs with the `L^2.2` curve (`PROGRESSION.md §3.7`). So a Basic class is cheap
  *early* but **every level is still harder than the last** — a Lv60 Basic class is a real grind, just a
  gentler one than a Lv60 Grandmaster. Low Tier = a flatter curve, **not** a free ride.
- Evolving **trades that speed away** (higher Tier = steeper curve), so there is a genuine, ongoing
  reason to *not* evolve: raw level throughput and skill depth **now**.

### 2. Specialize — go deep within the class (the reason to stay, and the steering wheel for evolution)
- At a class-mastery milestone you may choose a **Specialization** — a focus *inside* the current
  class that grants **mastery bonuses** (and sometimes **one unique skill**) without leaving the class
  or changing Tier.
- Specializations are how "staying is worth it" pays off mechanically: a **Smith** who specializes in
  **Light Armor** gets a crafting-quality/speed/material-efficiency bonus to light armor specifically;
  a **Warrior** picks a **stance/weapon mastery** (e.g. Two-Handed, Guardian) for combat bonuses.
- A Specialization is **narrower than an evolution and cheaper than a class change** — it sharpens what
  you already do. (Schema + examples in `§1.5`.)
- **A Specialization steers your next evolution — and narrows what you learn after it.** Going deep on a
  focus is what *unlocks and offers* the matching evolution (`opensEvolution` in the schema). Example:
  a **Smith** who specializes in **runes** is offered evolution to a **Runecrafter** — and once she
  evolves, her growth is **rune-focused only**: the skills she learns from there are rune/inscription
  skills, **not** the general Smith/basic pool anymore. **Specializing is the commitment that converts a
  broad Basic class into a focused lineage** — you trade breadth for a deep, specialized end-state.

### 3. Evolve — climb the lineage (offered by the path you've walked)
- Up a **Tier** within the lineage: a **bigger kit + foundation-skill synergy** (`§1.5`, `§3.5`).
- **An evolution is *offered* because of what you've actually done, not just your level.** The
  *specific* branch you're shown is gated on your **skill composition / specialization / playstyle**, so
  the offer reads as *earned and thematic*:
  - A **Warrior** who has picked up **healing / protective / oath-type skills** is offered **Paladin**
    (the support-knight reading of "warrior") — a pure damage Warrior might instead be offered **Reaver**.
  - A **Rogue** who leaned **Speed + stealth-kill** skills is offered **Ninja**; one who leaned **locks
    + infiltration** is offered **Infiltrator**.
  - A **Smith** specialized in **runes** → **Runecrafter** (axis 2 above).
- So branches aren't a fixed menu you pick blind — **the world reads your build and offers the evolution
  that fits it.** Level/Trial is the *gate*; your accumulated skills are the *key* that decides *which*
  door opens. (Mechanics: `§1.5` "Path-gated evolution offers".) **Slower leveling**, broader (or, post-
  specialization, deeper) power. Optional, never forced.

### 4. Change — lateral career switch (keep your skills)
- A **life/career** move to a different class (Warrior → Smith), `§1.6`. **You keep all accumulated
  skills**; only your *growth focus / signature / stat lean* changes.

> **Level vs. Specialize vs. Evolve vs. Change are orthogonal.** A player can level a Basic class to a
> high level, take a Specialization for focus bonuses, and **never evolve** — that is a fully valid,
> deep build. Evolution is *a* path, not *the* path.

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
- **Medium:** signature mechanics per class, advanced subclass branches at rep tiers, class **change** (lateral redirect — there is no respec).
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
   skills + synergy). **No respec** — lateral **class change** (`§1.7`) is the only redirect, and it's
   forward growth, not an undo.
4. **Race × class gating — LIGHT.** Only ~2–3 truly race-locked classes (Starborn/Hollow = alien-only,
   Beast-Kin = part-creature races); everything else open. Race = minor affinity lean + a few exclusives.
5. **Original-System exclusive evolutions** (`DESIGN.md §6.5`): every class's tree gains a hidden
   **Untethered branch** reachable only in Original-System mode (or via deep OWPS) — e.g. Warrior →
   Paladin (sanctioned) vs. Warrior → [darker C] (Untethered). Stronger/darker; pulls the buried-truth
   thread; makes the permadeath choice pay off at *every* class milestone.
