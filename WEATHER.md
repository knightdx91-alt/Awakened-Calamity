# Weather System

> Weather as a real system feeding **Exposure, encounters, and battle** — not just a backdrop.
> Runs on the real-time world clock, persists in world state. Companion to `DESIGN.md` (survival/
> battle), `LIVING_WORLD.md` (clock), `ENCOUNTERS.md`, `WORLD.md`. **Status:** brainstorming.

---

## 1. Weather Types (tied to hazards/affinities)

| Weather | Hazard fed | Battle effect (affinity) |
|---|---|---|
| **Clear** | — | neutral |
| **Rain** | (mild Tide) | Tide ↑, Ember ↓ |
| **Storm** | **Tempest** | Storm ↑, accuracy ↓; lightning flavor |
| **Heatwave** | **Heat** | Ember ↑, Tide/Frost ↓ |
| **Snow / Blizzard** | **Cold** | Frost ↑, movement/Stamina drain ↑ |
| **Fog** | **Gloom** | detection cones ↓ (stealth easier, your sight ↓) |
| **Toxic Haze** | **Toxic** | Toxin ↑; chip damage in the open |
| **Sandstorm** | (Stone/Heat) | Stone ↑; visibility ↓ |

One consistent language: weather **amplifies the matching Exposure hazard** and **shifts affinity
power** in battle.

---

## 2. What Weather Does (four hooks)

1. **Survival / Exposure** — weather **raises the matching hazard's Exposure build** (a blizzard
   spikes Cold; a heatwave spikes Heat). Camp/shelter and affinity gear mitigate. A clear day in a
   Heat biome is survivable; a heatwave there is lethal without gear. *Weather makes the same zone
   harder or easier on different days.*
2. **Battle** — weather buffs/weakens affinities (table above), adding a live tactical layer to Tempo
   fights. Storm-classes thrive in storms; you time fights or bring counters.
3. **Encounters** — some creatures are more active / only appear in certain weather (rare spawns in
   storms, etc.). Hooks into creature design later.
4. **Detection / movement** — Fog shrinks detection cones (stealth window); Blizzard/Storm drain
   Stamina faster and can slow movement.

---

## 3. How Weather Runs

- **On the real-time world clock** (`LIVING_WORLD.md`) — weather lives in **world state**, ticks on
  the real-time clock, and is **deterministic/seeded** so it's persistent and multiplayer-ready.
- **Zone tendencies + rolls:** each zone authors a weather **profile** (which types, how often) by
  region/season — Calderra leans Storm/Heat, Vael leans Snow/Blizzard, Verdara mild. Actual weather
  rolls against the profile over time.
- **Scripted weather:** story/Calamity weather overrides (e.g., a fire-Sovereign fight erupts the
  zone). Calamity zones can carry permanent oppressive weather.
- **Forecasting (utility tie-in):** a **Skyguard** guild service or a weather skill can predict
  upcoming weather, so players **plan expeditions around it** — living-world texture + a reason to
  engage the guild.

---

## 4. Map-authoring hook
Per zone (`WORLD.md §6`):
```
Weather: <profile — likely types + frequency; any scripted/permanent weather>
```

---

## 5. Scope Honesty
- **Cheap / early:** zone weather profiles + a clock-driven roller; the Exposure-amplify hook; a
  visual/lighting effect.
- **Medium:** battle affinity shifts, fog→detection, weather-gated encounters, forecasting.
- **Defer:** seasons, scripted Calamity weather, weather-exclusive rare spawns.

## 6. Open Calls

**LOCKED:**
1. **Weather-only now; seasons SAVED as a future option.** Ship the day-to-day weather roll — it
   already delivers what seasons would (same zone harder on different days via Exposure spikes,
   tactical battle shifts, weather-gated spawns), without the multiplied content cost (seasonal
   profiles + resource tables + art/lighting variants per zone). **Seasons are kept on the books as a
   later layer:** if added, a season slowly shifts each zone's weather *profile* (winter → constant
   Vael blizzards, summer → brutal Calderra heat) on a **compressed in-game calendar** (NOT the raw
   real clock — a 60h game must let players see all four seasons; the real-time-clock pacing is itself
   an option to revisit then). Out of scope for the first build, intact as a vision hook.

**Open:**
2. **Forecast access** — guild service, a skill, both, or always-on UI?
3. **Battle swing size** — how strong the affinity buff/weaken is (tactical spice vs. dominant).
