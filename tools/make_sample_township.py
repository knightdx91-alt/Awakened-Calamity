#!/usr/bin/env python3
"""Sample town on overworld_buch (Buch, CC-BY). source(col,row)->idx=row*21+col."""
import json, os
from PIL import Image
ROOT=os.path.join(os.path.dirname(__file__),'..')
TS='overworld_buch'; NAME='SampleTownship'; LAYOUT_ID='LAYOUT_SAMPLE_TOWNSHIP'; OWC=21
def idx(c,r): return r*OWC+c
sheet=Image.open(f'{ROOT}/data/tilesets/{TS}.png').convert('RGBA')
meta=json.load(open(f'{ROOT}/data/tilesets/{TS}.json')); PR=meta['metatiles_per_row']
def img(i): return sheet.crop(((i%PR)*16,(i//PR)*16,(i%PR)*16+16,(i//PR)*16+16))
def st(c,r):
    t=img(idx(c,r)).load();R=G=B=n=0;v=[]
    for y in range(16):
        for x in range(16):
            a=t[x,y]
            if a[3]>40:R+=a[0];G+=a[1];B+=a[2];n+=1;v.append(a[:3])
    if not n:return None
    ar,ag,ab=R//n,G//n,B//n;var=sum((p[0]-ar)**2+(p[1]-ag)**2+(p[2]-ab)**2 for p in v)/n
    return ar,ag,ab,var
def pick(sc):
    best,bi=-1e18,None
    for r in range(9):
        for c in range(OWC):
            s=st(c,r)
            if s and sc(*s)>best:best,bi=sc(*s),(c,r)
    return bi
GR=idx(*pick(lambda r,g,b,var:(g-r)+(g-b)-var*0.08))
SA=idx(*pick(lambda r,g,b,var:(r+g)-b*1.4-var*0.06 if r>150 and g>140 else -1e9))
WA=idx(*pick(lambda r,g,b,var:b*2-r-g-var*0.06))
RF1,RF2,WL1,WL2=idx(8,0),idx(9,0),idx(8,1),idx(9,1)   # 2x2 wood house
TREE=idx(6,6)
HOUSE_TILES={RF1,RF2,WL1,WL2}

W,H=26,20
m=[GR]*(W*H); blocked=[0]*(W*H)
def put(x,y,t,block=False):
    if 0<=x<W and 0<=y<H: m[y*W+x]=t; blocked[y*W+x]=1 if block else blocked[y*W+x]
def rect(x0,y0,x1,y1,t,block=False):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1): put(x,y,t,block)
# roads
rect(12,0,13,H-1,SA); rect(2,9,W-3,10,SA)
# pond
rect(20,2,23,6,WA,True)
# 2x2 houses
def house(x,y):
    put(x,y,RF1,True);put(x+1,y,RF2,True);put(x,y+1,WL1,True);put(x+1,y+1,WL2,True)
    put(x,y+2,SA);put(x+1,y+2,SA)   # frontage
for (hx,hy) in [(4,4),(8,4),(15,4),(4,13),(8,13),(16,13),(20,13)]:
    house(hx,hy)
# trees
for (tx,ty) in [(2,2),(10,2),(2,17),(10,17),(18,8),(15,17),(6,7),(19,17),(24,3),(24,16)]:
    put(tx,ty,TREE,True)
coll=[1 if (m[i]==WA or m[i]==TREE or m[i] in HOUSE_TILES) else 0 for i in range(W*H)]
os.makedirs(f'{ROOT}/data/layouts/awakened',exist_ok=True)
json.dump({'id':LAYOUT_ID,'width':W,'height':H,'tileset':TS,'metatiles':m,'collision':coll},open(f'{ROOT}/data/layouts/awakened/{LAYOUT_ID}.json','w'))
json.dump({'id':'MAP_SAMPLE_TOWNSHIP','name':NAME,'region':'awakened','layout':LAYOUT_ID,'music':'','weather':'WEATHER_NONE','map_type':'MAP_TYPE_TOWN','allow_running':True,'allow_cycling':False,'show_map_name':True,'connections':[],'npcs':[],'warps':[],'triggers':[],'signs':[]},open(f'{ROOT}/data/maps/awakened/{NAME}.json','w'))
ip=f'{ROOT}/data/maps/awakened_index.json';ix=json.load(open(ip));ix['MAP_SAMPLE_TOWNSHIP']=NAME;json.dump(ix,open(ip,'w'))
S=22;out=Image.new('RGBA',(W*S,H*S),(0,0,0,255))
for y in range(H):
    for x in range(W):
        out.alpha_composite(img(GR).resize((S,S),Image.NEAREST),(x*S,y*S))
        out.alpha_composite(img(m[y*W+x]).resize((S,S),Image.NEAREST),(x*S,y*S))
out.save('/tmp/sample_township.png');print('wrote',NAME,out.size,'grass',GR,'sand',SA,'water',WA)
