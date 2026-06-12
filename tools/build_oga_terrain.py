#!/usr/bin/env python3
"""Build an AUTOTILE-ordered terrain tileset from the CC-BY-SA oga_rpg16 source
textures, plus an autotile config the engine/editor use.

We use a 4-bit EDGE-BLOB scheme (16 tiles per terrain). For a 'feature' terrain
(e.g. dirt) painted over a 'base' (e.g. grass), each cell's tile is chosen by a
mask of its 4 orthogonal neighbours that share the feature:
    bit 1 = North same, 2 = East same, 4 = South same, 8 = West same
Tiles are laid out in mask order 0..15. The fully-surrounded tile (mask 15) is
pure feature; mask 0 is an isolated feature dot. Sides whose neighbour is NOT
the feature get an irregular border of the base texture — yielding edges and
outer corners automatically.

Source art: '16x16 RPG Tileset' by hilau / George Bailey / bluecarrot16
(CC-BY-SA 3.0). Derived terrain set is likewise CC-BY-SA 3.0 (see LICENSE).
"""
import json, os, glob, hashlib
from PIL import Image

SRC = "/tmp/ts5/tilesets_edit"
TS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'tilesets')
NAME = 'oga_terrain'
T = 16
PER_ROW = 16

def load_tiles(fname):
    im = Image.open(os.path.join(SRC, fname)).convert('RGBA')
    w, h = im.size
    return im, w // T, h // T

def tile_at(im, tx, ty):
    return im.crop((tx*T, ty*T, tx*T+T, ty*T+T))

def uniformity(tile):
    px = tile.load(); vals=[]; r=g=b=n=0
    for y in range(T):
        for x in range(T):
            cr,cg,cb,ca = px[x,y]
            if ca < 200: return None  # want fully opaque fills
            r+=cr; g+=cg; b+=cb; n+=1; vals.append((cr,cg,cb))
    ar,ag,ab = r//n, g//n, b//n
    var = sum((vr-ar)**2+(vg-ag)**2+(vb-ab)**2 for vr,vg,vb in vals)/n
    return ar,ag,ab,var

def pick_fill(fname, want):
    """want(r,g,b)->score; return the most-uniform tile maximising want-var."""
    im, cols, rows = load_tiles(fname)
    best, bs = None, -1e18
    for ty in range(rows):
        for tx in range(cols):
            t = tile_at(im, tx, ty)
            u = uniformity(t)
            if u is None: continue
            r,g,b,var = u
            sc = want(r,g,b) - var*0.12
            if sc > bs: bs, best = sc, t.copy()
    return best

def rng(seed):
    h = hashlib.md5(str(seed).encode()).digest(); i=0
    while True:
        for v in h: yield v/255.0
        i+=1; h = hashlib.md5(h+bytes([i&255])).digest()

def make_blob(feature, base, terrain_seed):
    """Return list of 16 tiles in mask order (bit1 N,2 E,4 S,8 W = feature side)."""
    tiles = []
    for mask in range(16):
        t = feature.copy()
        fp = t.load(); bp = base.load()
        g = rng(terrain_seed*100 + mask)
        N = mask & 1; E = mask & 2; S = mask & 4; Wb = mask & 8
        BORD = 5
        for y in range(T):
            for x in range(T):
                # distance into each border, with wobble
                draw_base = False
                if not N and y < BORD + (1 if next(g) < .4 else 0):
                    if y <= BORD - (1 if next(g) < .5 else 0): draw_base = True
                if not S and y >= T-BORD - (1 if next(g) < .4 else 0):
                    if y >= T-BORD + (1 if next(g) < .5 else 0)-1: draw_base = True
                if not Wb and x < BORD + (1 if next(g) < .4 else 0):
                    if x <= BORD - (1 if next(g) < .5 else 0): draw_base = True
                if not E and x >= T-BORD - (1 if next(g) < .4 else 0):
                    if x >= T-BORD + (1 if next(g) < .5 else 0)-1: draw_base = True
                if draw_base:
                    fp[x,y] = bp[x,y]
        tiles.append(t)
    return tiles

def build():
    grass = pick_fill('1_terrain.png', lambda r,g,b: (g-r)+(g-b))          # green
    dirt  = pick_fill('10_dirt.png',   lambda r,g,b: (r+g)-b*1.4 if r>110 else -1e9)  # tan
    # water fill: try waterfall sheet then terrain; bluest uniform
    water = pick_fill('5_waterfall.png', lambda r,g,b: b*2-r-g)
    if water is None:
        water = pick_fill('1_terrain.png', lambda r,g,b: b*2-r-g)

    terrains = [
        ('grass_dirt',  dirt,  grass),   # paint dirt over grass
        ('grass_water', water, grass),   # paint water over grass
    ]
    all_tiles, cfg = [], {'tile': T, 'per_row': PER_ROW, 'terrains': {}, 'fills': {}}
    # also store plain fills at the end for the editor's base
    for ti, (tname, feat, base) in enumerate(terrains):
        start = len(all_tiles)
        blob = make_blob(feat, base, ti+1)
        all_tiles.extend(blob)
        cfg['terrains'][tname] = {
            'base_index': start,        # mask 0..15 occupy start..start+15
            'count': 16,
            'scheme': 'edge4',          # 4-bit orthogonal edge blob
            'fill_index': start + 15,   # mask 15 = solid feature
            'behavior': (0x10 if tname == 'grass_water' else 0x00),
            'collision': (1 if tname == 'grass_water' else 0),
        }
    # background/base fill tiles appended after the terrains
    base_grass_idx = len(all_tiles); all_tiles.append(grass.copy())
    cfg['fills']['grass'] = base_grass_idx

    n = len(all_tiles)
    rows = (n + PER_ROW - 1)//PER_ROW
    sheet = Image.new('RGBA', (PER_ROW*T, rows*T), (0,0,0,0))
    behaviors, collisions = [], []
    for i, t in enumerate(all_tiles):
        sheet.paste(t, ((i%PER_ROW)*T, (i//PER_ROW)*T))
        behaviors.append(0); collisions.append(0)
    # apply per-terrain behavior/collision to its 16 tiles
    for tname, info in cfg['terrains'].items():
        for k in range(info['count']):
            behaviors[info['base_index']+k] = info['behavior']
            collisions[info['base_index']+k] = info['collision']

    os.makedirs(TS_DIR, exist_ok=True)
    sheet.save(os.path.join(TS_DIR, NAME + '.png'))
    json.dump({'total_metatiles': n, 'primary_count': n, 'secondary_count': 0,
               'metatiles_per_row': PER_ROW, 'behaviors': behaviors,
               'collisions': collisions}, open(os.path.join(TS_DIR, NAME + '.json'), 'w'))
    json.dump(cfg, open(os.path.join(TS_DIR, NAME + '.autotile.json'), 'w'), indent=1)
    with open(os.path.join(TS_DIR, NAME + '.LICENSE.txt'), 'w') as fh:
        fh.write("oga_terrain — autotile terrain derived from 'oga_rpg16' textures.\n"
                 "Source art CC-BY-SA 3.0 (hilau / George Bailey / bluecarrot16),\n"
                 "https://opengameart.org/content/16x16-rpg-tileset . This derived\n"
                 "autotile set is likewise CC-BY-SA 3.0.\n")
    print(f"wrote {NAME}: {n} tiles, terrains={list(cfg['terrains'])}, "
          f"base_grass={base_grass_idx}")
    return cfg

if __name__ == '__main__':
    build()
