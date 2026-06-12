#!/usr/bin/env python3
"""Procedurally generate an original 16x16-metatile tileset for Awakened Calamity.

Produces data/tilesets/<NAME>.png (256px wide, 16 metatiles/row) plus a matching
<NAME>.json (behaviors[] + collisions[]), drop-in compatible with the engine's
GameMap / GameRenderer (see CLAUDE.md "Map system").

Behavior bytes the engine understands:
  0x00 normal | 0x02/0x03 grass encounters | 0x08 cave/void floor encounters
  0x10 water (blocks movement, needs Surf)
Collision: 0 = walkable, 1 = blocked. (Grass/water behaviors override collision.)

All art here is generated from code — no ripped assets. Deterministic per-tile
noise keeps the GBA-ish dithered look while staying 100% original.
"""
import json, os, hashlib
from PIL import Image

TS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'tilesets')
TILE = 16
PER_ROW = 16

# ---- Palette (moody overgrowth + corruption). RGB tuples. -------------------
P = {
    'void0': (8, 6, 16),     'void1': (24, 14, 40),   'void2': (58, 24, 86),
    'glitch': (180, 60, 220),'glitchhi': (236, 140, 255),
    'grass0': (40, 78, 46),  'grass1': (58, 104, 58),  'grass2': (78, 140, 70),
    'tall0': (30, 60, 40),   'tall1': (46, 92, 52),
    'dirt0': (74, 56, 40),   'dirt1': (100, 78, 52),   'dirt2': (124, 100, 70),
    'rock0': (60, 60, 72),   'rock1': (92, 92, 108),   'rock2': (130, 130, 150),
    'sand0': (150, 132, 96), 'sand1': (182, 162, 120), 'sand2': (206, 188, 148),
    'water0': (24, 48, 92),  'water1': (38, 78, 134),  'water2': (70, 124, 180),
    'wood0': (52, 36, 24),   'wood1': (78, 54, 34),
    'leaf0': (26, 54, 32),   'leaf1': (40, 80, 44),    'leaf2': (58, 110, 58),
    'bone': (210, 204, 184), 'rust': (150, 70, 40),
    'flower_r': (200, 70, 70), 'flower_y': (220, 200, 90), 'flower_c': (90, 200, 210),
}

def _rng(seed):
    """Deterministic 0..1 stream from an integer seed."""
    h = hashlib.md5(str(seed).encode()).digest()
    i = 0
    while True:
        for b in h:
            yield b / 255.0
        i += 1
        h = hashlib.md5(h + bytes([i & 255])).digest()

def fill(px, color):
    for y in range(TILE):
        for x in range(TILE):
            px[x, y] = color

def noise(px, seed, base, *shades, density=0.5):
    """Scatter shade colors over a base fill for a dithered texture."""
    fill(px, base)
    g = _rng(seed)
    for y in range(TILE):
        for x in range(TILE):
            if next(g) < density:
                px[x, y] = shades[int(next(g) * len(shades)) % len(shades)]

def border(px, color):
    for i in range(TILE):
        px[i, 0] = color; px[i, TILE-1] = color
        px[0, i] = color; px[TILE-1, i] = color

# ---- Metatile painters. Each returns (behavior, collision). -----------------
def t_void(px, s):       # corrupted nothing — walkable "cave" floor encounter
    noise(px, s, P['void0'], P['void1'], P['void2'], density=0.35)
    g = _rng(s+9)
    for _ in range(6):
        x = int(next(g)*TILE); y = int(next(g)*TILE)
        px[x, y] = P['glitch'] if next(g) < .6 else P['glitchhi']
    return 0x08, 0

def t_grass(px, s):
    noise(px, s, P['grass1'], P['grass0'], P['grass2'], density=0.45)
    return 0x00, 0

def t_tall(px, s):       # tall grass — encounters
    noise(px, s, P['tall1'], P['tall0'], P['grass2'], density=0.5)
    g = _rng(s+3)
    for x in range(TILE):                      # vertical blades
        if next(g) < .5:
            h = 3 + int(next(g)*5)
            for y in range(TILE-h, TILE):
                px[x, y] = P['grass2'] if next(g) < .4 else P['tall0']
    return 0x02, 0

def t_flowers(px, s):
    t_grass(px, s)
    g = _rng(s+7)
    cols = [P['flower_r'], P['flower_y'], P['flower_c']]
    for _ in range(5):
        x = 2+int(next(g)*(TILE-4)); y = 2+int(next(g)*(TILE-4))
        c = cols[int(next(g)*3) % 3]
        px[x, y] = c; px[x+1, y] = c; px[x, y+1] = c; px[x+1, y+1] = c
        px[x, y] = P['flower_y'] if c != P['flower_y'] else P['flower_r']
    return 0x00, 0

def t_dirt(px, s):
    noise(px, s, P['dirt1'], P['dirt0'], P['dirt2'], density=0.4)
    return 0x00, 0

