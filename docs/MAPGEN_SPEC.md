> **Consolidated:** the procgen roadmap/queue + technique toolkit + quality bar now live in
> **`GENERATOR_ROADMAP.md`** (the master doc). This file is the **detailed per-map-type
> appendix** it references — read it for the concrete rules of a specific map type.

# MAPGEN_SPEC — Generator definition for every map type

Status: **design spec** (2026-06-17). Defines how `tools/mapgen.py` (town/route/forest)
and `tools/mapgen_indoor.py` (interior/dungeon) **should** build each map type, grounded
in RPG-Maker mapping convention (sources at the bottom — the official RM blog tutorials
on Towns, Interiors, Forests, Cliffs, "Upgrading a Generated Dungeon", and roof-variation
guides, cross-checked against ≥25 community example maps per type). Each section gives:
**(A) the RM convention**, **(B) what our generator does now**, **(C) the gap**, and
**(D) the target rules** to implement. The intent: an autopsy of every map type so the
generator output reads like a hand-made RM map, not a procedural grid.

The current renders this was written against: town/route/forest look solid; **interiors are
the worst** (flat band walls, scattered furniture, no rooms); **dungeons** are a decent carve
but unsectioned with flat walls. The A3-roof / A4-wall(+side-face) autotile bakes are now
DONE (`tools/build_vx_ace_walls.py`), so the wall-look fixes below are unblocked.

---

## 0. Cross-cutting principles (apply to ALL types)

From the RM mapping canon, in priority order:

1. **Walkable-first composition.** Stake out where the player can WALK first (roads, room
   floors, corridors), *then* fill the rest with decoration. Playable vs decorative must be
   instantly legible. Compose like a photo — every screen-sized window onto the map should
   be pleasant and lead the eye.
2. **Ground variation beats emptiness.** Open areas look fine if the *ground* is varied
   (grass + dirt + a worn patch). Empty space is boring and hard to fill — **start small**,
   add rows/columns only if needed.
3. **No lines, no grids, no clumps.** Never line up trees/rocks/houses in rows or squares.
   Never clump >2 of the same large object. Scatter with jitter; break straight runs.
4. **Consistency of style.** One wall style, one roof palette family, one tile size per map.
   Too much material variety reads as noise. Pick a palette per biome and hold it.
5. **Channel, don't cage.** Steer the player with *soft* obstacles (trees, rocks, fences,
   water) — believable AND controlling. Never hard-wall the only route.
6. **Everything has a reason.** A well needs access; a shop needs a counter; a path goes
   somewhere; props match the setting (no fresh water buckets in a 1000-year-dead crypt).
7. **Detail with restraint.** Over-decorating buries the eye and can block the exit. Detail
   in passes, leave breathing room.

These map to concrete generator levers: **terrain-variation pass**, **jittered scatter with
anti-line/anti-clump rules**, **purpose-driven placement (function tables)**, and a
**reachability guard** that runs last.

---

## 1. The building system (roofs, walls, and the overhang rule)

This is shared by towns (exteriors) and feeds the interior/dungeon wall look.

### (A) RM convention
- A building = a **wall block** (A4 wall, **2 tiles tall** is the RTP standard) with a
  **roof** (A3 front-view roof) sitting **on top**. The character is ~1 tile tall, so walls
  read at 2 tiles; 3+ looks oversized — keep wall height **2** unless deliberately grand.
