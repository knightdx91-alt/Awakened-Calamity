#!/usr/bin/env python3
"""Idempotent: add ONE RelicCache event to each run FLOOR map (not boss maps —
clearing the boss ends the run, wiping relics). Placed at a verified-walkable tile
with no existing event, far from the entrance. Mirrors the new generator output."""
import json, os, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def walkable_tiles(layout):
    w, h, coll = layout['width'], layout['height'], layout['collision']
    return [(i % w, i // w) for i, c in enumerate(coll) if not c]

added = 0
for f in sorted(glob.glob(os.path.join(ROOT, 'data', 'maps', 'awakened', 'RunFloor*.json'))):
    m = json.load(open(f))
    if any(e.get('name') == 'RelicCache' for e in m['events']):
        continue
    lp = os.path.join(ROOT, 'data', 'layouts', 'awakened', m['layout'] + '.json')
    layout = json.load(open(lp))
    occupied = {(e['x'], e['y']) for e in m['events']}
    walk = [t for t in walkable_tiles(layout) if t not in occupied]
    if not walk:
        print('  no free tile in', os.path.basename(f)); continue
    # pick a deterministic mid-map tile (median of walkables) for a sensible spot
    walk.sort(key=lambda t: (t[1], t[0]))
    x, y = walk[len(walk) // 2]
    nid = max((e['id'] for e in m['events']), default=0) + 1
    m['events'].append({
        "id": nid, "name": "RelicCache", "x": x, "y": y,
        "graphic": {"sprite": "Chest", "file": "rtp/Chest.png", "frame_w": 32, "frame_h": 32, "cols": 3, "rows": 4, "single": False},
        "dir": "down", "trigger": "action", "through": False, "behavior": None,
        "commands": [{"type": "relic", "count": 3}]})
    json.dump(m, open(f, 'w'))
    added += 1
    print('  +RelicCache @', x, y, 'in', os.path.basename(f))
print('floors updated:', added)
