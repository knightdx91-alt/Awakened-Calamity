#!/usr/bin/env python3
"""Build a playable sample forest map on the CC0 forest_cc0 tileset and render a
preview. Auto-selects representative tiles (grass/water/dirt/tree/stone/bush)
from the 268 converted metatiles, since the engine has no autotiler.
"""
import json, os, random
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
TS = 'forest_cc0'
NAME = 'SampleForest'
LAYOUT_ID = 'LAYOUT_SAMPLE_FOREST'
W, H = 24, 18
random.seed(7)

sheet = Image.open(os.path.join(ROOT, 'data', 'tilesets', TS + '.png')).convert('RGBA')
meta = json.load(open(os.path.join(ROOT, 'data', 'tilesets', TS + '.json')))
labels, beh, col = meta['labels'], meta['behaviors'], meta['collisions']
PR = meta['metatiles_per_row']

def tile_img(i):
    return sheet.crop(((i % PR)*16, (i//PR)*16, (i % PR)*16+16, (i//PR)*16+16))

def stats(i):
    px = tile_img(i).load(); r=g=b=n=0; vals=[]
    for y in range(16):
        for x in range(16):
            cr,cg,cb,ca = px[x,y]
            if ca > 40:
                r+=cr; g+=cg; b+=cb; n+=1; vals.append((cr,cg,cb))
    if n == 0: return None
    ar,ag,ab = r//n, g//n, b//n
    var = sum((vr-ar)**2+(vg-ag)**2+(vb-ab)**2 for vr,vg,vb in vals)/n
    return ar, ag, ab, var, n

def pick(pred, score):
    best, bs = None, -1e18
    for i, lab in enumerate(labels):
        s = stats(i)
        if s is None: continue
        if not pred(i, lab, s): continue
        sc = score(i, lab, s)
        if sc > bs: bs, best = sc, i
    return best

is_grass = lambda i,l,s: l.startswith('grass_') and not l.startswith('grass_deep') and not l.startswith('grass_dirt')
# cleanest, most uniform green grass
GRASS = pick(is_grass, lambda i,l,s: (s[1]-s[0]) + (s[1]-s[2]) - s[3]*0.05)
# a few detail grass variants (more variance)
GRASS_DETAIL = sorted(
    [i for i,l in enumerate(labels) if is_grass(i,l,stats(i) or (0,0,0,0,1))],
    key=lambda i: -stats(i)[3])[:4]
# solid deep water: bluest + low variance
WATER = pick(lambda i,l,s: l.startswith('grass_deep_water'),
             lambda i,l,s: s[2]*2 - s[0] - s[1] - s[3]*0.08)
# dirt clearing: tan (r,g high, b lower), uniform, from grass_dirt
DIRT = pick(lambda i,l,s: l.startswith('grass_dirt'),
            lambda i,l,s: (s[0]+s[1]) - s[2]*1.5 - s[3]*0.05 if s[0]>110 else -1e9)
# tree canopy (blocked, green) + trunk (blocked, brown) from trees sheet
TREE_CANOPY = pick(lambda i,l,s: l.startswith('trees') and col[i]==1,
                   lambda i,l,s: s[1] - s[2] - abs(s[0]-40))
TREE_TRUNK  = pick(lambda i,l,s: l.startswith('trees') and col[i]==1,
                   lambda i,l,s: s[0] - s[2] + (s[0]-s[1]))  # brownish
STONE = pick(lambda i,l,s: l.startswith('stones'),
             lambda i,l,s: -abs(s[0]-s[1]) - abs(s[1]-s[2]) - s[3]*0.02)  # grey
BUSH = pick(lambda i,l,s: l.startswith('bushes'), lambda i,l,s: s[1]-s[0])

print('picked  grass=%s detail=%s water=%s dirt=%s canopy=%s trunk=%s stone=%s bush=%s' %
      (GRASS, GRASS_DETAIL, WATER, DIRT, TREE_CANOPY, TREE_TRUNK, STONE, BUSH))

# ---- compose map ----
m = [GRASS]*(W*H)
def put(x,y,t):
    if 0<=x<W and 0<=y<H: m[y*W+x]=t
def rect(x0,y0,x1,y1,t):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1): put(x,y,t)

# scattered grass detail
for _ in range(40):
    put(random.randrange(W), random.randrange(H), random.choice(GRASS_DETAIL))
# a pond
rect(16,2,21,6, WATER)
# dirt clearing + a path toward it
rect(4,11,9,15, DIRT)
for x in range(9,17): put(x,13,DIRT)
# trees (trunk with canopy above) around the edges
for (tx,ty) in [(2,3),(5,5),(8,2),(12,4),(3,9),(20,12),(14,15),(18,9),(6,15),(22,3)]:
    put(tx,ty,TREE_TRUNK); put(tx,ty-1,TREE_CANOPY)
# stones + bushes scatter
for _ in range(8): put(random.randrange(W), random.randrange(H), STONE)
for _ in range(10): put(random.randrange(W), random.randrange(H), BUSH)

collision = [col[t] for t in m]

# ---- write engine files ----
os.makedirs(os.path.join(ROOT,'data','layouts','awakened'), exist_ok=True)
json.dump({'id':LAYOUT_ID,'width':W,'height':H,'tileset':TS,'metatiles':m,'collision':collision},
          open(os.path.join(ROOT,'data','layouts','awakened',LAYOUT_ID+'.json'),'w'))
json.dump({'id':'MAP_SAMPLE_FOREST','name':NAME,'region':'awakened','layout':LAYOUT_ID,
           'music':'','weather':'WEATHER_NONE','map_type':'MAP_TYPE_ROUTE','allow_running':True,
           'allow_cycling':False,'show_map_name':True,'connections':[],'npcs':[],'warps':[],
           'triggers':[],'signs':[]}, open(os.path.join(ROOT,'data','maps','awakened',NAME+'.json'),'w'))
idxp=os.path.join(ROOT,'data','maps','awakened_index.json')
idx=json.load(open(idxp)); idx['MAP_SAMPLE_FOREST']=NAME; json.dump(idx,open(idxp,'w'))

# ---- render preview ----
S=20
out=Image.new('RGBA',(W*S,H*S),(20,24,20,255))
for y in range(H):
    for x in range(W):
        t=m[y*W+x]
        out.alpha_composite(tile_img(GRASS).resize((S,S),Image.NEAREST),(x*S,y*S))  # grass underlay
        out.alpha_composite(tile_img(t).resize((S,S),Image.NEAREST),(x*S,y*S))
out.save('/tmp/sample_forest.png'); print('wrote map+layout+index + /tmp/sample_forest.png', out.size)
