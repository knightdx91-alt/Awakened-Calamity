#!/usr/bin/env python3
"""Assemble Demetrius's CC0 '16x16 tileset: water, grass and sand' into engine
format. Source: https://opengameart.org/content/16x16-tileset-water-grass-and-sand
License: CC0 (public domain, no attribution). Named border/corner pieces for
grass<->sand and sand<->water coastlines (ideal for autotiling later).
Classify: water -> 0x10 blocked; trees -> blocked; grass/sand -> walkable."""
import json, os, glob
from PIL import Image
SRC='/tmp/tiles5/tiles'; TS_DIR=os.path.join(os.path.dirname(__file__),'..','data','tilesets')
NAME='coast_cc0'; T=16; PR=16
# logical order: fills, trees, grass-sand, sand-grass, water-sand, sand-water
order=['grass1','sand1','water1','trees1','trees2',
 'grass_top_border_sand','grass_bottom_border_sand','grass_left_border_sand','grass_right_border_sand',
 'grass_upper_left_corner_sand','grass_upper_right_corner_sand','grass_lower_left_corner_sand','grass_lower_right_corner_sand',
 'sand_upper_left_corner_grass','sand_upper_right_corner_grass','sand_lower_left_corner_grass','sand_lower_right_corner_grass',
 'water_top_border_sand','water_bottom_border_sand','water_left_border_sand','water_right_border_sand',
 'water_upper_left_corner_sand','water_upper_right_corner_sand','water_lower_left_corner_sand','water_lower_right_corner_sand',
 'sand_upper_left_corner_water','sand_upper_right_corner_water','sand_lower_left_corner_water','sand_lower_right_corner_water']
present=[os.path.basename(p)[:-4] for p in glob.glob(SRC+'/*.png')]
order=[n for n in order if n in present]+[n for n in present if n not in order]
tiles=[];beh=[];col=[];labels=[]
for name in order:
    im=Image.open(os.path.join(SRC,name+'.png')).convert('RGBA'); tiles.append(im); labels.append(name)
    if name.startswith('water'): beh.append(0x10); col.append(1)
    elif name.startswith('trees'): beh.append(0); col.append(1)
    else: beh.append(0); col.append(0)
n=len(tiles); rows=(n+PR-1)//PR
sheet=Image.new('RGBA',(PR*T,rows*T),(0,0,0,0))
for i,t in enumerate(tiles): sheet.paste(t,((i%PR)*T,(i//PR)*T))
os.makedirs(TS_DIR,exist_ok=True); sheet.save(os.path.join(TS_DIR,NAME+'.png'))
json.dump({'total_metatiles':n,'primary_count':n,'secondary_count':0,'metatiles_per_row':PR,
           'labels':labels,'behaviors':beh,'collisions':col},open(os.path.join(TS_DIR,NAME+'.json'),'w'))
open(os.path.join(TS_DIR,NAME+'.LICENSE.txt'),'w').write(
 "coast_cc0 — '16x16 tileset: water, grass and sand' by Demetrius.\n"
 "License: CC0 1.0 (public domain). No attribution required.\n"
 "Source: https://opengameart.org/content/16x16-tileset-water-grass-and-sand\n")
print(f"wrote {NAME}: {n} tiles ({sum(1 for b in beh if b==0x10)} water, {sum(col)} blocked)")
