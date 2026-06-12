#!/usr/bin/env python3
"""Build a small playable sample town on the awakened_town tileset, and render
an upscaled preview PNG. Writes engine-valid layout + map JSON and registers it
in the awakened region index.
"""
import json, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
TS = 'awakened_town'
NAME = 'SampleTown'
LAYOUT_ID = 'LAYOUT_SAMPLE_TOWN'
W, H = 20, 16

# tile indices in awakened_town
G, ED, CB, BR, WN, DR, RF, WS, FN, SG, TT, TB, RU = range(13)

# Base: grass everywhere
m = [G] * (W * H)
def put(x, y, t): m[y * W + x] = t
def rect(x0, y0, x1, y1, t):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): put(x, y, t)

# --- pond (top-right) with shoreline tiles ---
rect(15, 1, 18, 4, WS)

# --- main cobble path: vertical spine + horizontal branch ---
for y in range(0, H): put(9, y, CB); put(10, y, CB)
for x in range(2, W - 2): put(x, 9, CB); put(x, 10, CB)

# --- house A (left of path) ---  roof row over wall row
def house(x, y):           # x,y = top-left of 3-wide, 2-tall house
    put(x, y, RF); put(x+1, y, RF); put(x+2, y, RF)
    put(x, y+1, WN); put(x+1, y+1, DR); put(x+2, y+1, WN)
    put(x+1, y+2, CB)      # doorstep onto path-ish
house(3, 3)
house(13, 11)

# --- a 2-tile tree (top over bottom) ---
def tree(x, y): put(x, y, TT); put(x, y+1, TB)
for (tx, ty) in [(2, 12), (6, 12), (17, 7), (4, 7), (16, 13)]:
    tree(tx, ty)

# --- fence run along bottom-left + signpost by the crossroads ---
for x in range(1, 7): put(x, 14, FN)
put(8, 8, SG)

# --- a glowing rune floor accent in the plaza center ---
put(9, 5, RU); put(10, 5, RU)

# ---- collision from tileset ----
meta = json.load(open(os.path.join(ROOT, 'data', 'tilesets', TS + '.json')))
tcol = meta['collisions']
collision = [tcol[t] for t in m]

# ---- write layout + map + index ----
os.makedirs(os.path.join(ROOT, 'data', 'layouts', 'awakened'), exist_ok=True)
layout = {'id': LAYOUT_ID, 'width': W, 'height': H, 'tileset': TS,
          'metatiles': m, 'collision': collision}
json.dump(layout, open(os.path.join(ROOT, 'data', 'layouts', 'awakened', LAYOUT_ID + '.json'), 'w'))

mp = {'id': 'MAP_SAMPLE_TOWN', 'name': NAME, 'region': 'awakened', 'layout': LAYOUT_ID,
      'music': '', 'weather': 'WEATHER_NONE', 'map_type': 'MAP_TYPE_TOWN',
      'allow_running': True, 'allow_cycling': False, 'show_map_name': True,
      'connections': [], 'npcs': [], 'warps': [], 'triggers': [], 'signs': []}
json.dump(mp, open(os.path.join(ROOT, 'data', 'maps', 'awakened', NAME + '.json'), 'w'))

idx_path = os.path.join(ROOT, 'data', 'maps', 'awakened_index.json')
idx = json.load(open(idx_path))
idx['MAP_SAMPLE_TOWN'] = NAME
json.dump(idx, open(idx_path, 'w'))

# ---- render preview ----
sheet = Image.open(os.path.join(ROOT, 'data', 'tilesets', TS + '.png')).convert('RGBA')
S = 18
out = Image.new('RGBA', (W * 16 * S // 16, H * 16 * S // 16), (0, 0, 0, 255))
out = Image.new('RGBA', (W * S, H * S), (30, 28, 36, 255))
for y in range(H):
    for x in range(W):
        t = m[y * W + x]
        tile = sheet.crop(((t % 16) * 16, (t // 16) * 16, (t % 16) * 16 + 16, (t // 16) * 16 + 16))
        tile = tile.resize((S, S), Image.NEAREST)
        # grass underlay for transparent tree tiles
        if t in (TT, TB):
            g = sheet.crop((0, 0, 16, 16)).resize((S, S), Image.NEAREST)
            out.alpha_composite(g, (x * S, y * S))
        out.alpha_composite(tile, (x * S, y * S))
out.save('/tmp/sample_town.png')
print('wrote layout/map/index + /tmp/sample_town.png', out.size)
