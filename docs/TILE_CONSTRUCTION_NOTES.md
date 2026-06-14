# How structures are built from tiles — research notes

Reference for building houses/towns from tiles (informs `tools/build_house.py`,
`build_building_tileset.py`, `gen_zone.py`). Top-down RPG conventions (RPG Maker
+ modular tileset packs). External examples viewed, not copied.

## 1. Buildings (the core principle)
A top-down building = **a tall wall FACE + a ROOF on top**, never a flat sprite.
- **Walls are ~2–3 tiles tall** (the front face you see), with **windows** on the
  upper rows and a **door** on the bottom row.
- **Roof sits above** the wall with a **darker eave/overhang** on its bottom edge.
- **Roofs need edge + corner pieces**, not just fill: top ridge, left/right slope,
  bottom eave, 4 **outer corners**, and **inner corners** for L-shaped/multi-wing
  buildings. Two roof styles:
  - **Gable** — ridge runs one direction; flat triangular ends.
  - **Hip** — slopes on all four sides meeting at a central ridge, with diagonal
    **hip lines** to the corners. (We render this procedurally in `build_hip_roof`.)
- Bigger buildings (manors, castles) are the SAME pieces tiled larger + towers/
  gatehouses stamped on; a castle = battlemented curtain wall (autotiled) + corner
  towers + gatehouse.

## 2. Walls (interior, modular)
Interior rooms use a wall **autotile set**: a top-wall strip, left/right side
walls, and **corner tiles** — including **inner vs outer corners**. In RPG Maker
each corner tile is internally split into **four 24×24 quarter sub-tiles** so any
wall junction resolves cleanly. The engine picks the right piece from the 4/8
neighbor pattern. (Our `_roof_piece()` does the same neighbor→piece selection.)

## 3. Autotiles — the connect-the-tiles mechanism
This is how terrain, **roads, paths, fences, water, cliffs** all "build
themselves":
- Each autotile is made of **corner mini-tiles** that **recombine by
  connectivity** (RPG Maker: 4 × 24×24 minitiles → 47-blob; our engine: Wang/
  corner `wang8_lut`).
- The **base tile** = how it looks fully surrounded by itself; it must tile
  seamlessly (matching top/bottom, left/right). Edges/corners are derived.
- Paint a path and the borders auto-resolve — no hand-placing every edge.

## 4. Roads & paths
- Roads are an **autotile** (same blob/Wang mechanism) — a base road tile +
  auto edges/corners/junctions (T, cross, bend).
- Design tip: **minimize long perfectly-straight runs**; let roads bend and branch
  so the town reads organic. Roads are the **skeleton** the town is laid on.

## 5. Towns (composition)
From the reference town: buildings are **organized around a path/road network**,
each building **fronting a road** with a small approach. The map has **functional
zones** (farmland block, pond, market/plaza, well) and is **framed** by cliffs/
forest. Decoration (trees, flowers, fences) lines edges and fills gaps —
**deliberate, not random scatter**.

## 6. How this maps to OUR system (status + gaps)
- ✅ Building assembler from a part-set, any footprint, outer **and** inner corners
  (`build_house.build_from_mask`), hip roofs (`build_hip_roof`), 6 materials,
  keep + curtain-wall castle.
- ✅ Terrain autotiling (`gen_zone` dual-grid + engine `wang8_lut`).
- ⏳ **Gable roof variants** (we have flat-top + hip; gable ends not yet authored).
- ⏳ **Road/path autotile** + **path-network town layout** (current placement is
  scatter; next upgrade = lay roads first, front buildings on them, zone the map).
- ⏳ **Interior wall autotile set** (for building interiors / dungeons).

## Sources
- RPG Maker official: "Mapping: Towns", "Creating Your Own Roof Variations",
  "How Autotiles Work" / "Making an Autotile" (rpgmakerweb.com/blog).
- LimeZu *Modern Interiors* "How to Walls" tutorial; Vectoraith *Modular DIY
  Top-Down RPG Buildings* pack (modular roof/wall assembly).
