#!/usr/bin/env python3
"""Import Shade's '16x16 Puny Dungeon Tileset' into engine format.
Source: https://merchant-shade.itch.io/16x16-puny-dungeon  License: CC-BY 4.0.
Credit REQUIRED: Shade (merchant-shade.itch.io). 2-edge Wang walls, floors,
water, torches, traps, doors, keys. Classify: water -> 0x10; very dark/wall
tiles -> blocked; floor -> cave encounter 0x08-ish kept walkable."""
import json, os
from PIL import Image
SRC='/tmp/itchdl/merchant-shade/16x16-puny-dungeon/files/punyworld-dungeon-tileset.png'
TS_DIR=os.path.join(os.path.dirname(__file__),'..','data','tilesets'); NAME='puny_dungeon'; T=16; PR=16
im=Image.open(SRC).convert('RGBA'); W,H=im.size; cols,rows=W//T,H//T
def avg(t):
    px=t.load(); r=g=b=n=0
    for y in range(T):
        for x in range(T):
            cr,cg,cb,ca=px[x,y]
            if ca>40: r+=cr;g+=cg;b+=cb;n+=1
    return (r//n,g//n,b//n,n) if n else None
tiles=[];beh=[];col=[];seen=set()
for ry in range(rows):
    for rx in range(cols):
        t=im.crop((rx*T,ry*T,rx*T+T,ry*T+T))
        if t.getbbox() is None: continue
        k=t.tobytes()
        if k in seen: continue
        seen.add(k); a=avg(t); tiles.append(t)
        if a and a[2]>80 and a[2]>a[0]+25 and a[2]>a[1]+10: beh.append(0x10);col.append(1)   # water
        elif a and max(a[0],a[1],a[2])<46: beh.append(0);col.append(1)                        # dark wall
        else: beh.append(0);col.append(0)
n=len(tiles); sr=(n+PR-1)//PR
sheet=Image.new('RGBA',(PR*T,sr*T),(0,0,0,0))
for i,t in enumerate(tiles): sheet.paste(t,((i%PR)*T,(i//PR)*T))
os.makedirs(TS_DIR,exist_ok=True); sheet.save(os.path.join(TS_DIR,NAME+'.png'))
json.dump({'total_metatiles':n,'primary_count':n,'secondary_count':0,'metatiles_per_row':PR,
           'behaviors':beh,'collisions':col},open(os.path.join(TS_DIR,NAME+'.json'),'w'))
open(os.path.join(TS_DIR,NAME+'.LICENSE.txt'),'w').write(
 "puny_dungeon — '16x16 Puny Dungeon Tileset' by Shade. License: CC-BY 4.0.\n"
 "REQUIRED CREDIT: Shade (https://merchant-shade.itch.io/16x16-puny-dungeon).\n")
print(f"wrote {NAME}: {n} unique tiles ({sum(1 for b in beh if b==0x10)} water, {sum(col)} blocked)")
