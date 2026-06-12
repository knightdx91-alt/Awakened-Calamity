"""
Extract Pokémon base stats from pokeemerald species_info.h into JSON.
Usage: python3 tools/extract_pokemon.py
Output: data/pokemon/base_stats.json
"""

import json
import os
import re

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_FILE = os.path.join(
    REPO_ROOT, "source", "pokeemerald", "src", "data", "pokemon", "species_info.h"
)
OUT_DIR = os.path.join(REPO_ROOT, "data", "pokemon")
OUT_FILE = os.path.join(OUT_DIR, "base_stats.json")


def parse_species_info(path):
    with open(path) as f:
        content = f.read()

    # Find each [SPECIES_XXX] = { ... } block
    pattern = re.compile(
        r'\[SPECIES_(\w+)\]\s*=\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}',
        re.DOTALL
    )

    results = {}

    for match in pattern.finditer(content):
        species_name = match.group(1)
        if species_name == "NONE":
            continue

        block = match.group(2)

        def get_int(field):
            m = re.search(rf'\.{field}\s*=\s*(\d+)', block)
            return int(m.group(1)) if m else None

        def get_str(field):
            m = re.search(rf'\.{field}\s*=\s*(\w+)', block)
            return m.group(1) if m else None

        def get_list(field):
            m = re.search(rf'\.{field}\s*=\s*\{{([^}}]*)\}}', block)
            if not m:
                return []
            return [x.strip() for x in m.group(1).split(",") if x.strip()]

        results[species_name] = {
            "name": species_name.capitalize(),
            "base_hp": get_int("baseHP"),
            "base_attack": get_int("baseAttack"),
            "base_defense": get_int("baseDefense"),
            "base_speed": get_int("baseSpeed"),
            "base_sp_attack": get_int("baseSpAttack"),
            "base_sp_defense": get_int("baseSpDefense"),
            "catch_rate": get_int("catchRate"),
            "exp_yield": get_int("expYield"),
            "types": get_list("types"),
            "abilities": get_list("abilities"),
            "egg_groups": get_list("eggGroups"),
            "growth_rate": get_str("growthRate"),
            "gender_ratio": get_str("genderRatio"),
            "friendship": get_int("friendship"),
            "egg_cycles": get_int("eggCycles"),
        }

    return results


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)

    if not os.path.isfile(SOURCE_FILE):
        print(f"Source file not found: {SOURCE_FILE}")
        raise SystemExit(1)

    data = parse_species_info(SOURCE_FILE)
    with open(OUT_FILE, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Extracted {len(data)} Pokémon → data/pokemon/base_stats.json")
