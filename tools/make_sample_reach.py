#!/usr/bin/env python3
"""Showcase map on synth_terrain: layered coastline + corruption. Uses the same
priority/multi-base bake logic as the editor, and PERSISTS layout.terrain[] so
the map stays re-editable with the Terrain brush."""
import json, os
from PIL import Image
ROOT=os.path.join(os.path.dirname(__file__),'..')
TS='synth_terrain'; NAME='SampleReach'; LAYOUT_ID='LAYOUT_SAMPLE_REACH'; W,H=30,22
sheet=Image.open(f'{ROOT}/data/tilesets/{TS}.png').convert('RGBA')
cfg=json.load(open(f'{ROOT}/data/tilesets/{TS}.autotile.json'))
tj=json.load(open(f'{ROOT}/data/tilesets/{TS}.json')); col=tj['collisions']; behj=tj['behaviors']
PR=cfg['per_row']; prio=cfg['priority']
def img(i): return sheet.crop(((i%PR)*16,(i//PR)*16,(i%PR)*16+16,(i//PR)*16+16))
def prioOf(t): t=t or 'grass'; return prio.index(t) if t in prio else 0
OFF=[(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1)]
ter=[['grass']*W for _ in range(H)]
def blob(cx,cy,rx,ry,t):
    for y in range(H):
        for x in range(W):
            if ((x-cx)/rx)**2+((y-cy)/ry)**2<=1: ter[y][x]=t
# coastline bottom-left: water bay with sand shore
blob(4,19,12,8,'sand'); blob(3,21,10,7,'water')
# corruption top-right: stone outcrop with void core
blob(24,4,9,7,'stone'); blob(25,3,6,5,'void')
# a sandy path strip
for x in range(8,24): ter[11][x]='sand'; ter[12][x]='sand'
def bake(x,y):
    name=ter[y][x]
    if name=='grass': return cfg['fills']['grass']
    info=cfg['terrains'][name]; myP=prioOf(name)
    def t_at(nx,ny): return ter[ny][nx] if 0<=nx<W and 0<=ny<H else 'grass'
    def same(nx,ny): t=t_at(nx,ny); return t==name or prioOf(t)>myP
    m=0
    for i,(dx,dy) in enumerate(OFF):
        if same(x+dx,y+dy): m|=(1<<i)
    base='grass';bp=-1
    for dy in(-1,0,1):
        for dx in(-1,0,1):
            if not dx and not dy: continue
            t2=t_at(x+dx,y+dy);p2=prioOf(t2)
            if t2!=name and p2<myP and p2>bp and t2 in info['luts']: bp=p2;base=t2
    return (info['luts'].get(base) or info['luts'].get('grass'))[m]
m=[0]*(W*H); coll=[0]*(W*H); terrain_flat=[''for _ in range(W*H)]
for y in range(H):
    for x in range(W):
        ti=bake(x,y); m[y*W+x]=ti; coll[y*W+x]=col[ti]
        terrain_flat[y*W+x]=ter[y][x] if ter[y][x]!='grass' else ''
os.makedirs(f'{ROOT}/data/layouts/awakened',exist_ok=True)
json.dump({'id':LAYOUT_ID,'width':W,'height':H,'tileset':TS,'metatiles':m,'collision':coll,'terrain':terrain_flat},
          open(f'{ROOT}/data/layouts/awakened/{LAYOUT_ID}.json','w'))
json.dump({'id':'MAP_SAMPLE_REACH','name':NAME,'region':'awakened','layout':LAYOUT_ID,'music':'','weather':'WEATHER_NONE','map_type':'MAP_TYPE_ROUTE','allow_running':True,'allow_cycling':False,'show_map_name':True,'connections':[],'npcs':[],'warps':[],'triggers':[],'signs':[]},open(f'{ROOT}/data/maps/awakened/{NAME}.json','w'))
ip=f'{ROOT}/data/maps/awakened_index.json';ix=json.load(open(ip));ix['MAP_SAMPLE_REACH']=NAME;json.dump(ix,open(ip,'w'))
S=20;out=Image.new('RGBA',(W*S,H*S),(0,0,0,255))
for y in range(H):
    for x in range(W):
        out.alpha_composite(img(cfg['fills']['grass']).resize((S,S),Image.NEAREST),(x*S,y*S))
        out.alpha_composite(img(m[y*W+x]).resize((S,S),Image.NEAREST),(x*S,y*S))
out.save('/tmp/sample_reach.png');print('wrote',NAME,out.size)
