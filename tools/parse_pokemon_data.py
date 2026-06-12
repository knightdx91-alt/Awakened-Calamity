#!/usr/bin/env python3
"""Parse pokeemerald source files into JSON data for the Pokemon game."""
import re
import json
import os

BASE = "/home/user/Pokemon-Game/source/pokeemerald/src/data"
OUT_DIR = "/home/user/Pokemon-Game/data/pokemon"

# --- Type mappings ---
TYPE_MAP = {
    "TYPE_NORMAL": "Normal",
    "TYPE_FIGHTING": "Fighting",
    "TYPE_FLYING": "Flying",
    "TYPE_POISON": "Poison",
    "TYPE_GROUND": "Ground",
    "TYPE_ROCK": "Rock",
    "TYPE_BUG": "Bug",
    "TYPE_GHOST": "Ghost",
    "TYPE_STEEL": "Steel",
    "TYPE_MYSTERY": "Normal",  # treat as normal
    "TYPE_FIRE": "Fire",
    "TYPE_WATER": "Water",
    "TYPE_GRASS": "Grass",
    "TYPE_ELECTRIC": "Electric",
    "TYPE_PSYCHIC": "Psychic",
    "TYPE_ICE": "Ice",
    "TYPE_DRAGON": "Dragon",
    "TYPE_DARK": "Dark",
}

PHYSICAL_TYPES = {"Normal","Fighting","Flying","Poison","Ground","Rock","Bug","Ghost","Steel"}
SPECIAL_TYPES = {"Fire","Water","Grass","Electric","Psychic","Ice","Dragon","Dark"}


def move_key(move_const):
    """MOVE_VINE_WHIP -> vine_whip"""
    return move_const.replace("MOVE_", "").lower()


def move_name(move_const):
    """MOVE_VINE_WHIP -> Vine Whip"""
    parts = move_const.replace("MOVE_", "").split("_")
    return " ".join(p.capitalize() for p in parts)


def get_category(power, type_name):
    if power == 0:
        return "status"
    if type_name in PHYSICAL_TYPES:
        return "physical"
    if type_name in SPECIAL_TYPES:
        return "special"
    return "physical"  # fallback


def parse_moves():
    path = os.path.join(BASE, "battle_moves.h")
    with open(path) as f:
        text = f.read()

    # Find all move blocks: [MOVE_XXX] = { ... }
    # Use regex to find each block
    pattern = re.compile(
        r'\[(\bMOVE_[A-Z0-9_]+\b)\]\s*=\s*\{([^}]+)\}',
        re.DOTALL
    )

    moves = {}
    for m in pattern.finditer(text):
        const = m.group(1)
        if const == "MOVE_NONE":
            continue
        body = m.group(2)

        def extract(field):
            fm = re.search(rf'\.{field}\s*=\s*([^,\n]+)', body)
            return fm.group(1).strip() if fm else None

        power_str = extract("power")
        type_str = extract("type")
        acc_str = extract("accuracy")
        pp_str = extract("pp")

        try:
            power = int(power_str) if power_str else 0
        except ValueError:
            power = 0
        try:
            accuracy = int(acc_str) if acc_str else 0
        except ValueError:
            accuracy = 0
        try:
            pp = int(pp_str) if pp_str else 0
        except ValueError:
            pp = 0

        type_name = TYPE_MAP.get(type_str, "Normal") if type_str else "Normal"
        category = get_category(power, type_name)

        key = move_key(const)
        moves[key] = {
            "name": move_name(const),
            "power": power,
            "type": type_name,
            "accuracy": accuracy,
            "pp": pp,
            "category": category,
        }

    return moves


def camel_to_snake(name):
    """sBulbasaurLevelUpLearnset -> bulbasaur (strip s prefix, strip LevelUpLearnset suffix, lowercase)"""
    # Remove leading 's', remove trailing 'LevelUpLearnset'
    if name.startswith('s'):
        name = name[1:]
    if name.endswith('LevelUpLearnset'):
        name = name[:-len('LevelUpLearnset')]
    # CamelCase -> snake_case
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    result = re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()
    return result


def parse_learnsets():
    path = os.path.join(BASE, "pokemon/level_up_learnsets.h")
    with open(path) as f:
        text = f.read()

    learnsets = {}

    # Match each array
    array_pattern = re.compile(
        r'static const u16 (s\w+LevelUpLearnset)\[\]\s*=\s*\{([^}]+)\}',
        re.DOTALL
    )
    move_pattern = re.compile(r'LEVEL_UP_MOVE\(\s*(\d+)\s*,\s*(MOVE_[A-Z0-9_]+)\s*\)')

    for m in array_pattern.finditer(text):
        array_name = m.group(1)
        body = m.group(2)
        species_key = camel_to_snake(array_name)

        moves = []
        for mm in move_pattern.finditer(body):
            level = int(mm.group(1))
            move = move_key(mm.group(2))
            moves.append([level, move])

        learnsets[species_key] = moves

    return learnsets


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    print("Parsing moves...")
    moves = parse_moves()
    moves_path = os.path.join(OUT_DIR, "moves.json")
    with open(moves_path, "w") as f:
        json.dump(moves, f, separators=(',', ':'))
    print(f"  Written {len(moves)} moves to {moves_path}")

    print("Parsing learnsets...")
    learnsets = parse_learnsets()
    learnsets_path = os.path.join(OUT_DIR, "learnsets.json")
    with open(learnsets_path, "w") as f:
        json.dump(learnsets, f, separators=(',', ':'))
    print(f"  Written {len(learnsets)} species to {learnsets_path}")


if __name__ == "__main__":
    main()
