#!/usr/bin/env python3
"""Higher-fidelity ORIGINAL town/structure tileset for Awakened Calamity.

Technique study (legal/style-only) from reference GBA town sheets:
  - per-material 3-shade ramp (shadow / mid / highlight) + near-black outline
  - structured patterns (brick courses, roof shingle rows, cobble clusters),
    NOT random noise
  - limited muted palette, hard pixel edges
All pixels here are authored from scratch in code; no asset is copied.

Outputs data/tilesets/awakened_town.png (+ .json) drop-in for the engine.
"""
import json, os, hashlib
from PIL import Image

TS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'tilesets')
T = 16
PER_ROW = 16
OUT = (12, 10, 16)   # near-black outline used across materials

# 3-shade ramps (shadow, mid, highlight) per original material -----------------
RAMP = {
    'brick':  ((96, 30, 44),  (150, 52, 70),  (196, 92, 110)),
    'wood':   ((58, 38, 26),  (96, 64, 40),   (138, 100, 66)),
    'roof':   ((52, 28, 60),  (92, 46, 96),   (140, 78, 140)),  # purple corrupt-slate
    'stone':  ((54, 56, 66),  (92, 96, 110),  (140, 146, 162)),
    'grass':  ((40, 78, 46),  (58, 110, 58),  (92, 150, 78)),
    'dirt':   ((74, 56, 40),  (104, 80, 52),  (136, 108, 74)),
    'water':  ((22, 46, 88),  (38, 80, 138),  (78, 132, 188)),
    'glass':  ((30, 60, 80),  (70, 140, 170), (150, 210, 230)),
}

def rng(seed):
    h = hashlib.md5(str(seed).encode()).digest(); i = 0
    while True:
        for b in h: yield b / 255.0
        i += 1; h = hashlib.md5(h + bytes([i & 255])).digest()

def newtile():
    return Image.new('RGBA', (T, T), (0, 0, 0, 255))

def fill(px, c):
    for y in range(T):
        for x in range(T): px[x, y] = c

# ── material painters ─────────────────────────────────────────────────────────
def brick(px, s):
    sh, mid, hi = RAMP['brick']; mortar = RAMP['stone'][0]
    fill(px, mid)
    g = rng(s)
    for y in range(T):
        course = y // 4
        for x in range(T):
            if y % 4 == 3: px[x, y] = mortar; continue        # horizontal mortar
            off = 0 if course % 2 == 0 else 4                  # running bond
            if (x + off) % 8 == 7: px[x, y] = mortar           # vertical mortar
            elif y % 4 == 0: px[x, y] = hi                     # top highlight row
            elif next(g) < .12: px[x, y] = sh                  # subtle wear
    return 0x00, 1

def roof(px, s):
    sh, mid, hi = RAMP['roof']
    fill(px, mid)
    for y in range(T):
        row = y // 4
        for x in range(T):
            off = 0 if row % 2 == 0 else 4
            scallop = (x + off) % 8
            if y % 4 == 0: px[x, y] = hi                       # shingle top edge
            elif y % 4 == 3: px[x, y] = sh                     # shadow under shingle
            if scallop == 7: px[x, y] = OUT                    # shingle seam
    return 0x00, 1

def wall_window(px, s):
    brick(px, s)
    sh, mid, hi = RAMP['glass']
    for y in range(4, 12):                                     # window pane
        for x in range(4, 12):
            px[x, y] = hi if (x < 8 and y < 8) else mid        # light from top-left
    for i in range(3, 13):                                     # frame
        px[i, 3] = OUT; px[i, 12] = OUT; px[3, i] = OUT; px[12, i] = OUT
    for i in range(4, 12):
        px[8, i] = RAMP['wood'][0]; px[i, 8] = RAMP['wood'][0] # muntins
    return 0x00, 1

def door(px, s):
    sh, mid, hi = RAMP['wood']
    brick(px, s)
    for y in range(2, T):                                      # door slab
        for x in range(4, 12):
            px[x, y] = mid
            if x in (4, 11) or y == 2: px[x, y] = OUT
            elif x == 5 or y == 3: px[x, y] = hi
            elif (y - 2) % 4 == 0: px[x, y] = sh               # plank lines
    px[10, 8] = (220, 200, 120)                                # knob
    return 0x00, 1

def cobble(px, s):
    sh, mid, hi = RAMP['stone']
    fill(px, mid); g = rng(s)
    for cy in range(0, T, 4):
        for cx in range(0, T, 4):
            jx = int(next(g) * 2); jy = int(next(g) * 2)
            for y in range(cy, min(cy + 3, T)):
                for x in range(cx, min(cx + 3, T)):
                    px[x, y] = hi if (x == cx + jx and y == cy + jy) else mid
            for x in range(cx, min(cx + 4, T)):                # grout
                if cy + 3 < T: px[x, cy + 3] = sh
            for y in range(cy, min(cy + 4, T)):
                if cx + 3 < T: px[cx + 3, y] = sh
    return 0x00, 0

def grass(px, s):
    sh, mid, hi = RAMP['grass']; fill(px, mid); g = rng(s)
    for y in range(T):
        for x in range(T):
            r = next(g)
            if r < .10: px[x, y] = hi
            elif r < .18: px[x, y] = sh
    return 0x00, 0

