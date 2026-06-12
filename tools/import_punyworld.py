#!/usr/bin/env python3
"""Import Shade's CC0 'PunyWorld Overworld Tileset' into engine format.
Source: https://opengameart.org/content/16x16-puny-world-tileset  License: CC0.
Big 16x16 overworld (terrain, trees, water, buildings, props). Re-lays tiles to
16/row (engine requirement); skips empty tiles; water -> 0x10 blocked, else
walkable (paint collision for building/tree bodies in the editor)."""
import json, os
from PIL import Image
SRC='/tmp/puny/punyworld.png'; TS_DIR=os.path.join(os.path.dirname(__file__),'..','data','tilesets')
NAME='punyworld'; T=16; PR=16
im=Image.open(SRC).convert('RGBA'); W,H=im.size; cols,rows=W//T,H//T
def avg(t):
    px=t.load(); r=g=b=n=0
    for y in range(T):
        for x in range(T):
            cr,cg,cb,ca=px[x,y]
            if ca>40: r+=cr;g+=cg;b+=cb;n+=1
    return (r//n,g//n,b//n,n) if n else None
tiles=[];beh=[];col=[]
seen=set()
for ry in range(rows):
    for rx in range(cols):
        t=im.crop((rx*T,ry*T,rx*T+T,ry*T+T))
        if t.getbbox() is None: continue          # skip empty
        key=t.tobytes()
        if key in seen: continue                   # dedupe
        seen.add(key)
        a=avg(t); tiles.append(t)
        if a and a[2]>85 and a[2]>a[0]+25 and a[2]>a[1]+10: beh.append(0x10);col.append(1)
        else: beh.append(0);col.append(0)
n=len(tiles); sr=(n+PR-1)//PR
sheet=Image.new('RGBA',(PR*T,sr*T),(0,0,0,0))
for i,t in enumerate(tiles): sheet.paste(t,((i%PR)*T,(i//PR)*T))
os.makedirs(TS_DIR,exist_ok=True); sheet.save(os.path.join(TS_DIR,NAME+'.png'))
json.dump({'total_metatiles':n,'primary_count':n,'secondary_count':0,'metatiles_per_row':PR,
           'behaviors':beh,'collisions':col},open(os.path.join(TS_DIR,NAME+'.json'),'w'))
open(os.path.join(TS_DIR,NAME+'.LICENSE.txt'),'w').write(
 "punyworld — 'PunyWorld Overworld Tileset' by Shade. License: CC0 (public domain).\n"
 "No attribution required. https://opengameart.org/content/16x16-puny-world-tileset\n")
print(f"wrote {NAME}: {n} unique tiles (from {cols}x{rows}), {sum(col)} water-blocked")
