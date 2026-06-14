# World Atlas — The Four Reaches

> World map plan for the LitRPG survival game. **Overview altitude** — each region drilled
> into town-by-town and zone-by-zone in later passes. Names are **original** (IP-clean).
> The Four Reaches are **wholly original areas** — invented geography, towns, zones, encounters,
> tiers, hazards, and story. They are **not** based on or modeled after any existing game's regions.
>
> Companion to `DESIGN.md`. **Status:** brainstorming / pre-implementation.

---

## 1. Target Length — Content Budget (60+ hours)

A 60h game isn't a long critical path; it's **layered content the survival/Surveillance loop
keeps you in.** Hours come from seven pillars, not from walking distance.

| Pillar | Hrs | What generates the time |
|---|---:|---|
| Main expeditions (story-gated zones) | ~20 | Outfit → push → camp → extract loops through each region's deep zones |
| Calamity Bosses (17 constructs) | ~12 | Prep (gear/affinity/Exposure counters) + the fights + purification re-clears |
| Guild bounty chains (16 guilds) | ~10 | Reputation tiers 0→10k unlock recipes/fast-travel; spread across regions |
| OWPS buried-truth chain | ~8 | The encryption/lockpick/ruin quest line that reveals the cycle |
| Survival + crafting loop (emergent) | ~6+ | Scavenging, hazard-gear crafting, camp expeditions, supply economy |
| Espionage / locked vaults | ~4 | Pre-Awakening vaults gated by Stealth/Lockpicking/Encryption |
| Endgame — purification + endings | ~8 | The Dismantling arc; true ending requires purifying all constructs |
| **Core total** | **~68** | + optional roamers, side caches, cosmetics, NG+ |

