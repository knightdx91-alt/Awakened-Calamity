#!/usr/bin/env python3
"""Bake RPG Maker VX Ace RTP A2 autotiles into the editor's wang8_lut format.

This is a CORRECT port of RM's A2 autotile template (the per-corner quarter map
behind MV/MZ's FLOOR_AUTOTILE_TABLE), not a heuristic. Each 32px tile is built
from four 16px quarters; for each tile corner we pick the outer / edge / inner /
fill quarter from the 2x3 block based on that corner's two orthogonal neighbours
and the one diagonal. Composing all 256 neighbour masks (and de-duping) yields
the ~47-tile blob set + a 256-entry LUT — true seamless edge blending against
the base terrain the block was drawn over.

Quarter positions within the 2x3 block (quarter coords x:0-3, y:0-5), derived
from FLOOR_AUTOTILE_TABLE and verified against the RTP sheet:
  TL: outer(0,0) leftEdge(0,4) topEdge(2,2) inner(2,0) fill(2,4)
  TR: outer(1,0) rightEdge(3,4) topEdge(1,2) inner(3,0) fill(1,4)
  BL: outer(0,1) leftEdge(0,3) botEdge(2,5) inner(2,1) fill(2,3)
  BR: outer(1,1) rightEdge(3,3) botEdge(1,5) inner(3,1) fill(1,3)

Output: data/tilesets/rtp_<scene>_ground.{png,json,autotile.json}
"""
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS   = os.path.join(ROOT, "data", "tilesets")
T    = 32                      # VX Ace native tile px
Q    = T // 2                  # quarter = 16px
PR   = 16                      # baked sheet metatiles-per-row

def block(im, cp, row):
    bx, by = cp * (2 * T), row * (3 * T)
    return im.crop((bx, by, bx + 2 * T, by + 3 * T))  # 64x96 (4x6 quarters)

def fill_tile(im, cp, row):
    """Seamless interior 32px tile of a block (for flat texture fills)."""
    return block(im, cp, row).crop((Q, T, Q + T, T + T))

# ── per-corner quarter pickers. args = (orthoH, orthoV, diag) "is SAME terrain" ──
def tl_q(w, n, nw):
    if not w and not n: return (0, 0)          # outer
    if not w and n:     return (0, 4)          # left edge
    if w and not n:     return (2, 2)          # top edge
    if not nw:          return (2, 0)          # inner corner
    return (2, 4)                              # fill
def tr_q(e, n, ne):
    if not e and not n: return (1, 0)
    if not e and n:     return (3, 4)          # right edge
    if e and not n:     return (1, 2)          # top edge
    if not ne:          return (3, 0)
    return (1, 4)
def bl_q(w, s, sw):
    if not w and not s: return (0, 1)
    if not w and s:     return (0, 3)          # left edge
    if w and not s:     return (2, 5)          # bottom edge
    if not sw:          return (2, 1)
    return (2, 3)
def br_q(e, s, se):
    if not e and not s: return (1, 1)
    if not e and s:     return (3, 3)          # right edge
    if e and not s:     return (1, 5)          # bottom edge
    if not se:          return (3, 1)
    return (1, 3)

# mask bits (clockwise): N=1 NE=2 E=4 SE=8 S=16 SW=32 W=64 NW=128 ; set = SAME terrain
def corners_for(m):
    N, NE, E, SE = m & 1, m & 2, m & 4, m & 8
    S, SW, W, NW = m & 16, m & 32, m & 64, m & 128
    return (tl_q(W, N, NW), tr_q(E, N, NE), bl_q(W, S, SW), br_q(E, S, SE))

def compose(blk, key):
    t = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    (tl, tr, bl, br) = key
    for (qx, qy), (dx, dy) in [(tl, (0, 0)), (tr, (Q, 0)), (bl, (0, Q)), (br, (Q, Q))]:
        t.paste(blk.crop((qx * Q, qy * Q, qx * Q + Q, qy * Q + Q)), (dx, dy))
    return t

def rm_autotile(blk):
    """Return (tiles[], lut[256]) — de-duped blob tiles + neighbour-mask LUT."""
    cache, tiles, lut = {}, [], [0] * 256
    for m in range(256):
        key = corners_for(m)
        if key not in cache:
            cache[key] = len(tiles); tiles.append(compose(blk, key))
        lut[m] = cache[key]
    return tiles, lut

