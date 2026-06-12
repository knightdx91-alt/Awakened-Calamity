#!/usr/bin/env python3
"""Import the '16x16 RPG Tileset' by hilau (OpenGameArt) into engine format.

Source:  https://opengameart.org/content/16x16-rpg-tileset
Authors: hilau; based on '16x16 Game Assets' by George Bailey and
         'LPC Thatched-roof Cottage' by bluecarrot16.
License: CC-BY-SA 3.0 / GPL 3.0  (ATTRIBUTION + SHARE-ALIKE required).
The derived tileset (oga_rpg16.png/.json) is therefore released CC-BY-SA 3.0;
attribution is recorded in data/tilesets/oga_rpg16.LICENSE.txt.

Slices every non-empty 16x16 tile across the sheets (skipping the character
sprite base), dedupes, and auto-classifies behaviors/collisions:
  - blue-dominant   -> water 0x10 (blocked)
  - near-black      -> solid wall (blocked)
  - buildings/roofs -> blocked structures
  - cave sheet      -> cave encounter floor 0x08 (walkable)
  - else            -> walkable grass/dirt/floor 0x00
"""
import json, os, glob
from PIL import Image

SRC = "/tmp/ts5/tilesets_edit"
TS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'tilesets')
NAME = 'oga_rpg16'
T = 16
PER_ROW = 16

SKIP = {'14_human_sprite_base.png'}
STRUCT_SHEETS = {'4_buildings.png', '11_roofs.png'}
CAVE_SHEETS = {'8_cave.png'}

def is_empty(t): return t.getbbox() is None

def avg(t):
    px = t.load(); r=g=b=n=0
    for y in range(T):
        for x in range(T):
            cr,cg,cb,ca = px[x,y]
            if ca > 40: r+=cr; g+=cg; b+=cb; n+=1
    if n == 0: return None
    return r//n, g//n, b//n, n

def classify(sheet, tile):
    a = avg(tile)
    if a is None: return 0x00, 0
    r,g,b,n = a
    if b > 75 and b > r + 25 and b > g + 8:      # water
        return 0x10, 1
    if r < 30 and g < 30 and b < 30:             # near-black solid
        return 0x00, 1
    if sheet in STRUCT_SHEETS:
        return 0x00, 1
    if sheet in CAVE_SHEETS:
        return 0x08, 0
    return 0x00, 0

def build():
    tiles, beh, col, labels = [], [], [], []
    seen = set()
    for path in sorted(glob.glob(os.path.join(SRC, '*.png'))):
        sn = os.path.basename(path)
        if sn in SKIP: continue
        sheet = Image.open(path).convert('RGBA')
        w, h = sheet.size
        for ty in range(h // T):
            for tx in range(w // T):
                tile = sheet.crop((tx*T, ty*T, tx*T+T, ty*T+T))
                if is_empty(tile): continue
                key = tile.tobytes()
                if key in seen: continue
                seen.add(key)
                b, c = classify(sn, tile)
                tiles.append(tile); beh.append(b); col.append(c)
                labels.append(f"{sn[:-4]}_{tx}_{ty}")
    n = len(tiles)
    rows = (n + PER_ROW - 1)//PER_ROW
    out = Image.new('RGBA', (PER_ROW*T, rows*T), (0,0,0,0))
    for i, t in enumerate(tiles):
        out.paste(t, ((i % PER_ROW)*T, (i//PER_ROW)*T))
    os.makedirs(TS_DIR, exist_ok=True)
    out.save(os.path.join(TS_DIR, NAME + '.png'))
    json.dump({'total_metatiles': n, 'primary_count': n, 'secondary_count': 0,
               'metatiles_per_row': PER_ROW, 'labels': labels,
               'behaviors': beh, 'collisions': col},
              open(os.path.join(TS_DIR, NAME + '.json'), 'w'))
    with open(os.path.join(TS_DIR, NAME + '.LICENSE.txt'), 'w') as fh:
        fh.write(
"oga_rpg16 tileset  (License: CC-BY-SA 3.0 / GPL 3.0)\n\n"
"Attribution (required):\n"
"Uses the '16x16 RPG Tileset' by hilau at\n"
"https://opengameart.org/content/16x16-rpg-tileset, which is based off of\n"
"'16x16 Game Assets' by George Bailey at\n"
"https://opengameart.org/content/16x16-game-assets and 'LPC Thatched-roof\n"
"Cottage' by bluecarrot16 at\n"
"https://opengameart.org/content/lpc-thatched-roof-cottage.\n\n"
"Share-Alike: this derived tileset is licensed under CC-BY-SA 3.0.\n"
"The character sprite sheet (14_human_sprite_base.png) was NOT imported.\n")
    print(f"wrote {NAME}.png ({out.size[0]}x{out.size[1]}), {n} unique metatiles "
          f"({sum(1 for x in beh if x==0x10)} water, {sum(1 for x in beh if x==0x08)} cave, "
          f"{sum(col)} blocked)")

if __name__ == '__main__':
    build()
