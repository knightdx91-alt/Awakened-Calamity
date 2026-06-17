#!/usr/bin/env python3
"""Import RTP enemy battlers -> data/battlers/rtp/ + rtp_battlers_index.json.
Front-view stills, variable size. SRC overridable."""
import json, os, struct, shutil
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.environ.get("SRC", os.path.join(ROOT,"assets-source","vx-ace-rtp","Graphics","Battlers"))
DST=os.path.join(ROOT,"data","battlers","rtp")
def size(p):
    d=open(p,"rb").read(24); assert d[:8]==b"\x89PNG\r\n\x1a\n"; return struct.unpack(">II",d[16:24])
def main():
    os.makedirs(DST,exist_ok=True); entries=[]
    for f in sorted(os.listdir(SRC)):
        if not f.lower().endswith(".png"): continue
        w,h=size(os.path.join(SRC,f)); nid=f[:-4]
        shutil.copyfile(os.path.join(SRC,f), os.path.join(DST,nid+".png"))
        entries.append({"id":nid,"file":"rtp/"+nid+".png","w":w,"h":h})
    json.dump({"source":"RPG Maker VX Ace RTP battlers (prototype; branch vx-ace-rtp)","battlers":entries},
              open(os.path.join(ROOT,"data","battlers","rtp_battlers_index.json"),"w"))
    print(f"imported {len(entries)} battlers")
main()