- **Roof vs wall width & OVERHANG** — the key rule:
  - The roof is built as a **9-slice** (ridge/cap top row, body, **eave** bottom row).
  - In RTP the roof's **eave (bottom row) overhangs the wall DOWNWARD** — the eave sits over
    the top wall row and casts a thin shadow rim on the wall ("a rim at the lower side of the
    roof" with shading for depth). So vertically the roof *does* lip over the wall's top edge.
  - **Sideways the roof is FLUSH** with the wall for the standard same-width house — the roof
    is the **same width** as the walls and does **NOT** overhang left/right into open ground.
    (Our owner explicitly chose the flush look; commit `f131a16` removed side overhang.)
  - A **side overhang of 1 tile each side** is only used for *larger/grander* buildings where
    the roof is intentionally wider than the wall — never for the small same-width houses,
    because a floating side-overhang over grass reads as a rendering bug.
  - Roof **height stays proportional** to footprint: a 4-wide house gets a 2-row roof, a
    ≥6-wide gets 3 rows — a roof must never out-tower its own walls.
- **Layering:** the roof + chimney go on the **upper layer (Layer 3)** so the player can walk
  *under* the eave; walls are on the normal layer and block. Walltop tiles are passable (you
  can stand on a roof) but our small houses don't expose roof-walking.
- **Front-view (A3) vs side-view (C-tab) roofs:** A3 = front-facing pitched roof (what towns
  use top-down); side-view roofs are a different sheet for buildings seen side-on. We use A3.
- Doors centered on the front wall; **windows in clean vertical columns** flanking the door,
  never on corners, on *every* wall row so a multi-row facade reads as real.

### (B) Current generator
`mapgen.house()` already does this well: flush same-width roof, `roof_rows()` proportional
height (2 or 3), roof+chimney on Layer 3 (player walks under eaves), door event centered,
windows in symmetric columns on every row, eave = roof's own bottom 9-slice row. Walls are
the A3 wall 9-slice. **This is the strongest part of the generator — keep it.**

### (C) Gap
- Houses are all **single rectangles**. Real RM towns mix **L-shaped and 3×3 cross** roofs
  (the roof-variation guides ship exactly these) and varied footprints.
- Only A3 *front* roofs; no taller "important building" with a 1-tile **intentional** side
  overhang to signal a landmark (inn, guildhall, keep interior).
- Wall material and roof color are picked at random per house — fine, but no **per-town
  palette cohesion** (principle 4): a town should bias to 2–3 roof colors, not all 5.

### (D) Target rules
1. Keep the flush same-width house as the default (it's correct).
2. Add **L-shape** and **3×3** house footprints (compose two/three flush rectangles sharing a
   wall; roofs meet at a valley). Gate behind a size check + spacing.
3. Add an **important-building** variant (inn/hall): wider roof with a **deliberate 1-tile
   side overhang** on Layer 3 + a sign, to read as a landmark. Document the overhang as
   intentional so it's never confused with the bug the flush rule fixed.
4. **Per-town palette:** pick 2–3 roof colors and 1–2 wall materials per `gen_town` seed;
   draw houses from that subset (cohesion). Vary footprint, not material.
5. Keep wall height 2 (3 only for the keep). Keep roof rows proportional.

---

## 2. Towns

### (A) RM convention
- Build around **2–3 anchor points** (trade hub / homes / a gate or dungeon mouth) and let
  the town grow organically from them. Roads connect anchors on **natural desire lines**
  (curve where people cut corners, straight where they'd walk straight) — **autotiled** road
  with grass borders, never blocky plain tiles.
- **Believable scale:** ~5 houses for a forest hamlet; don't over-shop (no mage tower in a
  logging village). Match buildings to the town's **purpose** (logging→sawpits/firewood,
  farming→crops/fences/animal pens, fishing→docks/nets).
- Doors face the road; you may put a door on the **side or back** if a clear path leads there.
- Infrastructure with **access**: a well you can walk up to (not marooned in a pond), crops
  with weeds, fences, stacked goods near workshops. Decoration in **layers**, reflecting the
  town's trade.
- **Don't** grid the houses; **don't** carpet the town in paths nobody uses.

### (B) Current generator
`gen_town`: central cobble **plaza** + a full-width **cross road** (both axes), optional
corner **pond**, optional **dirt cross-street**, optional **walled keep** (compact castle),
`_place_houses` drops N flush houses on grass with 1-tile clearance and runs a **dirt path
from each door to the nearest arm of the cross road**, optional flowerbeds at doors, a well
at plaza center with barrels/crates/sign/oven, tree border, nature pass. Renders well.

### (C) Gap
- The **full-width cross road** is the "grid" the canon warns against — every town is a `+`.
  Real towns have an **irregular road graph** following anchors, not a centered plus.
- Houses are placed by **rejection sampling anywhere** — no anchoring, no clustering into
  neighborhoods, no door-faces-road guarantee beyond the post-hoc path.
- **No town purpose/theme** — every town has the same generic prop mix. No crops/docks/pens.
- Plaza props are placed at fixed offsets from center (can land oddly).
- Roof colors/wall materials not cohesive per town (see §1.D.4).

### (D) Target rules
1. **Anchor graph, not a cross.** Pick 2–3 anchors (plaza, gate edge, a workshop/landmark).
   Lay roads as an **organic spanning path** between anchors with `path(... wander)` (already
   have it) — curve toward anchors, vary width 2–3, autotiled. Add 1–2 short spurs, not a
   full grid. The plaza stays as the social hub but roads radiate irregularly.
2. **Place houses along roads, facing them.** Sample house sites in a **band beside a road**,
   orient the door toward that road (door on the road-facing wall), 1-tile clearance kept.
   Cluster into 2–3 loose **neighborhoods** around anchors rather than uniform spray.
3. **Town purpose** (new `theme` arg: `farm|logging|fishing|trade|frontier`): swaps the prop
   palette + adds themed structures — farm→tilled-soil fields (dirt rows + crop props) +
   fences + pens; logging→stumps/log piles/sawhorse; fishing→a waterfront + docks + net/crate;
   trade→stalls + more signage; frontier→palisade fence ring + watch platform.
4. **Believable counts** scale with size: hamlet (≤30²) ~5–7 houses, town (50²) ~10–14,
   plus exactly the services the theme justifies (no random mage shop).
5. **Per-town palette** cohesion (§1.D.4). Mix in L/3×3 houses (§1.D.2) for silhouette variety.
6. Keep the well/plaza but place plaza props on **walkable, accessible** tiles (well not in
   water, reachable on ≥3 sides).
7. Run the **reachability guard** last: every door and the map edges must be mutually reachable.

---

## 3. Routes (the thoroughfare between places)

### (A) RM convention
- A route is a **trade road** that goes *somewhere*: consistent, sensible, **autotiled**,
  and where it enters the wild it should **dissolve into smaller dirt patches**, not stop dead.
- **Channel the player** along it with soft walls (trees/rocks/fences/cliffs), balancing
  believable vs controlled. Tree/rock walls hug the long edges, **never lined up**, varied,
  with some overlap/partial hiding for depth.
- Ground **variation** along the verge; a **point of interest** (a lake, a shrine, a rest
  camp, a ruin) for eye-candy and a reason to explore. Rocks/rubble near any cliffs, color-
  matched, scattered (no lines/squares).

### (B) Current generator
`gen_route`: one **continuous wide dirt road** (width 3) wandering across the map, a pond off
to one side, **dense 3-deep tree border** on the long edges, fence posts on the shoulders,
signposts where the road leaves the map, a small rest camp, a nature pass, and a final pass
that **force-clears the walking corridor** (no prop blocks the band). Reads well.

### (C) Gap
- The road **enters and exits at the same Y/X** (centered) with no edge **dissolve** — it
  hits the border crisply instead of fraying into dirt patches.
- Tree walls are only on the **long edges**; the road never **forks** or has a **switchback**,
  and there are no **mid-route gates** (a fallen log to detour, a narrow pass) for interest.
- One POI type (pond + a tiny camp). Canon wants a **landmark** with a reason.
- No **biome theming** (a marsh route vs a mountain pass vs a coast road look identical).

### (D) Target rules
1. **Frayed ends:** near each map edge, taper the road from width 3 → 2 → scattered dirt
   patches so it "dissolves into the wild" instead of a hard stub. Place the connection warp
   tile in that frayed mouth.
2. **One deliberate feature** per route from a table: a **rest camp** (firewood+crates+a heal
   point), a **shrine/ruin** (a few wall/pillar props + a lore sign), a **pond/ford** (cross
   the water on a dirt ford), or a **toll/checkpoint** (fence gap + a guard event hook). Place
   it in a widened pocket *off* the corridor.
3. **Gentle forks/switchbacks** allowed: a 1-in-3 chance of a short branch to the feature, or
   a single switchback if the route is vertical and long — keeps it from being a straight tube.
4. **Biome theming** (`biome` arg): swaps verge props + edge walls — forest→trees; mountain→
   cliffs/boulders/rubble (color-matched, scattered); marsh→reeds/water patches/dead trees;
   coast→sand verge + water on one side + driftwood. Ground-variation pass per biome.
5. Keep the **corridor-clear guard** and signposts. Keep tree walls varied (no lines).

---

## 4. Forests / open outside fields

### (A) RM convention
- **Trees:** dense and varied, **never clumped** (max two large trees together, don't clump
  small ones at all), some **overlapping** and some **partially hidden behind the forest
  wall** for depth and to mask the map border. Vary sizes.
- **Trails** look **worn and partly overgrown** — they fray into patches, not crisp lines;
  they wind naturally.
- **Ground variation** suggests foot traffic. Add a **lake/river** and a **point of interest**
  (camp, cabin, ruins) for motivation. Lower elevations = lush; near peaks = sparse.
- **Elevation (cliffs):** start a plateau all at one height, **break up long straight wall
  runs**, put color-matched rocks/rubble at cliff bases, scatter (no patterns).

### (B) Current generator
`gen_forest`: two winding dirt trails (both axes), a pond, two **clearings** with flower
pockets, a **very dense varied tree pass** (140 attempts, mixed tree2/pine/round), bushes,
flowers, tufts, boulders, rocks, firewood, dead trees. Trails are continuous.

### (C) Gap
- **No elevation** at all — forests/fields are flat. Canon leans hard on **cliffs/plateaus**
  for outdoor interest; we have the A4/A5 tiles but no cliff builder.
- Trails are continuous but **don't fray/overgrow** at the ends (we removed overgrow to fix a
  patchy bug, but the canon *wants* a controlled fray, not random holes).
