# Living World — Roaming NPCs, Time & Persistence

> Design for a world that feels alive: NPCs that roam across all four regions, simulated cheaply,
> and a **persistent, time-consistent** world where NPCs only ever move as far as they plausibly
> could in the time that actually elapsed. Companion to `DESIGN.md`, `WORLD.md`, `HIDDEN_LAYER.md`.
> **Status:** brainstorming / pre-implementation.

---

## 0. The Goal

The world should feel alive — you meet a merchant in Verdara and genuinely run into the same
merchant in Halveth hours later, because they actually traveled there. But the game must never
render thousands of sprites at once, and the world must stay **consistent**: log off, come back
15 minutes later, and an NPC that was on one side of the world is **not** suddenly on the opposite
side — there's no way they walked that far that fast.

Two systems achieve this: a **two-layer simulation** (cheap, scalable) and a **time-driven,
speed-bounded clock** (consistent, persistent).

---

## 1. Two-Layer Simulation

### Layer 1 — Abstract simulation (the "world brain")
Every roaming NPC is a small record in **world state** (not player state):
```
NPC = {
  id, name, role,
  currentZone, destinationZone,
  path: [zoneA, zoneB, ...],   // route through the world-graph
  pathProgress: 0.0–1.0,        // how far along the current leg
  x, y,                         // exact tile within currentZone
  speed,                        // zones per in-game hour (bounded)
  schedule,                     // home/work/sleep or travel loop
  flags                         // e.g. "remembers-before", "vanishing", "construct"
}
```
A lightweight ticker advances these between zones over in-game time. **No sprites, no rendering** —
an NPC "traveling Goldfield → Tidecrown" is just numbers ticking. Hundreds run for almost free.

### Layer 2 — Materialization (the "actor")
On entering a zone, the game asks the world brain *"who is here right now?"* and spawns real walking
sprites **only** for those NPCs, at their stored `x,y`. On leaving, they de-spawn back into abstract
records — the brain keeps moving them whether or not you're watching.

> The player only ever renders the handful on the current screen; the world *feels* fully populated.
> This is the Majora's-Mask-schedule / RDR2-population / roguelike-off-screen-sim technique.

### NPC Population Model — Locals vs. Travelers
Two populations, both make the world feel real:

- **Locals (town-bound)** — live a schedule inside one Safe Zone; they have a *reason* to stay:
  - **Crafters** who took the guild classes — run benches, sell, teach; tied to a guild.
  - **Homebodies** who didn't want to brave the Wildlands — shopkeepers, families, the cautious.
    (Most people just want to survive safely — not everyone is an adventurer.)
  - Give towns a stable, recognizable cast between expeditions.
- **Travelers (roaming) — MANY (locked toward aliveness).** Adventurers, merchants, scavengers,
  wanderers whose records physically move across regions (the "I keep running into the same person"
  magic). Large named roster.

> The contrast is itself worldbuilding: the brave/desperate roam and risk the wilds; the
> cautious/skilled stay and build. The world reads as a real society under the System.

### Multi-Species World — the System recruited across planets
When the System "spawned" on Earth it broadcast its offer **across worlds**; other planets'
populations could **migrate to Earth to take part.** The world is now a cosmopolitan frontier —
humans plus alien races converged into the same System-run reality.

- **Population variety** — towns are melting pots; roaming rosters can be large and diverse without
  feeling samey. Free visual variety across both locals and travelers.
- **Theme escalation** — the System didn't just trap Earth; it *recruited* across worlds with the
  same "helpful" pitch. It farms subjects on a cosmic scale. Every migrant was lured by the same blue text.
- **Buried-truth payoff** — an alien who "remembers before" remembers a *different world's*
  Awakening → hard proof the **cycle spans worlds, not just Earth's history.** Delivered by ordinary
  roaming NPCs. (Ties directly into the §4 vanishing-NPC / remember-before hooks.)
- **Texture** — some races are **refugees** whose home world was already consumed by a prior cycle;
  they fled here hoping this time is different. Some know more about the System than humans (potential
  OWPS allies *or* red herrings).
- **Scope guard** — keep mechanical race effects **light/optional** (minor affinity leanings, guild
  tendencies, dialogue flavor). This is a worldbuilding win first; don't make it a balancing burden.

### Don't over-simulate
- **Most NPCs:** cheap abstract layer (town schedules + a few dozen named cross-region travelers).
- **Story-critical NPCs:** can be pinned/scripted when continuity must be exact (escort, quest).
- Skip: full real-time pathfinding for *every* NPC across all regions — unnecessary; the illusion
  is indistinguishable and far more stable.

---

## 2. Time-Driven, Speed-Bounded Movement (the consistency rule)