**Critical-path pacing** (compressed from the Drive doc's 120h for a tighter 60–65h game):
- **Hrs 0–12** Verdara — learn every system, first Calamity, first glitch/ruin tells.
- **Hrs 10–24** Halveth — specialization, guild verticals, first encrypted archive.
- **Hrs 22–40** Calderra — mastery, weather/sea warfare, the cycle's "made to keep fighting" reveal.
- **Hrs 38–60+** Vael — ascension, full buried truth at the Sunken Ruins, the Distortion endgame.
- Regions **overlap** because the world is open (danger-by-depth, no gating) — these are
  *recommended* bands, not walls. A player can sail to Vael on day one and die in the docks.

---

## 2. The World — Four Reaches

Four open regions, each dominated by one level tier but containing pockets of all four.
"Safe" towns are System-protected; everything else is Wildlands.

| Region | Terrain character | Role | Hour band | Dominant tier | Signature hazards |
|---|---|---|---|---|---|
| **Verdara** | temperate forest, grassland & fishing coast | Onramp / tutorial-by-attrition | 0–12 | T1 (~60%) | mostly none; Gloom, pockets of Heat/Toxic |
| **Halveth** | old-growth woods, rolling country & dragon highlands | Specialization | 10–24 | T2 (~55%) | Gloom, Cold, Toxic |
| **Calderra** | tropics, active volcano & open ocean | Mastery | 22–40 | T3 (~50%) | Heat, Tempest, Tide |
| **Vael** | snow highlands, the great Spine & ancient ruins | Ascension / endgame | 38–60+ | T4 (~50%) | Cold, Gloom |

Hazard legend (player-facing): **Heat · Cold · Toxic · Gloom · Tempest** (defended by affinity
gear/creatures — see `DESIGN.md §3`). Tiers T1–T4 = depth/danger bands.

> **The population is multi-species.** When the System spawned on Earth it recruited *across worlds*
> — other planets' populations could migrate here to take part. Towns are cosmopolitan melting pots
> of humans + alien races (some refugees from worlds already consumed by prior cycles). This scales
> the antagonist to cosmic scale and sets up a major buried-truth reveal (the cycle spans worlds).
> Full model + story hooks in `LIVING_WORLD.md`.

---

## 3. Region Overviews

### 3.1 VERDARA — the Onramp (Hrs 0–12)
Temperate forests, grassland, low mountains, caves, a volcanic isle. Teaches every core system.

**Towns (Safe Zones) & guilds**
| Town | Role | Guild |
|---|---|---|
| **Dawnhearth** | Origin town, starter, System tutorial | — (Professor / System intro) |
| **Greywall** | Mountain-foot town | **Vanguard Order** (defensive crafting, tanking) |
| **Saltmere** | Fishing port | (water/fishing hub) |
| **Volthaven** | Industrial port | **Voltcorps** (engineering, X-items) |
| **Verdance** | Garden city | **Verdant Circle** (alchemy, herbs, potions) |
| **Cinderhold** | Volcanic-isle town | **Cinder Forge** (high-tier metalwork) |

**Key Wildland zones / areas**
| Area | Tier | Hazard | Notes |
|---|---|---|---|
| **Mistwood** | T1 | — / Verdant | Tutorial wilds, silk/herb scavenge |
| **Hollow Vein** | T1–2 | Gloom | First mining dungeon |
| **The Underpass** | T2 | Gloom | Mining tier 2 |
| **Sparkworks** | T2 | Tempest | Engineering dungeon → **Storm Warden "the Engineer"** (T3 Calamity) |
| **The Ashlab** | T3 | Toxic | Forbidden lab — **first OWPS contact + first pre-Awakening interface artifact** |
| **Frostfoam Caverns** | T3 | Cold | **Rime Warden "Marie"** Calamity (death line: *"I... was Marie..."*) |
| **Emberreach Isle** | T3 | Heat | **Pyre Warden "the Record-Burner"** Calamity |
| **The Trial Road** | T3 | — | High-level corridor before the deep tiers |
| **Null Hollow** | T4 | Gloom | **ANOMALY "Subject Two"** — the only T4 in Verdara, a silent System experiment, recurring world boss |

**Story tells:** tutorial one-frame glitch *"Welcome, [SUBJECT 4471]"*; first vanishing NPC in
Dawnhearth (leaves a note); The Ashlab opens the OWPS thread.

---

### 3.2 HALVETH — Specialization (Hrs 10–24)
Old-growth forest, rolling country, shrine ruins, sea cliffs, dragon highlands. Pick a vertical.

**Towns & guilds**
| Town | Role | Guild |
|---|---|---|
| **Newdawn** | Secondary onramp town | — |
| **Loomspire** | Forge port | **Loomwright** (steel-grandmaster forging) |
| **Skyreach** | Tower town | **Skyguard** (aerial logistics, fast travel) |
| **Goldfield** | Market metropolis | **Pastoral Exchange** (food economy, supply hub) |
| **Wyrmgate** | Highland town | **Wyrmwarden** (dragon / rare-scale crafting) |

**Key zones**
| Area | Tier | Hazard | Notes |
|---|---|---|---|
| **Tanglewood** | T2 | Verdant | Apricorn/herb nodes |
| **Concord Cave** | T2 | Stone/Gloom | Mining tier 3 |
| **The Drowned Well** | T2 | Toxic | Psychic-dust super-node |
| **The Burned Spire** | T3 | Heat/Gloom | Origin of the roaming trio; phoenix echo |
| **the Three Reburned** (roaming) | T3 | — | **Gale / Spark / Cinder Warden** — siblings who died in the spire fire, re-bound by the System |
| **Mortar Deep** | T3 | Stone | Combat trial |
| **Drake Hollow** | T3 | — | Dragon-marrow farming |
| **The Maelstrom Isles** | T4 | Tide/Tempest | **Tide Warden "Aether"** Calamity |
| **Silvercrown Summit** | T4 | Heat | **Pyre Sovereign "Phoenix"** Calamity — reachable from Verdara too; you still die |

**Story tells:** "remember-before" NPCs more common; roamer death lines; **first encrypted System
archive** (needs Encryption skill) — deepens the OWPS chain.

---

### 3.3 CALDERRA — Mastery (Hrs 22–40)
Tropical coast, rainforest, active volcano, vast ocean, sky towers, desert. Endgame gear loops,
weather warfare. The cycle's cruelty becomes clear here.

**Towns & guilds**
| Town | Role | Guild |
|---|---|---|
| **Tidecrown** | Caldera-lake capital | **Tideclaw** (naval supremacy, aquatic crafting) |
| **Bastion** | Rocky island coast | **Stoneheart** (earth/combat dual specialty) |
| **Galehold** | Junction city | **Stormcaller** (electric/aerial fusion) |
| **Emberfall** | Volcano-foot town | **Emberforge** (fire mastery, T3+ forging) |

**Key zones**
| Area | Tier | Hazard | Notes |
|---|---|---|---|
| **Granite Deep** | T3 | Stone/Gloom | First Cosmic Dust drops |
| **Mount Cinder** | T3 | Heat | Active volcano, Magma super-node |
| **The Stormworks** | T3 | Tempest | Engineering guild HQ (weather institute) |
| **The Orbital Spire** | T3 | — | Cosmic-dust factory |
| **Origin Hollow** | T3 | — | Pre-Calamity trial |
| **The Sealed Chambers** | T4 | varies | **the Three Wardens of the Door** — *"guarding the door is all I remember"* |
| **Heaven's Spine** | T4 | Tempest | **Sky Sovereign "the sky belonged to us"** |
| **The Sunken Vault** | T4 | Tide | **Abyss Warden** — pre-Awakening archive in lore |
| **The Caldera Maw** | T4 | Heat | **Magma Warden** — the two made to keep fighting forever |
| **the Mirror Pair** (open sea) | T4 | Tide/Tempest | twins who speak only to each other in death |

**Story tells:** pre-Awakening R&D ruin (corporate archive); the Abyss/Magma "made to keep
fighting" reveal; the regional **Disguise uniform artifact** is found here.

---

### 3.4 VAEL — Ascension / Endgame (Hrs 38–60+)
Snow highlands, a vast mountain spine, ancient ruins, a haunted estate, a frozen temple, and the
Distortion. The buried truth fully surfaces here.

**Towns & guilds**
| Town | Role | Guild |
|---|---|---|
| **Hollowmere** | Mining town | **Coalstrike** (mining mastery, the Spine operations) |
| **Veilharrow** | Cathedral city | **Veilspun** (ghost alchemy, herbal fusion) |
| **Auronpoint** | Coastal snow town | **Skyfracture** (ice/weather endgame) |
| **Cestmark** | Ancient village | **Mythcrafters** — *the only OWPS-aligned guild; joining unlocks the buried-truth questline* |

**Key zones**
| Area | Tier | Hazard | Notes |
|---|---|---|---|
| **Eldwood** | T2 | Verdant/Gloom | Mid-tier herbs & bugs |
| **The Spine (lower)** | T3 | Cold/Stone | Tier-4 mining |
| **Greypall Estate** | T4 | Gloom | Shadow-residue super-node, haunted manor |
| **The Sunken Ruins** | T4 | Gloom | **MAJOR OWPS site — oldest System interfaces, full buried truth** |
| **Irongrave Isle** | T4 | Stone | Steel-grandmaster crafting |
| **Pyrecore** | T4 | Heat | **Forge Warden "I crawled in to hide"** |
| **The Frozen Vault** | T4 | Cold | **Origin Warden** — the first Awakened of cycle −1, the *previous loop's tutorial boss* |
| **The Ledgerpoint** | T4 | Tempest | **the Bookkeepers** — twin Calamity who run the System's time-and-space ledgers |
| **the Three Who Saw** (lakes) | T4 | — | children who saw too much |
| **the Severed Lovers** | T4 | Gloom | lovers split by a cycle reset |
| **The Distortion** | T4+ | all | **the Exile / Sidewise One** — first Awakened to attempt escape, pushed sideways, knows everything. **Persistent raid, true-endgame entry.** |

**Story tells:** the Sunken Ruins lay the cycle bare; the Origin Warden reveals previous loops;
**the Exile delivers the endgame and the four endings.**

---

## 4. Calamity Constructs — Master List

Naming pattern: **[Hazard/Domain] [Class] "[remembered human]"** — each is a previous-cycle
Awakened, remade by the System. Class tiers: *Warden* (standard), *Sovereign* (regional apex),
*Anomaly* (System experiment), *Exile* (the one that got out sideways).

| Construct | Region | Tier | Hint |
|---|---|---|---|
| Rime Warden "Marie" | Verdara | T3 | Lighthouse builder, first mate of an Old World ship |
| Storm Warden "the Engineer" | Verdara | T3 | The engineer who refused to leave |
| Pyre Warden "the Record-Burner" | Verdara | T3 | The one who burned the records |
| ANOMALY "Subject Two" | Verdara | T4 | Not a past Awakened — a System experiment. Doesn't speak |
| the Three Reburned (Gale/Spark/Cinder) | Halveth | T3 | Three siblings who died in the spire fire |
| Tide Warden "Aether" | Halveth | T4 | Sealed away, before |
| Pyre Sovereign "Phoenix" | Halveth | T4 | *"Phoenix — meaning rebirth, meaning trap"* |
| the Three Wardens of the Door | Calderra | T4 | Three soldiers — *"guarding the door is all I remember"* |
| Sky Sovereign | Calderra | T4 | *"The sky belonged to us, before"* |
| Abyss Warden / Magma Warden | Calderra | T4 | The two the System made keep fighting |
| the Mirror Pair | Calderra | T4 | Twins who speak only to each other in death |
| Forge Warden | Vael | T4 | *"I crawled in to hide. I never crawled out"* |
| Origin Warden | Vael | T4 | First Awakened of cycle −1 — the previous loop's tutorial boss |
| the Bookkeepers | Vael | T4 | Run the System's time-and-space ledgers |
| the Three Who Saw | Vael | T4 | Children who saw too much |
| the Severed Lovers | Vael | T4 | Lovers separated by a cycle reset |
| **the Exile** | Vael (Distortion) | T4+ | First Awakened to attempt escape; knows everything; endgame |

Each has a **purification alt-clear** (harder, costlier) required for the "Destroy" true ending.
Mythicals are deliberately *not* constructs — they're the cycle's resistance fragments, found via
deep OWPS questing.

---

## 5. Endgame — The Dismantling (Hrs 50–65+)

Triggered after the Sunken Ruins + the Exile. The player gains the ability to speak with
constructs and moves to dismantle the System. **Four endings:**
- **Escape** — break back to the original world. Bittersweet.
- **Inherit** — become the new System. Tragic.
- **Destroy** — end the cycle forever. *True ending — requires purifying all constructs first.*
- **Submit** — refuse the final fight; the cycle continues (you're a construct next loop).

---

## 6. Zone Spec Template (for the per-region drill-downs)

Every zone gets authored with all of this in one pass so world, survival tuning, and story land together:

```
Zone: <name>
Region: <region>   (original area — no external basis)
Tier: T1–T4(+)        Battle format: single | surge-lanes
Hazard(s): Heat|Cold|Toxic|Gloom|Tempest (+ intensity)
Stamina budget: <approx tiles edge-to-objective>   Recommended gear/affinity counters: <...>
Wild roster: <affinity spread + level band>
Scavenge nodes / visible-temptation loot: <what you can SEE and risk for>
Camp anchors: <where a Camp Kit is viable / forward-base spots>
Surveillance notes: <System offers / Audit risk here>
Hidden: <secret area? concealment + key skill — see HIDDEN_LAYER.md>
Relics: <old-system relics here + how gated (skill / hazard / Surveillance)>
Traversal: <capabilities gating sub-areas / shortcuts / secrets — see TRAVERSAL.md>
Weather: <profile: likely types + frequency; any scripted/permanent — see WEATHER.md>
Story beat: <glitch | ruin | vanishing NPC | construct death line | OWPS step>
Warp unlock: <landmark that becomes fast-travel after first survival>
Connections: <adjacent zones / sea routes>
```

---

## 7. Next Passes
1. **Verdara deep-dive** — every town + zone filled to the §6 template (the playable Phase 0–6 slice).
2. Story throughline woven in as we go (tells placed per-zone, not bolted on).
3. Then Halveth → Calderra → Vael.
4. Creatures & affinities after the map/story passes (the core DMCA divergence).