- Trees are dense but **don't overlap or hide behind a forest wall** (depth) — they're placed
  as discrete 2×2 stamps that avoid each other; no layered canopy edge masking the border.
- One POI (clearings + pond). No cabin/ruin/camp landmark.

### (D) Target rules
1. **Add a cliff/plateau builder** (shared, also used by mountain routes & dungeons-with-
   elevation): pick a plateau region, lay A4-style cliff walls at one height, **break long
   straight runs** with 1-tile jogs, drop **color-matched rubble** at the base (scattered, no
   lines), and carve a ramp/stair down. Bake into the overlay/upper layers.
2. **Layered canopy edge:** along the map border, place a **2-deep forest wall** with trees on
   the upper layer overlapping inward so the hard map edge is hidden and the player reads a
   continuous forest (depth principle).
3. **Controlled trail fray:** taper trail ends to dirt patches (like §3.D.1) and let a *few*
   verge tiles of the trail be overgrown grass — deliberate, seeded, not random holes.
4. **One forest landmark** from a table (hunter's cabin, shrine, charcoal camp, standing
   stones) in a clearing, with a reason (a sign/event hook).
5. Keep the dense varied tree pass + clearings + pond; enforce the **anti-clump** rule
   explicitly (reject a tree stamp if >2 large trees already touch it).

