#!/usr/bin/env python3
"""Write data/tilesets/_index.json — a sorted list of available tileset names
(those having both a .json and .png), for the map editor's tileset picker."""
import json, os

TS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'tilesets')
names = []
for f in os.listdir(TS_DIR):
    if f.endswith('.json') and not f.startswith('_'):
        base = f[:-5]
        if os.path.exists(os.path.join(TS_DIR, base + '.png')):
            names.append(base)
names.sort()
out = os.path.join(TS_DIR, '_index.json')
with open(out, 'w') as fh:
    json.dump(names, fh)
print('wrote', out, 'with', len(names), 'tilesets')
