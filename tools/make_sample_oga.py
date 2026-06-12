#!/usr/bin/env python3
"""Build a playable sample map on the oga_rpg16 tileset + render a preview.
Auto-selects representative tiles from the 3000+ imported metatiles."""
import json, os, random
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
TS = 'oga_rpg16'
NAME = 'SampleGlade'
LAYOUT_ID = 'LAYOUT_SAMPLE_GLADE'
W, H = 24, 18
random.seed(11)

sheet = Image.open(os.path.join(ROOT,'data','tilesets',TS+'.png')).convert('RGBA')
meta = json.load(open(os.path.join(ROOT,'data','tilesets',TS+'.json')))
labels, beh, col = meta['labels'], meta['behaviors'], meta['collisions']
PR = meta['metatiles_per_row']

def img(i): return sheet.crop(((i%PR)*16,(i//PR)*16,(i%PR)*16+16,(i//PR)*16+16))
_cache={}
def stats(i):
    if i in _cache: return _cache[i]
    px=img(i).load(); r=g=b=n=0; vals=[]
    for y in range(16):
        for x in range(16):
            cr,cg,cb,ca=px[x,y]
            if ca>40: r+=cr;g+=cg;b+=cb;n+=1;vals.append((cr,cg,cb))
    if n==0: res=None
    else:
        ar,ag,ab=r//n,g//n,b//n
        var=sum((vr-ar)**2+(vg-ag)**2+(vb-ab)**2 for vr,vg,vb in vals)/n
        res=(ar,ag,ab,var,n)
    _cache[i]=res; return res

def pick(pred, score):
    best,bs=None,-1e18
    for i,l in enumerate(labels):
        s=stats(i)
        if s is None or not pred(i,l,s): continue
        v=score(i,l,s)
        if v>bs: bs,best=v,i
    return best

GRASS = pick(lambda i,l,s: l.startswith('1_terrain') and col[i]==0,
             lambda i,l,s: (s[1]-s[0])+(s[1]-s[2])-s[3]*0.06)
GRASS_DETAIL = [i for i,l in enumerate(labels)
                if l.startswith('3_plants') and col[i]==0 and stats(i) and stats(i)[1]>stats(i)[0]][:6]
WATER = pick(lambda i,l,s: beh[i]==0x10, lambda i,l,s: s[2]*2-s[0]-s[1]-s[3]*0.08)
DIRT  = pick(lambda i,l,s: l.startswith('10_dirt') and col[i]==0 and s[0]>110,
             lambda i,l,s: (s[0]+s[1])-s[2]*1.4-s[3]*0.05)
WALL  = pick(lambda i,l,s: l.startswith('4_buildings') and col[i]==1,
             lambda i,l,s: -s[3]*0.02 + s[0]-s[2])
ROOF  = pick(lambda i,l,s: l.startswith('11_roofs') and col[i]==1,
             lambda i,l,s: -s[3]*0.02)
TREE  = pick(lambda i,l,s: l.startswith('3_plants') and s[1]>s[0]+10 and s[1]>s[2]+10,
             lambda i,l,s: s[1]-s[2]+s[3]*0.01)
CAVE  = pick(lambda i,l,s: beh[i]==0x08, lambda i,l,s: -s[3]*0.05 - abs(s[0]-s[1]))
print('grass=%s detail=%s water=%s dirt=%s wall=%s roof=%s tree=%s cave=%s'%(
    GRASS,GRASS_DETAIL,WATER,DIRT,WALL,ROOF,TREE,CAVE))

m=[GRASS]*(W*H)
def put(x,y,t):
    if 0<=x<W and 0<=y<H: m[y*W+x]=t
def rect(x0,y0,x1,y1,t):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1): put(x,y,t)

for _ in range(36):
    put(random.randrange(W),random.randrange(H),random.choice(GRASS_DETAIL or [GRASS]))
rect(16,2,21,6,WATER)                      # pond
rect(3,12,8,16,DIRT)                       # dirt clearing
for x in range(8,18): put(x,14,DIRT)       # path
# a little hut: roof row over wall row
for x in range(10,13): put(x,8,ROOF)
for x in range(10,13): put(x,9,WALL)
# trees scattered
for (tx,ty) in [(2,3),(6,5),(9,2),(13,4),(20,11),(15,15),(4,9),(22,4),(18,8),(7,16)]:
    put(tx,ty,TREE)
# a cave-floor patch
rect(2,1,4,2,CAVE)

collision=[col[t] for t in m]

os.makedirs(os.path.join(ROOT,'data','layouts','awakened'),exist_ok=True)
json.dump({'id':LAYOUT_ID,'width':W,'height':H,'tileset':TS,'metatiles':m,'collision':collision},
          open(os.path.join(ROOT,'data','layouts','awakened',LAYOUT_ID+'.json'),'w'))
json.dump({'id':'MAP_SAMPLE_GLADE','name':NAME,'region':'awakened','layout':LAYOUT_ID,
           'music':'','weather':'WEATHER_NONE','map_type':'MAP_TYPE_ROUTE','allow_running':True,
           'allow_cycling':False,'show_map_name':True,'connections':[],'npcs':[],'warps':[],
           'triggers':[],'signs':[]},open(os.path.join(ROOT,'data','maps','awakened',NAME+'.json'),'w'))
idxp=os.path.join(ROOT,'data','maps','awakened_index.json')
idx=json.load(open(idxp)); idx['MAP_SAMPLE_GLADE']=NAME; json.dump(idx,open(idxp,'w'))

S=20
out=Image.new('RGBA',(W*S,H*S),(20,24,20,255))
for y in range(H):
    for x in range(W):
        t=m[y*W+x]
        out.alpha_composite(img(GRASS).resize((S,S),Image.NEAREST),(x*S,y*S))
        out.alpha_composite(img(t).resize((S,S),Image.NEAREST),(x*S,y*S))
out.save('/tmp/sample_glade.png'); print('wrote files + /tmp/sample_glade.png',out.size)
