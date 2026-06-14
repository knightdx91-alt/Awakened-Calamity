#!/usr/bin/env python3
"""Modular building constructor — assembles a correct building of any footprint.

Uses the synthesized piece set (tools/build_building_tileset.synth_pieces):
roof 9-set (tl t tr / l c r / bl b br) over a tall walled face (wall_c/l/r) with
windows and a door. Same material builds a hut, a manor, or a castle keep by
changing W, H, and wall height.
"""
import argparse
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_building_tileset import synth_pieces  # noqa: E402

TILE = 16


def build_house(material_or_pieces, w, h, wall_rows=2):
    p = material_or_pieces if isinstance(material_or_pieces, dict) \
        else synth_pieces(material_or_pieces)
    w = max(2, w)
    h = max(3, h)
    wall_rows = max(1, min(wall_rows, h - 1))
    roof_rows = h - wall_rows
    door_col = w // 2
    img = Image.new("RGBA", (w * TILE, h * TILE), (0, 0, 0, 0))

    def put(tx, ty, tile):
        img.paste(tile, (tx * TILE, ty * TILE), tile)

    def roof_tile(tx, ty):
        top = ty == 0
        bot = ty == roof_rows - 1
        left = tx == 0
        right = tx == w - 1
        if top and left: return p["roof_tl"]
        if top and right: return p["roof_tr"]
        if bot and left: return p["roof_bl"]
        if bot and right: return p["roof_br"]
        if top: return p["roof_t"]
        if bot: return p["roof_b"]
        if left: return p["roof_l"]
        if right: return p["roof_r"]
        return p["roof_c"]

    for ty in range(roof_rows):
        for tx in range(w):
            put(tx, ty, roof_tile(tx, ty))

    for wr in range(wall_rows):
        ty = roof_rows + wr
        is_bottom = wr == wall_rows - 1
        for tx in range(w):
            if is_bottom and tx == door_col:
                tile = p["wall_door"]
            elif (not is_bottom) and tx != door_col and tx % 2 == 1 and "wall_window" in p:
                tile = p["wall_window"]
            elif tx == 0:
                tile = p["wall_l"]
            elif tx == w - 1:
                tile = p["wall_r"]
            else:
                tile = p["wall_c"]
            put(tx, ty, tile)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--material", required=True, help="material dir (5 source fills)")
    ap.add_argument("--w", type=int, default=4)
    ap.add_argument("--h", type=int, default=5)
    ap.add_argument("--wall-rows", type=int, default=2)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=int, default=4)
    args = ap.parse_args()
    house = build_house(args.material, args.w, args.h, args.wall_rows)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    house.resize((house.width * args.scale, house.height * args.scale),
                 Image.NEAREST).save(args.out)
    print(f"built {args.w}x{args.h} (wall_rows={args.wall_rows}) -> {args.out}")


if __name__ == "__main__":
    main()
