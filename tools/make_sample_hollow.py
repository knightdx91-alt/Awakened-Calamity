#!/usr/bin/env python3
"""Playable SampleHollow on forest_terrain (correct Wang autotiler)."""
import json, os
from PIL import Image
ROOT=os.path.join(os.path.dirname(__file__),'..')
TS='forest_terrain'; NAME='SampleHollow'; LAYOUT_ID='LAYOUT_SAMPLE_HOLLOW'; W,Hh=22,16
sheet=Image.open(f'{ROOT}/data/tilesets/{TS}.png').convert('RGBA')
cfg=json.load(open(f'{ROOT}/data/tilesets/{TS}.autotile.json')); PR=cfg['per_row']
def img(i): return sheet.crop(((i%PR)*16,(i//PR)*16,(i%PR)*16+16,(i//PR)*16+16))
OFF=[(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1)]
ter=[['' for _ in range(W)] for _ in range(Hh)]
def rect(x0,y0,x1,y1,t):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            if 0<=x<W and 0<=y<Hh: ter[y][x]=t
rect(3,3,9,11,'dirt')
for y in range(3,12): ter[y][6]=''         # grass path through clearing
for x in range(9,18): ter[12][x]='dirt'    # path branch east
rect(13,2,19,7,'water')                     # pond
ter[4][16]=''; ter[5][16]=''                # island
grass=cfg['fills']['grass']
def mask(x,y,t):
    m=0
    for i,(dx,dy) in enumerate(OFF):
        nx,ny=x+dx,y+dy
        if 0<=nx<W and 0<=ny<Hh and ter[ny][nx]==t: m|=(1<<i)
    return m
m=[grass]*(W*Hh); coll=[0]*(W*Hh)
for y in range(Hh):
    for x in range(W):
        t=ter[y][x]
        if t:
            info=cfg['terrains'][t]; m[y*W+x]=info['lut'][mask(x,y,t)]; coll[y*W+x]=1 if info['collision'] else 0
os.makedirs(f'{ROOT}/data/layouts/awakened',exist_ok=True)
json.dump({'id':LAYOUT_ID,'width':W,'height':Hh,'tileset':TS,'metatiles':m,'collision':coll},open(f'{ROOT}/data/layouts/awakened/{LAYOUT_ID}.json','w'))
json.dump({'id':'MAP_SAMPLE_HOLLOW','name':NAME,'region':'awakened','layout':LAYOUT_ID,'music':'','weather':'WEATHER_NONE','map_type':'MAP_TYPE_ROUTE','allow_running':True,'allow_cycling':False,'show_map_name':True,'connections':[],'npcs':[],'warps':[],'triggers':[],'signs':[]},open(f'{ROOT}/data/maps/awakened/{NAME}.json','w'))
idxp=f'{ROOT}/data/maps/awakened_index.json'; idx=json.load(open(idxp)); idx['MAP_SAMPLE_HOLLOW']=NAME; json.dump(idx,open(idxp,'w'))
S=24; out=Image.new('RGBA',(W*S,Hh*S),(0,0,0,255))
for y in range(Hh):
    for x in range(W):
        out.alpha_composite(img(grass).resize((S,S),Image.NEAREST),(x*S,y*S))
        out.alpha_composite(img(m[y*W+x]).resize((S,S),Image.NEAREST),(x*S,y*S))
out.save('/tmp/sample_hollow.png'); print('wrote SampleHollow',out.size)