def grass_dirt_edge(px, s):
    """grass on top, dirt below, with a ragged transition — a real edge tile."""
    grass(px, s)
    sh, mid, hi = RAMP['dirt']; g = rng(s + 1)
    for x in range(T):
        edge = 8 + int(next(g) * 3) - 1                        # wobble the seam
        for y in range(edge, T):
            r = next(g)
            px[x, y] = hi if r < .12 else (sh if r < .24 else mid)
    return 0x00, 0

def water_shore(px, s):
    """water bottom, sand/stone shore on top — directional shoreline tile."""
    sh, mid, hi = RAMP['water']; fill(px, mid); g = rng(s)
    for y in range(T):
        for x in range(T):
            if y % 5 == 2 and next(g) < .5: px[x, y] = hi      # ripple
            elif next(g) < .08: px[x, y] = sh
    ssh, smid, shi = RAMP['stone']
    for x in range(T):
        h = 4 + int(next(g) * 3)
        for y in range(0, h):
            px[x, y] = shi if y < h - 2 else smid
        px[x, h] = OUT                                         # waterline
    return 0x10, 1

def fence(px, s):
    grass(px, s)
    sh, mid, hi = RAMP['wood']
    for x in (3, 8, 13):                                       # posts
        for y in range(2, T):
            px[x, y] = mid; px[x - 1, y] = sh; px[x + 1, y] = hi
    for y in (5, 10):                                          # rails
        for x in range(T): px[x, y] = mid; px[x, y + 1] = sh
    return 0x00, 1

def signpost(px, s):
    grass(px, s)
    sh, mid, hi = RAMP['wood']
    for y in range(8, T): px[8, y] = mid; px[7, y] = sh        # post
    for y in range(3, 8):                                      # board
        for x in range(3, 14):
            px[x, y] = mid
            if x in (3, 13) or y in (3, 7): px[x, y] = OUT
            elif y == 4: px[x, y] = hi
    for x in range(5, 12): px[x, 5] = RAMP['glass'][2]         # faux text line
    return 0x00, 1

def tree_top(px, s):
    sh, mid, hi = RAMP['grass']; g = rng(s)
    fill(px, (0, 0, 0, 0))
    for y in range(T):
        for x in range(T):
            if (x - 8) ** 2 + (y - 9) ** 2 <= 56:
                r = next(g)
                px[x, y] = hi if (x < 8 and y < 8) else (sh if r < .3 else mid)
                if (x - 8) ** 2 + (y - 9) ** 2 >= 46: px[x, y] = OUT
    return 0x00, 1

def tree_bottom(px, s):
    fill(px, (0, 0, 0, 0))
    sh, mid, hi = RAMP['wood']; gsh, gmid, ghi = RAMP['grass']
    for y in range(0, 6):                                      # crown underside
        for x in range(3, 13):
            if (x - 8) ** 2 + (y + 1) ** 2 <= 56: px[x, y] = gsh
    for y in range(4, T):                                      # trunk
        for x in range(6, 10):
            px[x, y] = mid
            if x == 6: px[x, y] = sh
            elif x == 9: px[x, y] = OUT
            elif x == 7: px[x, y] = hi
    return 0x00, 1

def rune_floor(px, s):
    sh, mid, hi = RAMP['stone']; cobble(px, s)
    glow = (180, 90, 220)
    for i in range(4, 12): px[i, 8] = glow; px[8, i] = glow
    px[8, 8] = (236, 160, 255)
    for d in range(-3, 4):                                     # diagonal accents
        px[8 + d, 8 + d] = glow; px[8 + d, 8 - d] = glow
    return 0x00, 0

TILES = [
    ('grass',          grass),
    ('grass_dirt_edge',grass_dirt_edge),
    ('cobble',         cobble),
    ('brick_wall',     brick),
    ('wall_window',    wall_window),
    ('door',           door),
    ('roof',           roof),
    ('water_shore',    water_shore),
    ('fence',          fence),
    ('signpost',       signpost),
    ('tree_top',       tree_top),
    ('tree_bottom',    tree_bottom),
    ('rune_floor',     rune_floor),
]

def build(name='awakened_town'):
    n = len(TILES); rows = (n + PER_ROW - 1) // PER_ROW
    sheet = Image.new('RGBA', (PER_ROW * T, rows * T), (0, 0, 0, 0))
    beh, col = [], []
    for i, (label, fn) in enumerate(TILES):
        t = newtile(); b, c = fn(t.load(), i * 1000 + 13)
        beh.append(b); col.append(c)
        sheet.paste(t, ((i % PER_ROW) * T, (i // PER_ROW) * T))
    os.makedirs(TS_DIR, exist_ok=True)
    sheet.save(os.path.join(TS_DIR, name + '.png'))
    json.dump({'total_metatiles': n, 'primary_count': n, 'secondary_count': 0,
               'metatiles_per_row': PER_ROW, 'labels': [t[0] for t in TILES],
               'behaviors': beh, 'collisions': col},
              open(os.path.join(TS_DIR, name + '.json'), 'w'))
    print(f'wrote {name}.png ({sheet.size[0]}x{sheet.size[1]}) + .json, {n} tiles')

if __name__ == '__main__':
    import sys
    build(sys.argv[1] if len(sys.argv) > 1 else 'awakened_town')
