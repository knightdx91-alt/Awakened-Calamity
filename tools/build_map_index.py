#!/usr/bin/env python3
"""
build_map_index.py — Build MAP_CONST → filename lookup tables for all regions.

Outputs:
  data/maps/kanto_index.json
  data/maps/hoenn_index.json
  data/maps/heartgold_index.json
  data/maps/sinnoh_index.json
"""

import json
import os

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_MAPS = os.path.join(REPO_ROOT, 'data', 'maps')


def build_index(region_dir, out_path):
    index = {}
    if not os.path.isdir(region_dir):
        print(f'  [SKIP] {region_dir} not found')
        return 0

    for fname in sorted(os.listdir(region_dir)):
        if not fname.endswith('.json'):
            continue
        fpath = os.path.join(region_dir, fname)
        try:
            with open(fpath, encoding='utf-8') as f:
                data = json.load(f)
            map_id   = data.get('id') or fname[:-5]
            map_name = data.get('name') or fname[:-5]
            index[map_id] = map_name
            # Also index by filename stem so lookups by bare name work
            stem = fname[:-5]
            if stem != map_id:
                index[stem] = map_name
        except Exception as e:
            print(f'  [WARN] {fname}: {e}')

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2, sort_keys=True)
    return len(index)


if __name__ == '__main__':
    regions = [
        ('kanto',     'kanto',     'kanto_index.json'),
        ('hoenn',     'hoenn',     'hoenn_index.json'),
        ('heartgold', 'heartgold', 'heartgold_index.json'),
        ('sinnoh',    'sinnoh',    'sinnoh_index.json'),
    ]

    total = 0
    for label, dir_name, out_name in regions:
        region_dir = os.path.join(DATA_MAPS, dir_name)
        out_path   = os.path.join(DATA_MAPS, out_name)
        n = build_index(region_dir, out_path)
        print(f'[{label}] {n} entries → {out_name}')
        total += n

    print(f'\nTotal: {total} index entries across all regions.')
