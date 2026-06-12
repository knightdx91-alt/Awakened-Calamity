#!/usr/bin/env python3
"""CORRECT autotile re-import of the CC0 forest set using its Godot .tres data.

The forest pack ships a Godot TileSet (.tres) that records, per tile, the terrain
on each of its 8 sides/corners (Godot "terrains_peering_bit"). Terrain ids seen:
1 = grass (base), 0 = dirt, 2 = water. We use this ground-truth to build proper
8-direction (corners+sides) Wang autotiling with the artist's REAL edge tiles
(crisp, including inner corners) — replacing the procedurally-blurred oga_terrain.

Output:
  data/tilesets/forest_terrain.png        — base grass + dirt + water edge tiles
  data/tilesets/forest_terrain.json       — behaviors/collisions
  data/tilesets/forest_terrain.autotile.json — scheme 'wang8_lut': per terrain a
        256-entry table mapping an 8-neighbour mask -> absolute metatile index.

License: source art CC0 (inkBubi). Derived set remains CC0.
"""
import json, os, re
from PIL import Image

SRC = "/tmp/forest/texture only/Forest Tileset - Free"
TRES = "/tmp/forest/forest-tileset-free-godot/Forest Tileset - Free/forest_tileset_free.tres"
TS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'tilesets')
NAME = 'forest_terrain'
T = 16

# 8-direction bit order (matches the editor's neighbour scan)
DIRS = ['top_side','top_right_corner','right_side','bottom_right_corner',
        'bottom_side','bottom_left_corner','left_side','top_left_corner']
BIT = {d: i for i, d in enumerate(DIRS)}
GRASS = 1  # base terrain id

def parse_tres():
    """-> {sheet_filename: {(col,row): {dir: terrain_id, ...}}}"""
    ext = {}     # ExtResource id -> filename
    sheets = {}  # filename -> {(c,r): {dir:val}}
    cur_file = None
    with open(TRES) as fh:
        for line in fh:
            line = line.strip()
            m = re.match(r'\[ext_resource .*path="res://.*/([^/"]+\.png)".*id="([^"]+)"', line)
            if m:
                ext[m.group(2)] = m.group(1); continue
            m = re.match(r'texture = ExtResource\("([^"]+)"\)', line)
            if m:
                cur_file = ext.get(m.group(1)); sheets.setdefault(cur_file, {}); continue
            m = re.match(r'(\d+):(\d+)/0/terrains_peering_bit/([a-z_]+) = (\d+)', line)
            if m and cur_file:
                c, r, d, v = int(m[1]), int(m[2]), m[3], int(m[4])
                sheets[cur_file].setdefault((c, r), {})[d] = v
    return sheets

def feature_mask(peer, feature):
    """8-bit mask: bit set where that direction's terrain == feature."""
    mask = 0
    for d, i in BIT.items():
        if peer.get(d, GRASS) == feature:
            mask |= (1 << i)
    return mask

def collect(sheets, sheet_file, feature):
    """Return list of (PIL tile, mask) for tiles whose peering involves feature."""
    im = Image.open(os.path.join(SRC, sheet_file)).convert('RGBA')
    out = []
    for (c, r), peer in sheets.get(sheet_file, {}).items():
        # skip all-grass tiles in transition sheets (no feature present)
        vals = set(peer.values())
        if feature not in vals and not all(v == feature for v in vals):
            # tile has no feature on any side -> it's plain grass; skip (base handles it)
            if feature not in vals:
                continue
        tile = im.crop((c*T, r*T, c*T+T, r*T+T))
        out.append((tile, feature_mask(peer, feature)))
    return out

def best_lut(cands):
    """256-entry LUT: for every neighbour mask, the local candidate index whose
    recorded mask best matches (sides weighted 2, corners 1)."""
    SIDE_BITS = {BIT['top_side'],BIT['right_side'],BIT['bottom_side'],BIT['left_side']}
    def dist(a, b):
        s = 0
        for i in range(8):
            if ((a>>i)&1) != ((b>>i)&1):
                s += 2 if i in SIDE_BITS else 1
        return s
    lut = []
    masks = [m for _, m in cands]
    for want in range(256):
        best, bi = 1e9, 0
        for ci, cm in enumerate(masks):
            d = dist(cm, want)
            if d < best: best, bi = d, ci
        lut.append(bi)
    return lut

def build():
    sheets = parse_tres()
    terrains_spec = [('dirt', 'grass_dirt.png', 0, 0x00, 0),
                     ('water','grass_deep_water.png', 2, 0x10, 1)]
    tiles, behaviors, collisions = [], [], []
    cfg = {'tile': T, 'per_row': 16, 'scheme': 'wang8_lut', 'terrains': {}, 'fills': {}}

    # base grass tile (an all-grass tile from grass.png)
    grass_im = Image.open(os.path.join(SRC, 'grass.png')).convert('RGBA')
    tiles.append(grass_im.crop((0,0,T,T)))
    behaviors.append(0); collisions.append(0)
    cfg['fills']['grass'] = 0

    for tname, sheet_file, feature, beh, col in terrains_spec:
        cands = collect(sheets, sheet_file, feature)
        local_lut = best_lut(cands)
        start = len(tiles)
        for tile, _mask in cands:
            tiles.append(tile); behaviors.append(beh); collisions.append(col)
        # convert local candidate indices -> absolute metatile indices
        abs_lut = [start + li for li in local_lut]
        cfg['terrains'][tname] = {'lut': abs_lut, 'behavior': beh, 'collision': col,
                                  'count': len(cands)}

    n = len(tiles); PR = 16; rows = (n + PR - 1)//PR
    sheet = Image.new('RGBA', (PR*T, rows*T), (0,0,0,0))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i%PR)*T, (i//PR)*T))
    os.makedirs(TS_DIR, exist_ok=True)
    sheet.save(os.path.join(TS_DIR, NAME + '.png'))
    json.dump({'total_metatiles': n, 'primary_count': n, 'secondary_count': 0,
               'metatiles_per_row': PR, 'behaviors': behaviors, 'collisions': collisions},
              open(os.path.join(TS_DIR, NAME + '.json'), 'w'))
    json.dump(cfg, open(os.path.join(TS_DIR, NAME + '.autotile.json'), 'w'))
    with open(os.path.join(TS_DIR, NAME + '.LICENSE.txt'), 'w') as fh:
        fh.write("forest_terrain — correct 8-dir Wang autotile built from the CC0\n"
                 "'Seasons of Forest (free sample)' by inkBubi, using the pack's\n"
                 "Godot .tres terrain data. License CC0 (public domain).\n")
    print(f"wrote {NAME}: {n} tiles; "
          + ", ".join(f"{k}={v['count']} edge tiles" for k,v in cfg['terrains'].items()))

if __name__ == '__main__':
    build()
