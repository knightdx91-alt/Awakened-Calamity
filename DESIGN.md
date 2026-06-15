# LitRPG Survival Game — Design Notes

> Working design doc for the **Pokémon System Awakening**-derived project: a GBA-style,
> 2D top-down LitRPG **survival** sandbox built on this repo's existing metatile engine.
> Companion to the Drive doc *Pokemon_System_Awakening_Expansion_v2*. This file captures
> the brainstorming decisions so they survive between sessions.
>
> **Status:** brainstorming / pre-implementation. Nothing here is built yet.
> **Legal note:** mechanics are not copyrightable, but creature designs, names, the
> Poké Ball, trademarked terms ("Pokémon", "Gym", "Pokédex"), art, and trade dress are.
> This design deliberately diverges in expression. Not legal advice — get a real IP
> opinion before any public release.

---

## 0. The North Star

**"The System helps you, and that's the horror."**

Every convenience the System offers is real and useful — and every time you use it, it
tightens its grip. That one sentence is simultaneously the **theme** (System = antagonist),
the **core mechanic** (Surveillance), and the **world design** (the comfortable path is the
trap). Judge every feature by whether it reinforces this.

### The interlock (closed loop)
- **Theme → Mechanic:** the System is the antagonist, so *using* it has a cost → the
  **Surveillance meter**.
- **Mechanic → World:** Surveillance pressure pushes players off the System's path into the
  **deep zones** to scavenge, where stealth and survival matter.
- **World → Theme:** the deep zones physically hold the **buried truth** (ruins, dead names,
  corrupted palettes), so playing the mechanic organically discovers the story.
- **…back to Theme:** learning the truth recolors every convenience you leaned on.

> **Full picture:** Safe = protected by the System. Wild = exposed. Going deeper raises level
> danger *and* exposure danger *and* shifts battles single→lane *and* tempts you toward System
> conveniences that raise Surveillance — which spawns Audits — while the truth hides in the very
> zones the survival pressure pushes you into.

### Guardrails
- Surveillance must feel like *avoiding it is fun*, never like a nag meter. Carrot, not stick.
- The twist must never gate fun — a player who ignores lore still gets a great survival sandbox.
- Lean into the cheap-and-thematic systems first (UI strings, palette swaps).

---

## 1. Battle System — **Tempo + Intervention**

> **2D prototype vs. 3D target.** *Tempo* (active-time/ATB) is this **2D prototype's** expression of
> combat — the right fit for a GBA-style build. In the **3D game**, combat becomes **class-driven and
> action-based**: a Reaver plays like action-melee, a Channeler like a caster, an Engineer like a
> gadget/summon build — combat *feels like your class*, not one universal ATB. **What carries over
> intact is the Intervention layer** (below): the System meddling *inside* the fight is combat-model-
> agnostic and is the genuinely original, headline-worthy mechanic. Keep Intervention; let the
> moment-to-moment combat match the medium.

Designed to be *more fun for survival* **and** mechanically distinct from classic turn-based
(divergence for IP safety). Two parts: **Tempo** (active-time core) + **Intervention** (the
System meddles).

### Tempo (active-time core)
- Each combatant has a **Tempo bar** that fills continuously from Speed. Full bar = it acts.
- **Action weight:** moves cost Tempo to recover from. Heavy attack = long recovery (empties
  your bar more); quick jab = short. The core decision each turn is *"how much of my next turn
  am I spending?"* — that's the whole skill curve.
- **Two modes (difficulty setting):**
  - *Pause-on-act* — gauge freezes on your turn. Chill / mobile-friendly.
  - *Live gauge* — gauge keeps ticking. Real pressure / hardcore.

### Intervention (the System as a third combatant)
A **System panel** sits on screen and periodically acts on its own Tempo bar. It is **not
neutral**. Unlocks **after the tutorial** (both helpful and hostile).

**Helpful (the bait):**
- *Emergency Restore* — one-tap revive/heal, costs Credits. **Raises Surveillance.**
- *Tactical Suggestion* — auto-highlights the optimal move. Over-use → Surveillance.
- *Tempo Boost* — instantly fill your bar once. Credits + Surveillance.

