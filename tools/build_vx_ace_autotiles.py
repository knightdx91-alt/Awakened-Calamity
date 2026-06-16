#!/usr/bin/env python3
"""Bake RPG Maker VX Ace RTP A2 ground autotiles into the editor's 9-slice
wang8_lut format (same scheme as ac_ground / pf_outside_ground).

VX Ace A2 autotiles use the SAME 2x3-block template as RMMZ — just 32px tiles
(quarter = 16px) instead of 48px. This is the Pixel Fantasy baker parameterised
for 32px + pointed at the rtp_*_a2 sheets. We classify each 16px quarter by
where the terrain sits inside it, collect the 9 nine-slice prototypes (fill, 4
edges, 4 outer corners), and assemble the 9 nine-patch tiles slice9() expects.

Output: data/tilesets/rtp_<scene>_ground.{png,json,autotile.json}
"""
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS   = os.path.join(ROOT, "data", "tilesets")
T    = 32                      # VX Ace native tile px
Q    = T // 2                  # quarter = 16px
H    = Q // 2                  # sub-quad = 8px
PR   = 16                      # baked sheet metatiles-per-row

def block(im, cp, row):
    bx, by = cp * (2 * T), row * (3 * T)
    return im.crop((bx, by, bx + 2 * T, by + 3 * T))  # 64x96

def classify_quarters(blk, outside):
    """Return dict type-> 16px Image for: fill, e_t,e_b,e_l,e_r, c_tl,c_tr,c_bl,c_br."""
    px = blk.load()
    def is_terrain(c):
        if c[3] == 0: return False
        return abs(c[0]-outside[0]) + abs(c[1]-outside[1]) + abs(c[2]-outside[2]) > 60
    def subcov(qx, qy):
        ox, oy = qx * Q, qy * Q
        s = []
        for sy in (0, 1):
            for sx in (0, 1):
                cnt = tot = 0
                for y in range(oy + sy*H, oy + sy*H + H):
                    for x in range(ox + sx*H, ox + sx*H + H):
                        tot += 1
                        if is_terrain(px[x, y]): cnt += 1
                s.append(cnt / tot)            # [TL,TR,BL,BR] sub-coverage
        return s
    def kind(s, thr=0.4):
        b = [v > thr for v in s]
        tl, tr, bl, br = b
        if all(b): return "fill"
        if not any(b): return "out"
        if bl and br and not tl and not tr: return "e_t"
        if tl and tr and not bl and not br: return "e_b"
        if tr and br and not tl and not bl: return "e_l"
        if tl and bl and not tr and not br: return "e_r"
        if br and not tl and not tr and not bl: return "c_tl"
        if bl and not tl and not tr and not br: return "c_tr"
        if tr and not tl and not bl and not br: return "c_bl"
        if tl and not tr and not bl and not br: return "c_br"
        return "mix"
    found, cov = {}, {}
    for qy in range(6):
        for qx in range(4):
            k = kind(subcov(qx, qy))
            if k in ("out", "mix"): continue
            if k not in found:
                found[k] = blk.crop((qx*Q, qy*Q, qx*Q+Q, qy*Q+Q))
                cov[k] = (qx, qy)
    return found, cov

def assemble9(qd):
    f = qd["fill"]
    et, eb, el, er = qd["e_t"], qd["e_b"], qd["e_l"], qd["e_r"]
    ctl, ctr, cbl, cbr = qd["c_tl"], qd["c_tr"], qd["c_bl"], qd["c_br"]
    layout = [
        [ctl, et, el, f], [et, et, f, f], [et, ctr, f, er],
        [el,  f, el, f],  [f,  f,  f, f], [f,  er,  f, er],
        [el,  f, cbl, eb],[f,  f,  eb, eb],[f, er, eb, cbr],
    ]
    tiles = []
    for tl, tr, bl, br in layout:
        t = Image.new("RGBA", (T, T), (0, 0, 0, 0))
        t.paste(tl, (0, 0)); t.paste(tr, (Q, 0)); t.paste(bl, (0, Q)); t.paste(br, (Q, Q))
        tiles.append(t)
    return tiles

def slice9(m):
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
    return block(im, cp, row).crop((Q, T, Q + T, T + T))

# blocks addressed by (block-col 0..7, block-row 0..3) in the 8x4 A2 grid.
JOBS = [
    # NOTE: true edge-blending autotiles need a proper RM A2 template port (the
    # FLOOR_AUTOTILE_TABLE quarter map); the coverage heuristic doesn't expose all
    # 9 nine-slice prototypes from VX Ace blocks. Until then these ship as clean
    # seamless fills (the interior tile of each block).
    dict(out="rtp_outside_ground", src="rtp_outside_a2.png",
         base=("grass", 0, 0),
         fills=[("dirt", 1, 0, 0), ("road", 2, 0, 0), ("cobble", 3, 0, 0)],
         terrains=[]),
    dict(out="rtp_inside_ground", src="rtp_inside_a2.png",
         base=("wood", 0, 0),
         fills=[("cobble", 1, 0, 0), ("rug", 2, 0, 0), ("straw", 3, 0, 0)],
         terrains=[]),
    dict(out="rtp_dungeon_ground", src="rtp_dungeon_a2.png",
         base=("dirt_cave", 0, 0),
         fills=[("grass_maze", 1, 0, 0), ("dark_dirt", 2, 0, 0),
                ("dark_grass", 3, 0, 0), ("rock_cave", 0, 1, 0), ("crystal", 1, 1, 0)],
         terrains=[]),
]

def bake_job(job, report_only=False):
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
        outside = blk.load()[1, 1]
        qd, cov = classify_quarters(blk, outside)
        missing = [k for k in ("fill","e_t","e_b","e_l","e_r","c_tl","c_tr","c_bl","c_br") if k not in qd]
        print(f"  {name}: outside={outside[:3]} found={sorted(cov.keys())}" + (f"  MISSING={missing}" if missing else "  OK"))
        if missing or report_only:
            continue
        start = len(out)
        for t in assemble9(qd):
            out.append(t); beh.append(0); col.append(collision)
        lut = [start + slice9(m) for m in range(256)]
        cfg["terrains"][name] = {"lut": lut, "luts": {bname: lut}, "behavior": 0, "collision": collision, "count": 9}
    if report_only:
        return
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
    print(f"  wrote {job['out']}: {n} tiles ({bname} + {len(job['fills'])} fills + "
          f"{len(cfg['terrains'])-len(job['fills'])} autotiles)")

def main():
    report = "--report" in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith("-")]
    for job in JOBS:
        if only and job["out"] not in only and job["src"].split(".")[0] not in only:
            continue
        bake_job(job, report_only=report)

if __name__ == "__main__":
    main()
