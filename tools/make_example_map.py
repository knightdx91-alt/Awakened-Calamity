#!/usr/bin/env python3
"""Generate an example custom map from authentic Pallet Town metatiles, proving
the new-map pipeline end-to-end. Emits the same layout + map JSON the in-browser
map editor exports, writes them into the game's data dirs under a `custom`
region, and renders a PNG preview using the real tileset.

This file is also the seed of the 'describe -> generate' workflow: the helpers
below (fill, border, rect, scatter) are the primitives a text description maps
onto.
"""
import json, os, random
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
TS = 'pallet_town'

# ── Authentic metatile vocabulary (verified from real Kanto layouts) ──
GRASS      = 1     # plain walkable grass
TALL_GRASS = 13    # encounter grass patch
FLOWER     = 4     # red flowers (decoration)
WATER      = 41    # open water (blocked)
# 2x2 tree unit (top-left, top-right / bottom-left, bottom-right)
TREE_TL, TREE_TR = 28, 29
TREE_BL, TREE_BR = 20, 21
PATH       = 196   # light dirt/sand path

W, H = 24, 20
NAME = 'VerdantHollow'
LAYOUT_ID = 'LAYOUT_VERDANT_HOLLOW'
REGION = 'custom'

mt = [GRASS] * (W * H)
col = [0] * (W * H)

def at(x, y): return y * W + x
def setc(x, y, tile, blocked):
    if 0 <= x < W and 0 <= y < H:
        mt[at(x, y)] = tile
        col[at(x, y)] = 1 if blocked else 0

def rect(x0, y0, x1, y1, tile, blocked):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            setc(x, y, tile, blocked)

# ── Tree border (2-thick ring of the 2x2 tree unit) ──
def tree_ring():
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            on_edge = x < 2 or x >= W - 2 or y < 2 or y >= H - 2
            if not on_edge:
                continue
            setc(x,   y,   TREE_TL, True)
            setc(x+1, y,   TREE_TR, True)
            setc(x,   y+1, TREE_BL, True)
            setc(x+1, y+1, TREE_BR, True)

tree_ring()

# ── Features inside the clearing ──
# a dirt path running south from the top opening to the bottom
rect(11, 2, 12, H - 3, PATH, False)
# a pond in the lower-left
rect(4, 12, 8, 16, WATER, True)
# a tall-grass patch upper-right (wild encounters)
rect(15, 4, 20, 8, TALL_GRASS, False)
# scattered flowers
random.seed(7)
for _ in range(14):
    x, y = random.randint(3, W - 4), random.randint(3, H - 4)
    if mt[at(x, y)] == GRASS:
        setc(x, y, FLOWER, False)

# ── Write layout + map JSON (identical shape to editor export) ──
layout = {
    'id': LAYOUT_ID, 'width': W, 'height': H,
    'primary_tileset': 'gTileset_General',
    'secondary_tileset': 'gTileset_PalletTown',
    'tileset': TS, 'metatiles': mt, 'collision': col,
}
mapjson = {
    'id': 'MAP_VERDANT_HOLLOW', 'name': NAME, 'region': REGION,
    'layout': LAYOUT_ID, 'music': 'MUS_PALLET', 'weather': 'WEATHER_SUNNY',
    'map_type': 'MAP_TYPE_TOWN', 'allow_running': True, 'allow_cycling': True,
    'show_map_name': True, 'connections': [], 'npcs': [],
    'warps': [{'x': 11, 'y': H - 2, 'dest_map': 'MAP_PALLET_TOWN', 'dest_warp_id': '0'}],
    'triggers': [], 'signs': [],
}

os.makedirs(os.path.join(ROOT, 'data', 'layouts', REGION), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'data', 'maps', REGION), exist_ok=True)
with open(os.path.join(ROOT, 'data', 'layouts', REGION, LAYOUT_ID + '.json'), 'w') as f:
    json.dump(layout, f)
with open(os.path.join(ROOT, 'data', 'maps', REGION, NAME + '.json'), 'w') as f:
    json.dump(mapjson, f)
# region index: MAP_CONST -> filename
idx_path = os.path.join(ROOT, 'data', 'maps', 'custom_index.json')
idx = {}
if os.path.exists(idx_path):
    idx = json.load(open(idx_path))
idx[mapjson['id']] = NAME
idx[NAME] = NAME
with open(idx_path, 'w') as f:
    json.dump(idx, f)

# ── Render a preview exactly like the in-game renderer (metatile slice) ──
sheet = Image.open(os.path.join(ROOT, 'data', 'tilesets', TS + '.png')).convert('RGBA')
PER_ROW = 16
scale = 3
out = Image.new('RGBA', (W * 16 * scale, H * 16 * scale))
for y in range(H):
    for x in range(W):
        mid = mt[at(x, y)]
        sc, sr = (mid % PER_ROW) * 16, (mid // PER_ROW) * 16
        tile = sheet.crop((sc, sr, sc + 16, sr + 16)).resize((16 * scale, 16 * scale), Image.NEAREST)
        out.alpha_composite(tile, (x * 16 * scale, y * 16 * scale))
out.convert('RGB').save('/tmp/example_map.png')
print('wrote layout + map + index, preview at /tmp/example_map.png')
print('blocked tiles:', sum(col), 'of', W * H)
