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

## 6. Open Calls
1. **Creature-optional extreme:** can a build (e.g., pure Engineer/Combat) reach endgame with **zero**
   Bound creatures, or is a minimum party always required?
2. **Class count at launch tutorial:** how many *offered* up front vs. unlocked later.
3. **Multiclass?** Pure single-class with subclass trees (recommended) vs. light multiclass dabbling.
4. **Race × class gating:** which obscure classes are alien-race-locked vs. open to all.
