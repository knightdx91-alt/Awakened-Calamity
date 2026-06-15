#!/usr/bin/env python3
"""Import the 'XP graphics reformatted for MV' tile sheets (LadyBaskerville)
into the map editor's tileset format (native 48px metatiles).

Source PNGs: assets-source/xp-for-mv/tilesets/*.png  (768-wide, 48px tiles)
Output:      data/tilesets/xp_<name>.png + .json, registered in _index.json

Naming:
  XP_to_MV_001-Grassland_PixelScaled.png -> xp_001_grassland
  XP_to_MV_A2_outside_PixelScaled.png    -> xp_a2_outside
  XP_to_MV_A5_PixelScaled.png            -> xp_a5

Plain paintable grids; the wang-autotile bake (A2 ground) is a separate pass.
EULA: RPG Maker XP RTP — see assets-source/xp-for-mv/LICENSE_FLAG.txt (prototype only).
"""
import json, os, re, struct, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "assets-source", "xp-for-mv", "tilesets")
DST  = os.path.join(ROOT, "data", "tilesets")
TILE = 48

def png_size(path):
    with open(path, "rb") as f:
        d = f.read(24)
    assert d[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG: " + path
    return struct.unpack(">II", d[16:24])

def clean_name(fname):
    stem = re.sub(r"\.png$", "", fname, flags=re.I)
    stem = stem.replace("XP_to_MV_", "").replace("_PixelScaled", "")
    stem = stem.replace("-", "_")
    return "xp_" + stem.lower()

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
        shutil.copyfile(src, os.path.join(DST, name + ".png"))
        meta = {
            "total_metatiles": total, "primary_count": total, "secondary_count": 0,
            "tile": TILE, "metatiles_per_row": cols,
            "source": "RPG Maker XP RTP reformatted for MV (LadyBaskerville); EULA — see assets-source/xp-for-mv/LICENSE_FLAG.txt",
            "behaviors": [0] * total, "collisions": [0] * total,
        }
        with open(os.path.join(DST, name + ".json"), "w") as f:
            json.dump(meta, f)
        names.append(name)
        print(f"  {name}  {cols}x{rows} = {total} tiles")

    # _index.json = ONLY the xp_* sheets (Pixel Fantasy removed per owner decision)
    with open(os.path.join(DST, "_index.json"), "w") as f:
        json.dump(sorted(names), f)
    print(f"imported {len(names)} XP-for-MV sheets; _index.json rewritten (xp only)")

if __name__ == "__main__":
    main()
