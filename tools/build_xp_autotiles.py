#!/usr/bin/env python3
"""Bake XP-for-MV A2 ground autotiles into the editor's 9-slice wang8_lut format
(same scheme as pf_*_ground / ac_ground).

Reuses the proven 24px-quarter classifier, but makes it RELIABLE on these sheets
by (a) using a FIXED grass base colour (sampled from the base block) instead of a
per-block single pixel, and (b) filling any nine-slice piece the classifier
misses by MIRRORING its symmetric partner (grass autotiles are left/right and
top/bottom symmetric, so flips are exact).

Output: data/tilesets/<out>.{png,json,autotile.json}, registered in _index.json.
EULA: RPG Maker XP RTP (LadyBaskerville) — prototype only.
"""
import json, os, sys, importlib.util
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS   = os.path.join(ROOT, "data", "tilesets")
T, Q, PR = 48, 24, 16

# borrow block / classify_quarters / assemble9 / slice9 / fill_tile from the PF baker
_spec = importlib.util.spec_from_file_location("pfbaker", os.path.join(ROOT, "tools", "build_pixel_fantasy_autotiles.py"))
pf = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(pf)

NINE = ("fill", "e_t", "e_b", "e_l", "e_r", "c_tl", "c_tr", "c_bl", "c_br")
FV = Image.FLIP_TOP_BOTTOM; FH = Image.FLIP_LEFT_RIGHT; R180 = Image.ROTATE_180

def avg_quarter(blk, qx, qy):
    p = blk.load(); rs = gs = bs = n = 0
    for y in range(qy*Q, qy*Q+Q):
        for x in range(qx*Q, qx*Q+Q):
            c = p[x, y]; rs += c[0]; gs += c[1]; bs += c[2]; n += 1
    return (rs//n, gs//n, bs//n)

def fill_missing(qd):
    """Derive any missing nine-slice piece from its mirror partner."""
    def mirror(dst, src, op):
        if dst not in qd and src in qd:
            qd[dst] = qd[src].transpose(op)
    # edges: top<->bottom (vertical flip), left<->right (horizontal flip)
    mirror("e_b", "e_t", FV); mirror("e_t", "e_b", FV)
    mirror("e_r", "e_l", FH); mirror("e_l", "e_r", FH)
    # corners: derive all four from whichever exists
    for base in ("c_tl", "c_tr", "c_bl", "c_br"):
        if base in qd:
            src = qd[base]
            variants = {
                "c_tl": {"c_tr": FH, "c_bl": FV, "c_br": R180},
                "c_tr": {"c_tl": FH, "c_br": FV, "c_bl": R180},
                "c_bl": {"c_br": FH, "c_tl": FV, "c_tr": R180},
                "c_br": {"c_bl": FH, "c_tr": FV, "c_tl": R180},
            }[base]
            for dst, op in variants.items():
                if dst not in qd: qd[dst] = src.transpose(op)
            break
    return [k for k in NINE if k not in qd]

def bake(out, src, grass, terrains):
    im = Image.open(os.path.join(TS, src)).convert("RGBA")
    # base grass fill tile (index 0) from the grass block's interior
    gblk = pf.block(im, grass[0], grass[1])
    base_fill = gblk.crop((Q, T, Q+T, T+T))
    grass_rgb = avg_quarter(gblk, 2, 4)
    tiles = [base_fill]; beh = [0]; col = [0]
    cfg = {"tile": T, "per_row": PR, "scheme": "wang8_lut",
           "priority": ["grass"] + [t[0] for t in terrains],
           "fills": {"grass": 0}, "terrains": {}}
    print(f"=== {out}  grass~{grass_rgb} ===")
    for name, bc, br, collision in terrains:
        blk = pf.block(im, bc, br)
        qd, cov = pf.classify_quarters(blk, grass_rgb)
        missing = fill_missing(qd)
        print(f"  {name} ({bc},{br}): found={sorted(cov.keys())} -> {'OK' if not missing else 'MISSING '+str(missing)}")
        if missing:
            continue
        start = len(tiles)
        for t in pf.assemble9(qd):
            tiles.append(t); beh.append(0); col.append(collision)
        lut = [start + pf.slice9(m) for m in range(256)]
        cfg["terrains"][name] = {"lut": lut, "luts": {"grass": lut},
                                 "behavior": 0, "collision": collision, "count": 9}
    n = len(tiles); rows = (n + PR - 1) // PR
    sheet = Image.new("RGBA", (PR*T, rows*T), (0, 0, 0, 0))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % PR)*T, (i // PR)*T))
    sheet.save(os.path.join(TS, out + ".png"))
    json.dump({"total_metatiles": n, "primary_count": n, "secondary_count": 0,
               "tile": T, "metatiles_per_row": PR,
               "source": "XP-for-MV A2 ground autotiles (LadyBaskerville); EULA, prototype-only",
               "behaviors": beh, "collisions": col}, open(os.path.join(TS, out + ".json"), "w"))
    json.dump(cfg, open(os.path.join(TS, out + ".autotile.json"), "w"))
    idx_path = os.path.join(TS, "_index.json")
    idx = json.load(open(idx_path))
    if out not in idx:
        json.dump(sorted(set(idx) | {out}), open(idx_path, "w"))
    print(f"  wrote {out}: {n} tiles ({len(cfg['terrains'])} autotile terrains over grass)")

# Jobs. Block (col 0..7, row 0..3) in the 8x4 A2 grid. Terrains = blocks that sit
# OVER grass (border = grass). Names are by inspection; tune as needed.
JOBS = [
    dict(out="xp_outside_ground", src="xp_a2_outside.png", grass=(0, 0),
         terrains=[("stone", 3, 0, 0), ("tallgrass", 1, 1, 0), ("cobble", 3, 1, 0)]),
]

def main():
    for job in JOBS:
        bake(**job)

if __name__ == "__main__":
    main()
