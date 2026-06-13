#!/usr/bin/env python3
"""Procedural zone generator for Awakened Calamity.

Turns a PixelLab 16-corner terrain set into a real, playable map:
  1. BAKE: pack the 16 corner tiles (downscaled to 16px) into an engine
     tileset sheet (<name>.png/.json) + register in data/tilesets/_index.json.
  2. GENERATE: build a procedural terrain corner-grid (island/lake/coast),
     pick the matching corner tile per cell (dual-grid autotiling), and emit
     layout + map JSON with collision.
  3. PREVIEW: render the assembled map to a PNG so it can be reviewed.

Engine facts used: TILE_PX=16, METATILES_PER_ROW=16; layout = flat
metatiles[]+collision[] over width*height; maps boot by name from
data/maps/<region>/<Name>.json.
"""
import argparse
import json
import math
import os
import random
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TILE = 16


# ---- 1. bake a PixelLab corner set into an engine tileset ----------------
def bake_tileset(src_dir, ts_name):
    man = json.load(open(os.path.join(src_dir, "manifest.json")))
    tiles = man["tiles"]  # 16 corner tiles
    sheet = Image.new("RGBA", (METAROW := 16, 1)) if False else None
    sheet = Image.new("RGBA", (16 * TILE, TILE), (0, 0, 0, 0))
    corner_to_idx = {}
    for idx, t in enumerate(tiles):
        im = Image.open(os.path.join(src_dir, t["file"])).convert("RGBA")
        if im.size != (TILE, TILE):
            im = im.resize((TILE, TILE), Image.LANCZOS)
        sheet.paste(im, (idx * TILE, 0), im)
        c = t["corners"]
        key = (c["NW"] == "upper", c["NE"] == "upper",
               c["SW"] == "upper", c["SE"] == "upper")
        corner_to_idx[key] = idx
    out_png = os.path.join(ROOT, "data/tilesets", ts_name + ".png")
    sheet.save(out_png)
    ts_json = {"total_metatiles": len(tiles), "primary_count": len(tiles),
               "secondary_count": 0, "metatiles_per_row": 16,
               "behaviors": [0] * len(tiles), "collisions": [0] * len(tiles)}
    json.dump(ts_json, open(os.path.join(ROOT, "data/tilesets", ts_name + ".json"), "w"))
    # register in _index.json
    idx_path = os.path.join(ROOT, "data/tilesets/_index.json")
    names = json.load(open(idx_path))
    if ts_name not in names:
        names.append(ts_name)
        names.sort()
        json.dump(names, open(idx_path, "w"))
    return corner_to_idx


# ---- 2. procedural terrain corner-grid -----------------------------------
def terrain_grid(w, h, shape, seed):
    """Return (w+1)x(h+1) grid of bools: True = upper terrain (land)."""
    rnd = random.Random(seed)
    gw, gh = w + 1, h + 1
    # a few random metaball centers for organic blobs
    cx, cy = gw / 2.0, gh / 2.0
    balls = [(cx, cy, min(gw, gh) * 0.42)]
    for _ in range(3):
        balls.append((rnd.uniform(gw * 0.2, gw * 0.8),
                      rnd.uniform(gh * 0.2, gh * 0.8),
                      min(gw, gh) * rnd.uniform(0.18, 0.30)))
    grid = [[False] * gw for _ in range(gh)]
    for y in range(gh):
        for x in range(gw):
            field = 0.0
            for bx, by, br in balls:
                d2 = (x - bx) ** 2 + (y - by) ** 2
                field += (br * br) / (d2 + 1e-6)
            n = rnd.uniform(-0.18, 0.18)
            inside = field + n > 1.0
            if shape == "lake":
                inside = not inside           # water blob in land
            elif shape == "coast":
                inside = (x / gw) + n * 0.3 < 0.5  # land left, water right
            grid[y][x] = inside
    return grid


