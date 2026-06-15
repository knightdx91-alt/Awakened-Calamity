#!/usr/bin/env python3
"""Import the XP-for-MV character sprites into data/sprites/xp/ and build an
index (data/sprites/xp_index.json) with MV-charset metadata for each sheet.

MV character-sheet format:
  - '$' prefix  -> SINGLE character filling the sheet: 3 cols x 4 rows of frames
                   (3 walk frames x 4 directions: down,left,right,up).
  - '!' prefix  -> no shadow / same-as-tile alignment (objects, doors).
  - '!$' prefix -> both.
  - no prefix   -> 8 characters: 4 wide x 2 tall, each a 3x4 frame block
                   (so the sheet is 12 frame-cols x 8 frame-rows).

Per sheet we record: file, name, single (bool), shadow (bool), chars,
cols/rows (frame grid), frame_w/frame_h. This is the data layer the editor's
sprite picker, the event system, and the character generator build on.

EULA: RPG Maker XP RTP (LadyBaskerville) — prototype-only, see
assets-source/xp-for-mv/LICENSE_FLAG.txt.
"""
import json, os, re, struct, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "assets-source", "xp-for-mv", "characters")
DST  = os.path.join(ROOT, "data", "sprites", "xp")

def png_size(path):
    with open(path, "rb") as f:
        d = f.read(24)
    assert d[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG: " + path
    return struct.unpack(">II", d[16:24])

def clean_name(fname):
    n = re.sub(r"\.png$", "", fname, flags=re.I)
    n = n.replace("_PixelScaled", "")
    n = re.sub(r"^[!$]+", "", n)            # drop the format prefix for the display id
    return n

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
            "id": out_name, "file": "xp/" + out_name + ".png",
            "single": single, "shadow": shadow, "chars": chars,
            "cols": cols, "rows": rows, "frame_w": fw, "frame_h": fh,
            "sheet_w": w, "sheet_h": h,
        })
    # group by leading word for a tidy picker (Farmer, Mage, Monster, Animal, ...)
    def category(e):
        m = re.match(r"^([A-Za-z]+?)\d", e["id"])
        return m.group(1) if m else "Misc"
    cats = sorted(set(category(e) for e in entries))
    index = {"source": "XP-for-MV characters (LadyBaskerville); EULA, prototype-only",
             "categories": cats,
             "sprites": entries}
    with open(os.path.join(ROOT, "data", "sprites", "xp_index.json"), "w") as f:
        json.dump(index, f)
    print(f"imported {len(entries)} sprites across {len(cats)} categories")
    print("categories:", ", ".join(cats))

if __name__ == "__main__":
    main()
