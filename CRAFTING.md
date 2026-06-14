# Crafting & Gathering — Materials, Nodes, Disciplines

> Design for the crafting economy and the **gathering nodes** that get placed on maps. Built **fresh**
> and IP-clean: no Poké Balls (Tethers/capture tech), no berries, no original-dex loot tables —
> our own affinity/hazard material vocabulary. Companion to `DESIGN.md`, `ECONOMY.md`, `WORLD.md`.
> **Status:** brainstorming / pre-implementation.

---

## 1. Philosophy — craft to survive

Traditional gear shops don't exist. **You craft your survival kit from scavenged materials and
creature drops.** The System Shop sells only what you *can't* craft (rare classes, relics, recipes,
utilities — `ECONOMY.md`). So crafting is the backbone of the survival loop, not a side activity.

- Material rarity uses the **game-wide rarity ladder** (`ECONOMY.md §5`): trash mats abundant, rare
  mats deep/hazard-gated. Trash loot's value is **here** (crafting), not in selling.
- Recipes gate on **material tier, class/discipline rank, and discovery** (no "era" gating —
  see §8.1b) — learned via class, guild, experimentation, or Shop recipe scrolls.

---

## 2. Crafting Disciplines (map to classes)

| Discipline | Makes | Class home |
|---|---|---|
| **Smithing** | Gear/armor for player & creatures, weapons, **hazard gear** | Smith |
| **Alchemy** | Potions, **hazard tonics** (Exposure cures), antidotes, buffs | Alchemist |
| **Engineering** | Gadgets, battle constructs/drones, **Tethers (capture tech)**, escape items | Engineer / Tinkerer |
| **Cooking** | **Stamina food**, expedition rations, camp meals | Cook |
| **Inscription** | Affinity rune-buffs onto gear/party | Runesmith |

Anyone can craft basics; the class/guild unlocks the deep recipes and quality bonuses (Perception
raises craft quality — `PROGRESSION.md`).

---

## 3. Material Families (our vocabulary)

Six families, each tied to gathering + affinity so they double as **hazard-gear inputs**:

| Family | Source | Feeds |
|---|---|---|
| **Metals** (scrap → ingots) | Ore veins (Stone) | Smithing: gear, Tethers, structure |
| **Flora** (weed → rare herb) | Herb patches / groves (Verdant) | Alchemy: potions, tonics, food |
| **Fiber** (vine, silk) | Plants, bug-creature drops | Tailoring/utility: ropes, light gear |
| **Affinity Essences** | Essence nodes (one per affinity) | Hazard gear + Inscription + affinity recipes |
| **Creature Drops** | Defeated/Bound creatures (common + rare per line) | All disciplines; rare drops = key gates |
| **Relic Components** | Hidden-layer caches (`HIDDEN_LAYER.md`) | Anti-System / Off-Grid gear, top recipes |

> **Affinity Essences are the survival keystone:** a Frost Essence node feeds Cold-hazard gear; an
> Ember Essence vent feeds Heat gear. Hazard biomes contain the essences that *counter neighboring*
> hazards (or gate behind them) — `DESIGN.md §3` Exposure mapping.

---

## 4. Gathering Nodes — the map-authoring vocabulary

This is what zone authoring needs. Each zone's spec (`WORLD.md §6` "scavenge nodes") draws from:

| Node type | Yields | Placement rule |
|---|---|---|
| **Ore vein** | Metals (tier by depth) | Caves/mountains; richer veins deeper/hazard-gated |
| **Herb patch / grove** | Flora | Forests/grassland; rarer herbs in deeper zones |
| **Fiber source** | Fiber | Woods, webbed areas |
| **Essence node** (per affinity) | Affinity Essence | Thematic to the biome (Ember=vents, Tide=springs, Frost=crystals, Storm=conductors, etc.) |
| **Super-node** | High-value rare mats | Deep/hazard zones only; **visible-temptation** loot (you can SEE it across a patrol) |
| **Relic cache** | Relic Components + lore | Hidden, espionage/Surveillance-gated (`HIDDEN_LAYER.md`) |
| **Creature drops** | Per-creature common/rare | From the zone's encounter roster (`ENCOUNTERS.md`) |

**Node properties to author per placement:** type, **material tier (T1–T4)**, rarity, respawn timer
(world-state, real-time — `LIVING_WORLD.md`), and whether it's gated (hazard / skill / Surveillance).

> Node respawn timers live in **world state** (separate from player state) so they tick on the
> real-time clock and are multiplayer-ready.

---

## 5. Capture Tech (Tethers) — the TOOL is crafted; the ABILITY is gated

