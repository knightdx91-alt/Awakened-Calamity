#!/usr/bin/env python3
"""Import the RPG Maker VX Ace RTP TILESET sheets into the editor/engine tileset
format (native 32px metatiles), as plain paintable grids.

VX Ace tiles are 32px. A-sheets (A1-A4) are autotile sheets; like the Pixel
Fantasy Pass-1 import we bring them in as RAW grids here (fully paintable), and
leave the wang/9-slice autotile bake to a later pass. A5 + B/C/D/E are already
plain 32px grids and are fully usable as-is.

Source PNGs default to the raw pack on the `vx-ace-rtp` branch:
    assets-source/vx-ace-rtp/Graphics/Tilesets/<Set>_<Tab>.png
(override with env SRC=/path). Output:
    data/tilesets/rtp_<set>_<tab>.png + .json, registered in _index.json
"""
import json, os, re, struct, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.environ.get("SRC", os.path.join(ROOT, "assets-source", "vx-ace-rtp", "Graphics", "Tilesets"))
DST  = os.path.join(ROOT, "data", "tilesets")
TILE = 32  # VX Ace native tile size

def png_size(path):
    with open(path, "rb") as f:
        d = f.read(24)
    assert d[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG: " + path
    w, h = struct.unpack(">II", d[16:24])
    return w, h

def clean_name(fname):
    # Outside_A2.png -> rtp_outside_a2
    stem = re.sub(r"\.png$", "", fname, flags=re.I)
    return "rtp_" + stem.lower()

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
            "total_metatiles": total,
            "primary_count": total,
            "secondary_count": 0,
            "tile": TILE,
            "metatiles_per_row": cols,
            "source": "RPG Maker VX Ace RTP (prototype; raw pack on branch vx-ace-rtp)",
            "behaviors": [0] * total,
            "collisions": [0] * total,
        }
        with open(os.path.join(DST, name + ".json"), "w") as f:
            json.dump(meta, f)
        names.append(name)
        print(f"  {name:22s} {w}x{h}  {cols}x{rows} = {total} tiles @{TILE}px")

    idx_path = os.path.join(DST, "_index.json")
    idx = json.load(open(idx_path))
    merged = sorted(set(idx) | set(names))
    json.dump(merged, open(idx_path, "w"))
    print(f"\nRegistered {len(names)} sheets; index now {len(merged)} tilesets.")

if __name__ == "__main__":
    main()
