#!/usr/bin/env python3
"""Build ac_ground: grass fill + pond + road official 3x3 (9-slice) autotiles
with a wang8_lut config (side-based 9-slice mapping). Uses the owner's own
autotile art. Output data/tilesets/ac_ground.{png,json,autotile.json}."""
import json, os
from PIL import Image
ROOT=os.path.join(os.path.dirname(__file__),'..')
DS=os.path.join(ROOT,'design-system','assets','tilesets')
TS_DIR=os.path.join(ROOT,'data','tilesets'); T=16; PR=16
def tiles(path):  # 3x3 -> 9 tiles row-major
    im=Image.open(path).convert('RGBA'); return [im.crop((c*T,r*T,c*T+T,r*T+T)) for r in range(3) for c in range(3)]
def grass():
    im=Image.open(os.path.join(DS,'ac-terrain-16.png')).convert('RGBA'); return im.crop((0,0,T,T))
def slice9(m):  # m: 8-bit; return 9-slice index 0..8 using sides only
    nN=not(m&1); nE=not(m&4); nS=not(m&16); nW=not(m&64)
    if nN and nW: return 0
    if nN and nE: return 2
    if nS and nW: return 6
    if nS and nE: return 8
    if nN: return 1
    if nS: return 7
    if nW: return 3
    if nE: return 5
    return 4
out=[grass()]; beh=[0]; col=[0]; cfg={'tile':T,'per_row':PR,'scheme':'wang8_lut','priority':['grass','road','pond'],'fills':{'grass':0},'terrains':{}}
for name,fn,b,c in [('road','ac-road-autotile-16.png',0x00,0),('pond','ac-pond-autotile-16.png',0x10,1)]:
    start=len(out); ts=tiles(os.path.join(DS,fn))
    for t in ts: out.append(t); beh.append(b); col.append(c)
    lut=[start+slice9(m) for m in range(256)]
    cfg['terrains'][name]={'lut':lut,'luts':{'grass':lut},'behavior':b,'collision':c,'count':9}
n=len(out); rows=(n+PR-1)//PR
sheet=Image.new('RGBA',(PR*T,rows*T),(0,0,0,0))
for i,t in enumerate(out): sheet.paste(t,((i%PR)*T,(i//PR)*T))
os.makedirs(TS_DIR,exist_ok=True); sheet.save(os.path.join(TS_DIR,'ac_ground.png'))
json.dump({'total_metatiles':n,'primary_count':n,'secondary_count':0,'metatiles_per_row':PR,'behaviors':beh,'collisions':col},open(os.path.join(TS_DIR,'ac_ground.json'),'w'))
json.dump(cfg,open(os.path.join(TS_DIR,'ac_ground.autotile.json'),'w'))
open(os.path.join(TS_DIR,'ac_ground.LICENSE.txt'),'w').write("ac_ground — official AC grass + pond/road autotiles (owner art, IP-clean).\n")
print(f"wrote ac_ground: {n} tiles (grass + road9 + pond9)")
