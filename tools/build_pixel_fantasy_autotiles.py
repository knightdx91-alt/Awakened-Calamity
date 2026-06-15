#!/usr/bin/env python3
"""Bake Pixel Fantasy RMMZ A2 ground autotiles into the editor's 9-slice
wang8_lut format (same scheme as ac_ground).

RM A2 autotiles are 2x3 (48px) blocks built from 24px quarter pieces. Rather
than reimplement RM's 48-shape engine, we CLASSIFY each 24px quarter by where
the terrain sits inside it (self-calibrating per terrain vs its "outside"
colour), collect the 9 nine-slice prototypes (fill, 4 edges, 4 outer corners),
and assemble the 9 nine-patch 48px tiles the editor's slice9() expects.

Output: data/tilesets/pf_outside_ground.{png,json,autotile.json}
"""
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS   = os.path.join(ROOT, "data", "tilesets")
T    = 48                      # native tile px
Q    = T // 2                  # quarter = 24px
PR   = 16                      # baked sheet metatiles-per-row

def block(im, cp, row):
    bx, by = cp * (2 * T), row * (3 * T)
    return im.crop((bx, by, bx + 2 * T, by + 3 * T))  # 96x144

def classify_quarters(blk, outside):
    """Return dict type-> 24px Image for: fill, e_t,e_b,e_l,e_r, c_tl,c_tr,c_bl,c_br."""
    px = blk.load()
    def is_terrain(c):
        if c[3] == 0: return False
        return abs(c[0]-outside[0]) + abs(c[1]-outside[1]) + abs(c[2]-outside[2]) > 60
    # coverage of terrain in the 4 sub-12px-quadrants of a quarter at (qx,qy)
    def subcov(qx, qy):
        ox, oy = qx * Q, qy * Q
        s = []
        for sy in (0, 1):
            for sx in (0, 1):
                cnt = tot = 0
                for y in range(oy + sy*12, oy + sy*12 + 12):
                    for x in range(ox + sx*12, ox + sx*12 + 12):
                        tot += 1
                        if is_terrain(px[x, y]): cnt += 1
                s.append(cnt / tot)            # [TL,TR,BL,BR] sub-coverage
        return s
    def kind(s, thr=0.4):
        b = [v > thr for v in s]               # terrain present per sub-quad
        tl, tr, bl, br = b
        if all(b): return "fill"
        if not any(b): return "out"
        if bl and br and not tl and not tr: return "e_t"   # terrain bottom -> top edge
        if tl and tr and not bl and not br: return "e_b"
        if tr and br and not tl and not bl: return "e_l"   # terrain right -> left edge
        if tl and bl and not tr and not br: return "e_r"
        if br and not tl and not tr and not bl: return "c_tl"  # terrain only BR -> TL outer corner
        if bl and not tl and not tr and not br: return "c_tr"
        if tr and not tl and not bl and not br: return "c_bl"
        if tl and not tr and not bl and not br: return "c_br"
        return "mix"
    found = {}
    cov = {}
    for qy in range(6):
        for qx in range(4):
            k = kind(subcov(qx, qy))
            if k in ("out", "mix"): continue
            if k not in found:
                found[k] = blk.crop((qx*Q, qy*Q, qx*Q+Q, qy*Q+Q))
                cov[k] = (qx, qy)
    return found, cov

def assemble9(qd):
    """Build 9 nine-patch 48px tiles from quarter prototypes. Order matches
    slice9(): 0=TL,1=T,2=TR,3=L,4=C,5=R,6=BL,7=B,8=BR."""
    f = qd["fill"]
    et, eb, el, er = qd["e_t"], qd["e_b"], qd["e_l"], qd["e_r"]
    ctl, ctr, cbl, cbr = qd["c_tl"], qd["c_tr"], qd["c_bl"], qd["c_br"]
    # each tile = [TLq, TRq, BLq, BRq]
    layout = [
        [ctl, et, el, f],   # 0 TL  (grass top+left)
        [et,  et, f,  f],   # 1 T
        [et, ctr, f,  er],  # 2 TR
        [el,  f,  el, f],   # 3 L
        [f,   f,  f,  f],   # 4 C
        [f,  er,  f,  er],  # 5 R
        [el,  f, cbl, eb],  # 6 BL
        [f,   f,  eb, eb],  # 7 B
        [f,  er,  eb, cbr], # 8 BR
    ]
    tiles = []
    for tl, tr, bl, br in layout:
        t = Image.new("RGBA", (T, T), (0, 0, 0, 0))
        t.paste(tl, (0, 0)); t.paste(tr, (Q, 0)); t.paste(bl, (0, Q)); t.paste(br, (Q, Q))
        tiles.append(t)
    return tiles

def slice9(m):  # 8-bit neighbour mask -> nine-slice index (sides only), from build_ac_ground
    nN = not (m & 1); nE = not (m & 4); nS = not (m & 16); nW = not (m & 64)
    if nN and nW: return 0
    if nN and nE: return 2
    if nS and nW: return 6
    if nS and nE: return 8
    if nN: return 1
    if nS: return 7
    if nW: return 3
    if nE: return 5
    return 4

def fill_tile(im, cp, row):
    """Seamless interior 48px tile of a block (for texture-fill terrains)."""
    return block(im, cp, row).crop((Q, T, Q + T, T + T))