**Hostile (deep zones / high Surveillance):**
- *Audit ambush* — a System Construct joins the **enemy** side mid-battle if Surveillance is high.
- *UI sabotage (bosses)* — move names scramble, the Tempo bar lies, "Emergency Restore" does
  nothing. The interface you trust becomes the boss mechanic.
- *Affinity lockout* — "This action violates Trainer Code 7", greys a move out for a few turns.

Three wills in every fight: **you, the enemy, and the watching System.**

### Battle structure — single + lane mix
- **Default: single-active** (one creature each). Fast, GBA-friendly, most wild fights.
- **Lanes unlock for "Surge" encounters** — packs, ambushes, Audits, Calamity Bosses. 3 lanes;
  front takes hits, back is safer but slower Tempo.
- **Trigger is environmental:** deep/corrupted zones spawn Surge fights; safe-ish zones stay single.
  The world tier decides the battle format.
- Survival bleeds in: **Exposure hits the whole party in lane fights** → long multi-enemy battles
  in hostile biomes are a race against the environment.

---

## 2. Affinities

Own wheel (not the 18 Pokémon types). **9 affinities + 2 meta-types.**

1. Ember · 2. Tide · 3. Verdant · 4. Storm · 5. Stone · 6. Frost · 7. Toxin · 8. Umbral · 9. Lumen

- **Corruption** (meta) — System-only, strong vs. all 9. The System cheats.
- **Untethered** (meta) — resists Corruption; mythical / resistance creatures only.

Each affinity has a **second job in survival** (see Exposure) — it's both an attack flavor and a
defense domain. That dual role is where depth and divergence come from.

---

## 3. Survival Layer (semi-survival)

**Soft** survival: meters make you *weaker / more exposed*, they rarely insta-kill. Death always
traces to a fight you entered weakened — never to a thirst bar. **Three meters:** Stamina,
Exposure, Supplies. Pressure = *being outside the System's protection* (Safe Zone vs. Wildlands).

Numbers below are **step-based** (engine is tile-based) starting points to playtest, not gospel.

### Stamina (fuel)
- Scale 0–100. Drain **1 per ~8 tiles** in Wildlands. **Zero drain in Safe Zones.** (~800 tiles/bar.)
- Modifiers: run/bike 2×; high Exposure 1.5×; over-capacity loot faster.
- Restore: Safe Zone full; Camp Rest +60; cooked food +15–40; raw scavenge +5.

| Stamina | Effect |
|---|---|
| 100–40 | Normal. |
| 39–15 | **Winded** — battle Tempo regen −25%; can't run on map. |
| 14–1 | **Exhausted** — Tempo regen −50%; detection radius vs. you +50%; Bind chance −20%. |
| 0 | **Collapsing** — no death; stumble every few steps; next battle starts with enemy Tempo pre-filled. |

### Exposure (biome hazard, affinity-defended)
"Do both": **readable hazard categories on top, 9 affinities underneath.**
- **Player-facing hazards (~5, clear icons):** Heat · Cold · Toxic · Gloom · Tempest. A zone shows 1–2.
- **Defense is affinity-granular:** Heat ← Tide/Frost gear, Ember creatures resist; Cold ← Ember
  gear, Frost creatures; Toxic ← Verdant/Stone; Gloom ← Lumen; Tempest ← Stone/Storm.
- Scale 0–100 per active hazard. Build **+1 per ~5 tiles**, cut by gear (down to +1/20 or zero),
  halved by a resistant-affinity creature on the field.
- Purge: leaving decays −1 per 3 tiles; Camp Rest ~40; matching tonic = instant.