**An NPC never teleports to its destination.** It has a `speed` and a `path`, and the brain only
ever advances it by `elapsed_time × speed`.

- Log off with an NPC in Verdara heading east → return **15 min** later → brain advances 15 min of
  travel → NPC moved 15 minutes' worth down its path (still in Verdara, maybe one zone over).
- Return **2 days** later → brain advances 2 days of travel → it *could* now legitimately be in
  Halveth, because enough time actually passed.

> The guarantee is **not** "the NPC stays put" — it's "the NPC only ever moved as far as it could
> have walked in the time that actually elapsed." Always physically plausible.

### World clock — REAL TIME (locked)
- **1 real second = 1 in-game second.** The world runs on a real-time clock; a real day = an
  in-game day. NPC `speed` is defined in real-world units.
- **Day/night becomes literal** — play at 9pm and it's night in-game (Animal-Crossing-style). This
  is a conscious consequence of real time.
- **Player setting: "Always Daytime Visuals" (locked).** A toggle in options that **forces the
  visual lighting to daytime while the real-time clock keeps advancing underneath.** The simulation
  (NPC roaming, schedules, weather, any time-of-day gameplay) is unaffected — only the on-screen
  lighting/sky is pinned to day. Fixes "always night after work" without pausing the world.
  - Implementation note: lighting reads a `visualClock`; gameplay/sim reads the true real-time
    clock. The toggle just makes `visualClock` return a fixed daytime value (or run a cosmetic
    cycle) while the real clock advances normally. The two clocks are decoupled by design.

---

## 3. Offline Advancement — UNCAPPED, Real-Time (locked)

**The world lives on its own real-time clock with no cap.** Log off and the ambient world keeps
advancing in real time; come back after a year and the merchants have lived a year. Movement is
still **speed-bounded** (§2), so nobody ever teleports — they just plausibly traveled a long way
over a long real absence.

### Performance — advance analytically, never tick-by-tick
With no cap you must NOT loop through elapsed time on load (a month of ticks would hang). Instead,
each NPC's position is a **closed-form function of elapsed time**:
- Schedules loop (home→work→sleep is periodic) → position = `f(elapsed mod cycle)`.
- Travel paths are bounded → position = start + `min(elapsed × speed, pathLength)`.
- "Where is NPC #47 after 30 days?" is an instant calculation regardless of how long you were gone.

### CRITICAL SPLIT — Ambient (time-driven) vs. Narrative (event-driven)
This is what makes uncapped + real-time safe:
- **Ambient state** — roaming, schedules, day/night, weather → **time-driven, uncapped.** Runs forever.
- **Narrative state** — vanishing-NPC plot beats, Calamity clears, quest/OWPS progress, the
  buried-truth chain → **event-driven; only advances when the player plays.**

> Without this split, an uncapped time-driven story could "spend itself" while you're away (whole
> cast vanished, plot consumed without you). Gating *narrative* to player actions while *ambient*
> life runs on the clock = a world that waited for you story-wise but moved on physically. This is
> the same world-state/player-state boundary already locked, with one more line drawn inside world state.

### The mechanism — one timestamp, no drift
```
on save:  store lastSimTime = realNow
on load:  delta = realNow - lastSimTime          // no cap
          for each NPC: position = closedForm(npc, delta)   // analytic, not looped
          lastSimTime = realNow
          // narrative flags are NOT touched here — they only change through play
```
Single source of truth = `lastSimTime`. No drift, no teleports, deterministic.

### Persist EXACT state, not just the zone
Save `{ currentZone, pathProgress, x, y }` per NPC so reload restores the precise spot — never
snaps an NPC to a zone center or its destination.

### Deterministic & multiplayer-ready
- Advance via a **seeded** simulation so identical elapsed time always yields identical results.
- This is the multiplayer hook: the world brain can later move to a thin server and every client
  computes the **same** world. Keep NPC/world state cleanly separated from player state (already a
  locked architecture decision).

---

## 4. Theme Hooks — the Living World supercharges the story

- **"NPCs who remember before" who vanish** — with the world brain it's literal: flag the record
  `vanishing`; one day the ticker removes it (leaving a note). They don't blink across the map —
  they plausibly traveled somewhere over real elapsed time, *then* the record is flagged gone. Eerie
  because the world genuinely tracked them.
- **Surveillance-reactive NPCs** — high-Surveillance flags let System Constructs actually *path
  toward* the player across zones. The watcher feels alive.
- **Pseudo-MMO feel, single-player** — delivers the "sandbox MMO" vibe of the concept doc without
  needing multiplayer yet.

---

## 4.5 Mortality, Repopulation & Memory (NPC death)

> Non-story NPCs can **die** — permanently — and the world **remembers** them, then **repopulates
> with genuinely new people** over time. Turns the world-brain from "who's where" into "who *was*."
> Interlocks `OVERFLOW.md` (town sieges) + `DESIGN.md` (Surveillance) + the multi-species influx (§1).