def build_layout(grid, w, h, corner_to_idx, block_terrain):
    metatiles, collision = [], []
    # full set must exist; fall back to nearest if a combo missing
    def pick(nw, ne, sw, se):
        key = (nw, ne, sw, se)
        if key in corner_to_idx:
            return corner_to_idx[key]
        # fallback: all-upper or all-lower
        return corner_to_idx.get((True, True, True, True),
                                 corner_to_idx.get((False, False, False, False), 0))
    for ty in range(h):
        for tx in range(w):
            nw = grid[ty][tx]
            ne = grid[ty][tx + 1]
            sw = grid[ty + 1][tx]
            se = grid[ty + 1][tx + 1]
            metatiles.append(pick(nw, ne, sw, se))
            uppers = sum([nw, ne, sw, se])
            if block_terrain == "lower":
                blocked = uppers == 0           # fully water -> block
            elif block_terrain == "upper":
                blocked = uppers == 4
            else:
                blocked = False
            collision.append(1 if blocked else 0)
    return metatiles, collision


# ---- 3. render preview ----------------------------------------------------
def render_preview(ts_name, w, h, metatiles, out, scale=4):
    sheet = Image.open(os.path.join(ROOT, "data/tilesets", ts_name + ".png")).convert("RGBA")
    img = Image.new("RGBA", (w * TILE, h * TILE), (0, 0, 0, 255))
    for i, idx in enumerate(metatiles):
        col = idx % 16
        tile = sheet.crop((col * TILE, 0, col * TILE + TILE, TILE))
        img.paste(tile, ((i % w) * TILE, (i // w) * TILE), tile)
    img = img.resize((w * TILE * scale, h * TILE * scale), Image.NEAREST)
    img.save(out)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="PixelLab tileset dir (manifest.json)")
    ap.add_argument("--tileset-name", required=True, help="baked engine tileset name")
    ap.add_argument("--name", required=True, help="Map name (e.g. GenIsle)")
    ap.add_argument("--region", default="awakened")
    ap.add_argument("--width", type=int, default=30)
    ap.add_argument("--height", type=int, default=22)
    ap.add_argument("--shape", choices=["island", "lake", "coast"], default="island")
    ap.add_argument("--block", choices=["lower", "upper", "none"], default="lower")
    ap.add_argument("--seed", type=int, default=1)
    args = ap.parse_args()

    corner_to_idx = bake_tileset(args.src, args.tileset_name)
    grid = terrain_grid(args.width, args.height, args.shape, args.seed)
    metatiles, collision = build_layout(grid, args.width, args.height,
                                        corner_to_idx, args.block)

    layout_id = "LAYOUT_" + args.name.upper()
    layout = {"id": layout_id, "width": args.width, "height": args.height,
              "tileset": args.tileset_name, "metatiles": metatiles,
              "collision": collision}
    lp = os.path.join(ROOT, f"data/layouts/{args.region}/{layout_id}.json")
    os.makedirs(os.path.dirname(lp), exist_ok=True)
    json.dump(layout, open(lp, "w"))

    mp = {"id": "MAP_" + args.name.upper(), "name": args.name,
          "region": args.region, "layout": layout_id, "music": "",
          "weather": "WEATHER_NONE", "map_type": "MAP_TYPE_ROUTE",
          "allow_running": True, "allow_cycling": False, "show_map_name": True,
          "connections": [], "npcs": [], "warps": [], "triggers": [], "signs": []}
    mpath = os.path.join(ROOT, f"data/maps/{args.region}/{args.name}.json")
    os.makedirs(os.path.dirname(mpath), exist_ok=True)
    json.dump(mp, open(mpath, "w"))

    prev = render_preview(args.tileset_name, args.width, args.height, metatiles,
                          os.path.join(ROOT, f"data/maps/{args.region}/{args.name}_preview.png"))
    print(f"BAKED tileset: data/tilesets/{args.tileset_name}.png ({len(corner_to_idx)} corner combos)")
    print(f"LAYOUT: {lp}")
    print(f"MAP:    {mpath}")
    print(f"PREVIEW:{prev}")
    print(f"Boot: game.html?map={args.name}&region={args.region}")


if __name__ == "__main__":
    main()
