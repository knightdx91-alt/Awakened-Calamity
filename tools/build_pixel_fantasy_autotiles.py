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

# --- terrains to bake from pf_outside_a2 ---
# (name, col-pair, row, collision)  — row 0 autotiles border grass
TERRAINS = [
    ("cobble", 1, 0, 0),
    ("stone",  2, 0, 0),
    ("path",   3, 0, 0),
]
BASE = ("grass", 0, 0)  # uniform fill (centre tile of its block)

def main():
    src = os.path.join(TS, "pf_outside_a2.png")
    im = Image.open(src).convert("RGBA")
    # grass fill = centre 48px tile of base block (solid interior)
    gblk = block(im, BASE[1], BASE[2])
    grass = gblk.crop((Q, T, Q + T, T + T))  # tile (... interior)
    out = [grass]; beh = [0]; col = [0]
    cfg = {"tile": T, "per_row": PR, "scheme": "wang8_lut",
           "priority": ["grass"] + [t[0] for t in TERRAINS],
           "fills": {"grass": 0}, "terrains": {}}
    for name, cp, row, collision in TERRAINS:
        blk = block(im, cp, row)
        outside = blk.load()[1, 1]            # outer corner pixel = the base it borders
        qd, cov = classify_quarters(blk, outside)
        missing = [k for k in ("fill","e_t","e_b","e_l","e_r","c_tl","c_tr","c_bl","c_br") if k not in qd]
        print(f"{name}: outside={outside[:3]} found={sorted(cov.keys())}" +
              (f"  MISSING={missing}" if missing else "  OK"))
        if missing:
            print(f"  !! cannot bake {name}, missing prototypes")
            continue
        start = len(out)
        for t in assemble9(qd):
            out.append(t); beh.append(0); col.append(collision)
        lut = [start + slice9(m) for m in range(256)]
        cfg["terrains"][name] = {"lut": lut, "luts": {"grass": lut},
                                 "behavior": 0, "collision": collision, "count": 9}
    # write baked sheet + meta + autotile cfg
    n = len(out); rows = (n + PR - 1) // PR
    sheet = Image.new("RGBA", (PR * T, rows * T), (0, 0, 0, 0))
    for i, t in enumerate(out):
        sheet.paste(t, ((i % PR) * T, (i // PR) * T))
    sheet.save(os.path.join(TS, "pf_outside_ground.png"))
    json.dump({"total_metatiles": n, "primary_count": n, "secondary_count": 0,
               "tile": T, "metatiles_per_row": PR,
               "source": "Pixel Fantasy RMMZ A2 (see PIXEL_FANTASY.LICENSE.txt)",
               "behaviors": beh, "collisions": col},
              open(os.path.join(TS, "pf_outside_ground.json"), "w"))
    json.dump(cfg, open(os.path.join(TS, "pf_outside_ground.autotile.json"), "w"))
    # register
    idx_path = os.path.join(TS, "_index.json")
    idx = json.load(open(idx_path))
    if "pf_outside_ground" not in idx:
        idx = sorted(set(idx) | {"pf_outside_ground"})
        json.dump(idx, open(idx_path, "w"))
    print(f"wrote pf_outside_ground: {n} tiles (grass + {len(cfg['terrains'])} terrains)")

if __name__ == "__main__":
    main()
