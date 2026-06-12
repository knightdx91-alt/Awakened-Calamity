#!/usr/bin/env python3
"""Import Buch's 'Overworld tiles' (overworld.png) into engine format.
Source: https://opengameart.org/content/overworld-tiles-0  License: CC-BY 3.0
Credit: Buch (https://opengameart.org/users/buch) + Jeffrey Kern (committer).
16x16 overworld set: terrain (grass/water/sand/cliff), trees, cave, and BUILDINGS
(houses, roofs, castle). Auto-classify: blue water -> 0x10 blocked; else walkable
(use the editor's collision tool to block building/tree bodies)."""
import json, os
from PIL import Image
SRC='/tmp/oga2/overworld_1.png'
TS_DIR=os.path.join(os.path.dirname(__file__),'..','data','tilesets')
NAME='overworld_buch'; T=16; PR=16
im=Image.open(SRC).convert('RGBA'); W,H=im.size
cols, rows = W//T, H//T
def avg(t):
    px=t.load(); r=g=b=n=0
    for y in range(T):
        for x in range(T):
            cr,cg,cb,ca=px[x,y]
            if ca>40: r+=cr;g+=cg;b+=cb;n+=1
    return (r//n,g//n,b//n,n) if n else (0,0,0,0)
tiles=[]; beh=[]; col=[]
for ry in range(rows):
    for rx in range(cols):
        t=im.crop((rx*T,ry*T,rx*T+T,ry*T+T)); tiles.append(t)
        r,g,b,n=avg(t)
        if n and b>80 and b>r+25 and b>g+10: beh.append(0x10); col.append(1)
        else: beh.append(0); col.append(0)
n=len(tiles); sheet_rows=(n+PR-1)//PR
sheet=Image.new('RGBA',(PR*T,sheet_rows*T),(0,0,0,0))
for i,t in enumerate(tiles): sheet.paste(t,((i%PR)*T,(i//PR)*T))
os.makedirs(TS_DIR,exist_ok=True)
sheet.save(os.path.join(TS_DIR,NAME+'.png'))
json.dump({'total_metatiles':n,'primary_count':n,'secondary_count':0,'metatiles_per_row':PR,
           'behaviors':beh,'collisions':col},open(os.path.join(TS_DIR,NAME+'.json'),'w'))
open(os.path.join(TS_DIR,NAME+'.LICENSE.txt'),'w').write(
 "overworld_buch — Buch's 'Overworld tiles'. License: CC-BY 3.0.\n"
 "REQUIRED CREDIT: Art by Buch (https://opengameart.org/users/buch); committed by\n"
 "Jeffrey Kern. Source: https://opengameart.org/content/overworld-tiles-0\n")
print(f"wrote {NAME}: {n} tiles ({cols}x{rows}), {sum(col)} blocked (water)")
