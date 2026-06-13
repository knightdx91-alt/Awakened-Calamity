#!/usr/bin/env python3
"""Modular house builder — RPG-Maker-style construction from tile parts.

A building = a ROOF block (ridge on top, shingle fill, a darker EAVE overhang on
the bottom edge, shaded side slopes) sitting on a TALL WALL FACE (2+ rows) with
windows, and a door on the bottom row. Same parts build a hut or a castle by
changing W, H, and wall height.

Parts (16px, in a dir): roof_fill, roof_top, wall_plain, wall_door, wall_window.
Edges (eave / side slope) are derived by shading the fill, so we don't need
fragile generated edge art.
"""
import argparse
import os
from PIL import Image, ImageEnhance

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


def shade(im, factor):
    """Darken only the RGB of an RGBA tile (keep alpha)."""
    r, g, b, a = im.split()
    rgb = Image.merge("RGB", (r, g, b))
    rgb = ImageEnhance.Brightness(rgb).enhance(factor)
    r, g, b = rgb.split()
    return Image.merge("RGBA", (r, g, b, a))


def build_house(parts, w, h, wall_rows=2):
    w = max(2, w)
    h = max(3, h)
    wall_rows = max(1, min(wall_rows, h - 1))
    roof_rows = h - wall_rows
    door_col = w // 2

    roof_fill = parts["roof_fill"]
    roof_ridge = parts.get("roof_top", roof_fill)
    eave = shade(roof_fill, 0.62)          # dark overhang on the bottom roof row
    side = shade(roof_fill, 0.82)          # subtle slope shadow on left/right
    wall = parts["wall_plain"]
    wall_side = shade(wall, 0.88)

    img = Image.new("RGBA", (w * TILE, h * TILE), (0, 0, 0, 0))

    def put(tx, ty, tile):
        img.paste(tile, (tx * TILE, ty * TILE), tile)

    for ty in range(roof_rows):
        for tx in range(w):
            if ty == roof_rows - 1:
                tile = eave                       # bottom = eave overhang
            elif ty == 0:
                tile = roof_ridge                 # top = ridge
            elif tx == 0 or tx == w - 1:
                tile = side                       # side slope shadow
            else:
                tile = roof_fill
            put(tx, ty, tile)

    for wr in range(wall_rows):
        ty = roof_rows + wr
        is_bottom = (wr == wall_rows - 1)
        for tx in range(w):
            if is_bottom and tx == door_col:
                tile = parts["wall_door"]
            elif (not is_bottom) and tx != door_col and tx % 2 == 1 \
                    and "wall_window" in parts:
                tile = parts["wall_window"]
            elif tx == 0 or tx == w - 1:
                tile = wall_side
            else:
                tile = wall
            put(tx, ty, tile)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parts", required=True)
    ap.add_argument("--w", type=int, default=4)
    ap.add_argument("--h", type=int, default=5)
    ap.add_argument("--wall-rows", type=int, default=2)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=int, default=4)
    args = ap.parse_args()
    parts = load_parts(args.parts)
    missing = [n for n in PARTS if n not in parts]
    if missing:
        raise SystemExit(f"Missing parts: {missing}")
    house = build_house(parts, args.w, args.h, args.wall_rows)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    house.resize((house.width * args.scale, house.height * args.scale),
                 Image.NEAREST).save(args.out)
    print(f"built {args.w}x{args.h} house (wall_rows={args.wall_rows}) -> {args.out}")


if __name__ == "__main__":
    main()
