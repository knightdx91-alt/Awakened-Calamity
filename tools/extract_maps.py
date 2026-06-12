"""
Extract map data from all decomp repos into unified JSON.
Usage: python3 tools/extract_maps.py
Output: data/maps/kanto/, data/maps/hoenn/, data/maps/heartgold/, data/maps/sinnoh/
"""

import json
import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DIR = os.path.join(REPO_ROOT, "source")
DATA_DIR = os.path.join(REPO_ROOT, "data", "maps")


def extract_gba_maps(repo_name, region):
    maps_dir = os.path.join(SOURCE_DIR, repo_name, "data", "maps")
    out_dir = os.path.join(DATA_DIR, region)
    os.makedirs(out_dir, exist_ok=True)

    if not os.path.isdir(maps_dir):
        print(f"[{repo_name}] maps dir not found: {maps_dir}", file=sys.stderr)
        return 0

    count = 0
    for map_name in sorted(os.listdir(maps_dir)):
        map_json_path = os.path.join(maps_dir, map_name, "map.json")
        if not os.path.isfile(map_json_path):
            continue

        with open(map_json_path) as f:
            raw = json.load(f)

        unified = {
            "id": raw.get("id"),
            "name": raw.get("name"),
            "region": region,
            "layout": raw.get("layout"),
            "music": raw.get("music"),
            "weather": raw.get("weather"),
            "map_type": raw.get("map_type"),
            "allow_running": raw.get("allow_running", False),
            "allow_cycling": raw.get("allow_cycling", False),
            "show_map_name": raw.get("show_map_name", False),
            "connections": raw.get("connections", []),
            "npcs": [
                {
                    "local_id": e.get("local_id"),
                    "graphics_id": e.get("graphics_id"),
                    "x": e.get("x"),
                    "y": e.get("y"),
                    "movement_type": e.get("movement_type"),
                    "trainer_type": e.get("trainer_type"),
                    "script": e.get("script"),
                    "flag": e.get("flag"),
                }
                for e in raw.get("object_events", [])
            ],
            "warps": [
                {
                    "x": w.get("x"),
                    "y": w.get("y"),
                    "dest_map": w.get("dest_map"),
                    "dest_warp_id": w.get("dest_warp_id"),
                }
                for w in raw.get("warp_events", [])
            ],
            "triggers": [
                {
                    "x": e.get("x"),
                    "y": e.get("y"),
                    "var": e.get("var"),
                    "var_value": e.get("var_value"),
                    "script": e.get("script"),
                }
                for e in raw.get("coord_events", [])
                if e.get("type") == "trigger"
            ],
            "signs": [
                {
                    "x": e.get("x"),
                    "y": e.get("y"),
                    "script": e.get("script"),
                }
                for e in raw.get("bg_events", [])
                if e.get("type") == "sign"
            ],
        }

        out_path = os.path.join(out_dir, f"{map_name}.json")
        with open(out_path, "w") as f:
            json.dump(unified, f, indent=2)
        count += 1

    print(f"[{repo_name}] Extracted {count} maps → data/maps/{region}/")
    return count


def extract_hgss_maps():
    """Extract HeartGold/SoulSilver zone event data into unified format."""
    zone_dir = os.path.join(
        SOURCE_DIR, "pokeheartgold", "files", "fielddata", "eventdata", "zone_event"
    )
    out_dir = os.path.join(DATA_DIR, "heartgold")
    os.makedirs(out_dir, exist_ok=True)

    if not os.path.isdir(zone_dir):
        print(f"[pokeheartgold] zone_event dir not found: {zone_dir}", file=sys.stderr)
        return 0

    count = 0
    for filename in sorted(os.listdir(zone_dir)):
        if not filename.endswith(".json"):
            continue

        zone_id = filename.replace(".json", "")
        with open(os.path.join(zone_dir, filename)) as f:
            raw = json.load(f)

        unified = {
            "id": zone_id,
            "region": "johto",
            "source": "heartgold",
            "script_header": raw.get("header"),
            "warps": [
                {
                    "x": w.get("x"),
                    "y": w.get("y"),
                    "z": w.get("z"),
                    "dest_map": w.get("header"),
                    "dest_anchor": w.get("anchor"),
                }
                for w in raw.get("warps", [])
            ],
            "signs": [
                {
                    "x": b.get("x"),
                    "y": b.get("y"),
                    "z": b.get("z"),
                    "script_id": b.get("scriptId"),
                    "type": b.get("type"),
                }
                for b in raw.get("bgs", [])
            ],
        }

        out_path = os.path.join(out_dir, f"{zone_id}.json")
        with open(out_path, "w") as f:
            json.dump(unified, f, indent=2)
        count += 1

    print(f"[pokeheartgold] Extracted {count} zones → data/maps/heartgold/")
    return count


def extract_platinum_maps():
    """
    Extract Platinum event data (NPCs, warps, signs) into unified format.
    Each events_<mapname>.json in res/field/events/ becomes one output file.
    Encounters are handled separately by extract_encounters.py.
    """
    events_dir = os.path.join(SOURCE_DIR, "pokeplatinum", "res", "field", "events")
    out_dir = os.path.join(DATA_DIR, "sinnoh")
    os.makedirs(out_dir, exist_ok=True)

    if not os.path.isdir(events_dir):
        print(f"[pokeplatinum] events dir not found: {events_dir}", file=sys.stderr)
        return 0

    count = 0
    for filename in sorted(os.listdir(events_dir)):
        if not filename.endswith(".json"):
            continue

        # Strip leading "events_" prefix for the map name
        map_name = filename.replace("events_", "").replace(".json", "")

        with open(os.path.join(events_dir, filename)) as f:
            raw = json.load(f)

        unified = {
            "id": map_name,
            "name": map_name.replace("_", " ").title(),
            "region": "sinnoh",
            "source": "platinum",
            "npcs": [
                {
                    "local_id": e.get("id"),
                    "graphics_id": e.get("graphics_id"),
                    "x": e.get("x"),
                    "y": e.get("y"),
                    "z": e.get("z"),
                    "movement_type": e.get("movement_type"),
                    "trainer_type": e.get("trainer_type"),
                    "script": e.get("script"),
                    "hidden_flag": e.get("hidden_flag"),
                }
                for e in raw.get("object_events", [])
            ],
            "warps": [
                {
                    "x": w.get("x"),
                    "y": w.get("y"),
                    "z": w.get("z"),
                    "dest_map": w.get("dest_map"),
                    "dest_warp_id": w.get("dest_warp_id"),
                }
                for w in raw.get("warp_events", [])
            ],
            "signs": [
                {
                    "x": b.get("x"),
                    "y": b.get("y"),
                    "z": b.get("z"),
                    "script": b.get("script"),
                    "type": b.get("type"),
                    "player_facing_dir": b.get("player_facing_dir"),
                }
                for b in raw.get("bg_events", [])
            ],
            "coord_events": raw.get("coord_events", []),
        }

        out_path = os.path.join(out_dir, f"{map_name}.json")
        with open(out_path, "w") as f:
            json.dump(unified, f, indent=2)
        count += 1

    print(f"[pokeplatinum] Extracted {count} maps → data/maps/sinnoh/")
    return count


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)

    total = 0
    total += extract_gba_maps("pokefirered", "kanto")
    total += extract_gba_maps("pokeemerald", "hoenn")
    total += extract_hgss_maps()
    total += extract_platinum_maps()

    print(f"\nTotal: {total} map/zone files extracted.")
