#!/usr/bin/env python3
"""Import the RPG Maker VX Ace RTP IconSet into data/icons/ as a sheet + index.

IconSet.png is a 16-wide grid of 24x24 icons (RTP: 624 icons). We copy the sheet
and emit a tiny JSON descriptor so the UI (SUPPLIES, skills, status) can draw an
icon by index via src/ui/icons.js (GameIcons.draw).

Source default: assets-source/vx-ace-rtp/Graphics/System/IconSet.png
(override with env SRC=/path/to/IconSet.png).
"""
import json, os, struct, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.environ.get("SRC", os.path.join(ROOT, "assets-source", "vx-ace-rtp", "Graphics", "System", "IconSet.png"))
DST  = os.path.join(ROOT, "data", "icons")
ICON = 24
PER_ROW = 16

def png_size(path):
    with open(path, "rb") as f:
        d = f.read(24)
    assert d[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG: " + path
    return struct.unpack(">II", d[16:24])

def main():
    os.makedirs(DST, exist_ok=True)
    w, h = png_size(SRC)
    cols, rows = w // ICON, h // ICON
    count = cols * rows
    shutil.copyfile(SRC, os.path.join(DST, "rtp_iconset.png"))
    json.dump({"sheet": "rtp_iconset.png", "icon": ICON, "per_row": cols,
               "rows": rows, "count": count, "sheet_w": w, "sheet_h": h,
               "source": "RPG Maker VX Ace RTP IconSet (prototype; raw pack on branch vx-ace-rtp)"},
              open(os.path.join(DST, "rtp_iconset.json"), "w"))
    print(f"imported IconSet: {w}x{h} -> {cols}x{rows} = {count} icons @{ICON}px")

if __name__ == "__main__":
    main()
