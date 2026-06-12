#!/usr/bin/env python3
"""Import the official Awakened Calamity tilesets (design-system/assets/tilesets)
into engine format: re-lay each sheet to 16 metatiles/row (renderer requirement),
preserving index = row*origCols + col. Auto-classify water/lava/void + object
sheets. Original IP-clean art (owner-produced)."""
import json, os
from PIL import Image
ROOT=os.path.join(os.path.dirname(__file__),'..')
SRC=os.path.join(ROOT,'design-system','assets','tilesets')
TS_DIR=os.path.join(ROOT,'data','tilesets'); T=16; PR=16
SHEETS={'ac-terrain-16.png':('ac_terrain','ground'),
        'ac-terrain2-16.png':('ac_terrain2','ground'),
        'ac-buildings-16.png':('ac_buildings','object'),
        'ac-dungeon-16.png':('ac_dungeon','ground'),
        'ac-props-16.png':('ac_props','object')}
def classify(tile, kind):
    px=tile.load(); r=g=b=n=tr=0
    for y in range(T):
        for x in range(T):
            a=px[x,y]
            if a[3]<128: tr+=1; continue
            r+=a[0];g+=a[1];b+=a[2];n+=1
    if n==0: return 0,0
    ar,ag,ab=r//n,g//n,b//n; transp=tr/256
    if ab>90 and ab>ar+25 and ab>ag+5: return 0x10,1            # water
    if ar>150 and ag<120 and ab<80 and ar>ag+40: return 0x00,1  # lava
    if ab>ar+20 and ar>60 and ag<ar: return 0x08,0              # void-ish purple
    if kind=='object': return 0x00, (1 if transp<0.55 else 0)   # opaque object blocks
    if max(ar,ag,ab)<46: return 0x00,1                          # near-black wall
    return 0x00,0
for fn,(name,kind) in SHEETS.items():
    im=Image.open(os.path.join(SRC,fn)).convert('RGBA'); W,H=im.size; COLS=W//T; ROWS=H//T; nt=COLS*ROWS
    beh=[0]*nt; col=[0]*nt
    sheet=Image.new('RGBA',(PR*T,((nt+PR-1)//PR)*T),(0,0,0,0))
    for r in range(ROWS):
        for c in range(COLS):
            idx=r*COLS+c; t=im.crop((c*T,r*T,c*T+T,r*T+T))
            sheet.paste(t,((idx%PR)*T,(idx//PR)*T))
            b,cl=classify(t,kind); beh[idx]=b; col[idx]=cl
    sheet.save(os.path.join(TS_DIR,name+'.png'))
    json.dump({'total_metatiles':nt,'primary_count':nt,'secondary_count':0,'metatiles_per_row':PR,
               'cols_original':COLS,'behaviors':beh,'collisions':col},open(os.path.join(TS_DIR,name+'.json'),'w'))
    open(os.path.join(TS_DIR,name+'.LICENSE.txt'),'w').write(
      "%s — official Awakened Calamity art (owner-produced, IP-clean).\nSee design-system/.\n"%name)
    print(f"{name}: {nt} tiles ({COLS}x{ROWS}), water/object classified")
