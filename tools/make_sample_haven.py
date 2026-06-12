#!/usr/bin/env python3
"""Sample town combining an autotiled synth_terrain BASE layer with an
overworld_buch BUILDINGS overlay layer (engine overlay support). Writes a layout
with metatiles/collision/terrain + overlay_tileset/overlay[]."""
import json, os
from PIL import Image
ROOT=os.path.join(os.path.dirname(__file__),'..')
BASE='synth_terrain'; OVER='overworld_buch'; NAME='SampleHaven'; LAYOUT_ID='LAYOUT_SAMPLE_HAVEN'
W,H=30,22; OWC=21
def oidx(c,r): return r*OWC+c
bsheet=Image.open(f'{ROOT}/data/tilesets/{BASE}.png').convert('RGBA')
osheet=Image.open(f'{ROOT}/data/tilesets/{OVER}.png').convert('RGBA')
cfg=json.load(open(f'{ROOT}/data/tilesets/{BASE}.autotile.json'))
btj=json.load(open(f'{ROOT}/data/tilesets/{BASE}.json')); bcol=btj['collisions']
PR=cfg['per_row']; prio=cfg['priority']
def bimg(i): return bsheet.crop(((i%PR)*16,(i//PR)*16,(i%PR)*16+16,(i//PR)*16+16))
def oimg(i): return osheet.crop(((i%16)*16,(i//16)*16,(i%16)*16+16,(i//16)*16+16))
def prioOf(t): t=t or 'grass'; return prio.index(t) if t in prio else 0
OFF=[(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1)]

ter=[['grass']*W for _ in range(H)]
ov=[[-1]*W for _ in range(H)]
ovblock=[[False]*W for _ in range(H)]
def rect(x0,y0,x1,y1,t):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            if 0<=x<W and 0<=y<H: ter[y][x]=t
def blob(cx,cy,rx,ry,t):
    for y in range(H):
        for x in range(W):
            if ((x-cx)/rx)**2+((y-cy)/ry)**2<=1: ter[y][x]=t
# --- base terrain: sand roads (cross), plaza, pond, void corner ---
rect(14,0,15,H-1,'sand'); rect(2,10,W-3,11,'sand')      # roads
rect(13,9,16,12,'sand')                                  # plaza
blob(25,18,5,4,'water'); blob(25,19,4,3,'water')         # pond SE
blob(3,3,5,4,'void')                                     # corruption NW corner
# --- overlay: 2x2 houses + trees + fences ---
ROOF=(oidx(8,0),oidx(9,0)); WALL=(oidx(8,1),oidx(9,1)); TREE=oidx(6,6)
def house(x,y):
    ov[y][x],ov[y][x+1]=ROOF; ov[y+1][x],ov[y+1][x+1]=WALL
    for yy in(y,y+1):
        for xx in(x,x+1): ovblock[yy][xx]=True
for (hx,hy) in [(5,6),(9,6),(18,6),(22,6),(5,15),(9,15),(18,15)]:
    house(hx,hy)
for (tx,ty) in [(2,8),(12,3),(20,3),(27,4),(2,19),(12,19),(20,13),(8,12),(24,9),(17,19)]:
    if 0<=tx<W and 0<=ty<H: ov[ty][tx]=TREE; ovblock[ty][tx]=True

# bake base
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
m=[0]*(W*H); coll=[0]*(W*H); ovflat=[-1]*(W*H); terflat=['']*(W*H)
for y in range(H):
    for x in range(W):
        bi=bake(x,y); m[y*W+x]=bi
        coll[y*W+x]=1 if (bcol[bi] or ovblock[y][x]) else 0
        ovflat[y*W+x]=ov[y][x]; terflat[y*W+x]=ter[y][x] if ter[y][x]!='grass' else ''
os.makedirs(f'{ROOT}/data/layouts/awakened',exist_ok=True)
json.dump({'id':LAYOUT_ID,'width':W,'height':H,'tileset':BASE,'overlay_tileset':OVER,
           'metatiles':m,'collision':coll,'overlay':ovflat,'terrain':terflat},
          open(f'{ROOT}/data/layouts/awakened/{LAYOUT_ID}.json','w'))
json.dump({'id':'MAP_SAMPLE_HAVEN','name':NAME,'region':'awakened','layout':LAYOUT_ID,'music':'','weather':'WEATHER_NONE','map_type':'MAP_TYPE_TOWN','allow_running':True,'allow_cycling':False,'show_map_name':True,'connections':[],'npcs':[],'warps':[],'triggers':[],'signs':[]},open(f'{ROOT}/data/maps/awakened/{NAME}.json','w'))
ip=f'{ROOT}/data/maps/awakened_index.json';ix=json.load(open(ip));ix['MAP_SAMPLE_HAVEN']=NAME;json.dump(ix,open(ip,'w'))
# render composite (base + overlay)
S=20;out=Image.new('RGBA',(W*S,H*S),(0,0,0,255))
for y in range(H):
    for x in range(W):
        out.alpha_composite(bimg(cfg['fills']['grass']).resize((S,S),Image.NEAREST),(x*S,y*S))
        out.alpha_composite(bimg(m[y*W+x]).resize((S,S),Image.NEAREST),(x*S,y*S))
        if ovflat[y*W+x]>=0: out.alpha_composite(oimg(ovflat[y*W+x]).resize((S,S),Image.NEAREST),(x*S,y*S))
out.save('/tmp/sample_haven.png');print('wrote',NAME,out.size)
