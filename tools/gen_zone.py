#!/usr/bin/env python3
"""Procedural zone generator for Awakened Calamity.

Pipeline:
  1. BAKE terrain: pack a PixelLab 16-corner set into an engine tileset
     (16px tiles). Optional clean-fill override for the all-upper/all-lower
     tiles (some PixelLab sets bake decoration into the fill -> striping).
  2. BAKE overlay: slice object sprites (houses/trees/props) into 16px tiles,
     pack into an overlay tileset.
  3. GENERATE: procedural terrain corner-grid (island/lake/coast) -> dual-grid
     autotile -> metatiles[]+collision[]; then scatter/place objects -> overlay[]
     (+ collision on their bases).
  4. PREVIEW: render base + overlay to a PNG.

Engine: TILE_PX=16, METATILES_PER_ROW=16; layout has tileset, metatiles[],
collision[], optional overlay_tileset + overlay[] (-1 = none).
"""
import argparse
import json
import math
import os
import random
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TILE = 16
TS_DIR = os.path.join(ROOT, "data/tilesets")


# ---- 1. terrain tileset --------------------------------------------------
def bake_tileset(src_dir, ts_name, fill_upper_png=None, fill_lower_png=None):
    man = json.load(open(os.path.join(src_dir, "manifest.json")))
    tiles = man["tiles"]
    sheet = Image.new("RGBA", (16 * TILE, TILE), (0, 0, 0, 0))
    corner_to_idx = {}
    for idx, t in enumerate(tiles):
        im = Image.open(os.path.join(src_dir, t["file"])).convert("RGBA")
        c = t["corners"]
        key = (c["NW"] == "upper", c["NE"] == "upper",
               c["SW"] == "upper", c["SE"] == "upper")
        # clean-fill override for the solid tiles
        if key == (True, True, True, True) and fill_upper_png:
            im = Image.open(fill_upper_png).convert("RGBA")
        if key == (False, False, False, False) and fill_lower_png:
            im = Image.open(fill_lower_png).convert("RGBA")
        if im.size != (TILE, TILE):
            im = im.resize((TILE, TILE), Image.LANCZOS)
        sheet.paste(im, (idx * TILE, 0), im)
        corner_to_idx[key] = idx
    sheet.save(os.path.join(TS_DIR, ts_name + ".png"))
    json.dump({"total_metatiles": len(tiles), "primary_count": len(tiles),
               "secondary_count": 0, "metatiles_per_row": 16,
               "behaviors": [0] * len(tiles), "collisions": [0] * len(tiles)},
              open(os.path.join(TS_DIR, ts_name + ".json"), "w"))
    idx_path = os.path.join(TS_DIR, "_index.json")
    names = json.load(open(idx_path))
    for n in (ts_name,):
        if n not in names:
            names.append(n)
    names.sort()
    json.dump(names, open(idx_path, "w"))
    return corner_to_idx


