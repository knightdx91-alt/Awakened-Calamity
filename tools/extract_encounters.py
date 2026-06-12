"""
Extract wild encounter tables from all decomp repos into JSON.
Usage: python3 tools/extract_encounters.py
Output: data/encounters/kanto.json, data/encounters/hoenn.json, data/encounters/sinnoh/
"""

import json
import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DIR = os.path.join(REPO_ROOT, "source")
OUT_DIR = os.path.join(REPO_ROOT, "data", "encounters")


def find_encounter_file(repo_name):
    candidates = [
        os.path.join(SOURCE_DIR, repo_name, "src", "data", "wild_encounters.json"),
        os.path.join(SOURCE_DIR, repo_name, "src", "data", "wild_encounter.json"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path

    for root, dirs, files in os.walk(os.path.join(SOURCE_DIR, repo_name, "src")):
        for f in files:
            if "wild_encounter" in f and f.endswith(".json"):
                return os.path.join(root, f)
    return None


def extract_gba_encounters(repo_name, region):
    path = find_encounter_file(repo_name)
    if not path:
        print(f"[{repo_name}] No wild encounter JSON found.", file=sys.stderr)
        return

    with open(path) as f:
        raw = json.load(f)

    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, f"{region}.json")
    with open(out_path, "w") as f:
        json.dump(raw, f, indent=2)

    map_count = len(raw.get("wild_encounter_groups", [{}])[0].get("encounters", []))
    print(f"[{repo_name}] Extracted encounters for {map_count} maps → data/encounters/{region}.json")


def extract_platinum_encounters():
    """
    Platinum stores one encounters_<mapname>.json per map in res/field/encounters/.
    Extract each into data/encounters/sinnoh/ and also build a combined index.
    """
    enc_dir = os.path.join(SOURCE_DIR, "pokeplatinum", "res", "field", "encounters")
    out_dir = os.path.join(OUT_DIR, "sinnoh")
    os.makedirs(out_dir, exist_ok=True)

    if not os.path.isdir(enc_dir):
        print(f"[pokeplatinum] encounters dir not found: {enc_dir}", file=sys.stderr)
        return

    combined = {}
    count = 0

    for filename in sorted(os.listdir(enc_dir)):
        if not filename.endswith(".json"):
            continue

        map_name = filename.replace("encounters_", "").replace(".json", "")

        with open(os.path.join(enc_dir, filename)) as f:
            raw = json.load(f)

        unified = {
            "map": map_name,
            "region": "sinnoh",
            "land_rate": raw.get("land_rate", 0),
            "land": raw.get("land_encounters", []),
            "surf_rate": raw.get("surf_rate", 0),
            "surf": raw.get("surf_encounters", []),
            "old_rod_rate": raw.get("old_rod_rate", 0),
            "old_rod": raw.get("old_rod_encounters", []),
            "good_rod_rate": raw.get("good_rod_rate", 0),
            "good_rod": raw.get("good_rod_encounters", []),
            "super_rod_rate": raw.get("super_rod_rate", 0),
            "super_rod": raw.get("super_rod_encounters", []),
            "swarms": raw.get("swarms", []),
            "day": raw.get("day", []),
            "night": raw.get("night", []),
            "radar": raw.get("radar", []),
        }

        out_path = os.path.join(out_dir, f"{map_name}.json")
        with open(out_path, "w") as f:
            json.dump(unified, f, indent=2)

        combined[map_name] = unified
        count += 1

    # Write combined index for easy lookup
    with open(os.path.join(OUT_DIR, "sinnoh.json"), "w") as f:
        json.dump(combined, f, indent=2)

    print(f"[pokeplatinum] Extracted encounters for {count} maps → data/encounters/sinnoh/")


def extract_heartgold_encounters():
    """
    HeartGold stores all encounters in a single gs_enc_data.json.
    Splits it into per-map files under data/encounters/johto/ and writes a combined index.
    Includes morning/day/night time-of-day variations per the HGSS encounter system.
    """
    src_path = os.path.join(
        SOURCE_DIR, "pokeheartgold", "files", "fielddata", "encountdata", "gs_enc_data.json"
    )
    out_dir = os.path.join(OUT_DIR, "johto")
    os.makedirs(out_dir, exist_ok=True)

    if not os.path.isfile(src_path):
        print(f"[pokeheartgold] gs_enc_data.json not found: {src_path}", file=sys.stderr)
        return

    with open(src_path) as f:
        raw = json.load(f)

    combined = {}
    count = 0

    for entry in raw.get("encounters", []):
        map_name = entry.get("map")
        if not map_name:
            continue

        unified = {
            "map": map_name,
            "region": "johto",
            "land": entry.get("land", {}),
            "surf": entry.get("surf", {}),
            "rock_smash": entry.get("rock_smash", {}),
            "fishing": entry.get("fishing", {}),
            "headbutt": entry.get("headbutt", {}),
        }

        out_path = os.path.join(out_dir, f"{map_name}.json")
        with open(out_path, "w") as f:
            json.dump(unified, f, indent=2)

        combined[map_name] = unified
        count += 1

    with open(os.path.join(OUT_DIR, "johto.json"), "w") as f:
        json.dump(combined, f, indent=2)

    print(f"[pokeheartgold] Extracted encounters for {count} maps → data/encounters/johto/")


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    extract_gba_encounters("pokefirered", "kanto")
    extract_gba_encounters("pokeemerald", "hoenn")
    extract_heartgold_encounters()
    extract_platinum_encounters()
