#!/usr/bin/env python3
"""Compose a sample open-town mockup from our tiles/buildings/objects.

Autotiled grass + a dirt-road network (dual-grid corner tiles), modular
buildings (varied materials/sizes) fronting the roads, plus trees/props.
Hand-laid-out for good composition (roads first, buildings on them, then deco).
Output: a single PNG mockup.
"""
import json
import os
import random
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_house import build_from_mask, rect_mask, build_house_hip  # noqa

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TILE = 16
W, H = 42, 30
rnd = random.Random(7)


def corner_set(d):
    man = json.load(open(os.path.join(ROOT, d, "manifest.json")))
    c2i = {}
    for t in man["tiles"]:
        im = Image.open(os.path.join(ROOT, d, t["file"])).convert("RGBA")
        if im.size != (TILE, TILE):
            im = im.resize((TILE, TILE), Image.LANCZOS)
        c = t["corners"]
        c2i[(c["NW"] == "upper", c["NE"] == "upper",
             c["SW"] == "upper", c["SE"] == "upper")] = im
    return c2i


def obj(name, scale_to=None):
    im = Image.open(os.path.join(ROOT, "data/art/objects", name + ".png")).convert("RGBA")
    return im


# --- terrain: grass (lower) <-> dirt road (upper) via A2_dirtpath -----------
road = corner_set("data/tilesets/outside/A2_dirtpath")
GRASS = road[(False, False, False, False)]
ROADF = road.get((True, True, True, True))


def pick(c2i, nw, ne, sw, se):
    k = (nw, ne, sw, se)
    return c2i.get(k, c2i.get((False, False, False, False)))


# road corner-grid (W+1 x H+1); True = road
g = [[False] * (W + 1) for _ in range(H + 1)]
def road_h(row, x0, x1, width=2):
    for r in range(row, row + width + 1):
        for c in range(x0, x1 + 1):
            if 0 <= r <= H and 0 <= c <= W: g[r][c] = True
def road_v(col, y0, y1, width=2):
    for c in range(col, col + width + 1):
        for r in range(y0, y1 + 1):
            if 0 <= r <= H and 0 <= c <= W: g[r][c] = True

# main crossroads + a plaza loop
road_h(15, 2, 40, 2)          # main street
road_v(20, 3, 27, 2)          # cross street
road_h(8, 8, 34, 1)           # upper lane
road_v(9, 8, 16, 1)
road_v(32, 8, 16, 1)

base = Image.new("RGBA", (W * TILE, H * TILE), (0, 0, 0, 255))
for ty in range(H):
    for tx in range(W):
        t = pick(road, g[ty][tx], g[ty][tx + 1], g[ty + 1][tx], g[ty + 1][tx + 1])
        base.paste(t, (tx * TILE, ty * TILE))


def stamp(img, tx, ty, anchor_bottom=True):
    px = tx * TILE
    py = ty * TILE - (img.height - TILE) if anchor_bottom else ty * TILE
    base.alpha_composite(img, (px, py))


# --- buildings fronting the roads (varied materials/sizes/roofs) ------------
def house(material, w, h, wr=2, hip=False):
    return build_house_hip("data/art/building/" + material, w, h, wr) if hip \
        else build_from_mask("data/art/building/" + material, rect_mask(w, h - wr), wr)

# north row (front faces the upper lane at row 8/main at 15)
stamp(house("cottage", 5, 6, 2, hip=True), 4, 14)
stamp(house("blue", 6, 7, 3), 12, 14)
stamp(house("shop", 5, 6, 2), 25, 14)
stamp(house("thatch", 4, 5, 2, hip=True), 33, 14)
# south row (front faces main street from below)
stamp(house("wood", 5, 6, 2), 6, 27)
stamp(house("cottage", 4, 5, 2, hip=True), 14, 27)
stamp(house("blue", 6, 6, 3), 24, 27)
stamp(house("thatch", 5, 6, 2), 33, 27)
# a stone keep up top
stamp(house("stone", 6, 7, 3), 18, 8)

# --- props / nature / fences -----------------------------------------------
well = obj("well"); stamp(well, 20, 22)
for tx, ty in [(2, 5), (38, 6), (3, 24), (39, 26), (10, 20), (30, 21), (16, 4), (24, 5)]:
    stamp(obj(rnd.choice(["tree_pine", "tree_broadleaf"])), tx, ty)
for tx, ty in [(7, 12), (28, 11), (36, 19), (5, 19), (22, 19), (12, 23), (31, 24), (40, 12)]:
    stamp(obj(rnd.choice(["bush", "rock"])), tx, ty)
for tx, ty in [(19, 17), (22, 13)]:
    stamp(obj("signpost"), tx, ty)
for tx, ty in [(8, 19), (33, 19), (15, 12)]:
    stamp(obj("barrel"), tx, ty)

out = os.path.join(ROOT, "data/art/town_mockup.png")
base.resize((W * TILE * 3, H * TILE * 3), Image.NEAREST).save(out)
print("wrote", out, base.size)
