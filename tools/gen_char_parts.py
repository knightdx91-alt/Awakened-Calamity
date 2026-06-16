#!/usr/bin/env python3
"""Generate a STARTER layered character-part set for the character generator.

Each part is an MV-format charset sheet (3 walk frames x 4 directions) at
48x72 px/frame = 144x288 px, drawn in WHITE/greyscale on transparent so the
generator can TINT each layer to any colour (multiply blend keeps the shading).

Layers (draw order, back->front): body (skin) · bottom · top · hair.
This is a clean, simple rig — drop higher-quality parts (e.g. LPC) into the same
manifest (data/generator/parts.json) to upgrade without code changes.

Output: data/generator/parts/<layer>/<id>.png + data/generator/parts.json
"""
import json, os, math
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(ROOT, "data", "generator", "parts")
FW, FH = 48, 72                  # frame size
COLS, ROWS = 3, 4                # 3 walk frames, 4 dirs (down,left,right,up)
DIRS = ["down", "left", "right", "up"]

WHITE = (255, 255, 255, 255)
SHADE = (205, 205, 205, 255)     # slightly darker → depth after tint
LINE  = (60, 60, 60, 255)        # outline

def new_sheet():
    return Image.new("RGBA", (FW*COLS, FH*ROWS), (0, 0, 0, 0))

def leg_offset(col):
    # col 0/2 = step poses (legs apart), col 1 = stand
    return {0: -3, 1: 0, 2: 3}[col]

def draw_body(d, ox, oy, di, col):
    """Skin body: head, torso, arms, legs. Drawn in white (tinted to skin)."""
    cx = ox + FW//2
    # head
    hr = 8
    hy = oy + 16
    d.ellipse([cx-hr, hy-hr, cx+hr, hy+hr], fill=WHITE, outline=LINE)
    # torso
    d.rounded_rectangle([cx-9, oy+24, cx+9, oy+46], 4, fill=WHITE, outline=LINE)
    # arms
    sw = leg_offset(col)
    d.rounded_rectangle([cx-13, oy+25, cx-9, oy+42+max(0, sw)], 3, fill=SHADE, outline=LINE)
    d.rounded_rectangle([cx+9, oy+25, cx+13, oy+42-min(0, sw)], 3, fill=SHADE, outline=LINE)
    # legs (alternate per step)
    lo = leg_offset(col)
    d.rounded_rectangle([cx-8, oy+46, cx-1, oy+60-lo], 3, fill=WHITE, outline=LINE)
    d.rounded_rectangle([cx+1, oy+46, cx+8, oy+60+lo], 3, fill=WHITE, outline=LINE)
    # face dots (down only) so direction reads
    if di == "down":
        d.ellipse([cx-4, hy-1, cx-2, hy+1], fill=LINE)
        d.ellipse([cx+2, hy-1, cx+4, hy+1], fill=LINE)

def draw_bottom_pants(d, ox, oy, di, col):
    cx = ox + FW//2; lo = leg_offset(col)
    d.rounded_rectangle([cx-8, oy+44, cx-1, oy+60-lo], 3, fill=WHITE, outline=LINE)
    d.rounded_rectangle([cx+1, oy+44, cx+8, oy+60+lo], 3, fill=WHITE, outline=LINE)
    d.rectangle([cx-9, oy+42, cx+9, oy+48], fill=WHITE, outline=LINE)

def draw_bottom_skirt(d, ox, oy, di, col):
    cx = ox + FW//2
    d.polygon([(cx-7, oy+42), (cx+7, oy+42), (cx+11, oy+56), (cx-11, oy+56)], fill=WHITE, outline=LINE)

def draw_top_tunic(d, ox, oy, di, col):
    cx = ox + FW//2; sw = leg_offset(col)
    d.rounded_rectangle([cx-10, oy+24, cx+10, oy+48], 4, fill=WHITE, outline=LINE)
    d.rounded_rectangle([cx-13, oy+25, cx-9, oy+40+max(0, sw)], 3, fill=SHADE, outline=LINE)
    d.rounded_rectangle([cx+9, oy+25, cx+13, oy+40-min(0, sw)], 3, fill=SHADE, outline=LINE)

