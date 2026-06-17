#!/usr/bin/env python3
"""Generate a 50x50 RTP town map for Awakened Calamity.

Engine constraint: one tileset per layer (base + overlay). So:
  - BASE  = rtp_outside_ground (autotiled grass / dirt paths / cobble plaza)
  - OVERLAY = a CUSTOM packed sheet `town_props` (roofs, walls, windows, doors,
    well, fountain, fences, signs, barrels, crates, trees, bushes, flowers, crops)
Buildings are solid (collision), so roofs sitting in the overlay (below player) is
fine — you never walk behind them. Doors are events (RTP !Door charset).

Town design follows the researched RM techniques: central plaza with a well +
market, organic dirt paths, varied house sizes/roof colours with doors facing the
square, fences/crops around homes, layered tree edges, scattered detail.

Output: data/tilesets/town_props.{png,json}, data/layouts/awakened/LAYOUT_VERDANT_TOWN.json,
data/maps/awakened/VerdantTown.json (+ register in awakened_index.json).
"""
import json, os, random
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS   = os.path.join(ROOT, "data", "tilesets")
T    = 32
W = H = 50
random.seed(7)

# ---- pack a custom props sheet from A3 (roofs/walls) + B (objects) ----
# (source_sheet, source_tile_index, name)
PACK = [
    # roofs: (ridge tile on top, body fill below) per colour
    ("rtp_outside_a3", 1, "roof_o_ridge"), ("rtp_outside_a3", 17, "roof_o_body"),
    ("rtp_outside_a3", 9, "roof_r_ridge"), ("rtp_outside_a3", 25, "roof_r_body"),
    ("rtp_outside_a3", 7, "roof_b_ridge"), ("rtp_outside_a3", 23, "roof_b_body"),
    ("rtp_outside_a3", 5, "roof_g_ridge"), ("rtp_outside_a3", 21, "roof_g_body"),
    ("rtp_outside_a3", 13, "roof_s_ridge"), ("rtp_outside_a3", 29, "roof_s_body"),
    # walls (front face fill)
    ("rtp_outside_a3", 48, "wall_plaster"), ("rtp_outside_a3", 56, "wall_brick"),
    ("rtp_outside_a3", 50, "wall_stone"), ("rtp_outside_a3", 62, "wall_wood"),
    # building details (B)
    ("rtp_outside_b", 33, "window"), ("rtp_outside_b", 52, "window_glass"),
    ("rtp_outside_b", 68, "door"), ("rtp_outside_b", 70, "door_top"), ("rtp_outside_b", 65, "chimney"),
    # town objects (B)
    ("rtp_outside_b", 76, "well"), ("rtp_outside_b", 82, "fountain"),
    ("rtp_outside_b", 86, "fence_h"), ("rtp_outside_b", 87, "fence_v"),
    ("rtp_outside_b", 74, "sign"), ("rtp_outside_b", 78, "barrel"), ("rtp_outside_b", 117, "crate"),
    ("rtp_outside_b", 94, "tree"), ("rtp_outside_b", 103, "bush"), ("rtp_outside_b", 93, "stump"),
    ("rtp_outside_b", 96, "boulder"),
    ("rtp_outside_b", 97, "flower_r"), ("rtp_outside_b", 98, "flower_y"),
    ("rtp_outside_b", 99, "flower_p"), ("rtp_outside_b", 100, "flower_w"),
    ("rtp_outside_b", 89, "grass_tuft"), ("rtp_outside_b", 109, "crops"),
    ("rtp_outside_b", 107, "firewood"), ("rtp_outside_b", 105, "scarecrow"),
]