# ---- 2. overlay tileset from object sprites ------------------------------
def bake_overlay(objects_dir, names, ov_name):
    """Slice each object PNG into 16px tiles. Returns:
       objmap[name] = {cols,rows,grid[[idx or -1]]}, and writes the sheet."""
    pieces = []          # list of 16x16 RGBA tiles
    objmap = {}
    for nm in names:
        path = os.path.join(objects_dir, nm + ".png")
        if not os.path.exists(path):
            continue
        im = Image.open(path).convert("RGBA")
        cols = math.ceil(im.width / TILE)
        rows = math.ceil(im.height / TILE)
        canvas = Image.new("RGBA", (cols * TILE, rows * TILE), (0, 0, 0, 0))
        canvas.paste(im, ((cols * TILE - im.width) // 2, rows * TILE - im.height))
        grid = []
        for ry in range(rows):
            row = []
            for rx in range(cols):
                tile = canvas.crop((rx * TILE, ry * TILE, rx * TILE + TILE, ry * TILE + TILE))
                if tile.getbbox() is None:           # fully transparent
                    row.append(-1)
                else:
                    row.append(len(pieces))
                    pieces.append(tile)
            grid.append(row)
        objmap[nm] = {"cols": cols, "rows": rows, "grid": grid}
    if not pieces:
        return objmap, None
    per_row = 16
    rows_n = math.ceil(len(pieces) / per_row)
    sheet = Image.new("RGBA", (per_row * TILE, rows_n * TILE), (0, 0, 0, 0))
    for i, t in enumerate(pieces):
        sheet.paste(t, ((i % per_row) * TILE, (i // per_row) * TILE), t)
    sheet.save(os.path.join(TS_DIR, ov_name + ".png"))
    json.dump({"total_metatiles": len(pieces), "primary_count": len(pieces),
               "secondary_count": 0, "metatiles_per_row": 16,
               "behaviors": [0] * len(pieces), "collisions": [0] * len(pieces)},
              open(os.path.join(TS_DIR, ov_name + ".json"), "w"))
    idx_path = os.path.join(TS_DIR, "_index.json")
    names_idx = json.load(open(idx_path))
    if ov_name not in names_idx:
        names_idx.append(ov_name); names_idx.sort()
        json.dump(names_idx, open(idx_path, "w"))
    return objmap, ov_name


# ---- 3a. terrain corner-grid ---------------------------------------------
def terrain_grid(w, h, shape, seed):
    rnd = random.Random(seed)
    gw, gh = w + 1, h + 1
    cx, cy = gw / 2.0, gh / 2.0
    balls = [(cx, cy, min(gw, gh) * 0.42)]
    for _ in range(3):
        balls.append((rnd.uniform(gw * 0.2, gw * 0.8),
                      rnd.uniform(gh * 0.2, gh * 0.8),
                      min(gw, gh) * rnd.uniform(0.18, 0.30)))
    grid = [[False] * gw for _ in range(gh)]
    for y in range(gh):
        for x in range(gw):
            field = sum((br * br) / ((x - bx) ** 2 + (y - by) ** 2 + 1e-6)
                        for bx, by, br in balls)
            inside = field + rnd.uniform(-0.18, 0.18) > 1.0
            if shape == "lake":
                inside = not inside
            elif shape == "coast":
                inside = (x / gw) + rnd.uniform(-0.05, 0.05) < 0.5
            grid[y][x] = inside
    return grid


def build_base(grid, w, h, corner_to_idx, block_terrain):
    metatiles, collision = [], []
    def pick(k):
        return corner_to_idx.get(k, corner_to_idx.get(
            (True, True, True, True), corner_to_idx.get((False, False, False, False), 0)))
    for ty in range(h):
        for tx in range(w):
            nw, ne = grid[ty][tx], grid[ty][tx + 1]
            sw, se = grid[ty + 1][tx], grid[ty + 1][tx + 1]
            metatiles.append(pick((nw, ne, sw, se)))
            uppers = nw + ne + sw + se
            blocked = (uppers == 0) if block_terrain == "lower" else \
                      (uppers == 4) if block_terrain == "upper" else False
            collision.append(1 if blocked else 0)
    return metatiles, collision


# ---- 3b. object placement -------------------------------------------------
def place_objects(w, h, collision, objmap, spec, seed):
    rnd = random.Random(seed * 7 + 1)
    overlay = [-1] * (w * h)
    occupied = [False] * (w * h)
    placed = 0
    def free_block(px, py, cols, rows):
        if px < 0 or py < 0 or px + cols > w or py + rows > h:
            return False
        for yy in range(rows):
            for xx in range(cols):
                ci = (py + yy) * w + (px + xx)
                if collision[ci] or occupied[ci]:
                    return False
        # keep a 1-tile margin from water edges for footprint base
        return True
    for nm, count in spec:
        o = objmap.get(nm)
        if not o:
            continue
        cols, rows, grid = o["cols"], o["rows"], o["grid"]
        for _ in range(count):
            done = False
            for _try in range(80):
                px = rnd.randint(0, max(0, w - cols))
                py = rnd.randint(0, max(0, h - rows))
                if not free_block(px, py, cols, rows):
                    continue
                for yy in range(rows):
                    for xx in range(cols):
                        idx = grid[yy][xx]
                        ci = (py + yy) * w + (px + xx)
                        occupied[ci] = True
                        if idx >= 0:
                            overlay[ci] = idx
                # block the base row (solid footing)
                for xx in range(cols):
                    if grid[rows - 1][xx] >= 0:
                        collision[(py + rows - 1) * w + (px + xx)] = 1
                placed += 1
                done = True
                break
            if not done:
                break
    return overlay, placed


# ---- 4. preview -----------------------------------------------------------
def render_preview(ts_name, ov_name, w, h, metatiles, overlay, out, scale=3):
    base = Image.open(os.path.join(TS_DIR, ts_name + ".png")).convert("RGBA")
    img = Image.new("RGBA", (w * TILE, h * TILE), (0, 0, 0, 255))
    for i, idx in enumerate(metatiles):
        col = idx % 16
        img.paste(base.crop((col * TILE, 0, col * TILE + TILE, TILE)),
                  ((i % w) * TILE, (i // w) * TILE))
    if ov_name and overlay:
        ov = Image.open(os.path.join(TS_DIR, ov_name + ".png")).convert("RGBA")
        for i, idx in enumerate(overlay):
            if idx < 0:
                continue
            col, row = idx % 16, idx // 16
            tile = ov.crop((col * TILE, row * TILE, col * TILE + TILE, row * TILE + TILE))
            img.paste(tile, ((i % w) * TILE, (i // w) * TILE), tile)
    img = img.resize((w * TILE * scale, h * TILE * scale), Image.NEAREST)
    img.save(out)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--tileset-name", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--region", default="awakened")
    ap.add_argument("--width", type=int, default=30)
    ap.add_argument("--height", type=int, default=22)
    ap.add_argument("--shape", choices=["island", "lake", "coast"], default="lake")
    ap.add_argument("--block", choices=["lower", "upper", "none"], default="upper")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--fill-upper-png", default=None)
    ap.add_argument("--fill-lower-png", default=None)
    ap.add_argument("--objects-dir", default=None)
    ap.add_argument("--building-parts", default=None, help="dir of modular house parts")
    args = ap.parse_args()

    corner_to_idx = bake_tileset(args.src, args.tileset_name,
                                 args.fill_upper_png, args.fill_lower_png)
    grid = terrain_grid(args.width, args.height, args.shape, args.seed)
    metatiles, collision = build_base(grid, args.width, args.height,
                                      corner_to_idx, args.block)

    overlay, ov_name = None, None
    if args.objects_dir:
        names = ["well", "tree_pine", "tree_broadleaf", "bush", "rock",
                 "barrel", "signpost"]
        house_spec = []
        if args.building_parts:
            # MODULAR houses: assemble from parts at several sizes
            import sys
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from build_house import build_house
            sizes = {"builtH_small": (3, 4, 2), "builtH_med": (5, 5, 2),
                     "builtH_large": (7, 7, 3)}
            for nm, (bw, bh, wr) in sizes.items():
                build_house(args.building_parts, bw, bh, wr).save(os.path.join(args.objects_dir, nm + ".png"))
                names.insert(0, nm)
            house_spec = [("builtH_large", 1), ("builtH_med", 2), ("builtH_small", 3)]
        else:
            names = ["house_large", "house_medium", "house_small"] + names
            house_spec = [("house_large", 1), ("house_medium", 2), ("house_small", 2)]
        objmap, ov_name = bake_overlay(args.objects_dir, names,
                                       args.tileset_name + "_obj")
        spec = house_spec + [
                ("well", 1), ("signpost", 1), ("tree_pine", 6),
                ("tree_broadleaf", 6), ("bush", 8), ("rock", 5), ("barrel", 3)]
        overlay, placed = place_objects(args.width, args.height, collision,
                                        objmap, spec, args.seed)
        print(f"placed {placed} objects")

    layout_id = "LAYOUT_" + args.name.upper()
    layout = {"id": layout_id, "width": args.width, "height": args.height,
              "tileset": args.tileset_name, "metatiles": metatiles,
              "collision": collision}
    if ov_name:
        layout["overlay_tileset"] = ov_name
        layout["overlay"] = overlay
    lp = os.path.join(ROOT, f"data/layouts/{args.region}/{layout_id}.json")
    os.makedirs(os.path.dirname(lp), exist_ok=True)
    json.dump(layout, open(lp, "w"))

    mp = {"id": "MAP_" + args.name.upper(), "name": args.name,
          "region": args.region, "layout": layout_id, "music": "",
          "weather": "WEATHER_NONE", "map_type": "MAP_TYPE_TOWN",
          "allow_running": True, "allow_cycling": False, "show_map_name": True,
          "connections": [], "npcs": [], "warps": [], "triggers": [], "signs": []}
    mpath = os.path.join(ROOT, f"data/maps/{args.region}/{args.name}.json")
    os.makedirs(os.path.dirname(mpath), exist_ok=True)
    json.dump(mp, open(mpath, "w"))

    prev = render_preview(args.tileset_name, ov_name, args.width, args.height,
                          metatiles, overlay,
                          os.path.join(ROOT, f"data/maps/{args.region}/{args.name}_preview.png"))
    print(f"LAYOUT {lp}\nMAP {mpath}\nPREVIEW {prev}")
    print(f"Boot: game.html?map={args.name}&region={args.region}")


if __name__ == "__main__":
    main()