---

## 5. Interiors  ← biggest fix

### (A) RM convention
- **Walls = 2 tiles tall**, consistent everywhere, rendered as a **side-view face** (you see
  the wall *rise*): a lit **top cap/lip** row + a **2-tile body** face below, the standard RM
  look — NOT a flat top-down band.
- **Section rooms with interior walls** and **doorways** between them; the interior layout
  should **roughly match the exterior footprint** and use only corners a real builder would.
  Avoid **square-house syndrome** — vary room shapes/sizes, add a hallway, an alcove.
- **Furniture sits IN FRONT of walls, not embedded in them** (RTP furniture is drawn to stand
  forward). Make **purposeful use of space** — people don't scatter junk randomly.
- **Item placement by room FUNCTION:**
  - **Bedroom** — bed against a wall (head to the wall), nightstand/dresser beside it, a
    wardrobe, maybe a rug; oriented to the wall it touches (head-to-back-wall = vertical;
    along a side wall = horizontal).
  - **Kitchen** — stove/counter along a wall, cupboards, a table, barrels/sacks.
  - **Dining/living** — table with chairs *around* it (chairs on multiple sides), rug under,
    a hearth on a wall, shelves.
  - **Shop** — a **counter blocking customer access** to the merchant side, goods on display,
    a cash box; living quarters separated (upstairs/back).
  - **Storage** — crates/barrels/sacks/shelves stacked along walls.