# --- bake jobs: each produces one pf_<scene>_ground tileset ---
# blocks addressed by (block-col 0..7, block-row 0..3) in the 8x4 A2 grid.
#   base    = (name, col, row)                       -> index-0 default fill
#   fills   = [(name, col, row, collision), ...]      -> flat seamless textures (1 tile each)
#   terrains= [(name, col, row, collision), ...]      -> 9-slice autotiles (terrain over base)
# Outside row-0 blocks ARE terrain-over-grass (visible base border) -> autotiles.
# Inside/Dungeon left-column blocks are seamless texture fills; cols 4-7 are pit
# autotiles (terrain feature over a contrasting base) -> classify as autotiles.
JOBS = [
    dict(out="pf_outside_ground", src="pf_outside_a2.png",
         base=("grass", 0, 0), fills=[],
         terrains=[("cobble", 1, 0, 0), ("stone", 2, 0, 0), ("path", 3, 0, 0)]),
    dict(out="pf_inside_ground", src="pf_inside_a2.png",
         base=("wood", 0, 0),
         fills=[("scallop_tile", 1, 0, 0), ("wood_floor", 2, 0, 0), ("brick", 1, 1, 0),
                ("red_carpet", 2, 1, 0), ("blue_carpet", 2, 2, 0), ("pink_carpet", 3, 2, 0),
                ("white_tile", 5, 1, 0), ("orange_scale", 0, 3, 0), ("blue_scale", 1, 3, 0)],
         terrains=[]),
    dict(out="pf_dungeon_ground", src="pf_dungeon_a2.png",
         base=("dirt", 0, 0),
         fills=[("moss", 1, 0, 0), ("stone", 0, 1, 0), ("cobble", 1, 1, 0),
                ("lava_rock", 1, 2, 0), ("lava", 2, 2, 1), ("ice", 0, 3, 0)],
         # pit autotiles: feature (dark hole) over the block's own base ground.
         terrains=[("sand_pit", 4, 0, 1)]),
]

def bake_job(job, report_only=False):
    src = os.path.join(TS, job["src"])
    im = Image.open(src).convert("RGBA")
    bname, bcp, brow = job["base"]
    out = [fill_tile(im, bcp, brow)]; beh = [0]; col = [0]
    cfg = {"tile": T, "per_row": PR, "scheme": "wang8_lut",
           "priority": [bname] + [f[0] for f in job["fills"]] + [t[0] for t in job["terrains"]],
           "fills": {bname: 0}, "terrains": {}}
    print(f"=== {job['out']} (base {bname}) ===")
    # flat texture fills -> 1 tile each, lut maps every neighbour-mask to that tile
    for name, cp, row, collision in job["fills"]:
        idx = len(out)
        out.append(fill_tile(im, cp, row)); beh.append(0); col.append(collision)
        cfg["fills"][name] = idx
        lut = [idx] * 256
        cfg["terrains"][name] = {"lut": lut, "luts": {bname: lut},
                                 "behavior": 0, "collision": collision, "count": 1}
        print(f"  {name}: flat fill -> tile {idx}")
    # 9-slice autotiles (terrain feature over a contrasting in-block base)
    for name, cp, row, collision in job["terrains"]:
        blk = block(im, cp, row)
        outside = blk.load()[1, 1]            # outer corner pixel = the base it borders
        qd, cov = classify_quarters(blk, outside)
        missing = [k for k in ("fill","e_t","e_b","e_l","e_r","c_tl","c_tr","c_bl","c_br") if k not in qd]
        print(f"  {name}: outside={outside[:3]} found={sorted(cov.keys())}" +
              (f"  MISSING={missing}" if missing else "  OK"))
        if missing or report_only:
            continue
        start = len(out)
        for t in assemble9(qd):
            out.append(t); beh.append(0); col.append(collision)
        lut = [start + slice9(m) for m in range(256)]
        cfg["terrains"][name] = {"lut": lut, "luts": {bname: lut},
                                 "behavior": 0, "collision": collision, "count": 9}
    if report_only:
        return
    n = len(out); rows = (n + PR - 1) // PR
    sheet = Image.new("RGBA", (PR * T, rows * T), (0, 0, 0, 0))
    for i, t in enumerate(out):
        sheet.paste(t, ((i % PR) * T, (i // PR) * T))
    sheet.save(os.path.join(TS, job["out"] + ".png"))
    json.dump({"total_metatiles": n, "primary_count": n, "secondary_count": 0,
               "tile": T, "metatiles_per_row": PR,
               "source": "Pixel Fantasy RMMZ A2 (see PIXEL_FANTASY.LICENSE.txt)",
               "behaviors": beh, "collisions": col},
              open(os.path.join(TS, job["out"] + ".json"), "w"))
    json.dump(cfg, open(os.path.join(TS, job["out"] + ".autotile.json"), "w"))
    idx_path = os.path.join(TS, "_index.json")
    idx = json.load(open(idx_path))
    if job["out"] not in idx:
        idx = sorted(set(idx) | {job["out"]})
        json.dump(idx, open(idx_path, "w"))
    print(f"  wrote {job['out']}: {n} tiles "
          f"({bname} + {len(job['fills'])} fills + {len(cfg['terrains'])-len(job['fills'])} autotiles)")

def main():
    report = "--report" in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith("-")]
    for job in JOBS:
        if only and job["out"] not in only and job["src"].split(".")[0] not in only:
            continue
        bake_job(job, report_only=report)

if __name__ == "__main__":
    main()
