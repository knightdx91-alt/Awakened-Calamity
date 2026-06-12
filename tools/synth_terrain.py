#!/usr/bin/env python3
"""Universal autotile-terrain synthesizer — v2: layered terrain priorities.

v1 blended every terrain to grass only, so terrain-vs-terrain boundaries
(sand->water beaches, void->stone) met in hard seams. v2 introduces a PRIORITY
ORDER (low -> high): grass < sand < stone < water < void. For each terrain F we
synthesize a full wang8 blob against EVERY lower-priority base B (not just
grass). At bake time the editor:
  - treats higher-priority neighbours as "same" (F extends underneath them),
  - picks the edge art for the highest-priority lower neighbour actually
    adjacent (so water meeting sand uses the water-over-sand blob).

Config format (scheme wang8_lut, multi-base):
  priority: ['grass','sand','stone','water','void']
  terrains[name] = { behavior, collision, luts: { <base>: [256 x tileIdx] } }

Fills: grass/water/sand/stone from ufeff (CC0), void from our own art.
"""
import json, os, hashlib
from PIL import Image

TS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'tilesets')
T = 16; PR = 16

def bits(m):
    return {'top':m&1,'tr':m&2,'right':m&4,'br':m&8,
            'bottom':m&16,'bl':m&32,'left':m&64,'tl':m&128}

def most_uniform_tile(path):
    im=Image.open(path).convert('RGBA'); w,h=im.size; best=None; bv=1e9
    for r in range(h//T):
        for c in range(w//T):
            t=im.crop((c*T,r*T,c*T+T,r*T+T)); px=t.load(); v=[]; ok=True
            for y in range(T):
                for x in range(T):
                    a=px[x,y]
                    if a[3]<200: ok=False; break
                    v.append(a[:3])
                if not ok: break
            if not ok or not v: continue
            ar=sum(p[0] for p in v)//len(v); ag=sum(p[1] for p in v)//len(v); ab=sum(p[2] for p in v)//len(v)
            var=sum((p[0]-ar)**2+(p[1]-ag)**2+(p[2]-ab)**2 for p in v)/len(v)
            if var<bv: bv,best=var,t.copy()
    return best

def rng(seed):
    h=hashlib.md5(str(seed).encode()).digest(); i=0
    while True:
        for b in h: yield b/255.0
        i+=1; h=hashlib.md5(h+bytes([i&255])).digest()

B=5; C=3
def synth_tile(feat, base, m, seed):
    """Composite feature fill over base fill with blob-edge geometry for mask m."""
    out=feat.copy(); fp=out.load(); bp=base.load(); b=bits(m); g=rng(seed)
    for y in range(T):
        for x in range(T):
            wob=1 if next(g)<.35 else 0
            edged=False
            if not b['top']    and y < B-wob: edged=True
            if not b['bottom'] and y >= T-B+wob: edged=True
            if not b['left']   and x < B-wob: edged=True
            if not b['right']  and x >= T-B+wob: edged=True
            # inner concave corners
            if b['top'] and b['left'] and not b['tl'] and x<C and y<C: edged=True
            if b['top'] and b['right'] and not b['tr'] and x>=T-C and y<C: edged=True
            if b['bottom'] and b['left'] and not b['bl'] and x<C and y>=T-C: edged=True
            if b['bottom'] and b['right'] and not b['br'] and x>=T-C and y>=T-C: edged=True
            if edged: fp[x,y]=bp[x,y]
    return out

def pair_blob(feat, base, seed0):
    """Synthesize all 256 masks for feat-over-base, dedupe, return (tiles, lut)."""
    seen={}; order=[]; lut=[]
    for m in range(256):
        t=synth_tile(feat, base, m, seed0)    # same seed -> identical wobble -> dedupes
        key=t.tobytes()
        if key not in seen:
            seen[key]=len(order); order.append(t)
        lut.append(seen[key])
    return order, lut

def build():
    fills={}
    gt='/tmp/ufeff/grass.png'
    fills['grass']=most_uniform_tile(gt) if os.path.exists(gt) else most_uniform_tile(os.path.join(TS_DIR,'forest_terrain.png'))
    for nm,src in [('water','/tmp/ufeff/water.png'),('sand','/tmp/ufeff/sand.png'),('stone','/tmp/ufeff/stone.png')]:
        if os.path.exists(src): fills[nm]=most_uniform_tile(src)
    ov=Image.open(os.path.join(TS_DIR,'awakened_overgrowth.png')).convert('RGBA')
    fills['void']=ov.crop((0,0,T,T))

    PRIORITY=['grass','sand','stone','water','void']
    PRIORITY=[p for p in PRIORITY if p in fills]
    SPEC={'sand':(0x00,0),'stone':(0x00,1),'water':(0x10,1),'void':(0x08,0)}

    tiles=[fills['grass']]; beh=[0]; col=[0]
    cfg={'tile':T,'per_row':PR,'scheme':'wang8_lut','priority':PRIORITY,
         'fills':{'grass':0},'terrains':{}}
    seed=1
    for fi,fname in enumerate(PRIORITY):
        if fname=='grass': continue
        b,c=SPEC[fname]
        entry={'behavior':b,'collision':c,'luts':{}}
        for bname in PRIORITY[:fi]:                 # every lower-priority base
            order,lut=pair_blob(fills[fname], fills[bname], seed); seed+=1
            start=len(tiles)
            for t in order: tiles.append(t); beh.append(b); col.append(c)
            entry['luts'][bname]=[start+k for k in lut]
        # legacy single-lut fallback (grass) for older editor code paths
        entry['lut']=entry['luts'].get('grass')
        cfg['terrains'][fname]=entry
    n=len(tiles); rows=(n+PR-1)//PR
    sheet=Image.new('RGBA',(PR*T,rows*T),(0,0,0,0))
    for i,t in enumerate(tiles): sheet.paste(t,((i%PR)*T,(i//PR)*T))
    os.makedirs(TS_DIR,exist_ok=True); sheet.save(os.path.join(TS_DIR,'synth_terrain.png'))
    json.dump({'total_metatiles':n,'primary_count':n,'secondary_count':0,'metatiles_per_row':PR,
               'behaviors':beh,'collisions':col},open(os.path.join(TS_DIR,'synth_terrain.json'),'w'))
    json.dump(cfg,open(os.path.join(TS_DIR,'synth_terrain.autotile.json'),'w'))
    open(os.path.join(TS_DIR,'synth_terrain.LICENSE.txt'),'w').write(
      "synth_terrain — layered grass/sand/stone/water/void autotile terrains\n"
      "synthesised from CC0 fills (ufeff) + our own void art. Public-domain-clean.\n")
    pairs=sum(len(t['luts']) for t in cfg['terrains'].values())
    print(f"wrote synth_terrain: {n} tiles, {pairs} terrain-pair blobs, priority={PRIORITY}")

if __name__=='__main__': build()