| Exposure | Effect |
|---|---|
| 0–30 | Cosmetic warning (icon flicker, screen-edge tint). |
| 31–70 | Per-step Stamina drain +50%; small chip HP to party each battle turn. |
| 71–99 | Chip doubles; one team affinity move "suppressed" by the environment. |
| 100 | Hazard cap — steady chip even walking; depletes a creature → it **faints** (player doesn't die). |

### Supplies (scarcity, not a ticking bar)
- Your scavenged consumable stock: Camp Kits, food, Tethers, hazard tonics, escape items.
- Tension is economic — *"2 Camp Kits, 3 Frost tonics — how deep dare I go?"* No new meter to watch.
- Soft failure: running out forces retreat or a risky System purchase (Credits + Surveillance).

### Why this is "soft but tense"
No meter insta-kills; they **compound** into real danger (Exhausted + 80 Exposure + no tonics +
a +40-level patrol = a real "push or extract" call); death is always the player's decision's fault.

### Dials to set once maps exist
1. **Expedition length** — tuned for ~800-tile runs before forced camp/extract. Adjust to map size.
2. **Camp generosity** — Rest +60 Stamina / +40 Exposure is forgiving; tighten if runs feel too safe.

---

## 4. Capture — **Bind** (IP-divergent)

> **Framing — NOT a headline pillar.** This is **not a creature-collector game.** Bonding is a
> **class subsystem**, available to the few capture-capable classes (Tamer/Binder lineage) or bought
> from the Shop (`CRAFTING.md §5`) — one build path among many, not the game's identity or its
> marketing. The game is a **System-horror LitRPG action-survival RPG**; taming is optional flavor.

### Where creatures come from (origin lore)
**Bonded creatures are just the world's monsters — the same things you fight.** There is no separate
"collectible species" set. When the **System came online** it populated the world two ways:
- **Mutated native fauna** — ordinary animals warped into monsters: a **giant ant**, a **fire
  salamander**, a **dire wolf** — recognizable-but-wrong versions of real creatures, mostly in the
  overworld/wilds.
- **Pulled-in otherworld creatures** — things dragged from **other Systems / consumed cycles**
  (`WORLD.md`'s cycle cosmology) to **populate the dungeons**: alien, never-of-this-world forms like
  **large bipedal night-lizards**. Dungeon depths skew otherworldly.

### The bond flow — you bond what you fight
Per the **Overflow** loop (`OVERFLOW.md`): a creature breaks free / roams the wilds, **you find it,
you fight it**, and **before you land the kill you may attempt the Bond.** If the creature **accepts**,
it becomes your bonded creature; if it refuses (or you've no Bind ability), the fight is just a fight.
So your party is literally *the monsters you chose to spare and tame*, not pre-set catchables.

No Poké Balls. You **Bind** a weakened creature via the System's protocol.
- **The ability to Bind is GATED — not universal** (`CRAFTING.md §5`). Only **capture-capable classes**
  (the Tamer/Binder lineage) can Bind innately; **everyone else must purchase the Bind capability from
  the System Shop**. Without it, a Tether does nothing. (The System sells you the right to a party.)
- Weaken (low HP / status), then spend a **Tether** (your consumable, your art) on your Tempo turn.
- Bind chance scales with HP%, affinity, and the creature's **resistance to the System** — rarer
  creatures resist control (lore: the System claims things), so they're harder to Bind.
- **Surveillance angle:** Binding uses System protocol → tiny Surveillance gain. Late-game OWPS
  alternative **Free-Bond** befriends without the System — no Surveillance, but slower/harder.

---

## 5. Camp / Expedition Loop (survival's heartbeat)

1. **Outfit** (Safe Zone) — stock Supplies, craft hazard gear for the target biome, pick affinities.
   Full Stamina, save, craft, store loot. Roguelite-style prep beat.
2. **Push** (Wildlands) — Stamina drains, Exposure climbs, detection cones force stealth, visible
   temptation loot deeper in.
3. **Camp** (the key new verb) — craftable **Camp Kit** drops a temporary Safe Zone:
   - **Rest** (+Stamina, partial Exposure purge, costs in-game time)
   - **Craft** (convert scavenge in the field)
   - **Save** (deep checkpoint)
   - **Cook** (raw → Stamina food)
4. **Camp risk:**
   - *Soft:* consumes the Kit + in-game time (night = worse spawns / more Exposure).
   - *Story:* camping while **high-Surveillance** can trigger an **Audit raid on your camp** — even
     your refuge isn't off-grid if you've leaned on the System.
   - *Offer:* *"Unauthorized Safe Zone detected. Register for protection? (Cr + Surveillance)."*
     Register = Audit-proof but flagged. Refuse = hidden but exposed. The convenience-trap, even here.
5. **Extract** — haul loot to a Safe Zone or warp from an unlocked landmark. Deeper = bigger haul = bigger risk.

Camp = the moment you most feel both the comfort the System sells *and* the freedom of refusing it.

---

## 6. Surveillance Meter (the spine mechanic)

- **Rises** with convenience: Shop use, fast-travel, in-battle Intervention, Trials, camp registration,
  System-protocol Binding.
- **Lowers** only via deep-zone OWPS quests (and the rare, flagged Surveillance Wipe).
- **High Surveillance** → **Audits**: hostile System Constructs spawn at wild-encounter rates; can
  join battles; can raid camps.
- It *is* the antagonist's attention. The number going up is the story progressing.

---

## 6.5 The Original System — the one-time permadeath choice

The North Star, made literal: **refusing the System's comfort is the hardest, truest path.**

- **The offer (once, post-tutorial, irreversible).** After the tutorial, the player is told the
  System *wasn't always this helpful* — when it first began it didn't revive you, didn't hand-hold.
  They're offered the choice to run on the **Original System**. The screen warns **unambiguously**:
  *"Choose the Original System and there is no going back. Death is permanent."* — with a hard,
  deliberate confirmation, not a casual prompt. It appears **once** and can never be re-offered.
- **What it costs (the stick) — full permadeath.**
  - **The player dies permanently** — character death ends the run (save locks to a *fallen* state, no
    reload).
  - **Bonded creatures die permanently too** — a Bound creature that falls is **gone forever** (true
    Nuzlocke; you bury it). Every battle carries real, lasting loss — and it rhymes with the world's
    own permanent-death rule (`LIVING_WORLD.md §4.5`).
  - **The safety nets are gone** — no Emergency Restore, no in-battle Intervention revives, costly/no
    fast-travel & camp registration, harsher Audits. **Difficulty rises by the System WITHDRAWING its
    help — NOT by inflating enemy numbers.** Combat math is unchanged, so every death stays *earned*
    (the §3 rule: death traces to a fight you entered weakened, never a cheap shot). Permadeath + a
    fair fight = tense, not unfair.
- **What it grants (the carrot) — both story and power.**
  - **Exclusive evolutions** — hidden **class evolutions and skill evolutions** the assisted System
    never offers. When a class/skill would normally evolve into A or B, the Original path opens a
    stronger/darker **C**. The reward is felt at *every* milestone, not just at the choice.
  - **Off the leash** — **Surveillance grows far slower**; **OWPS / Untethered / Free-Bond** content
    and the **true endings** open here (and may be reachable *only* here).
  - **Front-loaded growth** — a progression edge (e.g. an XP multiplier or extra attribute point/level)
    so the hard path is also the faster-growing one.

The comfortable path is the trap; this is the escape that costs everything.

---

## 7. Scope Honesty (build order leanings)

- **Cheap / early:** System UI + Intervention/notification strings (the aesthetic backbone),
  Tempo bar, Stamina + Supplies drain, hazard icons, basic camp (rest/save), palette-swap deep zones,
  the 9-affinity chart.
- **Medium:** Tempo/recovery math + balancing, Bind, affinity-mapped Exposure defense, field crafting/cooking,
  hazard gear recipes.
- **Defer (design hooks now, build later):** Audit-construct AI, UI-sabotage boss scripting,
  camp-raids + "register your camp" offer, night/time-of-day spawn shifts.

Mirrors the Drive doc's phased order (Phase 0 walk → Phase 1 System layer → Phase 2 combat/capture → …).

---

## 8. Open / Next

Sequenced plan from the brainstorm:
1. **Maps + story together** (next) — author each Verdara zone with its **hazard type**, **Stamina-distance
   budget**, and the **buried-truth beat it carries** in one pass (first glitch, first ruin, first
   vanishing NPC, first boss death line seeded alongside the geography).
2. **Creatures & affinities** — sketch the *own* monster framework (the real DMCA divergence) after maps/story.

Still-open calls inherited from the Drive doc §11: battle flavor (resolved → Tempo+Intervention),
save scope, player soft-cap (~450), variant-form drops, System voice tone (menacing corporate cheer).