# blocks addressed by (block-col 0..7, block-row 0..3) in the 8x4 A2 grid.
JOBS = [
    dict(out="rtp_outside_ground", src="rtp_outside_a2.png",
         base=("grass", 0, 0), fills=[],
         terrains=[("dirt", 1, 0, 0), ("road", 2, 0, 0), ("cobble", 3, 0, 0)]),
    dict(out="rtp_inside_ground", src="rtp_inside_a2.png",
         base=("wood", 0, 0), fills=[],
         terrains=[("cobble", 1, 0, 0), ("rug", 2, 0, 0), ("straw", 3, 0, 0)]),
    dict(out="rtp_dungeon_ground", src="rtp_dungeon_a2.png",
         base=("dirt_cave", 0, 0),
         # alternate ground types people use as a base -> flat fills
         fills=[("grass_maze", 1, 0, 0), ("rock_cave", 0, 1, 0), ("crystal", 1, 1, 0)],
         # features painted OVER the cave ground -> real autotiles (hole blocks passage)
         terrains=[("dark_dirt", 2, 0, 0), ("dark_grass", 3, 0, 0), ("hole", 4, 0, 1)]),
]

def bake_job(job):
    im = Image.open(os.path.join(TS, job["src"])).convert("RGBA")
    bname, bcp, brow = job["base"]
    out = [fill_tile(im, bcp, brow)]; beh = [0]; col = [0]
    cfg = {"tile": T, "per_row": PR, "scheme": "wang8_lut",
           "priority": [bname] + [f[0] for f in job["fills"]] + [t[0] for t in job["terrains"]],
           "fills": {bname: 0}, "terrains": {}}
    print(f"=== {job['out']} (base {bname}) ===")
    for name, cp, row, collision in job["fills"]:
        idx = len(out)
        out.append(fill_tile(im, cp, row)); beh.append(0); col.append(collision)
        cfg["fills"][name] = idx
        lut = [idx] * 256
        cfg["terrains"][name] = {"lut": lut, "luts": {bname: lut}, "behavior": 0, "collision": collision, "count": 1}
        print(f"  {name}: flat fill -> tile {idx}")
    for name, cp, row, collision in job["terrains"]:
        blk = block(im, cp, row)
        tiles, local = rm_autotile(blk)
        start = len(out)
        for t in tiles:
            out.append(t); beh.append(0); col.append(collision)
        lut = [start + local[m] for m in range(256)]
        cfg["terrains"][name] = {"lut": lut, "luts": {bname: lut}, "behavior": 0, "collision": collision, "count": len(tiles)}
        print(f"  {name}: RM autotile -> {len(tiles)} blob tiles")
    n = len(out); rows = (n + PR - 1) // PR
    sheet = Image.new("RGBA", (PR * T, rows * T), (0, 0, 0, 0))
    for i, t in enumerate(out):
        sheet.paste(t, ((i % PR) * T, (i // PR) * T))
    sheet.save(os.path.join(TS, job["out"] + ".png"))
    json.dump({"total_metatiles": n, "primary_count": n, "secondary_count": 0,
               "tile": T, "metatiles_per_row": PR,
               "source": "RPG Maker VX Ace RTP A2 (prototype; raw pack on branch vx-ace-rtp)",
               "behaviors": beh, "collisions": col},
              open(os.path.join(TS, job["out"] + ".json"), "w"))
    json.dump(cfg, open(os.path.join(TS, job["out"] + ".autotile.json"), "w"))
    idx_path = os.path.join(TS, "_index.json")
    idx = json.load(open(idx_path))
    if job["out"] not in idx:
        json.dump(sorted(set(idx) | {job["out"]}), open(idx_path, "w"))
    print(f"  wrote {job['out']}: {n} tiles")

def main():
    only = [a for a in sys.argv[1:] if not a.startswith("-")]
    for job in JOBS:
        if only and job["out"] not in only and job["src"].split(".")[0] not in only:
            continue
        bake_job(job)

if __name__ == "__main__":
    main()
