# Traversal & Exploration Gating

> Our original "HMs": capabilities that gate **movement and reachability** — cross water, scale
> cliffs, light caves, break rubble, wade hazards. Shapes zone connectivity, shortcuts, and secret
> access, so it constrains map layout. Companion to `WORLD.md`, `CRAFTING.md`, `DESIGN.md`,
> `HIDDEN_LAYER.md`. **Status:** brainstorming / pre-implementation.

---

## 0. Principle — gate POCKETS, not regions

Danger-by-depth means **no hard region gating** (`WORLD.md`). So traversal gating controls
**reachability of sub-areas, shortcuts, and secrets**, not whole regions. You can walk anywhere; some
*loot, caches, and shortcuts* need the right capability. This pairs with **visible temptation**
(`DESIGN.md`): you can SEE the reward across the water you can't yet cross — and come back for it.

---

## 1. Traversal Capabilities (the vocabulary maps use)

| Capability | Passes | Obtained via (multiple paths) |
|---|---|---|
| **Ford / Swim** | deep water | crafted Tidewalk rig · a Tide creature ferry · Beast-Kin class |
| **Climb** | cliffs, ledges | climbing kit · Ranger/Stoneclimb skill · a climbing creature |
| **Glide / Descend** | chasms, big drops | glider gear · a flying creature |
| **Illuminate** | dark caves | Lumen lantern / affinity · (without it: Gloom Exposure rises + sight blinded) |
| **Break** | rubble, boulders | crafted breaker · Might threshold · a brute creature |
| **Hazard-wade** | lava / ice / toxic fields | the matching **affinity hazard gear** (same gear that defends Exposure) |

> **Multiple paths to every capability — gear OR class OR creature.** No build is locked out: a pure
> non-creature build crafts the gear; a Tamer build uses creatures; some classes traverse natively.
> This protects class diversity (`CLASSES.md`).

---

## 2. Elegant overlaps (reuse, not new systems)

- **Hazard gear = traversal gear.** The Heat gear that lets you survive a volcano's Exposure is also
  what lets you *wade the lava field* to reach the loot. Survival prep and traversal are the same kit.
- **Illuminate ↔ Gloom hazard.** A light source both reveals dark caves and suppresses Gloom
  Exposure — one capability, two payoffs.
- **Creature field-utility.** Bound creatures provide swim/fly/smash/light out of battle — making the
  party useful beyond combat and reinforcing "creatures are one pillar, not the only one."
- **Stealth as soft traversal.** Slipping a detection cone (`DESIGN.md`) is how you "pass" patrolled
  routes without a tool — an Infiltrator's traversal.

---

## 3. Map-authoring hook
Per zone (`WORLD.md §6`), note:
```
Traversal: <which capabilities gate which sub-areas / shortcuts / secret access>
```
Reserve the rarer capabilities (Glide, Hazard-wade for deep hazards) for later regions; Verdara
teaches Ford/Climb/Illuminate/Break as the basics. Relic caches (`HIDDEN_LAYER.md`) often sit behind
a traversal + skill gate.

---

## 4. Scope Honesty
- **Cheap / early:** Ford/Climb/Illuminate/Break as capability flags + tile gates; gear or creature
  grants them.
- **Medium:** creature field-utility, hazard-wade tied to Exposure gear, Glide.
- **Defer:** fancy traversal animations, multi-step traversal puzzles.

## 5. Open Calls

**LOCKED:**
1. **Creature field-utility = always available if you have the creature.** Passive — any creature in
   your party grants its traversal capability just by *being there*; no slot, no equip, no
   teaching-step. Crucially this means you never have to **expose** a creature to use its utility (it
   sidesteps the permanent-death catch-22, `ENCOUNTERS §4`). It's the Tamer build's natural
   convenience — a party that doubles as a traversal toolkit. **Party size is the only limit** (you
   can't cover every capability at once without also crafting the gear alternatives, §1).

2. **Capability count = KEEP THE 6** (Ford/Swim · Climb · Glide/Descend · Illuminate · Break ·
   Hazard-wade). Each maps to a distinct, instantly-readable obstacle (water/cliff/chasm/dark/rubble/
   hazard-field), each reuses an existing system (Hazard-wade = Exposure gear, Illuminate = Gloom
   defense), and each already has the gear/class/creature triple path (= 18 acquisition routes to
   author — enough). **Stagger introduction:** Verdara teaches the 4 basics (Ford, Climb, Illuminate,
   Break); the rarer two (Glide, deep Hazard-wade) come in later regions.

3. **Gates = SOFT by default — reward ingenuity, not the "right item."** The philosophy is **make
   players *think* about how to get past things**, and make figuring it out feel **special**. Most
   obstacles should offer a **risky / clever workaround** rather than a hard "come back with capability
   X" wall:
   - **Risk-it crossings** — wade a river without the rig (Stamina/chip damage, maybe swept back),
     dash a toxic patch eating Exposure, feel through a dark cave blind (Gloom rises, sight reduced).
     Bold or desperate play is a valid answer.
   - **Multiple solution paths** — gear OR class OR creature OR a risky unaided attempt OR an
     environmental trick. Because **taming is NOT a main pillar**, traversal must never quietly require
     a creature; a clever player without one should still find a way — and be *rewarded* for it.
   - **Cleverness is special** — an unintended-but-valid crossing (stack something, time a hazard, lure
     a creature, use a skill off-label) should succeed and feel like a discovery, not get walled.
   - **Hard gates only where genuinely needed** — true lethal barriers (deep open water, sheer
     cliffs, lava, story seals) stay strict for safety/sense; everything milder is soft. **Per-gate
     authored flag** marks which is which, so each hard wall is a deliberate exception.
   - *Fits the North Star:* "do I risk this crossing for the visible-temptation loot, or come back
     safe?" is the survival push-or-extract tension expressed in traversal.