def t_path(px, s):       # lighter packed path
    noise(px, s, P['dirt2'], P['dirt1'], P['sand1'], density=0.35)
    return 0x00, 0

def t_sand(px, s):
    noise(px, s, P['sand1'], P['sand0'], P['sand2'], density=0.4)
    return 0x00, 0

def t_water(px, s):
    noise(px, s, P['water1'], P['water0'], P['water2'], density=0.45)
    g = _rng(s+5)
    for y in range(2, TILE, 5):               # horizontal ripples
        for x in range(TILE):
            if next(g) < .5:
                px[x, y] = P['water2']
    return 0x10, 1

def t_rock(px, s):       # blocking boulder / cliff
    noise(px, s, P['rock1'], P['rock0'], P['rock2'], density=0.4)
    border(px, P['rock0'])
    for i in range(TILE):
        px[i, 1] = P['rock2']
    return 0x00, 1

def t_tree(px, s, top):  # 1x1 stylized tree (top or bottom half), blocking
    if top:
        noise(px, s, P['leaf1'], P['leaf0'], P['leaf2'], density=0.5)
        g = _rng(s)
        for x in range(TILE):                 # rounded crown
            for y in range(TILE):
                if (x-8)**2 + (y-9)**2 > 70:
                    px[x, y] = P['grass1']
    else:
        fill(px, P['grass1'])
        for x in range(6, 10):
            for y in range(0, TILE):
                px[x, y] = P['wood1'] if (x+y) % 2 else P['wood0']
        noise_overlay = _rng(s+2)
        for x in range(4, 12):                 # root flare
            if next(noise_overlay) < .5:
                px[x, TILE-1] = P['wood0']
    return 0x00, 1

def t_corrupt_grass(px, s):  # grass bleeding into corruption — encounters
    noise(px, s, P['grass0'], P['void2'], P['glitch'], density=0.4)
    g = _rng(s+11)
    for _ in range(4):
        x=int(next(g)*TILE); y=int(next(g)*TILE)
        px[x,y]=P['glitchhi']
    return 0x03, 0

def t_bones(px, s):     # decorative blocked debris
    t_dirt(px, s)
    g=_rng(s+13)
    for _ in range(5):
        x=2+int(next(g)*12); y=2+int(next(g)*12)
        px[x,y]=P['bone']; px[x+1,y]=P['bone']
    return 0x00, 1

def t_rune(px, s):      # glowing System rune marker (walkable)
    noise(px, s, P['void1'], P['void0'], density=0.3)
    c=P['glitchhi']
    for i in range(3,13):
        px[i,8]=c; px[8,i]=c
    px[8,8]=P['bone']
    return 0x00, 0

# ---- Tile table: order defines metatile index (row-major, 16/row) -----------
TILES = [
    ('void',        t_void),
    ('grass',       t_grass),
    ('grass2',      lambda px,s: t_grass(px, s+100)),
    ('tall_grass',  t_tall),
    ('corrupt_grass', t_corrupt_grass),
    ('flowers',     t_flowers),
    ('dirt',        t_dirt),
    ('path',        t_path),
    ('sand',        t_sand),
    ('water',       t_water),
    ('water2',      lambda px,s: t_water(px, s+50)),
    ('rock',        t_rock),
    ('tree_top',    lambda px,s: t_tree(px, s, True)),
    ('tree_bottom', lambda px,s: t_tree(px, s, False)),
    ('bones',       t_bones),
    ('rune',        t_rune),
]

def build(name='awakened_overgrowth'):
    n = len(TILES)
    rows = (n + PER_ROW - 1) // PER_ROW
    sheet = Image.new('RGBA', (PER_ROW*TILE, rows*TILE), (0,0,0,0))
    behaviors, collisions = [], []
    for idx, (label, fn) in enumerate(TILES):
        tile = Image.new('RGBA', (TILE, TILE), (0,0,0,255))
        b, c = fn(tile.load(), idx*1000 + 7)
        behaviors.append(b); collisions.append(c)
        col = idx % PER_ROW; row = idx // PER_ROW
        sheet.paste(tile, (col*TILE, row*TILE))
    os.makedirs(TS_DIR, exist_ok=True)
    png = os.path.join(TS_DIR, name + '.png')
    sheet.save(png)
    meta = {
        'total_metatiles': n, 'primary_count': n, 'secondary_count': 0,
        'metatiles_per_row': PER_ROW,
        'labels': [t[0] for t in TILES],
        'behaviors': behaviors, 'collisions': collisions,
    }
    with open(os.path.join(TS_DIR, name + '.json'), 'w') as fh:
        json.dump(meta, fh)
    print(f'wrote {png} ({sheet.size[0]}x{sheet.size[1]}) + {name}.json, {n} metatiles')
    return png

if __name__ == '__main__':
    import sys
    build(sys.argv[1] if len(sys.argv) > 1 else 'awakened_overgrowth')
