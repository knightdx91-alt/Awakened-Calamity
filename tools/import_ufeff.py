#!/usr/bin/env python3
"""Import ufeff's CC0 'Versatile 255-Tile Pixel Art Pack' master sheet.
Source: https://opengameart.org/content/versatile-255-tile-pixel-art-pack  CC0.
The master sheet is already 16 tiles/row (256x256). Slice all, classify water/
void as blocked; everything else walkable (paint object collision in editor)."""
import json, os
from PIL import Image
SRC='/tmp/ufeff/0-ufeff_tiles_v2.png'; TS_DIR=os.path.join(os.path.dirname(__file__),'..','data','tilesets')
NAME='ufeff'; T=16; PR=16
im=Image.open(SRC).convert('RGBA'); W,H=im.size; cols,rows=W//T,H//T
def avg(t):
    px=t.load(); r=g=b=n=0
    for y in range(T):
        for x in range(T):
            cr,cg,cb,ca=px[x,y]
            if ca>40: r+=cr;g+=cg;b+=cb;n+=1
    return (r//n,g//n,b//n,n) if n else None
tiles=[];beh=[];col=[]
for ry in range(rows):
    for rx in range(cols):
        t=im.crop((rx*T,ry*T,rx*T+T,ry*T+T)); a=avg(t); tiles.append(t)
        if a and a[2]>85 and a[2]>a[0]+25 and a[2]>a[1]+10: beh.append(0x10);col.append(1)  # water
        elif a and max(a[0],a[1],a[2])<40: beh.append(0x08);col.append(0)                  # void/dark floor
        else: beh.append(0);col.append(0)
n=len(tiles)
sheet=Image.new('RGBA',(PR*T,((n+PR-1)//PR)*T),(0,0,0,0))
for i,t in enumerate(tiles): sheet.paste(t,((i%PR)*T,(i//PR)*T))
os.makedirs(TS_DIR,exist_ok=True); sheet.save(os.path.join(TS_DIR,NAME+'.png'))
json.dump({'total_metatiles':n,'primary_count':n,'secondary_count':0,'metatiles_per_row':PR,
           'behaviors':beh,'collisions':col},open(os.path.join(TS_DIR,NAME+'.json'),'w'))
open(os.path.join(TS_DIR,NAME+'.LICENSE.txt'),'w').write(
 "ufeff — 'Versatile 255-Tile Pixel Art Pack' by ufeff (wareya). License: CC0.\n"
 "No attribution required. https://opengameart.org/content/versatile-255-tile-pixel-art-pack\n")
print(f"wrote {NAME}: {n} tiles ({cols}x{rows})")
