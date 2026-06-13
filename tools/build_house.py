#!/usr/bin/env python3
"""Modular house builder — assembles a house of ANY footprint from tile parts.

Parts (16px each, in a dir): roof_fill, roof_top, wall_plain, wall_door,
wall_window. Like RPG Maker, a house = roof rows on top + a front wall row with
a door and windows. Same parts build a hut or a castle by changing W/H.
"""
import argparse
import os
from PIL import Image

TILE = 16
PARTS = ["roof_fill", "roof_top", "wall_plain", "wall_door", "wall_window"]


def load_parts(d):
    parts = {}
    for n in PARTS:
        p = os.path.join(d, n + ".png")
        if os.path.exists(p):
            im = Image.open(p).convert("RGBA")
            if im.size != (TILE, TILE):
                im = im.resize((TILE, TILE), Image.LANCZOS)
            parts[n] = im
    return parts


def build_house(parts, w, h):
    """Return a (w*16 x h*16) RGBA image of an assembled house.
    Top h-1 rows = roof (row 0 = ridge), bottom row = wall with door+windows."""
    w = max(2, w)
    h = max(2, h)
    img = Image.new("RGBA", (w * TILE, h * TILE), (0, 0, 0, 0))
    roof_h = h - 1
    door_col = w // 2
    for ty in range(h):
        for tx in range(w):
            if ty < roof_h:
                tile = parts["roof_top"] if ty == 0 else parts["roof_fill"]
            else:
                if tx == door_col:
                    tile = parts["wall_door"]
                elif tx in (0, w - 1):
                    tile = parts["wall_plain"]
                else:
                    tile = parts.get("wall_window", parts["wall_plain"]) \
                        if (tx % 2 == 0) else parts["wall_plain"]
            img.paste(tile, (tx * TILE, ty * TILE), tile)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parts", required=True)
    ap.add_argument("--w", type=int, default=4)
    ap.add_argument("--h", type=int, default=4)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=int, default=4)
    args = ap.parse_args()
    parts = load_parts(args.parts)
    missing = [n for n in PARTS if n not in parts]
    if missing:
        raise SystemExit(f"Missing parts: {missing}")
    house = build_house(parts, args.w, args.h)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    house.resize((house.width * args.scale, house.height * args.scale),
                 Image.NEAREST).save(args.out)
    print(f"built {args.w}x{args.h} house -> {args.out}")


if __name__ == "__main__":
    main()
