#!/usr/bin/env python3
"""Import the RPG Maker VX Ace RTP character (charset) sheets into
data/sprites/rtp/ and build data/sprites/rtp_index.json with charset metadata
for each sheet — the data layer the editor sprite picker + event system use.

VX Ace charset format (same grid model as MV, 32px frames):
  - '$' prefix  -> SINGLE character filling the sheet: 3 cols x 4 rows of frames
                   (3 walk frames x 4 directions). e.g. $BigMonster1 = 64px frames.
  - '!' prefix  -> no shadow / tile-aligned (objects: doors, chests, switches).
  - '!$'        -> both.
  - no prefix   -> 8 characters (4 wide x 2 tall), each a 3x4 frame block
                   (sheet = 12 frame-cols x 8 frame-rows). e.g. Actor1 = 32px.

Source default: the raw pack on branch vx-ace-rtp
    assets-source/vx-ace-rtp/Graphics/Characters/   (override with env SRC=/path)
"""
import json, os, re, struct, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.environ.get("SRC", os.path.join(ROOT, "assets-source", "vx-ace-rtp", "Graphics", "Characters"))
DST  = os.path.join(ROOT, "data", "sprites", "rtp")

def png_size(path):
    with open(path, "rb") as f:
        d = f.read(24)
    assert d[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG: " + path
    return struct.unpack(">II", d[16:24])

def clean_name(fname):
    n = re.sub(r"\.png$", "", fname, flags=re.I)
    return re.sub(r"^[!$]+", "", n)          # drop the format prefix for the display id

def main():
    os.makedirs(DST, exist_ok=True)
    entries = []
    for fname in sorted(os.listdir(SRC)):
        if not fname.lower().endswith(".png"):
            continue
        prefix = re.match(r"^([!$]*)", fname).group(1)
        single = "$" in prefix
        shadow = "!" not in prefix
        w, h = png_size(os.path.join(SRC, fname))
        out_name = clean_name(fname)
        if single:
            chars, cols, rows = 1, 3, 4
        else:
            chars, cols, rows = 8, 12, 8       # 4x2 chars, each 3x4 frames
        fw, fh = w // cols, h // rows
        shutil.copyfile(os.path.join(SRC, fname), os.path.join(DST, out_name + ".png"))
        entries.append({
            "id": out_name, "file": "rtp/" + out_name + ".png",
            "single": single, "shadow": shadow, "chars": chars,
            "cols": cols, "rows": rows, "frame_w": fw, "frame_h": fh,
            "sheet_w": w, "sheet_h": h,
        })
    def category(e):
        m = re.match(r"^([A-Za-z]+?)\d", e["id"])
        return m.group(1) if m else e["id"]   # Door1->Door, BigMonster1->BigMonster, Animal->Animal
    cats = sorted(set(category(e) for e in entries))
    index = {"source": "RPG Maker VX Ace RTP characters (prototype; raw pack on branch vx-ace-rtp)",
             "categories": cats, "sprites": entries}
    with open(os.path.join(ROOT, "data", "sprites", "rtp_index.json"), "w") as f:
        json.dump(index, f)
    print(f"imported {len(entries)} sprites across {len(cats)} categories")
    print("categories:", ", ".join(cats))

if __name__ == "__main__":
    main()
