# Seamless Map Streaming

> The overworld traverses **seamlessly — no load screens between outdoor maps** (Pokémon-style).
> Loads happen only for discrete **interiors** (doors/warps). Builds on the engine's existing
> connection system. Companion to `WORLD.md`, `LIVING_WORLD.md`, `TRAVERSAL.md`.
> **Status:** brainstorming / pre-implementation.

---

## 0. Goal
An expedition into the wilds is **one continuous space** — you cross between outdoor maps with no
load screen or seam. Only **going indoors** (a door/cave-mouth warp) triggers a short transition.

---

## 1. The model — an always-loaded active set

The world is a graph of maps connected at edges with **aligned tile offsets** (the engine already
has this: `getConnectionAt` / exit offsets in `src/engine/map.js`).

- **Active set = current map + all directly-connected outdoor neighbors**, loaded at once.
- **Render across borders:** as you approach an edge, the neighbor's tiles are *already rendering* in
  view — so stepping across has **no load and no seam**.
- **On cross:** the "current" pointer updates; the camera keeps moving; the **next ring of neighbors
  async-preloads** (tiles **and** their tilesets); maps that fall out of range **unload**.
- **Bounded memory:** keep current + 1 ring (optionally 2 for fast movement). Never the whole region.

```
loaded = { current } ∪ neighbors(current)            // outdoor only
on approach-edge: ensure neighbor fully loaded (it already is)
on cross:        current = neighbor
                 preload neighbors(current) async (idle/worker)
                 unload maps beyond the ring
```

---

## 2. Interiors stay discrete (this is fine)
Doors / cave-mouths / building entrances are **warps** → a quick **fade transition**. Interiors are
separate spaces, so a short load there matches the Pokémon feel and keeps the outdoor stream light.
Only the **outdoor** world is seamless.

### 2.1 Transition types (all reuse the warp framework — all buildable)
| Transition | How it works | Effort |
|---|---|---|
| **Door (enter building)** | door tile = warp → fade → load interior map at its entrance; exit at bottom warps back to the overworld door | cheap |
| **Stairs (multi-floor)** | each floor is its own small interior map; **stair warps** link them; snappy step/slide transition (often no full fade). Multi-story shops/guilds/towers = stacked floor-maps | cheap |
| **Boat / ship (sea travel)** | a port's **"board ship"** interaction → warp-with-flavor to the destination port. Also the region↔region sea path | medium |

**Boat — two styles (open call):**
1. **Cinematic crossing** — short sailing sequence/transition, then disembark at the destination port. Simplest.
2. **Walkable ship** — the ship is its own little map (deck/cabins) you walk while it "sails," then disembark. More immersive, more work.

---

## 3. Why the engine fits
- **Connections + offsets already exist** — we extend them from "transition trigger" to
  "always-loaded neighbor that renders contiguously."
- **Metatile rendering is per-tile** (`GameRenderer.drawMetatile`) — drawing a neighbor's visible
  border slice is cheap (only what's on-screen).
- **Async loading** on idle/worker so streaming never hitches mid-step.

---

## 4. Living-world synergy
Roaming NPCs (`LIVING_WORLD.md`) **materialize/de-materialize at the edges of the active set** — the
seamless world makes the alive-world more convincing (you watch a traveler walk in from the next map,
not pop into existence on a fresh load).

---

## 5. Region-to-region
- **Within a region:** fully seamless.
- **Between regions (sea travel):** seamless where two regions are directly adjacent; a short
  **travel sequence** for long voyages (open call).

---

## 6. Map-authoring requirements (affects how we build maps)
- Every outdoor map declares its **N/S/E/W connections with correct tile offsets** so grids line up.
- **Border tiles blend** across the seam (consistent tilesets/terrain at edges).
- The **map editor already supports connections**; we author them deliberately. (`Connections:` is
  already in the `WORLD.md §6` zone template.)

---

## 7. Scope Honesty
- **Cheap / early:** load current + 4 neighbors; render visible border slices; warp-fade for interiors.
- **Medium:** async ring preloading + unloading, tileset preloading, 2-ring buffer for fast movement.
- **Defer:** worker-thread streaming, sea-voyage sequences, diagonal-neighbor corners.

## 8. Open Calls

> **Note — prototype-scoped.** These are **2D metatile-engine** streaming details. In the **3D target**
> they dissolve into standard distance-based chunk streaming, so they carry decision-weight only for
> this prototype. Defaults locked below.

**LOCKED (prototype defaults):**
1. **Ring depth = 2** — load the full 3×3 (4 orthogonal **+ 4 diagonal/corner** neighbors). Fully
   seamless in *every* direction including diagonal corner crossings; safe for fast travel / biking
   (no edge hitch). Costs ~2× maps in memory vs. ring 1 — acceptable for the prototype's small maps.
2. **Sea travel = short travel scene** for long crossings (avoids streaming a large empty ocean);
   seamless near-shore water is fine, but open-sea voyages use a brief sequence.
3. **Indoor transition = instant fade** (simplest, snappy).
4. **Boat style = cinematic crossing** for long voyages; walkable ship deferred (§2.1).
