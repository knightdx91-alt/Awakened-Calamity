# Overflow — Dungeon Alphas, Breaks & Town Sieges

> Dungeons aren't static loot-rooms — they **fill up** if neglected and **break out** to raid the nearest
> settlement, led by the dungeon's **Alpha**. Keeping the wilds in check is an ongoing survival pressure,
> and the System will gladly "handle it for you" (the trap). Companion to `ENCOUNTERS.md`, `LIVING_WORLD.md`,
> `WORLD.md`, `DESIGN.md`, `GAZETTEER.md`. **Status:** brainstorming / pre-implementation.

---

## 0. The pitch

Every dungeon ends in an **Alpha** (its apex creature). Clear it and the dungeon resets; ignore it and an
**Overflow meter** climbs on the real-time clock until the dungeon **Breaks** — the Alpha and a warband
**march the roads** to assault the nearest Safe Zone or Holdfast. You must **keep up with the dungeons**
or get attacked at home. It interlocks the dungeon, living-world, survival, and Surveillance systems into
one loop, and it's pure North Star: the System offers to suppress overflow *for you* — Credits + Surveillance.

---

## 1. Alphas — every dungeon has one

- **What:** the `apex` archetype (`ENCOUNTERS.md §1`) at the deepest point of every dungeon — a wild,
  elite creature scaled to the dungeon's **tier** (T1–T4). ~57 dungeons → ~57 Alphas.
- **Not Calamity Constructs.** The 17 Calamities (`WORLD.md §4`) are *story* bosses; Alphas are *wild*
  apexes — repeatable, regional flavor. (A dungeon that *is* a Calamity site uses its Construct as the Alpha.)
- **Clear reward:** defeating the Alpha **resets the dungeon's Overflow to Stable**, stamps `lastCleared`,
  and drops **rare materials** (the credit engine + crafting gates, `ECONOMY.md`/`CRAFTING.md`).
- **Bindable trophy:** apex = high System-resistance, so Alphas are **hard to Bind** (`DESIGN.md §4`) — a
  real prize, not a guaranteed catch.
- **Repopulation:** the Alpha (and roster) **regrow over time** — clearing is *upkeep*, not one-and-done.
  A freshly cleared dungeon is briefly safe; left alone, it stirs again.

---

## 2. The Overflow meter — pressure on the clock

Each dungeon holds an **Overflow value** in **world state** (not player state), rising on the real-time
clock (`LIVING_WORLD.md`) while uncleared. Five stages:

| Stage | Meaning | In-world tell |
|---|---|---|
| **Stable** | recently cleared | calm; normal spawns |
| **Stirring** | filling | denser spawns inside; map icon warms |
| **Swelling** | near full | a **warband forms**; nearest town gets a warning ("tremors from the Vein") |
| **Breaking** | primed | Alpha + warband ready to march (offline cap — see §5) |
| **Break!** | overflow | they **leave the dungeon and move the route graph** toward the target settlement |

- **Fill rate scales by region/tier:** Verdara overflows **slowly + gently** (tutorial); Halveth→Vael fill
  **faster and hit harder**. Tunable per-dungeon (`speed`-style constant).
- **Telegraphed:** every dungeon's stage is **visible on the world map** (a colored ring/heat), so players
  plan upkeep. No surprise losses.

---

## 3. The Break — a raid you can see coming

Because the overworld is **seamless** (`MAP_STREAMING.md`), a Break is a **physical event on the map**: the
warband path-finds along **real routes** from the dungeon to its **target settlement** (the nearest Safe
Zone/Holdfast — authored per dungeon in `GAZETTEER.md`). Players get **three responses**:

1. **Pre-empt** — clear the dungeon (kill the Alpha) before it breaks. The clean, intended play.
2. **Intercept** — ambush the marching warband on the route → a **Surge-lane** battle (`DESIGN.md`), Alpha
   as the boss. Stops the raid in the field.
3. **Defend** — let it reach town → a **siege**: defensive **wave/lane** battle, Alpha as the final wave.
   Guild NPCs / town defenders may fight alongside you (`LIVING_WORLD.md` locals).

### If you do nothing
- **Town damage:** shops shutter, prices spike, services (Shop/heal/save/benches) **disabled until repaired**.
- **Reputation loss** with that town/guild (`ECONOMY.md`); **NPCs hurt** (feeds the **vanishing-NPC** thread).
- **Holdfasts are far more vulnerable** than Safe Zones — a Holdfast can fall to **"contested"** and must be
  **reclaimed** (clear the occupiers) before it functions again. Safe Zones are System-protected (harder to
  break) but **not immune** to high-tier overflow.
- **Recoverable, not permadeath:** towns enter a **besieged/damaged** state you can **relieve** (repair via a
  recovery quest / paying / clearing the source). *(Optional hardcore toggle: a Safe Zone repeatedly lost
  **degrades to a Holdfast**, then to a ruin — see §7.)*

