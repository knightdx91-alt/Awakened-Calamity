#!/usr/bin/env python3
"""Build data/sprites/player.png from the CC0 Puny Character-Base sheet, in the
renderer's expected format: a horizontal strip of 9 frames, each 16x32, indices
matching WALK_FRAMES (down/up/left x stand/step1/step2; right mirrors left).
Source frames are 32x32 (24x8 grid). Directions: r0=down, r2=left, r4=up.
"""
import os
from PIL import Image
SRC='data/sprites/puny/Character-Base.png'
OUT='data/sprites/player.png'
im=Image.open(SRC).convert('RGBA')
F=32
def frame(r,c): return im.crop((c*F,r*F,c*F+F,r*F+F))
# WALK_FRAMES order: 0 down.stand,1 up.stand,2 left.stand,3 down.s1,4 down.s2,
#                    5 up.s1,6 up.s2,7 left.s1,8 left.s2
src=[(0,0),(4,0),(2,0),(0,2),(0,3),(4,2),(4,3),(2,2),(2,3)]
CELL_W,CELL_H=16,32
strip=Image.new('RGBA',(CELL_W*len(src),CELL_H),(0,0,0,0))
for i,(r,c) in enumerate(src):
    fr=frame(r,c); bb=fr.getbbox()
    content=fr.crop(bb); w,h=content.size
    cell=Image.new('RGBA',(CELL_W,CELL_H),(0,0,0,0))
    px=max(0,round((CELL_W-w)/2)); py=CELL_H-h           # feet aligned to bottom
    cell.alpha_composite(content,(px,py))
    strip.paste(cell,(i*CELL_W,0))
os.makedirs('data/sprites',exist_ok=True)
strip.save(OUT)
print('wrote',OUT,strip.size,'(9 frames of 16x32)')
