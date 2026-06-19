#!/usr/bin/env python3
"""Populate the run maps with the new enemy roster (was emberling/thornwolf only).
Roaming enemies become tier-banded by floor letter; the two boss maps get distinct
named bosses. Idempotent-ish: re-running re-derives from the floor band. All output
stays editable in the map editor (it just rewrites the battle commands' `key`)."""
import json, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T1 = ["emberling","thornwolf","husk_rat","mire_slime","ash_imp","cave_crawler"]
T2 = ["bramblewight","frost_shade","voltspine","bonepicker","sahagin_raider","cinder_hound"]
# per-floor-map band: which pool the roamers draw from (floors are seed-picked for
# depth 1-3, so this gives a spread of difficulty across the pool)
BANDS = {
    "RunFloorA": T1, "RunFloorB": T1,
    "RunFloorC": T1+T2, "RunFloorD": T1+T2,
    "RunFloorE": T2+T1[:2], "RunFloorF": T2+T1[:2],
}
BOSSES = { "RunBoss1": "veinmother", "RunBoss2": "cinder_tyrant" }

def is_boss_event(e):
    return e.get("name") == "Alpha"

for f in sorted(glob.glob(os.path.join(ROOT,"data","maps","awakened","Run*.json"))):
    name = os.path.basename(f)[:-5]
    m = json.load(open(f)); changed = 0; ri = 0
    for e in m["events"]:
        for c in e.get("commands", []):
            if c.get("type") != "battle": continue
            if name in BOSSES and is_boss_event(e):
                # boss floor: one named boss (keep the authored level), drop extra adds
                lvl = max((en.get("level",6) for en in c.get("enemies",[])), default=6)
                c["enemies"] = [{"key": BOSSES[name], "level": lvl}]
                changed += 1
            elif name in BANDS:
                pool = BANDS[name]
                for en in c.get("enemies", []):
                    en["key"] = pool[ri % len(pool)]; ri += 1
                changed += 1
    if changed:
        json.dump(m, open(f,"w"))
        print("  %-12s updated %d battle(s)" % (name, changed))
print("done.")
