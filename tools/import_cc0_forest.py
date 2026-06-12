#!/usr/bin/env python3
"""Import the CC0 "Seasons of Forest (free sample)" tileset by inkBubi into the
engine's metatile format.

Source: https://opengameart.org/content/free-sample-16x16-pixel-forest-tileset
License: CC0 (public domain) — no attribution required. Safe to commit to a
public repo. (We still record provenance in data/tilesets/forest_cc0.LICENSE.)

The source ships Godot blob/autotile PNGs (grass, grass_dirt, grass_deep_water,
trees, stones, bushes). Our engine has no autotiler — it reads a flat sheet of
16x16 metatiles (16/row) + per-tile behaviors[]/collisions[]. So we slice every
non-empty 16px tile, lay them out 16/row, and auto-classify each tile:
  - source trees/stones/bushes  -> solid object  (collision 1)
  - water-blue dominant tiles    -> water 0x10    (collision 1, needs Surf)
  - everything else (grass/dirt) -> walkable 0x00 (collision 0)
"""
import json, os, glob
from PIL import Image

SRC = "/tmp/forest/texture only/Forest Tileset - Free"
TS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'tilesets')
NAME = 'forest_cc0'
T = 16
PER_ROW = 16

# Which source sheets are "solid objects" (always blocking).
SOLID_SHEETS = {'trees.png', 'stones.png', 'bushes.png'}
# bushes read as tall-grass-ish cover -> give them an encounter behavior.
GRASS_ENCOUNTER_SHEETS = {'bushes.png'}

def is_empty(tile):
    return tile.getbbox() is None  # fully transparent

def avg_color(tile):
    px = tile.load(); r=g=b=n=0
    for y in range(T):
        for x in range(T):
            cr,cg,cb,ca = px[x,y]
            if ca > 40:
                r+=cr; g+=cg; b+=cb; n+=1
    if n == 0: return (0,0,0,0)
    return (r//n, g//n, b//n, n)

def is_water(tile):
    """Blue clearly dominates -> water."""
    r,g,b,n = avg_color(tile)
    return n > 0 and b > 70 and b > r + 25 and b > g + 10

def classify(sheet_name, tile):
    if sheet_name in SOLID_SHEETS:
        return 0x00, 1
    if is_water(tile):
        return 0x10, 1
    if sheet_name in GRASS_ENCOUNTER_SHEETS:
        return 0x02, 0
    return 0x00, 0

def build():
    tiles, beh, col, labels = [], [], [], []
    seen = set()
    for path in sorted(glob.glob(os.path.join(SRC, '*.png'))):
        sheet = Image.open(path).convert('RGBA')
        sn = os.path.basename(path)
        w, h = sheet.size
        for ty in range(h // T):
            for tx in range(w // T):
                tile = sheet.crop((tx*T, ty*T, tx*T+T, ty*T+T))
                if is_empty(tile):
                    continue
                key = tile.tobytes()
                if key in seen:            # dedupe identical tiles
                    continue
                seen.add(key)
                b, c = classify(sn, tile)
                tiles.append(tile); beh.append(b); col.append(c)
                labels.append(f"{sn[:-4]}_{tx}_{ty}")
    n = len(tiles)
    rows = (n + PER_ROW - 1) // PER_ROW
    sheet = Image.new('RGBA', (PER_ROW*T, rows*T), (0,0,0,0))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % PER_ROW)*T, (i // PER_ROW)*T))
    os.makedirs(TS_DIR, exist_ok=True)
    sheet.save(os.path.join(TS_DIR, NAME + '.png'))
    json.dump({'total_metatiles': n, 'primary_count': n, 'secondary_count': 0,
               'metatiles_per_row': PER_ROW, 'labels': labels,
               'behaviors': beh, 'collisions': col},
              open(os.path.join(TS_DIR, NAME + '.json'), 'w'))
    # provenance / license note
    with open(os.path.join(TS_DIR, NAME + '.LICENSE.txt'), 'w') as fh:
        fh.write("forest_cc0 tileset\n"
                 "Source: 'Seasons of Forest (free sample)' by inkBubi\n"
                 "https://opengameart.org/content/free-sample-16x16-pixel-forest-tileset\n"
                 "License: CC0 1.0 (public domain). No attribution required; credit appreciated.\n"
                 "Full set: https://inkbubi.itch.io/seasons-of-forest-tileset\n")
    print(f"wrote {NAME}.png ({sheet.size[0]}x{sheet.size[1]}), {n} unique metatiles "
          f"({sum(1 for b in beh if b==0x10)} water, {sum(col)} blocked)")

if __name__ == '__main__':
    build()
