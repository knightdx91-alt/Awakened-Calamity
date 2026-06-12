#!/usr/bin/env python3
"""Universal autotile-terrain synthesizer.

Most imported sheets don't ship grass-blended transition tiles (only
forest_terrain did, via its Godot .tres). This builds proper grass-blended
8-direction (wang8) autotile terrains from ANY terrain's *fill* tile by
compositing the feature over a grass base with correct blob geometry
(sides + outer corners + inner concave corners). Hard-edged GBA-style blend.

Output: data/tilesets/synth_terrain.png + .json + .autotile.json (wang8_lut).
Fills are sourced from existing CC0 tilesets (grass/water/sand from ufeff,
void from our own awakened_overgrowth). Result is original/CC0-clean.
"""
import json, os, hashlib
from PIL import Image

TS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'tilesets')
T = 16; PR = 16
# 8-dir bit order: top,TR,right,BR,bottom,BL,left,TL
def bits(m):
    return {'top':m&1,'tr':m&2,'right':m&4,'br':m&8,'bottom':m&16,'bl':m&32,'left':m&64,'tl':m&128}

def most_uniform_tile(path):
    im=Image.open(path).convert('RGBA'); w,h=im.size; best=None; bv=1e9
    for r in range(h//T):
        for c in range(w//T):
            t=im.crop((c*T,r*T,c*T+T,r*T+T)); px=t.load(); v=[]
            ok=True
            for y in range(T):
                for x in range(T):
                    a=px[x,y]
                    if a[3]<200: ok=False;break
                    v.append(a[:3])
                if not ok: break
            if not ok or not v: continue
            ar=sum(p[0] for p in v)//len(v);ag=sum(p[1] for p in v)//len(v);ab=sum(p[2] for p in v)//len(v)
            var=sum((p[0]-ar)**2+(p[1]-ag)**2+(p[2]-ab)**2 for p in v)/len(v)
            if var<bv: bv,best=var,t.copy()
    return best

def rng(seed):
    h=hashlib.md5(str(seed).encode()).digest();i=0
    while True:
        for b in h: yield b/255.0
        i+=1;h=hashlib.md5(h+bytes([i&255])).digest()

B=5; C=3
def synth_tile(feat, grass, m, seed):
    """feat/grass: 16x16 fill tiles. m: 8-bit neighbour mask (set=feature)."""
    out=feat.copy(); fp=out.load(); gp=grass.load(); b=bits(m); g=rng(seed)
    for y in range(T):
        for x in range(T):
            wob=1 if next(g)<.35 else 0
            grassy=False
            if not b['top']    and y < B-wob: grassy=True
            if not b['bottom'] and y >= T-B+wob: grassy=True
            if not b['left']   and x < B-wob: grassy=True
            if not b['right']  and x >= T-B+wob: grassy=True
            # inner concave corners: both sides feature but diagonal grass
            if b['top'] and b['left'] and not b['tl'] and x<C and y<C: grassy=True
            if b['top'] and b['right'] and not b['tr'] and x>=T-C and y<C: grassy=True
            if b['bottom'] and b['left'] and not b['bl'] and x<C and y>=T-C: grassy=True
            if b['bottom'] and b['right'] and not b['br'] and x>=T-C and y>=T-C: grassy=True
            if grassy: fp[x,y]=gp[x,y]
    return out

SIDE={0,2,4,6}
def build_lut(masks):
    def dist(a,b):
        s=0
        for i in range(8):
            if((a>>i)&1)!=((b>>i)&1): s+= 2 if i in SIDE else 1
        return s
    return [min(range(len(masks)),key=lambda k:dist(masks[k],want)) for want in range(256)]

# canonical mask set: all combos actually used by the blob (dedupe identical tiles)
def terrain_tiles(feat, grass, seed0):
    seen={}; order=[]; tile_by_mask={}
    for m in range(256):
        t=synth_tile(feat,grass,m,seed0)
        key=t.tobytes()
        if key not in seen:
            seen[key]=len(order); order.append(t)
        tile_by_mask[m]=seen[key]
    lut=[tile_by_mask[m] for m in range(256)]
    return order, lut

def build():
    grass=most_uniform_tile(os.path.join(TS_DIR,'ufeff.png')) or most_uniform_tile(os.path.join(TS_DIR,'forest_terrain.png'))
    # grass specifically green: prefer ufeff grass.png fill if present in /tmp
    gt='/tmp/ufeff/grass.png'
    if os.path.exists(gt): grass=most_uniform_tile(gt)
    feats=[]
    # void: our own corrupted-void tile (awakened_overgrowth index 0)
    ov=Image.open(os.path.join(TS_DIR,'awakened_overgrowth.png')).convert('RGBA')
    feats.append(('void', ov.crop((0,0,T,T)), 0x08, 0))
    for nm,src,beh,col in [('water','/tmp/ufeff/water.png',0x10,1),
                           ('sand','/tmp/ufeff/sand.png',0x00,0),
                           ('stone','/tmp/ufeff/stone.png',0x00,1)]:
        if os.path.exists(src):
            feats.append((nm, most_uniform_tile(src), beh, col))

    tiles=[grass]; beh=[0]; col=[0]
    cfg={'tile':T,'per_row':PR,'scheme':'wang8_lut','terrains':{},'fills':{'grass':0}}
    for i,(nm,feat,b,c) in enumerate(feats):
        order,lut=terrain_tiles(feat,grass,i*1000+1)
        start=len(tiles)
        for t in order: tiles.append(t); beh.append(b); col.append(c)
        cfg['terrains'][nm]={'lut':[start+k for k in lut],'behavior':b,'collision':c,'count':len(order)}
    n=len(tiles); rows=(n+PR-1)//PR
    sheet=Image.new('RGBA',(PR*T,rows*T),(0,0,0,0))
    for i,t in enumerate(tiles): sheet.paste(t,((i%PR)*T,(i//PR)*T))
    os.makedirs(TS_DIR,exist_ok=True); sheet.save(os.path.join(TS_DIR,'synth_terrain.png'))
    json.dump({'total_metatiles':n,'primary_count':n,'secondary_count':0,'metatiles_per_row':PR,
               'behaviors':beh,'collisions':col},open(os.path.join(TS_DIR,'synth_terrain.json'),'w'))
    json.dump(cfg,open(os.path.join(TS_DIR,'synth_terrain.autotile.json'),'w'))
    open(os.path.join(TS_DIR,'synth_terrain.LICENSE.txt'),'w').write(
      "synth_terrain — grass-blended autotile terrains synthesised from CC0 fills\n"
      "(grass/water/sand: ufeff CC0; void: our own art). Public-domain-clean.\n")
    print(f"wrote synth_terrain: {n} tiles; terrains={list(cfg['terrains'])}")

if __name__=='__main__': build()
