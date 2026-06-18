#!/usr/bin/env python3
"""One-shot, idempotent migration to bring already-authored maps in line with the
roaming-encounter + one-time-chest changes:
  - monster events (battle + despawn signature) get behavior:{type:roam,...} so the
    engine wanders + chases them;
  - chest events that grant loot unconditionally get wrapped in a self-switch-A
    conditional so the loot can only be claimed once.
Re-runnable: skips events already migrated.
"""
import json, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
maps = glob.glob(os.path.join(ROOT, "data", "maps", "*", "*.json"))
changed_files = 0; n_roam = 0; n_chest = 0

def is_monster(e):
    cmds = e.get("commands") or []
    types = [c.get("type") for c in cmds]
    return "battle" in types and "despawn" in types

def is_loot_chest(e):
    cmds = e.get("commands") or []
    if not cmds: return False
    # already migrated? top-level conditional on a selfswitch
    if cmds[0].get("type") == "conditional" and (cmds[0].get("cond") or {}).get("kind") == "selfswitch":
        return False
    types = [c.get("type") for c in cmds]
    return ("money" in types or "item" in types)

for f in maps:
    try: m = json.load(open(f))
    except Exception: continue
    evs = m.get("events") or []
    dirty = False
    for e in evs:
        if is_monster(e) and not e.get("behavior"):
            e["behavior"] = {"type": "roam", "sight": 5, "speed": 420}
            n_roam += 1; dirty = True
        elif e.get("name") == "Chest" and is_loot_chest(e):
            cmds = e["commands"]
            intro = cmds[0] if cmds and cmds[0].get("type") == "text" else {"type": "text", "text": "A weathered chest."}
            loot = [c for c in cmds if c is not intro]
            loot.append({"type": "selfswitch", "letter": "A", "value": True})
            e["commands"] = [{
                "type": "conditional",
                "cond": {"kind": "selfswitch", "letter": "A", "value": True},
                "then": [{"type": "text", "text": "The chest lies open and empty."}],
                "else": [intro] + loot}]
            n_chest += 1; dirty = True
    if dirty:
        json.dump(m, open(f, "w"))
        changed_files += 1

print("files changed: %d  roamers tagged: %d  chests made one-time: %d" % (changed_files, n_roam, n_chest))
