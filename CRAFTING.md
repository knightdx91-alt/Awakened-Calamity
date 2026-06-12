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
- Recipes are gated by **era tier** (T1–T4) and learned via class, guild, or Shop recipe scrolls.

---

## 2. Crafting Disciplines (map to classes)

| Discipline | Makes | Class home |
|---|---|---|
| **Smithing** | Gear/armor for player & creatures, weapons, **hazard gear** | Smith |
| **Alchemy** | Potions, **hazard tonics** (Exposure cures), antidotes, buffs | Alchemist |
| **Engineering** | Gadgets, battle constructs/drones, **Tethers (capture tech)**, escape items | Engineer / Tinkerer |
| **Cooking** | **Stamina food**, expedition rations, camp meals | Cook |
| **Inscription** | Affinity rune-buffs onto gear/party | Runesmith |

Anyone can craft basics; the class/guild unlocks the deep recipes and quality bonuses (Insight stat
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

## 5. Capture Tech (Tethers) — crafted, not bought

Binding uses **Tethers** (`DESIGN.md §4`), which are **Engineering** crafts — tiered like everything
else (basic Tether → high-grade → Ghost Tether for Free-Bond/Off-Grid). Capture viability is a
crafting progression, not a store purchase.

---

## 6. Interlock Summary
- **Survival:** crafting *is* the expedition prep — hazard gear, tonics, food, Camp Kits, Tethers.
- **Economy:** trash mats = crafting inputs (near-worthless to sell); rare drops gate recipes.
- **World/Maps:** the node table above is the placement vocabulary for every zone.
- **Hidden Layer:** Relic Components unlock anti-System/Off-Grid gear.
- **Classes:** each discipline has a class home; Insight raises quality.

---

## 7. Scope Honesty
- **Cheap / early:** material families + node types as **data**; basic gather interaction; a simple
  craft menu; tiered Tethers + a starter recipe set.
- **Medium:** affinity-essence → hazard-gear chains, discipline depth, quality/Insight scaling,
  real-time node respawns.
- **Defer:** relic/Off-Grid gear, full era-4 master recipes, Inscription depth.

## 8. Open Calls
1. **Recipe count target** per era (how deep the craft tree goes).
2. **Gear slots** — how many equip slots for player and per creature.
3. **Durability?** — do crafted items wear out (survival pressure) or are they permanent?
4. **Node density** — how many nodes per zone (affects expedition pacing + Stamina budget).
