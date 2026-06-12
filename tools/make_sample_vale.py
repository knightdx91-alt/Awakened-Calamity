#!/usr/bin/env python3
"""Build a playable autotiled map (SampleVale) on the oga_terrain tileset to
demonstrate the 4-bit edge-blob autotiler end-to-end, and render a preview."""
import json, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
TS = 'oga_terrain'
NAME = 'SampleVale'
LAYOUT_ID = 'LAYOUT_SAMPLE_VALE'
W, H = 22, 16

sheet = Image.open(os.path.join(ROOT,'data','tilesets',TS+'.png')).convert('RGBA')
cfg = json.load(open(os.path.join(ROOT,'data','tilesets',TS+'.autotile.json')))
meta = json.load(open(os.path.join(ROOT,'data','tilesets',TS+'.json')))
PR = cfg['per_row']
def img(i): return sheet.crop(((i%PR)*16,(i//PR)*16,(i%PR)*16+16,(i//PR)*16+16))

# terrain layer: '' grass base, 'grass_dirt', 'grass_water'
ter = [['' for _ in range(W)] for _ in range(H)]
def rect(x0,y0,x1,y1,t):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            if 0<=x<W and 0<=y<H: ter[y][x]=t

rect(2,3,8,9,'grass_dirt')           # a dirt clearing
for y in range(3,13): ter[y][11]='grass_dirt'  # dirt path running down
for x in range(11,19): ter[12][x]='grass_dirt' # path branch
rect(14,2,19,6,'grass_water')        # pond
ter[6][5]=''; ter[7][5]=''           # carve grass into the dirt (inner edges)

# bake via edge4
m=[0]*(W*H); coll=[0]*(W*H)
grass_fill=cfg['fills']['grass']
def same(x,y,t): return 0<=x<W and 0<=y<H and ter[y][x]==t
for y in range(H):
    for x in range(W):
        t=ter[y][x]
        if not t:
            m[y*W+x]=grass_fill; coll[y*W+x]=0; continue
        info=cfg['terrains'][t]
        mask=(1 if same(x,y-1,t) else 0)|(2 if same(x+1,y,t) else 0)|(4 if same(x,y+1,t) else 0)|(8 if same(x-1,y,t) else 0)
        m[y*W+x]=info['base_index']+mask
        coll[y*W+x]=1 if info['collision'] else 0

os.makedirs(os.path.join(ROOT,'data','layouts','awakened'),exist_ok=True)
json.dump({'id':LAYOUT_ID,'width':W,'height':H,'tileset':TS,'metatiles':m,'collision':coll},
          open(os.path.join(ROOT,'data','layouts','awakened',LAYOUT_ID+'.json'),'w'))
json.dump({'id':'MAP_SAMPLE_VALE','name':NAME,'region':'awakened','layout':LAYOUT_ID,
           'music':'','weather':'WEATHER_NONE','map_type':'MAP_TYPE_ROUTE','allow_running':True,
           'allow_cycling':False,'show_map_name':True,'connections':[],'npcs':[],'warps':[],
           'triggers':[],'signs':[]},open(os.path.join(ROOT,'data','maps','awakened',NAME+'.json'),'w'))
idxp=os.path.join(ROOT,'data','maps','awakened_index.json')
idx=json.load(open(idxp)); idx['MAP_SAMPLE_VALE']=NAME; json.dump(idx,open(idxp,'w'))

S=24
out=Image.new('RGBA',(W*S,H*S),(0,0,0,255))
for y in range(H):
    for x in range(W):
        out.alpha_composite(img(grass_fill).resize((S,S),Image.NEAREST),(x*S,y*S))
        out.alpha_composite(img(m[y*W+x]).resize((S,S),Image.NEAREST),(x*S,y*S))
out.save('/tmp/sample_vale.png'); print('wrote SampleVale + /tmp/sample_vale.png', out.size)
