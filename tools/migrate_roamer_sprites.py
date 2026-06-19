#!/usr/bin/env python3
"""Give each roaming monster event the sprite of the creature it actually is (was a
generic Monster1 char-0 for everything). Reads creatures.json charsets and rewrites
the event `graphic` for every roamer (battle+despawn) by its enemy key."""
import json, os, glob
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cre=json.load(open(os.path.join(ROOT,"data","systems","creatures.json")))

def roamer_key(e):
    for c in e.get("commands",[]):
        if c.get("type")=="battle":
            en=c.get("enemies") or []
            if en: return en[0].get("key")
    return None

def gfx_for(key):
    cs=(cre.get(key) or {}).get("charset")
    if not cs: return None
    return {"sprite":key,"file":cs["file"],"frame_w":32,"frame_h":32,
            "cols":cs.get("charCols",4)*3,"rows":8,"single":False,
            "char":cs.get("char",0),"charCols":cs.get("charCols",4)}

n=0
for f in sorted(glob.glob(os.path.join(ROOT,"data","maps","*","*.json"))):
    m=json.load(open(f))
    if not isinstance(m,dict): continue
    changed=False
    for e in m.get("events",[]):
        types=[c.get("type") for c in e.get("commands",[])]
        if "battle" in types and "despawn" in types:        # a roamer
            key=roamer_key(e); g=gfx_for(key) if key else None
            if g: e["graphic"]=g; changed=True
    if changed:
        json.dump(m,open(f,"w")); n+=1
print("updated roamer sprites in %d maps"%n)
