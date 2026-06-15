#!/usr/bin/env python3
"""Import the Pixel Fantasy RMMZ RTP tile sheets into the map editor's tileset
format (native 48px metatiles).

RMMZ tiles are 48px. The engine renderer already honours a per-tileset `tile`
(native source size) + `metatiles_per_row`; this tool emits matching JSON
sidecars so each sheet loads as a plain paintable grid. RMMZ autotile sheets
(A1-A4) are imported here as raw grids too; the wang-autotile bake is a
separate pass (build_pixel_fantasy_autotiles.py).

Source PNGs: pixel-fantasy-rmmz/img/tilesets/PixelFantasy_*.png
Output:      data/tilesets/pf_<group>_<sheet>.png + .json, registered in _index.json
"""
import json, os, re, struct, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "pixel-fantasy-rmmz", "img", "tilesets")
DST  = os.path.join(ROOT, "data", "tilesets")
TILE = 48  # RMMZ native tile size

def png_size(path):
    with open(path, "rb") as f:
        d = f.read(24)
    assert d[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG: " + path
    w, h = struct.unpack(">II", d[16:24])
    return w, h

def clean_name(fname):
    # PixelFantasy_Outside_D-Trees.png -> pf_outside_d
    stem = re.sub(r"\.png$", "", fname, flags=re.I)
    stem = stem.replace("PixelFantasy_", "")
    stem = stem.split("-")[0]            # drop "-Trees" etc.
    return "pf_" + stem.lower()

def main():
    names = []
    for fname in sorted(os.listdir(SRC)):
        if not fname.lower().endswith(".png"):
            continue
        src = os.path.join(SRC, fname)
        w, h = png_size(src)
        cols, rows = w // TILE, h // TILE
        total = cols * rows
        name = clean_name(fname)
        # copy PNG
        shutil.copyfile(src, os.path.join(DST, name + ".png"))
        # JSON sidecar (plain grid; behaviors/collisions default 0)
        meta = {
            "total_metatiles": total,
            "primary_count": total,
            "secondary_count": 0,
            "tile": TILE,
            "metatiles_per_row": cols,
            "source": "Pixel Fantasy RMMZ RTP (commercial, see data/tilesets/PIXEL_FANTASY.LICENSE.txt)",
            "behaviors": [0] * total,
            "collisions": [0] * total,
        }
        with open(os.path.join(DST, name + ".json"), "w") as f:
            json.dump(meta, f)
        names.append(name)
        print(f"  {name:22s} {w}x{h}  {cols}x{rows} = {total} tiles @{TILE}px")

    # register in _index.json (merge, sorted, unique)
    idx_path = os.path.join(DST, "_index.json")
    idx = json.load(open(idx_path))
    merged = sorted(set(idx) | set(names))
    json.dump(merged, open(idx_path, "w"))
    print(f"\nRegistered {len(names)} sheets; index now {len(merged)} tilesets.")

if __name__ == "__main__":
    main()
