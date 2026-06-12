#!/usr/bin/env python3
"""Re-import PunyWorld preserving original layout (no dedup/skip) so multi-tile
buildings can be addressed by original (col,row): index = row*COLS + col.
Source 27x65 tiles -> re-laid 16/row (renderer draws by index, sheet pos
irrelevant). CC0 (Shade)."""
import json, os
from PIL import Image
SRC='/tmp/puny/punyworld.png'; TS_DIR=os.path.join(os.path.dirname(__file__),'..','data','tilesets')
NAME='punyworld_full'; T=16; PR=16
im=Image.open(SRC).convert('RGBA'); W,H=im.size; COLS,ROWS=W//T,H//T
n=COLS*ROWS
def avg(t):
    px=t.load(); r=g=b=na=0
    for y in range(T):
        for x in range(T):
            a=px[x,y]
            if a[3]>40: r+=a[0];g+=a[1];b+=a[2];na+=1
    return (r//na,g//na,b//na,na) if na else None
beh=[0]*n; col=[0]*n; sheet=Image.new('RGBA',(PR*T,((n+PR-1)//PR)*T),(0,0,0,0))
for r in range(ROWS):
    for c in range(COLS):
        idx=r*COLS+c; t=im.crop((c*T,r*T,c*T+T,r*T+T))
        sheet.paste(t,((idx%PR)*T,(idx//PR)*T))
        a=avg(t)
        if a and a[2]>85 and a[2]>a[0]+25 and a[2]>a[1]+10: beh[idx]=0x10;col[idx]=1
os.makedirs(TS_DIR,exist_ok=True); sheet.save(os.path.join(TS_DIR,NAME+'.png'))
json.dump({'total_metatiles':n,'primary_count':n,'secondary_count':0,'metatiles_per_row':PR,
           'cols_original':COLS,'behaviors':beh,'collisions':col},open(os.path.join(TS_DIR,NAME+'.json'),'w'))
open(os.path.join(TS_DIR,NAME+'.LICENSE.txt'),'w').write(
 "punyworld_full — PunyWorld (Shade) preserving original layout. CC0.\n"
 "index = row*%d + col. https://opengameart.org/content/16x16-puny-world-tileset\n"%COLS)
print(f"wrote {NAME}: {n} tiles ({COLS}x{ROWS}), index=row*{COLS}+col")
