#!/usr/bin/env python3
"""Bake RPG Maker VX Ace RTP A1 water into the editor's wang8_lut format.

A1 stores animated water/waterfalls as 2x3 FLOOR-type blocks (3 horizontal
animation frames per autotile). We take frame 0 of the chosen water block and
run it through the SAME proven A2 FLOOR template (build_vx_ace_autotiles), so the
water blends seamlessly with a foam/shore edge — paint it like any terrain over a
grass (or other) base. Output: data/tilesets/rtp_<scene>_water.{png,json,autotile.json}

Block coords are (block-col, block-row) in the A1 sheet's 2x3-tile grid
(64x96 px each). Picked by eyeballing /tmp/a1_blobs.png blob renders.
"""
import json, os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_vx_ace_autotiles as B

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS = os.path.join(ROOT, "data", "tilesets")
T, PR = B.T, B.PR

# base (grass/floor) fill cropped from the already-baked A2 ground tileset, so
# non-water cells match the ground the editor pairs this with.
JOBS = [
    dict(out="rtp_outside_water", a1="rtp_outside_a1.png", ground="rtp_outside_ground.png",
         base="grass", waters=[("water", 4, 2), ("deepwater", 0, 0)]),
    dict(out="rtp_dungeon_water", a1="rtp_dungeon_a1.png", ground="rtp_dungeon_ground.png",
         base="floor", waters=[("water", 0, 0)]),
    dict(out="rtp_inside_water", a1="rtp_inside_a1.png", ground="rtp_inside_ground.png",
         base="floor", waters=[("water", 0, 0)]),
]


def bake(job):
    a1 = Image.open(os.path.join(TS, job["a1"])).convert("RGBA")
    grd = Image.open(os.path.join(TS, job["ground"])).convert("RGBA")
    base = grd.crop((0, 0, T, T))  # tile 0 of the ground sheet = its base fill
    out = [base]; beh = [0]; col = [0]
    bname = job["base"]
    cfg = {"tile": T, "per_row": PR, "scheme": "wang8_lut",
           "priority": [bname] + [w[0] for w in job["waters"]],
           "fills": {bname: 0}, "terrains": {}}
    print(f"=== {job['out']} (base {bname}) ===")
    for name, bcol, brow in job["waters"]:
        blk = B.block(a1, bcol, brow)            # 64x96, frame 0
        tiles, local = B.rm_autotile(blk)
        start = len(out)
        for t in tiles:
            out.append(t); beh.append(16); col.append(1)
        lut = [start + local[m] for m in range(256)]
        cfg["terrains"][name] = {"lut": lut, "luts": {bname: lut},
                                 "behavior": 16, "collision": 1, "count": len(tiles)}
        print(f"  {name}: A1 block ({bcol},{brow}) -> {len(tiles)} blob tiles")
    n = len(out); rows = (n + PR - 1) // PR
    sheet = Image.new("RGBA", (PR * T, rows * T), (0, 0, 0, 0))
    for i, t in enumerate(out):
        sheet.paste(t, ((i % PR) * T, (i // PR) * T))
    sheet.save(os.path.join(TS, job["out"] + ".png"))
    json.dump({"total_metatiles": n, "primary_count": n, "secondary_count": 0,
               "tile": T, "metatiles_per_row": PR,
               "source": "RPG Maker VX Ace RTP A1 water (frame 0; raw pack on branch vx-ace-rtp)",
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
        if only and job["out"] not in only:
            continue
        bake(job)


if __name__ == "__main__":
    main()
