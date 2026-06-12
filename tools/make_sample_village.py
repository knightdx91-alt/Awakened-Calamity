#!/usr/bin/env python3
"""Official-art village: ac_ground autotiled base (grass + road + pond) with a
combined ac_buildings+decor overlay (houses, trees, fences). Writes layout (with
terrain[] + overlay_tileset/overlay[]) and renders."""
import json, os
from PIL import Image
ROOT=os.path.join(os.path.dirname(__file__),'..')
DS=os.path.join(ROOT,'design-system','assets','tilesets')
TS_DIR=os.path.join(ROOT,'data','tilesets'); T=16; PR=16
NAME='SampleVillage'; LAYOUT_ID='LAYOUT_SAMPLE_VILLAGE'; W,H=28,20
# --- build combined overlay tileset: ac_buildings(0-39) + decor(40+) ---
bld=Image.open(os.path.join(DS,'ac-buildings-16.png')).convert('RGBA'); BC=bld.width//16
ter=Image.open(os.path.join(DS,'ac-terrain-16.png')).convert('RGBA'); TC=ter.width//16
def bt(i): return bld.crop(((i%BC)*16,(i//BC)*16,(i%BC)*16+16,(i//BC)*16+16))
def tt(i): return ter.crop(((i%TC)*16,(i//TC)*16,(i%TC)*16+16,(i//TC)*16+16))
otiles=[bt(i) for i in range(BC*(bld.height//16))]   # 0..39 buildings
DECOR={'tree':16,'pine':17,'fence':26,'sign':27,'flower':20,'mushroom':22}
decor_idx={}
for nm,ti in DECOR.items():
    decor_idx[nm]=len(otiles); otiles.append(tt(ti))
n=len(otiles); rows=(n+PR-1)//PR
osheet=Image.new('RGBA',(PR*T,rows*T),(0,0,0,0))
for i,t in enumerate(otiles): osheet.paste(t,((i%PR)*T,(i//PR)*T))
OVER='ac_village_overlay'; osheet.save(os.path.join(TS_DIR,OVER+'.png'))
json.dump({'total_metatiles':n,'primary_count':n,'secondary_count':0,'metatiles_per_row':PR,
           'behaviors':[0]*n,'collisions':[0]*n},open(os.path.join(TS_DIR,OVER+'.json'),'w'))
open(os.path.join(TS_DIR,OVER+'.LICENSE.txt'),'w').write("ac_village_overlay — official AC buildings+decor (owner art).\n")

# --- base autotile ground ---
gsheet=Image.open(os.path.join(TS_DIR,'ac_ground.png')).convert('RGBA')
gcfg=json.load(open(os.path.join(TS_DIR,'ac_ground.autotile.json')))
gtj=json.load(open(os.path.join(TS_DIR,'ac_ground.json'))); gcol=gtj['collisions']
def gimg(i): return gsheet.crop(((i%PR)*16,(i//PR)*16,(i%PR)*16+16,(i//PR)*16+16))
def oimg(i): return osheet.crop(((i%PR)*16,(i//PR)*16,(i%PR)*16+16,(i//PR)*16+16))
OFF=[(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1)]
prio=gcfg['priority']
def prioOf(t): t=t or 'grass'; return prio.index(t) if t in prio else 0

gter=[['grass']*W for _ in range(H)]
def grect(x0,y0,x1,y1,t):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            if 0<=x<W and 0<=y<H: gter[y][x]=t
# roads: main cross + a loop
for x in range(2,W-2): gter[10][x]='road'; gter[11][x]='road'
for y in range(2,H-2): gter[13][y if False else 13]='road'
for y in range(2,H-2): gter[y][13]='road'; gter[y][14]='road'
grect(21,3,25,7,'pond')

ov=[[-1]*W for _ in range(H)]; ovb=[[False]*W for _ in range(H)]
def place(x,y,rows2):
    for r,row in enumerate(rows2):
        for c,idx in enumerate(row):
            if 0<=y+r<H and 0<=x+c<W and idx>=0:
                ov[y+r][x+c]=idx; ovb[y+r][x+c]=True
TAN=[[16,17,18],[24,25,26],[25,28,27]]
RED=[[0,1,2],[7,7,7]]
BLUE=[[8,9,10],[15,15,15]]
place(4,4,TAN); place(8,5,RED); place(17,4,BLUE); place(23,12,TAN); place(4,14,RED); place(9,14,BLUE)
TREE=decor_idx['tree']; PINE=decor_idx['pine']; FENCE=decor_idx['fence']; SIGN=decor_idx['sign']
for (tx,ty,td) in [(2,7,TREE),(16,8,PINE),(26,9,TREE),(2,18,PINE),(19,18,TREE),(26,17,PINE),(7,9,TREE),(20,2,TREE)]:
    if 0<=tx<W and 0<=ty<H: ov[ty][tx]=td; ovb[ty][tx]=True
for x in range(3,9): 
    if gter[18][x]=='grass': ov[18][x]=FENCE; ovb[18][x]=True
ov[12][6]=SIGN; ovb[12][6]=True

def bake(x,y):
    name=gter[y][x]
    if name=='grass': return gcfg['fills']['grass']
    info=gcfg['terrains'][name]
    def t_at(nx,ny): return gter[ny][nx] if 0<=nx<W and 0<=ny<H else 'grass'
    def same(nx,ny): t=t_at(nx,ny); return t==name or prioOf(t)>prioOf(name)
    m=0
    for i,(dx,dy) in enumerate(OFF):
        if same(x+dx,y+dy): m|=(1<<i)
    return info['lut'][m]
m=[0]*(W*H); coll=[0]*(W*H); ovf=[-1]*(W*H); terf=['']*(W*H)
for y in range(H):
    for x in range(W):
        bi=bake(x,y); m[y*W+x]=bi
        coll[y*W+x]=1 if (gcol[bi] or ovb[y][x]) else 0
        ovf[y*W+x]=ov[y][x]; terf[y*W+x]=gter[y][x] if gter[y][x]!='grass' else ''
os.makedirs(f'{ROOT}/data/layouts/awakened',exist_ok=True)
json.dump({'id':LAYOUT_ID,'width':W,'height':H,'tileset':'ac_ground','overlay_tileset':OVER,
           'metatiles':m,'collision':coll,'overlay':ovf,'terrain':terf},
          open(f'{ROOT}/data/layouts/awakened/{LAYOUT_ID}.json','w'))
json.dump({'id':'MAP_SAMPLE_VILLAGE','name':NAME,'region':'awakened','layout':LAYOUT_ID,'music':'','weather':'WEATHER_NONE','map_type':'MAP_TYPE_TOWN','allow_running':True,'allow_cycling':False,'show_map_name':True,'connections':[],'npcs':[],'warps':[],'triggers':[],'signs':[]},open(f'{ROOT}/data/maps/awakened/{NAME}.json','w'))
ip=f'{ROOT}/data/maps/awakened_index.json';ix=json.load(open(ip));ix['MAP_SAMPLE_VILLAGE']=NAME;json.dump(ix,open(ip,'w'))
S=22;out=Image.new('RGBA',(W*S,H*S),(0,0,0,255))
for y in range(H):
    for x in range(W):
        out.alpha_composite(gimg(0).resize((S,S),Image.NEAREST),(x*S,y*S))
        out.alpha_composite(gimg(m[y*W+x]).resize((S,S),Image.NEAREST),(x*S,y*S))
        if ovf[y*W+x]>=0: out.alpha_composite(oimg(ovf[y*W+x]).resize((S,S),Image.NEAREST),(x*S,y*S))
out.save('/tmp/sample_village.png');print('wrote',NAME,out.size)
