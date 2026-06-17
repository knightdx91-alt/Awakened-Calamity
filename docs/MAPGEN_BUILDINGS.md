# MAPGEN_BUILDINGS — how houses & buildings are made (tile by tile)

Status: **design spec, buildings-focused** (2026-06-17). This is the deep dive the owner
asked for: **exactly how a building is constructed tile by tile** — which tile goes where,
roof rows, the overhang rule, walls, doors, windows, chimneys, shadows — the RM convention,
then a concrete dissection of what `mapgen.house()` does now (with the real bugs found in the
rendered output) and the target rules to fix it. Grounded in the RPG-Maker building canon
(official RM blog "Creating Your Own Roof Variations" 1 & 2, RPG Maker Unite "Creating Maps
Basics 2", MoeGamer, the tileset-structure guides) cross-checked against the actual RTP A3 /
A4 / Outside_B sheets in `data/tilesets/` and ≥25 community example houses. Sources at the end.

> **TL;DR of the current problem (from the rendered house `/tmp/house_iso.png`):** our windows
> render as **grey horizontal rungs** and the door is a **tiny black hole**, because the
> generator's window tile index (`Outside_B` 54) is **blank** and its door index (116) is a
> **dark recessed opening** — so the "windows" you see are actually stacked wall-edge 9-slice
> rows, not windows at all. There is also **no eave** (roof→wall depth). Fixes in §6.

---

## 1. RTP building tile anatomy (what's actually on our sheets)

RPG Maker splits a building across several tabs. Concrete contents of our 48→32px RTP sheets:

### A3 — building autotiles (`rtp_outside_a3`, 16×8 tiles = 8×4 blocks of 2×2)
A3 is **front-view building tiles** arranged as **2×2-tile blocks**, each block a wall-shape
autotile (orthogonal, 16-variant — the bake in `build_vx_ace_walls.py`).
- **Top two block-rows = ROOFS** (one color per block): block-cols give orange / brown / green
  / blue / red / gold / sage … (`mapgen.ROOF_BLOCKS`). A roof block 9-slices into ridge-cap
  edges + body + eave rim.
- **Lower block-rows = WALL textures** (stone / brick / block / plank / log / thatch / white —
  `mapgen.WALL_BLOCKS`). These are the *facade* faces, 9-sliceable, each with a built-in **top
  trim row** (the light lip where the wall meets the roof) and side/bottom edges.

### A4 — walls (`rtp_outside_a4`, 16×15 tiles)
Bands of **wall-TOP** (2-tile, top-down cap) + **wall-SIDE** (3-tile, the side-view face that
"rises"). A4 is what dungeons/interiors use for room walls; for **front-view town houses RTP
uses the A3 wall facade**, not A4. (Our baked `rtp_*_wall` + `rtp_*_wallface` come from A4.)

### Outside_B — props, doors, windows, chimney (`rtp_outside_b`, 16×16 = 256 tiles)
Verified by rendering the sheet with indices (`/tmp/b_indexed.png`). The building-relevant tiles:
| Index | Tile | Good for |
|------:|------|----------|
| 67, 70 | **framed wood windows** (dark/4-pane glass) | the real window tile |
| 99 | **stained-glass window** (colored) | chapel / important building |
| 102 | **barred window** | jail / cellar |
| 98 | **arched wooden double-door** | the real front door |
| 100 | **arched dark doorway** (recessed) | doorway opening (pair with a Door event) |
| 116 | dark recessed opening (small) | NOT a door — what we wrongly use now |
| 54 | **blank/white** | NOT a window — what we wrongly use now |
| 128 | chimney (twin-pipe) | roof chimney (correct, in use) |
| 144 | oven / 147 well / 145–146 signs / 149 barrel / 226 crate | yard props |

The door/window tiles are **whole single tiles** drawn to read as a door/window on a wall — you
place **one** of them, you do not stack or 9-slice them.

---

## 2. The canonical RTP house — tile by tile

A standard small RTP house, top to bottom, is a **single flush rectangle** `ww` wide:

```
        ┌──────────────┐   ← roof RIDGE / cap row  (A3 roof block, top 9-slice row: tl t … t tr)
 roof   │░░░░░░░░░░░░░░│   ← roof BODY row(s)       (A3 roof body: l f … f r)   ← Layer 3
        │▄▄▄▄▄▄▄▄▄▄▄▄▄▄│   ← roof EAVE / rim row     (A3 roof bottom 9-slice: bl b … b br) ← Layer 3
        ├──────────────┤   ← wall TOP-TRIM row       (A3 wall block top 9-slice: tl t … t tr)
 wall   │██  ▢  ██  ▢ ██│   ← wall BODY row(s)        (A3 wall body: l f … f r) + windows (B 67/70)
        │██  ▢  ██▐█▌▢ ██│   ← wall FRONT row         (A3 wall bottom 9-slice) + DOOR (B 98) + windows
        └──────╨───────┘
                ▲ Door1 charset event sits on the door tile (the openable door)
```

Rules that make it read as a house:
1. **Roof height is proportional:** 2 body rows for a ≤5-wide house, 3 for ≥6-wide. A roof must
   never out-tower its walls (`roof_rows()`). Ridge cap on top, **eave rim on the bottom** for
   depth ("add a rim at the lower side of the roof… or it looks paper-thin").
2. **Wall height = 2 tiles** (the RTP standard; the character is ~1 tile, so 2 reads right; 3 is
   used in some tutorials for grander builds — keep 2 for houses).
3. **Roof goes on the UPPER layer (Layer 3)** so the player can walk *under* the eave; the wall
   is on the normal layer and **blocks**.
4. **Door = one door tile** (B 98) on the wall's **front (bottom) row, centered**, with a
   **Door1 charset event** on the same tile for the actual open/enter. Door faces the road; it
   may be on a side/back wall if a path clearly leads there.
5. **Windows = one window tile** (B 67/70) per window position, in **clean vertical columns**
   flanking the door, **never on a corner or the door column**. One window reads as a window;
   **do not stack a window on every wall row** (that makes rungs). For a 2-row wall, put the
   window on the **upper** wall row (under the eave) so the front row stays clear for the door.
6. **Chimney** (B 128) on the roof ridge, off-center, on Layer 3.
7. **Shadow:** RTP casts a shadow on the **east side** of walls (shadow-pen). A subtle 1px
   eave shadow on the wall-top trim sells the overhang.

---

## 3. The roof OVERHANG rule (the thing to get exactly right)

- **Sideways: FLUSH.** For the standard same-width house the roof is the **same width as the
  walls** and does **NOT** overhang left/right. A roof lip floating over grass on the sides
  reads as a rendering bug. (This is why commit `f131a16` removed side overhang — keep it.)
- **Downward: the EAVE overhangs.** The roof's **bottom row is the eave/rim**, and it lips
  **down over the top of the wall**, casting a thin shadow on the wall-top trim. So vertically
  the roof *does* hang over the wall's top edge — that overhang is what gives the house depth
  and stops the roof looking paper-thin. **This is the overhang our houses are currently
  missing** (the roof body just stops and the wall trim begins, with no eave rim/shadow).
- **Intentional side overhang = landmark only.** A roof **wider than its wall by 1 tile each
  side** is reserved for *grand/important* buildings (inn, guild hall, manor, keep) to signal
  importance — and it's placed on Layer 3 with its own eave so it reads as deliberate, never
  for the small same-width houses.
- **Roof pitch direction:** front-view (A3) roofs are lit slightly from the **left** (left
  slope lighter, right darker); keep one light direction across the whole town.

---

## 4. Building variety (beyond the single box)

Real RM towns vary the **silhouette**, not the materials:
1. **Single flush rectangle** — the default (correct).
2. **L-shape** — two flush rectangles sharing a wall; the two roofs meet at a **valley** (the
   inner corner). Built from 1-wide×3-tall + 3-wide×1-tall roof pieces + a 3×3 corner.
3. **Cross / T** — a 3×3 roof core with wings; uses the 3×3 roof block for the intersection.
4. **Multi-story** — taller wall (2 wall bands) with a row of windows per floor; roof on top.
5. **Important building** — wider footprint, the §3 **intentional side-overhang** roof, a sign
   (B 145/146), maybe stained glass (B 99) or a double-width door; this is the inn / hall.
6. **Shopfront** — a wider door or an awning (B 32/33 flower-box awning), a sign, goods crates
   (B 226) by the door.

Material/palette discipline: pick **2–3 roof colors + 1–2 wall materials per town** and draw
every house from that subset. Vary footprint and roof color within the palette, **not** the
material on every house (which reads as noise). Match material to region (lots of wood → plank
/ log walls; stone region → stone / brick).

---

## 5. What `mapgen.house()` does now — dissection

From reading `tools/mapgen.py` and rendering an isolated house (`/tmp/house_iso.png`):

```python
def house(wx, wy, ww, wh, roof, wall):
    rh = roof_rows(ww, wh)                       # 2 or 3
    self._grid9(f"roof_{roof}", wx, wy-rh, ww, rh, up=True)   # roof 9-slice on Layer 3
    self._grid9(f"wall_{wall}", wx, wy, ww, wh)              # wall 9-slice, normal layer
    door_x = wx + ww//2
    self.setp(door_x, fy, f"wall_{wall}_door")              # composite door
    # window columns flanking door, on EVERY wall row (window_t / window_f / window)
    self.setu(wx+ww-2, wy-rh, f"roof_{roof}_chimney")        # chimney on Layer 3
```

The `town_props` sheet builds these composites:
```python
window = b_tile("rtp_outside_b", 54)    # ← BLANK tile (bug)
door   = b_tile("rtp_outside_b", 116)   # ← dark recessed opening (bug)
chimney= b_tile("rtp_outside_b", 128)   # ✓ correct
tiles.append(("wall_%s_door",  over(sl["b"], door)))      # door = wall-bottom-slice + dark recess
tiles.append(("wall_%s_window",   over(sl["b"], window))) # window = wall-bottom-slice + BLANK
tiles.append(("wall_%s_window_t", over(sl["t"], window))) # = wall-TOP-slice + BLANK
tiles.append(("wall_%s_window_f", over(sl["f"], window))) # = wall-FILL-slice + BLANK
```

### The concrete bugs
1. **Windows are invisible / read as grey rungs.** `window` = B-tile **54, which is blank**.
   So `wall_*_window*` is just the wall 9-slice **edge row** with nothing on it. Placing
   `window_t` (top-edge slice) + `window_f` (fill) + `window` (bottom-edge slice) stacked down a
   column renders the wall's **light top-trim and bottom-trim lines** as horizontal grey bars →
   the **ladder-rung** look. There is no window graphic at all.
2. **Door is a black hole.** `door` = B-tile **116, a small dark recessed opening**. Composited
   onto the wall-bottom slice it's a black rectangle; the Door1 event sits on top. It reads as a
   hole, not a door.
3. **No eave / no overhang depth.** The roof body's bottom row is just the roof 9-slice `b`
   row — there's no distinct **eave rim** and no shadow where it meets the wall-top trim, so the
   roof→wall junction is abrupt and the roof looks paper-thin (violates §3's downward overhang).
4. **Windows on every row.** Even with a real window tile, putting a window on *every* wall row
   of a column is wrong — it should be **one** window per position (upper row), not a stack.
5. **No silhouette / palette variety** — every house is a single flush box with a random wall
   material + roof color (no per-town palette, no L/3×3/landmark variants).

What's already **right** (keep): proportional `roof_rows`, roof+chimney on Layer 3 (walk under
eaves), flush same-width sides, door centered with a Door1 event, symmetric window **columns**
off the corners, 1-tile clearance around each house.

---

## 6. Target rules (the fix)

Do these as **appended** props (never renumber existing `town_props` gids — old maps store them):

1. **Use real window tiles.** Add window props from **B 67 / 70** (and **99** stained glass,
   **102** barred, for special buildings). Compose **one** clean `wall_<mat>_window` = wall-fill
   slice + window-67. Place it **once per window position on the upper wall row**; leave the
   front (door) row clear except the door. Kill the per-row `window_t/_f/window` stack.
2. **Use a real door tile.** Add `wall_<mat>_door` = wall-bottom slice + **B 98** (arched
   double-door) — or, for a recessed look, **B 100** — keeping the Door1 event on the tile.
   Drop the blank/recess composites.
3. **Add the eave.** Insert a dedicated **eave row** between roof body and wall: either use the
   roof block's bottom 9-slice as a distinct eave with a **shadow rim** baked on, or composite a
   1px dark line + slight overhang onto the wall-top-trim row. Result: the roof visibly lips
   over the wall (the §3 downward overhang).
4. **Per-town palette** (`gen_town`): choose 2–3 roof colors + 1–2 wall materials per seed;
   `_place_houses` draws from that subset. Match to a town `theme`/region material.
5. **Footprint variety:** add **L-shape** and **3×3 cross** house builders (compose flush
   rectangles, roofs meet at a valley using the 1×3 / 3×1 / 3×3 roof pieces) and a **landmark**
   variant with the intentional §3 side-overhang + sign + (optional) stained glass.
6. **Windows by floor:** for a 2-row wall, windows on the upper row; for multi-story, one window
   row per floor. Always off corners and off the door column, symmetric about the door.
7. **East-side shadow:** add a subtle shadow on the east wall edge + the eave shadow line.
8. **Re-render every change** with the isolated-house harness (`/tmp/house_iso.png` pattern) and
   a town render before committing — the bar is "reads like a hand-placed RTP house."

### Quick-win order
(1) real door tile + (2) real window tile placed once per position → removes the black-hole door
and the rung windows immediately (biggest visible win). Then (3) eave depth, (4) palette, then
(5) footprint variety.

### Progress
- ✅ **(1)+(2) DONE** (`tools/mapgen.py`, 2026-06-17): window source → Outside_B **67** (real
  framed window; was the blank tile 54), door backing → the **Door1 closed-door** graphic
  (matches the in-game event sprite; was the dark recess 116), and windows now placed **once per
  column** as a symmetric pair on the upper wall row (was stacked every row = rungs). `town_props`
  pixels regenerated with stable gids, so existing maps pick up the real door/window too. Verified
  via isolated-house + full-town renders. Also fixed the registry write (list-format index).
- ⏳ TODO: (3) eave depth/shadow, (4) per-town palette, (5) L/3×3/landmark footprints, and the
  **interior back-wall FACE** so walking up shows a wall with height in front of you (the
  `rtp_*_wallface` bake → `mapgen_indoor.py`).

---

## Sources
- [Creating Your Own Roof Variations (Part 1) — Official RPG Maker Blog](https://www.rpgmakerweb.com/blog/creating-your-own-roof-variations)
- [Creating Your Own Roof Variations (Part 2) — Official RPG Maker Blog](https://www.rpgmakerweb.com/blog/creating-your-own-roof-variations-part-2)
- [Creating Maps — The Basics 2 (house = A4 walls then A3 roofs on top) — RPG Maker Unite](https://rpgmakerunite.com/en/learn/004_eng.html)
- [Mapping: Towns — Official RPG Maker Blog](https://www.rpgmakerweb.com/blog/mapping-towns)
- [RPG Maker MV: Basic Mapping — MoeGamer](https://moegamer.net/2016/08/10/rpg-maker-mv-basic-mapping/)
- [Bot's Guide to Custom Art in RPGmaker MV: Understanding Tilesets — Medium](https://robotsweater.medium.com/bots-guide-to-custom-art-in-rpgmaker-mv-understanding-tilesets-9178fe09e475)
- Concrete tile indices verified against `data/tilesets/rtp_outside_{a3,a4,b}` (rendered with
  per-tile indices) and the isolated-house render from `tools/mapgen.py`.