Binding uses **Tethers** (`DESIGN.md §4`), which are **Engineering** crafts — a tiered lineage
(basic Tether → high-grade → Ghost Tether for Free-Bond/Off-Grid). The *tool* is a crafting
progression.

> **But the ABILITY to capture/Bind at all is gated — it is NOT universal.**
> - **Capture-capable classes** (the Tamer/Binder lineage) can Bind **innately** — it's their thing.
> - **Everyone else must purchase the Bind capability from the System Shop** as a System ability.
>   Until you have it (by class or by purchase), holding a crafted Tether does nothing.
>
> So capturing is gated **on the player's class/abilities, not just on the creature**. A non-Tamer
> who wants a party pays the System for the privilege — another way the System sells you power.

---

## 6. Interlock Summary
- **Survival:** crafting *is* the expedition prep — hazard gear, tonics, food, Camp Kits, Tethers.
- **Economy:** trash mats = crafting inputs (near-worthless to sell); rare drops gate recipes.
- **World/Maps:** the node table above is the placement vocabulary for every zone.
- **Hidden Layer:** Relic Components unlock anti-System/Off-Grid gear.
- **Classes:** each discipline has a class home; Perception raises quality.

---

## 7. Scope Honesty
- **Cheap / early:** material families + node types as **data**; basic gather interaction; a simple
  craft menu; tiered Tethers + a starter recipe set.
- **Medium:** affinity-essence → hazard-gear chains, discipline depth, quality/Perception scaling,
  real-time node respawns.
- **Defer:** relic/Off-Grid gear, full top-tier master recipes, Inscription depth.

## 8. Open Calls

**LOCKED:**
1. **Recipe depth = EXPANDS LIKE THE CLASS SYSTEM. Go deep — a LOT.** Crafting is **not** a flat
   "N recipes per era." It mirrors `CLASSES.md`:
   - **Tiered lineages, Basic → Legendary** (same Tier ladder as classes), per discipline. A recipe
     line *evolves/branches* — e.g. a Smithing weapon line deepens and branches the way a class
     lineage does (branch-then-converge, capstones).
   - **Discovery / experimentation** — like self-teaching skills (`SKILLS.md §1.5`) and the class
     **discovery layer** (`CLASS_GENERATION.md`): players can find/derive recipes, not only buy
     scrolls. New material+method combinations can mint new recipes.
   - **A lot of content** — ambition comparable to the class catalog; this is the survival backbone,
     so it should feel as deep as the class tree, not a side menu.
   - **No "era" gating** (see #1b). Recipes gate on **material tier, class/discipline rank, and
     discovery**, not on a world "era."
   - *(Build vertically: author one full discipline lineage Basic→Legendary first as the slice, the
     way the Smith class lineage was built, then replicate.)*

1b. **"Era" is REMOVED game-wide — it was a prototype holdover.** Decided: drop the **word** "era"
   everywhere, but **keep the T1–T4 tier bands** (now called **level / depth tiers**). Zones,
   encounters, and materials still scale by depth tier; only the "era" label is gone. Reworded across
   `PROGRESSION`, `WORLD`, `ECONOMY`, `CRAFTING`.

3. **Durability = YES. Items WEAR and BREAK — nothing is permanent.** Equipment and tools carry a
   **durability pool** that depletes with use:
   - **Drains from use** — weapons/armor lose durability in combat (dealing & taking hits), tools from
     gathering, and **hazard exposure accelerates wear** (Cold/Heat/etc. chew through gear — ties
     durability into the survival/Exposure layer).
   - **At 0 it BREAKS** — the item becomes unusable (not silently weaker). A broken weapon stops
     working; broken hazard gear stops protecting (and Exposure starts climbing). The break is a
     *felt* event mid-expedition, a real reason to carry spares / turn back.
   - **Repair, don't ignore** — repairable at Camp/town with **materials** (a fraction of the craft
     cost) via the relevant discipline. Repair is the steady crafting sink that keeps gathering and
     the craft loop alive the whole game.
   - **Soft cap on repair (recommended, tune in playtest):** each repair may shave a little off **max**
     durability, so gear eventually needs **re-crafting**, not infinite patching — keeps high-end mats
     flowing and stops one perfect item lasting forever. (Open: how steep, or whether repair is lossless.)
   - **Theme fit:** your *character* is permanent (no respec, permadeath stakes), but your *gear* is a
     maintained, consumable resource — crafting stays the survival backbone, never one-and-done.

**Open:**
2. **Gear slots** — how many equip slots for player and per creature.
4. **Node density** — how many nodes per zone (affects expedition pacing + Stamina budget).
