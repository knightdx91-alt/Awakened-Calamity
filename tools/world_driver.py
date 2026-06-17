#!/usr/bin/env python3
"""world_driver — generate maps from the world data (data/world/<region>.json).

Looks a place up by name, maps its `archetype` to the right generator, derives a
deterministic seed from its id (same place → same map), and builds it. Use via:
  python3 tools/gen_map.py place "Hollow Vein"
  python3 tools/gen_map.py place all                 # whole catalogue
  python3 tools/gen_map.py place "Dawnhearth" --region verdara
The engine region all maps register under is each file's `engine_region`.
"""
import json, os, re, glob, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mapgen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORLD = os.path.join(ROOT, "data", "world")

def _norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower()).replace("the", "", 1) if s else ""

def camel(name):
    return "".join(w[:1].upper() + w[1:] for w in re.sub(r"[^A-Za-z0-9 ]", "", name).split())

def load_world():
    places = []
    for f in sorted(glob.glob(os.path.join(WORLD, "*.json"))):
        data = json.load(open(f))
        er = data.get("engine_region", "awakened")
        for p in data.get("places", []):
            p = dict(p); p["engine_region"] = er; p["_region"] = data.get("region")
            places.append(p)
    return places

def find_place(query, places):
    q = _norm(query)
    exact = [p for p in places if _norm(p["name"]) == q]
    if exact: return exact[0]
    part = [p for p in places if q and q in _norm(p["name"])]
    return part[0] if part else None

def _size(p, dw, dh):
    s = p.get("size")
    if s:
        w, h = s.lower().split("x"); return int(w), int(h)
    return dw, dh

def build_place(p, region=None, seed=None):
    region = region or p.get("engine_region", "awakened")
    seed = seed if seed is not None else (abs(hash(p["id"])) % 100000)
    arch = p.get("archetype", "town")
    name = camel(p["name"])
    tier = int(p.get("tier", 1) or 1); hazard = p.get("hazard", "")
    if arch == "town":
        w, h = _size(p, 50, 50)
        return mapgen.gen_town(name, w, h, seed, region,
                               houses=int(p.get("houses", 12)), keep=bool(p.get("keep", True)),
                               pond=(p.get("type") != "holdfast"))
    if arch == "route":
        w, h = _size(p, 64, 30)
        return mapgen.gen_route(name, w, h, seed, region)
    if arch == "forest":
        w, h = _size(p, 50, 50)
        return mapgen.gen_forest(name, w, h, seed, region)
    if arch in ("dungeon", "interior"):
        import mapgen_indoor
        if arch == "dungeon":
            w, h = _size(p, 44 + tier * 4, 44 + tier * 4)
            return mapgen_indoor.gen_dungeon(name, w, h, seed, region, tier=tier, hazard=hazard)
        w, h = _size(p, 26, 18)
        return mapgen_indoor.gen_interior(name, w, h, seed, region, tier=tier, hazard=hazard)
    if arch == "water":
        print(f"  ~ skip {p['name']} (archetype 'water' not implemented yet)")
        return None
    print(f"  ~ skip {p['name']} (unknown archetype {arch})")
    return None

def generate_place(query, region=None, seed=None):
    places = load_world()
    if query.strip().lower() == "all":
        made = []
        for p in places:
            mid = build_place(p, region, seed)
            if mid:
                made.append(mid); print("  +", mid)
        print(f"generated {len(made)} maps")
        return f"{len(made)} maps"
    p = find_place(query, places)
    if not p:
        names = ", ".join(sorted(x["name"] for x in places)[:12])
        raise SystemExit(f"No place matching '{query}'. Try one of: {names} …")
    return build_place(p, region, seed)

if __name__ == "__main__":
    generate_place(" ".join(sys.argv[1:]) or "all")
