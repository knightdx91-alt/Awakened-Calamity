#!/usr/bin/env python3
"""Add dungeon content to the existing run floors: hidden traps (steppable, never
block a path) + a lever->sealed-cache puzzle (optional reward). Idempotent."""
import json, os, glob, random
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def trap(x,y,kind):
    body=([{"type":"text","text":"A System sigil flares underfoot — it has logged your position."},{"type":"surveil","amount":12}]
          if kind=="sensor" else
          [{"type":"text","text":"Spikes erupt from the floor!"},{"type":"hurt","what":"hp","amount":16}])
    return {"name":"Trap","x":x,"y":y,"trigger":"touch","through":True,
            "graphic":{"sprite":"","file":"","single":True},
            "commands":[{"type":"conditional","cond":{"kind":"selfswitch","letter":"A","value":True},
                "then":[],"else":body+[{"type":"selfswitch","letter":"A","value":True}]}]}
def lever(x,y,sw):
    return {"name":"Lever","x":x,"y":y,"trigger":"action","through":False,
            "graphic":{"sprite":"Switch1","file":"rtp/Switch1.png","frame_w":32,"frame_h":32,"cols":3,"rows":4,"single":False},
            "commands":[{"type":"se","name":"Switch1"},{"type":"switch","id":sw,"value":True},
                {"type":"text","text":"The lever grinds down. Somewhere in the dark, stone slides open."}]}
def cache(x,y,sw):
    return {"name":"SealedCache","x":x,"y":y,"trigger":"action","through":False,
            "graphic":{"sprite":"Chest","file":"rtp/Chest.png","frame_w":32,"frame_h":32,"cols":3,"rows":4,"single":False},
            "commands":[{"type":"conditional","cond":{"kind":"switch","id":sw,"value":True},
                "then":[{"type":"text","text":"The seal is broken — the cache opens."},{"type":"relic","count":3}],
                "else":[{"type":"text","text":"A sealed cache. A mechanism elsewhere holds it shut — find the lever."}]}]}
n=0
for f in sorted(glob.glob(os.path.join(ROOT,"data","maps","awakened","RunFloor*.json"))):
    name=os.path.basename(f)[:-5]
    m=json.load(open(f))
    if any(e.get("name")=="Trap" for e in m["events"]): continue
    l=json.load(open(os.path.join(ROOT,"data","layouts","awakened",m["layout"]+".json")))
    W=l["width"]; coll=l["collision"]
    occ={(e["x"],e["y"]) for e in m["events"]}
    walk=[(i%W,i//W) for i,c in enumerate(coll) if not c and (i%W,i//W) not in occ]
    rng=random.Random(hash(name)&0xffff); rng.shuffle(walk)
    nid=max((e.get("id",0) for e in m["events"]),default=0)
    picks=walk[:6]
    for k,(x,y) in enumerate(picks[:4]):
        nid+=1; e=trap(x,y,"sensor" if k%3==0 else "spike"); e["id"]=nid; e["dir"]="down"; m["events"].append(e)
    if len(picks)>=6:
        sw="gate_"+name.lower()
        nid+=1; e=lever(*picks[4],sw); e["id"]=nid; e["dir"]="down"; m["events"].append(e)
        nid+=1; e=cache(*picks[5],sw); e["id"]=nid; e["dir"]="down"; m["events"].append(e)
    json.dump(m,open(f,"w")); n+=1
    print("  %s: +traps +lever/cache"%name)
print("updated %d floors"%n)