---

## 4. The System "helps" — the convenience-trap (the spine)

The System notices your dungeon problem and offers solutions, each real, each tightening the leash
(`DESIGN.md` North Star · `HIDDEN_LAYER.md`):

- **"Register [Dungeon] for Automated Suppression."** — auto-resets its Overflow on the clock. **Cr + Surveillance.**
- **"Garrison [Town]."** — System Constructs defend it, Audit-proof. **Cr + Surveillance + flagged.**
- **"Emergency Extraction / Reinforcement"** mid-siege — a one-tap save, big **Surveillance** spike.

> **The dark read:** high Surveillance makes Breaks **worse** — Audits (`DESIGN.md §1`) stack with overflow,
> Audit-warbands can join a raid, and camps near a Breaking dungeon are likelier to be raided. The System
> **manufactures the danger it sells protection from.** Refusing suppression = you maintain the wilds yourself
> (the survival sandbox); accepting = safety now, a tighter collar later. Off-Grid relics (`HIDDEN_LAYER.md`)
> let you suppress/defend **without** Surveillance — the resistance path.

---

## 5. Living-world safety (uncapped clock, but fair)

Overflow obeys `LIVING_WORLD.md`'s **ambient vs. narrative split** so an absence never wrecks your world:

- **Ambient (time-driven, uncapped):** the Overflow **meter** rises on the real clock, even offline,
  computed **analytically** (closed-form `f(elapsed)`), never ticked.
- **Narrative (event-driven, player-gated):** the **destructive Break only fires while you're playing in/near
  the region.** **Offline, meters cap at "Breaking" (primed, not fired).** On return you may find dungeons
  primed and towns *warned* — but the raid resolves when you're present to fight it. You always get a shot.
- **Deterministic/seeded** → multiplayer-ready; every client computes the same Overflow state.

---

## 6. The upkeep loop (why this is fun, not a chore)

- **Keeping up pays:** Alpha clears = **rare drops** (income + crafting), healthy town services, **suppression
  bounties** from guilds (rep + Cr — a core repeatable loop, `ECONOMY.md`), and a **"Warden" reputation** with
  towns you protect (grateful NPCs, discounts, perks).
- **Bounded threat:** each settlement is threatened by only its **nearest 1–2 dungeons** — pressure, not
  whack-a-mole. The map shows exactly which.
- **Player agency:** pre-empt (efficient), intercept (heroic), defend (high-stakes), or **register** (pay the
  System). Four valid stances, each with a cost.
- **Pacing knobs (set once maps exist):** per-dungeon fill rate; warband size/level vs. dungeon tier; town
  defense strength; repair cost; suppression price + Surveillance gain.

---

## 7. Map / HUD payoff
- Each **dungeon node** renders its **Overflow stage** (ring/heat: Stable→Break).
- On a Break, the **route(s) from dungeon → target town light up** as the raid path (a live threat-board).
- Town markers show **status** (Safe / Warned / Besieged / Contested).
- This makes the world map a **living strategic layer**, not just a travel chart — strong "what a player sees."

---

## 8. Interlock summary
- **Encounters:** Alpha = `apex` archetype; warbands = the dungeon roster, elevated, in **Surge lanes**.
- **Living World:** meters in world state on the real clock; ambient/narrative split keeps it fair; raids use
  the roaming/path system.
- **Survival:** upkeep is part of the expedition economy; camps near Breaking dungeons are at risk.
- **Surveillance/Endings:** suppression/garrison = convenience-trap; Off-Grid = the no-Surveillance answer.
- **Economy:** Alpha drops + suppression bounties = a core credit/rep engine; lost towns disable services.
- **World:** danger-by-depth made *temporal* — neglect, not just distance, raises danger.

---

## 9. Scope honesty
- **Cheap / early:** Alpha at each dungeon end + clear-reset; an Overflow timer with map-icon stages; a basic
  town "besieged" state with disabled services; pre-empt + simple defend.
- **Medium:** marching warbands on the route graph, intercept Surge battles, suppression/garrison offers,
  guild suppression bounties, Holdfast "contested/reclaim."
- **Defer:** Audit-warband stacking, Warden-rep perks, hardcore Safe-Zone degradation, full siege choreography.

## 10. Open calls
1. **Fill clock:** real-time hours per stage by tier (how often a neglected T1 vs. T4 dungeon breaks).
2. **Warband strength:** fixed by tier, or scales with how *overfull* the meter got (later = nastier)?
3. **Multiple Breaks:** can two dungeons besiege one town at once, or hard-cap one active siege per town?
4. **Safe-Zone loss:** besieged-only (recoverable) by default vs. optional hardcore degrade-to-ruin (§3).
5. **Pre-clear decay:** does a freshly cleared dungeon also slow *neighboring* overflow (regional calm), or independent?