- **Stairs** must not glue to an outer wall (you'd walk "into" the wall going up); place them
  so the implied destination is over interior space. **Windows** only where a wall physically
  allows. Don't bury the room's function under decoration.

### (B) Current generator
`gen_interior`: one `carve_rect` room with a **2-row back wall** (rows 1–2) for top-wall
height, optional single vertical split into two rooms with a 1-tile doorway, exit at bottom-
center, then a **fixed furniture script** (bed+bed2 head-over-foot in a corner, cabinet,
two shelves, fireplace+barrel, a centered table+chair, pots flanking the exit, optional store
crates), plus a couple of scattered pots/crates. Walls use the **A4 wall 9-slice top-down**
band (flat).

### (C) Gap (this is the weak map type)
- **Walls are a flat top-down band** — the #1 visual complaint. The **side-view wall FACE**
  (lit cap + 2-tile body) is now **baked** (`rtp_<scene>_wallface` slots) but **not consumed**
  by the builder.
- **Rooms aren't really sectioned** — at most one vertical split; no hallway, no doorways with
  framing, no room-function zoning. It's one box with furniture sprinkled in.
- **Furniture is a fixed script**, not driven by **room function** — every interior is the
  same studio apartment regardless of building purpose (inn vs house vs shop vs infirmary).
- **No furniture orientation logic** — bed is always the vertical head-over-foot corner pair;
  no horizontal bed along a side wall; tables don't get chairs on multiple sides.
- Furniture can sit one tile off the wall (the back-wall offset is right, but side/front
  furniture isn't guaranteed flush-in-front-of-wall).

### (D) Target rules
1. **Render walls as the side-view FACE.** Replace the top-down 9-slice band with the baked
   `rtp_<scene>_wallface`: top **cap** row at the wall's top, **2-tile body** below for the
   back/interior walls so the wall visibly rises; keep a thin top-down cap only where a wall
   is seen purely from above. (Builder change in `mapgen_indoor.py` consuming the `slots`
   map already in the sheet JSON.)
2. **Room graph, not one box.** Generate **2–5 rooms** via BSP or a small hand-tuned splitter:
   partition the floor with **interior walls (2-tile)**, connect adjacent rooms with **framed
   doorways** (1–2 tiles), add a **hallway** spine for ≥3 rooms. Vary room sizes; allow an
   **L-shaped** main room and a small **alcove** to kill square-house syndrome. The outer
   footprint should be enterable from the bottom-center exit into a hall or main room.
3. **Assign each room a FUNCTION** from the building's purpose, then **furnish by function
   table** (the §5.A lists): bedroom / kitchen / dining-living / shop / storage / workshop /
   infirmary. A `gen_interior(purpose=...)` arg picks the room mix (house = bed+kitchen+living;
   inn = several bedrooms + a common room + counter; shop = shopfront counter + back storage +
   upstairs bed; infirmary = beds in a row + supply shelves).
4. **Furnish against walls with orientation logic.** Place each piece **flush in front of** a
   wall, choosing the **horizontal vs vertical** variant by which wall it touches (bed head to
   back wall = vertical; bed along a side wall = horizontal — needs the horizontal bed tiles
   added to the indoor prop sheet). Tables get **chairs on 2–4 sides**; rugs under tables;
   shelves/cupboards line walls; leave the room center walkable.
5. **Stairs/exit logic:** exit at bottom-center into a hall (keep). Any up-stairs placed
   against an **interior** wall (never an outer wall). Windows only on outer walls, in columns.
6. **Restraint guard:** keep each room's center clear; cap clutter; run reachability so every
   room is reachable from the exit through the doorways.

---

## 6. Dungeons

### (A) RM convention
- Choose **rooms + passages** or **pure maze**, with **margins** and corridor width (1-tile or
  wider) as deliberate choices. Generated layouts are a **starting point** — then **break up
  rectangles**: remove short wall segments to merge/shape rooms, block areas to change the
  silhouette.
- **Vary room size AND shape** — mix small square chambers with large halls; for caves add
  **irregular/organic** formations alongside rectangular chambers.
- **Avoid the linear chain** (entrance→hall→room→hall→room). Good dungeons offer **choices**:
  **loops, decision points, interconnected routes** ("Jaquaysing") so players can circle back.
- **Decoration matches the fiction** (bandit hide → crates/beds/torches; ancient tomb → no
  fresh water, lit torches odd; cave → rubble/stalagmites). **Don't over-decorate** into
  blocking the exit. Props near walls; pillars line big halls; water/chasms as obstacles.
- Maps need **room to breathe** — generated room-dungeons want ~60×35+, not 30×19 (cramped).

### (B) Current generator
`gen_dungeon`: scatter **N rectangular rooms** (size 5–9 × 4–7), **sort by position**, connect
each to the **previous one** with an L-corridor (width 1–2) → a **single linear chain**.
Finalize top-down 9-slice walls. Entrance stairs in room 0, **Alpha** (boss) in the last room,
pillars in big rooms, scattered crystals/rubble/barrels/crates/bones/gold.

### (C) Gap
- **Linear chain** — exactly the anti-pattern the canon warns against. Rooms connect only
  prev→next; no loops, no decision points, no circling back.
- **All rooms are rectangles** of similar size; no organic cave shapes, no large hall vs small
  chamber contrast, no merged/blocked silhouettes.
- **Flat top-down walls** (same as interiors) — no side-view wall face, no cave-wall variety.
- **Props scatter generically** regardless of the dungeon's fiction; no theme/hazard coupling
  beyond the count scaling with tier.
- No **chokepoints, secret nooks, or a treasure vault** as a reward for exploring a loop.

### (D) Target rules
1. **Connect as a graph, not a chain.** Build a connectivity graph over the rooms
   (e.g., MST for guaranteed reachability) **plus 1–3 extra edges** to form **loops**; add a
   couple of **branch dead-ends** ending in a reward (vault/chest) so exploration pays off.
   Corridor width varies 1–2; add the occasional **chokepoint** (1-wide pinch with a prop).
2. **Vary room shape & size.** Mix **small chambers**, **large halls** (pillars line them),
   and **organic cave rooms** (cellular-automata blob carve, not a rect) for cave-themed
   dungeons; **break rectangles** by merging overlapping rooms and blocking a corner or two.
3. **Side-view / cave walls.** Consume the baked `rtp_dungeon_wallface` for a wall face with
   height like interiors; for caves use the dungeon A4/A5 cave-wall set so walls read as rock,
   not a flat band.
4. **Theme + hazard coupling** (already have `tier`/`hazard` args, currently cosmetic): a
   `theme` (cave / crypt / bandit-hide / flooded / mine) drives the **prop table** (crypt →
   bones/graves/cobwebs, no fresh water; flooded → water rooms + a ford; mine → rails/carts/
   ore) and the **hazard** (water, dark, lava) places real obstacle terrain.
5. **Placement:** entrance stairs in the room nearest one edge; **Alpha lair = the deepest
   room on a loop terminus** (a large hall) with space to fight; a **treasure nook** on a
   branch; pillars in halls; rubble near walls (no lines). Keep the over-decoration guard.
6. **Size floor:** room-based dungeons generate at **≥48×40**; smaller requests fall back to
   a tighter maze layout so they don't read as cramped.

---

## 7. Implementation priority

1. **Interiors** (biggest visual win, art is ready): wall-face render (§5.D.1) → room graph
   (§5.D.2) → function-driven furnishing + orientation (§5.D.3–4). Add horizontal furniture
   tiles to the indoor prop sheet.
2. **Dungeons:** graph-with-loops connectivity (§6.D.1) + room shape variety (§6.D.2) +
   wall-face (§6.D.3). Theme/hazard tables (§6.D.4) after.
3. **Towns:** anchor-graph roads + houses-face-roads + per-town palette + L/3×3 footprints +
   town purpose (§2.D, §1.D).
4. **Routes/Forests:** frayed ends, one deliberate landmark, biome theming, and the shared
   **cliff/plateau builder** (§3.D, §4.D) — the cliff builder is the one big new shared system.

Each step ships with a **blob/render verification** (the `tools/render_town.py` harness) and a
headless editor/game load, per the project's verify-everything rule.

---

## Sources (RM mapping canon, cross-checked against community example maps)

- [Mapping: Towns — Official RPG Maker Blog](https://www.rpgmakerweb.com/blog/mapping-towns)
- [Tutorial — Mapping: Interior — Official RPG Maker Blog](https://www.rpgmakerweb.com/blog/tutorial-mapping-interior)
- [Mapping Forests — Official RPG Maker Blog](https://www.rpgmakerweb.com/blog/mapping-forests)
- [Tips and Tricks: Mapping Cliffs — Official RPG Maker Blog](https://www.rpgmakerweb.com/blog/tips-and-tricks-mapping-cliffs)
- [Upgrading a Generated Dungeon — Official RPG Maker Blog](https://www.rpgmakerweb.com/blog/upgrading-a-generated-dungeon)
- [Creating Your Own Roof Variations (1 & 2) — Official RPG Maker Blog](https://www.rpgmakerweb.com/blog/creating-your-own-roof-variations)
- [Traveling with a Simple World Map — Official RPG Maker Blog](https://www.rpgmakerweb.com/blog/traveling-with-a-simple-world-map)
- [RPG Maker MV: Basic Mapping — MoeGamer](https://moegamer.net/2016/08/10/rpg-maker-mv-basic-mapping/)
- [Bot's Guide to Custom Art in RPGmaker MV: Understanding Tilesets — Medium](https://robotsweater.medium.com/bots-guide-to-custom-art-in-rpgmaker-mv-understanding-tilesets-9178fe09e475)
- RPG Maker Forums mapping-tips / mapping-and-map-design-tips threads (community example maps)