### Permanent death, living repopulation (locked)
- Every NPC record carries **`mortal`**. **Story / quest-critical NPCs are `mortal: false`** — the
  sim never kills them (they may be threatened/wounded in scripted beats, never lost).
- **Death is permanent.** A dead record is flagged `alive:false` **forever** — *never restored,
  never revived.* The individual is gone. (No System-resurrection — that was considered and rejected:
  permanence is the point.)
- **The world does NOT respawn the dead.** Instead the brain keeps each town/role near a target
  population by **generating brand-new NPC records** — new name, new dialogue, often a different
  **species** (the refugee/migrant influx, §1). A town that lost its blacksmith eventually gets a
  *different* blacksmith who **arrived from elsewhere** and references the one before
  (*"I took over the forge after the last smith was lost in the Break."*). Roles refill; people don't.

### Causes of death (resolved abstractly in the world-brain — no rendering)
1. **Overflow Break** — when a dungeon Breaks on a town (`OVERFLOW.md §3`), it rolls **casualties**
   among locals: defenders and **homebodies who didn't flee**. Neglecting dungeons literally costs
   lives — the stakes that make the upkeep loop matter.
2. **Wild** — roaming **travelers** (adventurers, scavengers) pathing through dangerous / high-
   Overflow zones roll a death chance scaled to their level vs. the zone. *("Bob went out to hunt
   monsters to level — never came back.")* Homebodies don't roam, so they only die at home (Breaks).
3. **Player** — the player can kill NPCs. **These deaths are permanent even if nothing else is.**
   Consequences: **Warden standing drops**, the **System notices you harming subjects (+Surveillance)**,
   and the town **fears / mourns** you. Your violence leaves a mark the world keeps.

### Memory & gossip — the "feels alive" payoff
- Each death writes a **world-memory** record `{ name, role, cause, where, when, relations }`.
- Related / nearby NPCs gain a **dialogue hook** about it (*"Heard about Bob? Shame."*). News
  **spreads outward over real time, speed-bounded** like all §2 movement — a far town won't know yet;
  **travelers carry the news between towns** (*"Goldfield got hit bad, I hear."*).
- The player is **never told directly** — they *learn* by talking / overhearing. Optional
  environmental payoff: a fresh **grave / memorial** appears near the death site.
- **Named vs. background:** a *named/memorable* roster (~the 150) gets individual gossip + memory;
  generic background folk aggregate (*"the town lost six in the Break"*).

### Scope / tuning
- All of this is **abstract records** — 150+ mortal NPCs cost almost nothing; deaths resolve on the
  offline-advancement tick (§3), not per frame. Materialized sprites just read their record's
  `alive` on spawn.
- **Tune death rates low** — meaningful, not a meat-grinder. Death probability rises with **zone
  Overflow / depth** and **player neglect**, so the world's body count is a readout of how well the
  player is keeping the wilds in check.

---

## 5. Scope Honesty

- **Cheap / early:** abstract NPC records + the world clock + the `lastSimTime` catch-up rule +
  exact-position persistence. Town schedule loops. A dozen named travelers.
- **Medium:** materialization spawn/de-spawn polish, schedules reacting to time/weather/cleared
  Calamities, the vanishing-NPC flag pipeline.
- **Defer:** Surveillance pathing-toward-player constructs, large named-traveler casts, server-side
  world brain (multiplayer).

---

## 6. Decisions & Open Calls
**Locked:**
- Offline mode: **uncapped catch-up** (the world lives on its own clock forever).
- Time: **real time** (1 real second = 1 in-game second).
- Safety: **ambient = time-driven/uncapped; narrative = event-driven/player-gated** (the §3 split).
- Performance: positions advanced **analytically** (closed-form), never tick-by-tick.

- Visual day/night: literal by default, with a **"Always Daytime Visuals" player toggle** that pins
  lighting to day while the clock keeps advancing (sim untouched). `visualClock` decoupled from the
  real-time sim clock.

**Still open (filled in as we author the world/story, not upfront settings):**
1. **Traveler roster size:** how many *named cross-region roamers* to author. Most NPCs are locals
   who live a schedule in one town; travelers are the subset whose records physically move across
   regions (the "I keep running into the same person" magic). Dial between aliveness (~50+) and
   workload (~10–20). Set when we populate the world.
2. **Narrative pin list:** which story-critical NPCs are **exempt from roaming** so they're always
   where the plot needs them (quest-givers at a fixed spot, escorts, cutscene/boss NPCs). "Pinned"
   = ignores the world brain until their beat is done, then released or vanished. Marked per-quest
   as we write the story.