def draw_top_plain(d, ox, oy, di, col):
    cx = ox + FW//2
    d.rounded_rectangle([cx-9, oy+24, cx+9, oy+44], 4, fill=WHITE, outline=LINE)

def draw_hair_short(d, ox, oy, di, col):
    cx = ox + FW//2; hr = 8; hy = oy + 16
    if di == "up":
        d.ellipse([cx-hr, hy-hr, cx+hr, hy+hr], fill=WHITE, outline=LINE)
    else:
        d.pieslice([cx-hr-1, hy-hr-1, cx+hr+1, hy+hr+1], 180, 360, fill=WHITE, outline=LINE)

def draw_hair_long(d, ox, oy, di, col):
    cx = ox + FW//2; hr = 8; hy = oy + 16
    d.pieslice([cx-hr-1, hy-hr-1, cx+hr+1, hy+hr+1], 180, 360, fill=WHITE, outline=LINE)
    d.rounded_rectangle([cx-hr-1, hy-2, cx-hr+3, oy+34], 2, fill=WHITE, outline=LINE)
    d.rounded_rectangle([cx+hr-3, hy-2, cx+hr+1, oy+34], 2, fill=WHITE, outline=LINE)
    if di == "up":
        d.rounded_rectangle([cx-hr+1, hy, cx+hr-1, oy+36], 3, fill=WHITE, outline=LINE)

DRAW = {
    ("body", "body1"): draw_body,
    ("bottom", "pants"): draw_bottom_pants,
    ("bottom", "skirt"): draw_bottom_skirt,
    ("top", "tunic"): draw_top_tunic,
    ("top", "plain"): draw_top_plain,
    ("hair", "short"): draw_hair_short,
    ("hair", "long"): draw_hair_long,
}

PARTS = {
    "body":   [("body1", "Body")],
    "bottom": [("pants", "Pants"), ("skirt", "Skirt"), ("none", "(none)")],
    "top":    [("tunic", "Tunic"), ("plain", "Shirt"), ("none", "(none)")],
    "hair":   [("short", "Short"), ("long", "Long"), ("none", "(bald)")],
}
DEFAULT_COLOR = {"body": "#e8b894", "bottom": "#3a5a8a", "top": "#a83232", "hair": "#5a3a1a"}

def build_part(layer, pid):
    if pid == "none":
        return None
    fn = DRAW[(layer, pid)]
    sheet = new_sheet()
    d = ImageDraw.Draw(sheet)
    for r, di in enumerate(DIRS):
        for c in range(COLS):
            fn(d, c*FW, r*FH, di, c)
    # left/right are mirrors of a single profile → mirror the 'right' row into 'left'
    return sheet

def main():
    manifest = {"frame_w": FW, "frame_h": FH, "cols": COLS, "rows": ROWS,
                "order": ["body", "bottom", "top", "hair"], "categories": {}}
    for layer in ["body", "bottom", "top", "hair"]:
        os.makedirs(os.path.join(OUT, layer), exist_ok=True)
        cat = {"tintable": True, "default_color": DEFAULT_COLOR[layer], "parts": []}
        for pid, label in PARTS[layer]:
            entry = {"id": pid, "label": label}
            sheet = build_part(layer, pid)
            if sheet is not None:
                sheet.save(os.path.join(OUT, layer, pid + ".png"))
                entry["file"] = "parts/%s/%s.png" % (layer, pid)
            cat["parts"].append(entry)
        manifest["categories"][layer] = cat
    json.dump(manifest, open(os.path.join(ROOT, "data", "generator", "parts.json"), "w"), indent=1)
    print("generated starter parts:", {k: len(v) for k, v in PARTS.items()})

if __name__ == "__main__":
    main()
