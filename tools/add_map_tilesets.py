#!/usr/bin/env python3
"""
add_map_tilesets.py — Inject a tileset field into Johto and Sinnoh map JSONs.

For Sinnoh: uses source/pokeplatinum/res/field/area_data/ + map_headers.txt
to map header index → area_data index → texture_set index → sinnoh_NNN.
Where the link is unknown, falls back to pattern matching on map name.

For Johto/HeartGold: pattern-based assignment using map name keywords.

Writes updated JSONs back in place.
"""

import json
import os
import re

REPO_ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_MAPS   = os.path.join(REPO_ROOT, 'data', 'maps')
PLAT_RES    = os.path.join(REPO_ROOT, 'source', 'pokeplatinum', 'res', 'field')

# ---------------------------------------------------------------------------
# Sinnoh: build header_name → texture_set_index using map_headers.txt +
#         area_data JSON files.
#
# The map_headers.txt lists 596 map header names (one per line).
# The area_data files in res/field/area_data/ are numbered 000-074 (75 entries).
# Unfortunately the index mapping between them isn't encoded in the JSON files —
# it's baked into the C source. We use a name-similarity heuristic: normalise
# both the header name and the sinnoh map JSON id, then match.
# ---------------------------------------------------------------------------

def _normalise(s):
    """Lowercase, strip MAP_HEADER_ prefix, replace non-alnum with space."""
    s = s.upper().replace('MAP_HEADER_', '')
    return re.sub(r'[^A-Z0-9]+', ' ', s).strip()


def build_sinnoh_tileset_map():
    """Return dict: sinnoh map JSON id → sinnoh_NNN tileset name."""
    # Load area_data → texture_set mapping (area_data_000 → 'map_texture_set_000')
    area_dir = os.path.join(PLAT_RES, 'area_data')
    area_to_tex = {}   # int index → 'sinnoh_NNN'
    if os.path.isdir(area_dir):
        for fname in sorted(os.listdir(area_dir)):
            if not fname.endswith('.json'): continue
            idx = int(fname.replace('area_data_', '').replace('.json', ''))
            d = json.load(open(os.path.join(area_dir, fname)))
            tex = d.get('mapTextureSet', '')
            if tex.startswith('map_texture_set_'):
                tex_idx = int(tex.replace('map_texture_set_', ''))
                area_to_tex[idx] = f'sinnoh_{tex_idx:03d}'

    # area_data has 75 entries (000-074). Use them in order as a lookup table
    # for the first 75 map headers in map_headers.txt (heuristic — known to be
    # roughly correct for Platinum's primary areas).
    headers_path = os.path.join(REPO_ROOT, 'source', 'pokeplatinum',
                                'generated', 'map_headers.txt')
    header_to_tileset = {}
    if os.path.isfile(headers_path):
        headers = open(headers_path).read().splitlines()
        for i, h in enumerate(headers):
            if i in area_to_tex:
                header_to_tileset[_normalise(h)] = area_to_tex[i]

    # Now map each sinnoh map JSON id to a tileset via header name matching
    sinnoh_dir = os.path.join(DATA_MAPS, 'sinnoh')
    result = {}
    if not os.path.isdir(sinnoh_dir):
        return result

    for fname in os.listdir(sinnoh_dir):
        if not fname.endswith('.json'): continue
        d = json.load(open(os.path.join(sinnoh_dir, fname)))
        map_id = d.get('id', fname[:-5])
        norm = _normalise(map_id)
        tileset = header_to_tileset.get(norm)
        if tileset:
            result[map_id] = tileset
        else:
            # Pattern-based fallback
            result[map_id] = _sinnoh_fallback(map_id)

    return result


def _sinnoh_fallback(map_id):
    """Assign a plausible sinnoh_NNN based on map name keywords."""
    n = map_id.lower()
    if any(k in n for k in ('cave','tunnel','ruins','underground','mine')):
        return 'sinnoh_048'   # set 048 has cave-like textures
    if any(k in n for k in ('pokemon_center','pokecenter','mart','shop','gym')):
        return 'sinnoh_022'   # indoor building set
    if any(k in n for k in ('route','lakefront','meadow','forest','marsh','wetlands')):
        return 'sinnoh_005'   # outdoor route (largest set, 85 tiles)
    if any(k in n for k in ('lake','acuity','valor','verity')):
        return 'sinnoh_010'
    if any(k in n for k in ('snowpoint','blizzard','snowfall')):
        return 'sinnoh_016'
    if any(k in n for k in ('city','town','village')):
        return 'sinnoh_006'
    return 'sinnoh_005'       # default: main outdoor set


# ---------------------------------------------------------------------------
# Johto: pattern-based tileset assignment
# ---------------------------------------------------------------------------

def _johto_tileset(map_id):
    """Assign a johto_NNN tileset based on map name keywords."""
    n = map_id.lower()
    if any(k in n for k in ('cave','tunnel','ruins','ice','darkened','dark')):
        return 'johto_089'   # cave model (7 tiles)
    if any(k in n for k in ('gym','elite','champion','kanto','olivine','ecruteak',
                             'morty','jasmine','clair','chuck','bugsy','pryce',
                             'falkner','whitney')):
        return 'johto_035'   # gym-style (5 tiles)
    if any(k in n for k in ('pokemon_center','pokecenter','mart','shop','house',
                             'gate','lab','tower','lighthouse','bell')):
        return 'johto_019'   # indoor building (4 tiles)
    if any(k in n for k in ('route','road','path','forest','national')):
        return 'johto_123'   # outdoor route (21 tiles — largest)
    if any(k in n for k in ('town','city','village','new_bark','palette',
                             'pallet','violet','azalea','goldenrod','ecruteak',
                             'olivine','cianwood','mahogany','blackthorn')):
        return 'johto_187'   # town exterior (21 tiles)
    if any(k in n for k in ('water','whirl','sea','ocean','lake','surf')):
        return 'johto_255'   # water route (9 tiles)
    return 'johto_187'       # default: town exterior


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def patch_region(region_dir, get_tileset_fn, label):
    if not os.path.isdir(region_dir):
        print(f'  [SKIP] {region_dir} not found')
        return 0

    updated = 0
    for fname in sorted(os.listdir(region_dir)):
        if not fname.endswith('.json'): continue
        fpath = os.path.join(region_dir, fname)
        d = json.load(open(fpath, encoding='utf-8'))
        if d.get('tileset'):
            continue   # already set
        map_id  = d.get('id', fname[:-5])
        tileset = get_tileset_fn(map_id)
        if tileset:
            d['tileset'] = tileset
            with open(fpath, 'w', encoding='utf-8') as f:
                json.dump(d, f, separators=(',', ':'))
            updated += 1

    print(f'  [{label}] Updated {updated} map files with tileset field.')
    return updated


if __name__ == '__main__':
    print('Building Sinnoh tileset map...')
    sinnoh_map = build_sinnoh_tileset_map()
    def sinnoh_fn(map_id):
        return sinnoh_map.get(map_id) or _sinnoh_fallback(map_id)

    patch_region(os.path.join(DATA_MAPS, 'sinnoh'), sinnoh_fn, 'sinnoh')
    patch_region(os.path.join(DATA_MAPS, 'heartgold'), _johto_tileset, 'johto/heartgold')
    print('Done.')
