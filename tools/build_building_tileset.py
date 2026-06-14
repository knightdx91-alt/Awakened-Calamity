#!/usr/bin/env python3
"""Synthesize a FULL building tilesheet from a material's source fills.

From 5 generated fills (roof_fill, roof_top, wall_plain, wall_door, wall_window)
it derives the complete piece set used to build correct buildings at any size:

  roof: tl t tr / l c r / bl b br   (ridge top, eave bottom, shaded sides+corners)
  wall: c l r door window

- synth_pieces(material_dir) -> {name: 16px RGBA tile}   (used by build_house)
- save_tileset(pieces, name)  -> data/tilesets/<name>.png/.json (+ _index.json)
                                 so it's usable in the engine/editor like an
                                 RPG Maker A3/A4 building sheet.
"""
import argparse
import json
import os
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS_DIR = os.path.join(ROOT, "data/tilesets")
TILE = 16
# fixed sheet order so layouts can reference indices reliably
ORDER = ["roof_tl", "roof_t", "roof_tr", "roof_l", "roof_c", "roof_r",
         "roof_bl", "roof_b", "roof_br", "wall_c", "wall_l", "wall_r",
         "wall_door", "wall_window"]


def _load(d, n):
    p = os.path.join(d, n + ".png")
    im = Image.open(p).convert("RGBA")
    return im.resize((TILE, TILE), Image.LANCZOS) if im.size != (TILE, TILE) else im


def _shade(im, f):
    r, g, b, a = im.split()
    rgb = ImageEnhance.Brightness(Image.merge("RGB", (r, g, b))).enhance(f)
    return Image.merge("RGBA", (*rgb.split(), a))


def synth_pieces(material_dir):
    roof_fill = _load(material_dir, "roof_fill")
    roof_top = _load(material_dir, "roof_top")
    wall = _load(material_dir, "wall_plain")
    door = _load(material_dir, "wall_door")
    window = _load(material_dir, "wall_window")

    eave = _shade(roof_fill, 0.60)            # bottom overhang shadow
    side = _shade(roof_fill, 0.82)            # side slope shade
    ridge = roof_top
    p = {
        "roof_c": roof_fill,
        "roof_t": ridge,
        "roof_b": eave,
        "roof_l": side,
        "roof_r": side,
        "roof_tl": _shade(ridge, 0.88),
        "roof_tr": _shade(ridge, 0.88),
        "roof_bl": _shade(eave, 0.9),
        "roof_br": _shade(eave, 0.9),
        "wall_c": wall,
        "wall_l": _shade(wall, 0.9),
        "wall_r": _shade(wall, 0.9),
        "wall_door": door,
        "wall_window": window,
    }
    return p


def save_tileset(pieces, name):
    sheet = Image.new("RGBA", (16 * TILE, TILE), (0, 0, 0, 0))
    for i, key in enumerate(ORDER):
        sheet.paste(pieces[key], (i * TILE, 0), pieces[key])
    sheet.save(os.path.join(TS_DIR, name + ".png"))
    n = len(ORDER)
    json.dump({"total_metatiles": n, "primary_count": n, "secondary_count": 0,
               "metatiles_per_row": 16, "behaviors": [0] * n,
               "collisions": [1] * n}, open(os.path.join(TS_DIR, name + ".json"), "w"))
    idx = os.path.join(TS_DIR, "_index.json")
    names = json.load(open(idx))
    if name not in names:
        names.append(name); names.sort(); json.dump(names, open(idx, "w"))
    return {key: i for i, key in enumerate(ORDER)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--material", required=True, help="dir with the 5 source fills")
    ap.add_argument("--name", required=True, help="engine tileset name")
    ap.add_argument("--preview", default=None)
    args = ap.parse_args()
    pieces = synth_pieces(args.material)
    idxmap = save_tileset(pieces, args.name)
    print(f"baked tilesheet data/tilesets/{args.name}.png ({len(pieces)} pieces)")
    if args.preview:
        S = 5
        strip = Image.new("RGBA", (len(ORDER) * (TILE + 2) * S, (TILE + 2) * S), (30, 30, 36, 255))
        for i, key in enumerate(ORDER):
            t = pieces[key].resize((TILE * S, TILE * S), Image.NEAREST)
            strip.paste(t, (i * (TILE + 2) * S, 0), t)
        strip.save(args.preview)
        print("preview", args.preview)


if __name__ == "__main__":
    main()
