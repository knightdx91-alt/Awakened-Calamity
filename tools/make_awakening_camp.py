#!/usr/bin/env python3
"""Rebuild AwakeningCamp (default boot map) on official art: ac_ground autotiled
base + ac_camp_overlay (props: tents/campfire/barrels + trees + System rune).
A forest clearing where the player Awakens."""
import json, os
from PIL import Image
ROOT=os.path.join(os.path.dirname(__file__),'..')
DS=os.path.join(ROOT,'design-system','assets','tilesets'); TS_DIR=os.path.join(ROOT,'data','tilesets')
T=16; PR=16; W,H=22,18; LAYOUT_ID='LAYOUT_AWAKENING_CAMP'; NAME='AwakeningCamp'
# combined overlay: ac_props(0-31) + ac_terrain decor
props=Image.open(os.path.join(DS,'ac-props-16.png')).convert('RGBA'); PC=props.width//16
ter=Image.open(os.path.join(DS,'ac-terrain-16.png')).convert('RGBA'); TC=ter.width//16
def pt(i): return props.crop(((i%PC)*16,(i//PC)*16,(i%PC)*16+16,(i//PC)*16+16))
def tt(i): return ter.crop(((i%TC)*16,(i//TC)*16,(i%TC)*16+16,(i//TC)*16+16))
otiles=[pt(i) for i in range(PC*(props.height//16))]   # 0..31 props
DEC={'tree':16,'pine':17,'rune':23,'flower':20}; dec={}
for nm,ti in DEC.items(): dec[nm]=len(otiles); otiles.append(tt(ti))
n=len(otiles); osheet=Image.new('RGBA',(PR*T,((n+PR-1)//PR)*T),(0,0,0,0))
for i,t in enumerate(otiles): osheet.paste(t,((i%PR)*T,(i//PR)*T))
OVER='ac_camp_overlay'; osheet.save(os.path.join(TS_DIR,OVER+'.png'))
json.dump({'total_metatiles':n,'primary_count':n,'secondary_count':0,'metatiles_per_row':PR,'behaviors':[0]*n,'collisions':[0]*n},open(os.path.join(TS_DIR,OVER+'.json'),'w'))
open(os.path.join(TS_DIR,OVER+'.LICENSE.txt'),'w').write("ac_camp_overlay — official AC props+decor (owner art).\n")
# props indices
CAMPFIRE,RTENT,BTENT,BARREL,CRATE,LAMP,SIGN,WELL=16,17,18,2,3,11,10,22
TREE,PINE,RUNE=dec['tree'],dec['pine'],dec['rune']
# base autotile ground
gsheet=Image.open(os.path.join(TS_DIR,'ac_ground.png')).convert('RGBA')
gcfg=json.load(open(os.path.join(TS_DIR,'ac_ground.autotile.json')))
gcol=json.load(open(os.path.join(TS_DIR,'ac_ground.json')))['collisions']
def gimg(i): return gsheet.crop(((i%PR)*16,(i//PR)*16,(i%PR)*16+16,(i//PR)*16+16))
def oimg(i): return osheet.crop(((i%PR)*16,(i//PR)*16,(i%PR)*16+16,(i//PR)*16+16))
OFF=[(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1)];prio=gcfg['priority']
def prioOf(t): t=t or 'grass'; return prio.index(t) if t in prio else 0
gter=[['grass']*W for _ in range(H)]
# dirt path exiting south from the clearing
for y in range(8,H): gter[y][10]='road'; gter[y][11]='road'
ov=[[-1]*W for _ in range(H)]; ovb=[[False]*W for _ in range(H)]
def P(x,y,idx,block=True):
    if 0<=x<W and 0<=y<H: ov[y][x]=idx; ovb[y][x]=block
# forest border of pines
for x in range(W):
    P(x,0,PINE); P(x,1,PINE if x%2 else TREE)
    P(x,H-1,PINE)
for y in range(H):
    P(0,y,PINE); P(W-1,y,PINE)
# clear the south path opening
ov[H-1][10]=-1;ovb[H-1][10]=False;ov[H-1][11]=-1;ovb[H-1][11]=False
# campfire + tents around it (the awakening point)
P(10,8,CAMPFIRE); P(11,8,RUNE,block=False)   # System rune beside the fire
P(7,6,RTENT); P(13,6,BTENT); P(8,10,RTENT); P(14,10,BTENT)
P(6,8,BARREL); P(15,8,CRATE); P(5,11,LAMP); P(16,6,WELL)
P(9,12,SIGN,block=False)
# a few scattered trees inside
for (tx,ty) in [(4,4),(17,4),(3,13),(18,13),(13,13)]: P(tx,ty,TREE)
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
m=[0]*(W*H);coll=[0]*(W*H);ovf=[-1]*(W*H);terf=['']*(W*H)
for y in range(H):
    for x in range(W):
        bi=bake(x,y);m[y*W+x]=bi;coll[y*W+x]=1 if(gcol[bi] or ovb[y][x]) else 0
        ovf[y*W+x]=ov[y][x];terf[y*W+x]=gter[y][x] if gter[y][x]!='grass' else ''
json.dump({'id':LAYOUT_ID,'width':W,'height':H,'tileset':'ac_ground','overlay_tileset':OVER,'metatiles':m,'collision':coll,'overlay':ovf,'terrain':terf},open(f'{ROOT}/data/layouts/awakened/{LAYOUT_ID}.json','w'))
mp=json.load(open(f'{ROOT}/data/maps/awakened/{NAME}.json'))
mp['map_type']='MAP_TYPE_TOWN'; json.dump(mp,open(f'{ROOT}/data/maps/awakened/{NAME}.json','w'))
S=22;out=Image.new('RGBA',(W*S,H*S),(0,0,0,255))
for y in range(H):
    for x in range(W):
        out.alpha_composite(gimg(0).resize((S,S),Image.NEAREST),(x*S,y*S))
        out.alpha_composite(gimg(m[y*W+x]).resize((S,S),Image.NEAREST),(x*S,y*S))
        if ovf[y*W+x]>=0: out.alpha_composite(oimg(ovf[y*W+x]).resize((S,S),Image.NEAREST),(x*S,y*S))
out.save('/tmp/awakening_camp.png');print('wrote AwakeningCamp',out.size)
