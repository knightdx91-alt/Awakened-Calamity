# Encounters & Death — Zone Spawns and Knockout Rules

> Two map-critical systems: **how encounters are specified per zone** (so zones are authorable now,
> before final creatures exist) and **what happens on knockout** (respawn/penalty). Built fresh,
> IP-clean. Companion to `DESIGN.md`, `WORLD.md`, `PROGRESSION.md`, `CRAFTING.md`.
> **Status:** brainstorming / pre-implementation.

---

## 1. Encounter Format (creature-agnostic placeholder)

Creatures are designed *after* maps, so zones reference encounters by **role, not species**. A
zone's encounter table is a weighted list of entries:

```
EncounterEntry = {
  affinity,        // one of the 9 (or Corruption for constructs)
  archetype,       // role placeholder: skirmisher | brute | caster | swarm | ambusher | apex
  levelBand,       // sub-range within the zone's tier (e.g. T1: 8–14)
  rarity,          // common | uncommon | rare | apex  (game-wide ladder)
  weight,          // spawn frequency
  drops            // common + rare material refs (CRAFTING.md families)
}
```

When creatures are authored later, each species is tagged with `{affinity, archetype, levelBand,
rarity, drops}` and slots into any matching entry — **no map rework needed.** Zones are built against
*roles*; species fill the roles afterward.

---

## 2. Spawn Methods (tie to world tier + danger-by-depth)

| Method | Where | Feel |
|---|---|---|
| **Grass/terrain spawn** | Safe-ish T1–T2 zones | Step into tall-grass-equiv tiles → encounter (classic, low-tension) |
| **Overworld roaming + detection cones** | T2+ / deep zones | Creatures visible on the map; stealth avoids them (`DESIGN.md`). Engaging is a *choice* |
| **Nests / dens** | Fixed spots | Reliable farm for a specific drop; higher density |
| **Surge ambush** | Deep/corrupted zones | Multi-enemy **lane** battles (`DESIGN.md` battle structure) |
| **Audit spawn** | High Surveillance | System Constructs (Corruption affinity) appear at wild rates |
| **Fixed boss** | Calamity sites | Scripted Calamity Construct encounter (`WORLD.md §4`) |

> Deeper zones lean on **visible roaming + cones + Surges**, not random grass — so danger is seen and
> chosen, and stealth/scavenger play is viable.

### Level bands by tier
T1 = 1–125 · T2 = 126–250 · T3 = 251–375 · T4 = 376–500+. Each zone picks a **sub-band** within its
tier; the level-diff HUD coloring (`PROGRESSION.md §5`) tells the player if it's lethal.

---

## 3. Encounter Density & Rates
Authored per zone (affects Stamina budget + pacing):
- **Rate** (grass) or **population count** (roaming) — sparse in deep hazardous zones, denser in farms.
- **Rare-spawn chance** — uncommon/rare/apex entries roll against weight; apex = a mini-event.
- Density interacts with the **Stamina budget** (`DESIGN.md §3`): more fights = more drain = shorter
  reach without camp.

---

## 4. Death / Knockout Rules (soft, recoverable)

Consistent with **soft survival** — knockout is never permadeath; it's a setback with teeth.

### Distinctions
- **Creature faints** — removed from the fight; revived at a Safe Zone or with a crafted Revive item.
- **Player downed** — happens via self-combat HP loss, full party wipe, or Exposure cap depleting
  you. Triggers the **recovery** below.

### On player down — Recovery
- **Respawn** at the **last Camp checkpoint** if one is active, else the **last Safe Zone**.
- **Penalties (from the locked survival model):**
  - **~5% XP loss** on carried creatures.
  - **10% chance per carried material** to be lost (scavenged haul is at risk — the real sting).
  - **No item-drop-on-death** — nothing is left in the world to lose/grief (multiplayer-safe).
- **Restored on respawn:** Stamina (Safe Zone) / partial (Camp). Exposure decays. Bound party revived
  at base HP.
- **Surveillance is NOT reset** by death — it's the antagonist's memory, not a combat stat.

### Camps reduce the sting
An active **Camp checkpoint** (`DESIGN.md §5`) means you respawn *forward*, not back at town — the
core reason to risk camping deep. (But a camp can be Audit-raided at high Surveillance.)

### Past the soft cap (~450)
Death while pushing past the cap unprotected carries the **conversion risk** (`PROGRESSION.md §4`) —
the only "death" that can be permanent, and it's a story event (the Submit path), not a normal wipe.

---

## 5. Interlock Summary
- **Maps:** §1 format + §2 methods + §3 density = the encounter half of every zone's spec.
- **Progression:** level bands + diff coloring + soft-cap conversion.
- **Survival:** density ↔ Stamina budget; Exposure can down you; camps change respawn.
- **Crafting:** drops feed material families; Revives are crafted.
- **Surveillance:** Audit spawns + camp raids; death doesn't clear Surveillance.

---

## 6. Scope Honesty
- **Cheap / early:** the role-based encounter table format (data), grass spawns, basic player-down →
  Safe-Zone respawn with XP/material penalty.
- **Medium:** roaming + detection-cone encounters, Surge lanes, camp-checkpoint respawn, nests.
- **Defer:** Audit spawns, soft-cap conversion death, apex mini-events.

## 7. Open Calls

**LOCKED:**
1. **Down trigger = the PLAYER, not the party.** The player character is a targetable actor with
   their own HP bar. The run ends the moment **you** are downed — regardless of any creatures still
   standing. Enemies *can* target the back-line player even while a creature is out (so self-combat
   builds have real stakes and the Intervention bait at ≤35% player HP stays coherent), but creature
   aggro/taunt draws hits, so a well-managed creature build rarely exposes the player. Exposure-cap
   down and full wipe both still resolve through this same single rule.

**Open:**
2. **Material-loss scope** — 10% per material of everything carried, or only the run's new scavenge?
3. **Revive economy** — how scarce are crafted Revives (affects deep-expedition risk)?
4. **Encounter rate baseline** — tune against the ~800-tile Stamina expedition target.
