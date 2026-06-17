#!/usr/bin/env python3
"""Import RTP face sheets -> data/faces/rtp/ + rtp_faces_index.json.
VX Ace faces: 4x2 grid of 96x96 portraits per sheet (8 faces). SRC overridable."""
import json, os, struct, shutil
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.environ.get("SRC", os.path.join(ROOT,"assets-source","vx-ace-rtp","Graphics","Faces"))
DST=os.path.join(ROOT,"data","faces","rtp"); FACE=96; PER_ROW=4
def size(p):
    d=open(p,"rb").read(24); assert d[:8]==b"\x89PNG\r\n\x1a\n"; return struct.unpack(">II",d[16:24])
def main():
    os.makedirs(DST,exist_ok=True); entries=[]
    for f in sorted(os.listdir(SRC)):
        if not f.lower().endswith(".png"): continue
        w,h=size(os.path.join(SRC,f)); cols,rows=w//FACE,h//FACE; nid=f[:-4]
        shutil.copyfile(os.path.join(SRC,f), os.path.join(DST,nid+".png"))
        entries.append({"id":nid,"file":"rtp/"+nid+".png","face":FACE,"per_row":cols,"faces":cols*rows})
    json.dump({"source":"RPG Maker VX Ace RTP faces (prototype; branch vx-ace-rtp)",
               "face":FACE,"per_row":PER_ROW,"sheets":entries},
              open(os.path.join(ROOT,"data","faces","rtp_faces_index.json"),"w"))
    print(f"imported {len(entries)} face sheets ({sum(e['faces'] for e in entries)} portraits @{FACE}px)")
main()