def build_props_sheet():
    cache = {}
    def sheet(n):
        if n not in cache: cache[n] = Image.open(os.path.join(TS, n + ".png")).convert("RGBA")
        return cache[n]
    PR = 16
    n = len(PACK); rows = (n + PR - 1) // PR
    out = Image.new("RGBA", (PR * T, rows * T), (0, 0, 0, 0))
    gid = {}
    for i, (sn, idx, name) in enumerate(PACK):
        s = sheet(sn); cols = s.width // T
        cell = s.crop(((idx % cols) * T, (idx // cols) * T, (idx % cols) * T + T, (idx // cols) * T + T))
        out.paste(cell, ((i % PR) * T, (i // PR) * T))
        gid[name] = i
    out.save(os.path.join(TS, "town_props.png"))
    json.dump({"total_metatiles": n, "primary_count": n, "secondary_count": 0, "tile": T,
               "metatiles_per_row": PR, "source": "RTP A3+B packed for the town (prototype)",
               "behaviors": [0] * n, "collisions": [0] * n},
              open(os.path.join(TS, "town_props.json"), "w"))
    # register
    ip = os.path.join(TS, "_index.json"); idx = json.load(open(ip))
    if "town_props" not in idx: json.dump(sorted(set(idx) | {"town_props"}), open(ip, "w"))
    return gid, n

GID, NPROPS = build_props_sheet()

# ---- ground autotile LUTs (from the baked rtp_outside_ground) ----
GCFG = json.load(open(os.path.join(TS, "rtp_outside_ground.autotile.json")))
GCOUNT = json.load(open(os.path.join(TS, "rtp_outside_ground.json")))["total_metatiles"]
DIRT = GCFG["terrains"]["dirt"]["lut"]; COBBLE = GCFG["terrains"]["cobble"]["lut"]
DIRS = [(0,-1,1),(1,-1,2),(1,0,4),(1,1,8),(0,1,16),(-1,1,32),(-1,0,64),(-1,-1,128)]

# ---- town layout grids ----
terr   = [["grass"]*W for _ in range(H)]   # grass | dirt | cobble
over   = [-1]*(W*H)                          # overlay props gid (-1 none)
coll   = [0]*(W*H)
events = []
def setp(x,y,name,block=True):
    if 0<=x<W and 0<=y<H:
        over[y*W+x]=GID[name]
        if block: coll[y*W+x]=1
def blockcell(x,y):
    if 0<=x<W and 0<=y<H: coll[y*W+x]=1

# central cobble plaza
PX0,PY0,PX1,PY1 = 19,19,30,30
for y in range(PY0,PY1+1):
    for x in range(PX0,PY1 and PX1+1):
        terr[y][x]="cobble"

# dirt paths: cross through the plaza out to the edges (slightly organic)
def path_h(y, x0, x1, jitter=0):
    yy=y
    for x in range(min(x0,x1),max(x0,x1)+1):
        if jitter and random.random()<0.18: yy=max(1,min(H-2,yy+random.choice([-1,1])))
        for w in (0,1):
            if terr[yy+w][x]=="grass": terr[yy+w][x]="dirt"
def path_v(x, y0, y1, jitter=0):
    xx=x
    for y in range(min(y0,y1),max(y0,y1)+1):
        if jitter and random.random()<0.18: xx=max(1,min(W-2,xx+random.choice([-1,1])))
        for w in (0,1):
            if terr[y][xx+w]=="grass": terr[y][xx+w]="dirt"
path_h(24, 0, PX0, 1); path_h(24, PX1, W-1, 1)
path_v(24, 0, PY0, 1); path_v(24, PY1, H-1, 1)
path_v(34, PY1, H-1, 1); path_h(14, 6, PX0, 1); path_v(40, 8, 40, 1)

# ---- houses ----  (x,y,w,h, roof, wall, door_dx)
ROOFS = {"o":("roof_o_ridge","roof_o_body"),"r":("roof_r_ridge","roof_r_body"),
         "b":("roof_b_ridge","roof_b_body"),"g":("roof_g_ridge","roof_g_body"),
         "s":("roof_s_ridge","roof_s_body")}
WALLS = ["wall_plaster","wall_brick","wall_stone","wall_wood"]

def house(x,y,w,h,roof,wall,door_dx=None):
    ridge,body = ROOFS[roof]
    if wall not in GID: wall = "wall_" + wall
    if door_dx is None: door_dx = w//2
    for j in range(h):
        for i in range(w):
            cx,cy=x+i,y+j
            if not (0<=cx<W and 0<=cy<H): continue
            if j < h-1:                      # roof
                setp(cx,cy, ridge if j==0 else body)
            else:                            # front wall row
                if i==door_dx:
                    setp(cx,cy,"door"); events.append({"x":cx,"y":cy})
                elif i in (door_dx-1,door_dx+1) and w>=4 and 0<=i<w:
                    setp(cx,cy,"window")
                else:
                    setp(cx,cy,wall)
    # chimney on the roof
    if w>=4 and h>=4: setp(x+w-2,y, "chimney")

# A designed set of houses around the plaza (doors face inward / toward paths)
HOUSES = [
    (6,8,6,5,"r","brick"), (14,7,5,5,"o","plaster"), (33,7,6,5,"b","stone"),
    (41,9,5,5,"g","wood"), (6,16,5,5,"o","wood"), (40,17,6,5,"r","brick"),
    (7,33,6,5,"b","plaster"), (15,35,5,4,"g","stone"), (33,34,6,5,"o","brick"),
    (41,33,5,5,"r","wood"), (10,42,5,4,"s","stone"), (30,42,6,4,"b","plaster"),
    (38,41,5,4,"g","brick"),
    # town hall / larger building near the plaza top
    (22,9,8,6,"s","stone"),
]
for hx,hy,hw,hh,rf,wl in HOUSES:
    house(hx,hy,hw,hh,rf, wl)

# fountain at plaza centre (well as the centrepiece), market around it
setp(24,24,"fountain"); blockcell(24,24)
for (dx,dy,obj) in [(-3,-2,"barrel"),(-3,-1,"barrel"),(3,-2,"crate"),(3,-1,"crate"),
                    (-2,3,"sign"),(2,3,"sign"),(-3,2,"barrel"),(3,2,"crate")]:
    setp(24+dx,24+dy,obj)
# a real well too, off to one side of the plaza
setp(28,21,"well")

# fences + crops + flowers around some homes (gardens)
def garden(x,y,w,h):
    for i in range(w):
        if terr[y+h][x+i]!="cobble": setp(x+i,y+h,"fence_h")
    for j in range(h):
        if terr[y+j][x-1]!="cobble": setp(x-1,y+j,"fence_v")
    for i in range(0,w,2):
        if random.random()<0.6: setp(x+i,y+h-1,"crops",block=False)
garden(6,14,5,1)
garden(33,40,6,1)

# scattered nature: trees forming edges + clusters, bushes, flowers, boulders
flowers=["flower_r","flower_y","flower_p","flower_w"]
def scatter(name, n, block=True, avoid_paths=True):
    placed=0; tries=0
    while placed<n and tries<n*40:
        tries+=1; x=random.randint(1,W-2); y=random.randint(1,H-2)
        if over[y*W+x]!=-1 or coll[y*W+x]: continue
        if avoid_paths and terr[y][x]!="grass": continue
        setp(x,y,name,block=block); placed+=1
# forest border ring of trees
for x in range(1,W-1):
    for y in (1,2, H-3,H-2):
        if over[y*W+x]==-1 and terr[y][x]=="grass" and random.random()<0.55: setp(x,y,"tree")
for y in range(1,H-1):
    for x in (1,2, W-3,W-2):
        if over[y*W+x]==-1 and terr[y][x]=="grass" and random.random()<0.55: setp(x,y,"tree")
scatter("tree", 40); scatter("bush", 24)
for f in flowers: scatter(f, 8, block=False)
scatter("grass_tuft", 30, block=False)
scatter("boulder", 8); scatter("stump", 6); scatter("firewood", 4)

# ---- bake ground metatiles from terrain ----
def same(g,x,y,name): return 0<=y<H and 0<=x<W and g[y][x]==name
meta=[0]*(W*H); flat_terr=['']*(W*H)
for y in range(H):
    for x in range(W):
        t=terr[y][x]; i=y*W+x; flat_terr[i]='' if t=='grass' else t
        if t=='grass': meta[i]=0
        else:
            m=sum(b for dx,dy,b in DIRS if same(terr,x+dx,y+dy,t))
            meta[i]=(DIRT if t=='dirt' else COBBLE)[m]

# ---- write layout + map ----
layout={"id":"LAYOUT_VERDANT_TOWN","width":W,"height":H,
        "tileset":"rtp_outside_ground","tileset_group":[{"name":"rtp_outside_ground","offset":0,"count":GCOUNT}],
        "metatiles":meta,"collision":coll,"terrain":flat_terr,
        "overlay_tileset":"town_props","overlay":over}
os.makedirs(os.path.join(ROOT,"data","layouts","awakened"),exist_ok=True)
json.dump(layout,open(os.path.join(ROOT,"data","layouts","awakened","LAYOUT_VERDANT_TOWN.json"),"w"))

mapobj={"id":"MAP_VERDANT_TOWN","name":"VerdantTown","region":"awakened","parent":"","layout":"LAYOUT_VERDANT_TOWN",
        "music":"MUS_NONE","weather":"WEATHER_NONE","map_type":"MAP_TYPE_TOWN","allow_running":True,
        "show_map_name":True,"connections":[],"npcs":[],"warps":[],"triggers":[],"signs":[],
        "events":[{"id":i+1,"name":"Door%d"%(i+1),"x":e["x"],"y":e["y"],
                   "graphic":{"sprite":"Door1","file":"rtp/!Door1.png","frame_w":32,"frame_h":32,"cols":3,"rows":4,"single":True},
                   "dir":"down","trigger":"action","through":False,
                   "commands":[{"type":"text","text":"The door is locked."}]} for i,e in enumerate(events)]}
os.makedirs(os.path.join(ROOT,"data","maps","awakened"),exist_ok=True)
json.dump(mapobj,open(os.path.join(ROOT,"data","maps","awakened","VerdantTown.json"),"w"))

# register in region index
ipath=os.path.join(ROOT,"data","maps","awakened_index.json"); idx=json.load(open(ipath))
idx["MAP_VERDANT_TOWN"]="VerdantTown"; idx["VerdantTown"]="VerdantTown"
json.dump(idx,open(ipath,"w"))

print(f"Town built: {len(HOUSES)} houses, {len(events)} doors, props sheet {NPROPS} tiles.")
print("ground tiles:", GCOUNT, "| map VerdantTown registered in awakened region.")
