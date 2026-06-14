#!/usr/bin/env python3
"""Town mockup built ENTIRELY from the owner's official design-bundle art:
ac-terrain-16 (grass), ac-road-autotile-16 (3x3 road), ac-buildings-16 (the
authored building kit), ac-props-16 (props). Buildings are assembled from the
kit's real roof/eave/corner/wall/door pieces (cohesive palette, proper
construction) — not procedural shading.

Requires the official PNGs in OFF dir (extracted from the design-bundle branch).
"""
import os
import random
from PIL import Image

OFF = os.environ.get("OFF", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src/assets/tiles"))
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "data/art/official_town_mockup.png")
TILE = 16
W, H = 44, 30
rnd = random.Random(11)

terr = Image.open(os.path.join(OFF, "ac-terrain-16.png")).convert("RGBA")
bld = Image.open(os.path.join(OFF, "ac-buildings-16.png")).convert("RGBA")
props = Image.open(os.path.join(OFF, "ac-props-16.png")).convert("RGBA")
road = Image.open(os.path.join(OFF, "ac-road-autotile-16.png")).convert("RGBA")


def cut(sheet, idx, per_row):
    c, r = idx % per_row, idx // per_row
    return sheet.crop((c * TILE, r * TILE, c * TILE + TILE, r * TILE + TILE))


GRASS = cut(terr, 0, 8)
canvas = Image.new("RGBA", (W * TILE, H * TILE), (0, 0, 0, 255))
for ty in range(H):
    for tx in range(W):
        canvas.paste(GRASS, (tx * TILE, ty * TILE))


# --- road network (mask) + 3x3 autotile ------------------------------------
rd = [[False] * W for _ in range(H)]
def rh(row, x0, x1, w=2):
    for r in range(row, row + w):
        for c in range(x0, x1 + 1):
            if 0 <= r < H and 0 <= c < W: rd[r][c] = True
def rv(col, y0, y1, w=2):
    for c in range(col, col + w):
        for r in range(y0, y1 + 1):
            if 0 <= r < H and 0 <= c < W: rd[c if False else r][c] = True
rh(15, 2, 41); rv(21, 3, 27); rh(8, 9, 35, 1); rv(10, 8, 15, 1); rv(33, 8, 15, 1)

def is_rd(r, c): return 0 <= r < H and 0 <= c < W and rd[r][c]
def road_tile(r, c):
    n, s, e, w = is_rd(r-1, c), is_rd(r+1, c), is_rd(r, c+1), is_rd(r, c-1)
    if not n and not w: i = 0
    elif not n and not e: i = 2
    elif not s and not w: i = 6
    elif not s and not e: i = 8
    elif not n: i = 1
    elif not s: i = 7
    elif not w: i = 3
    elif not e: i = 5
    else: i = 4
    return cut(road, i, 3)
for r in range(H):
    for c in range(W):
        if rd[r][c]:
            canvas.paste(road_tile(r, c), (c * TILE, r * TILE))


# --- buildings assembled from the official kit -----------------------------
# kit roof = [TL,top,TR, eaveL,eave,eaveR]; wall = [wall, wall+win, L, R, doorTop, door]
MAT = {
    "red":   {"roof": [0, 1, 2, 3, 4, 5],   "wall": [24, 25, 26, 27, 28, 29]},
    "blue":  {"roof": [8, 9, 10, 11, 12, 13],"wall": [24, 25, 26, 27, 28, 29]},
    "thatch":{"roof": [16, 17, 18, 19, 20, 21],"wall": [24, 25, 26, 27, 28, 29]},
    "stone": {"roof": [36, 37, 37, 36, 37, 37],"wall": [30, 31, 32, 33, 34, 35]},
}
def building(mat, w, wall_rows=2):
    m = MAT[mat]; roof, wall = m["roof"], m["wall"]
    grid = []
    grid.append([roof[0]] + [roof[1]] * (w - 2) + [roof[2]])
    grid.append([roof[3]] + [roof[4]] * (w - 2) + [roof[5]])
    door = w // 2
    for wr in range(wall_rows):
        bottom = wr == wall_rows - 1
        row = []
        for c in range(w):
            if c == door:
                row.append(wall[5] if bottom else wall[4])
            elif c == 0:
                row.append(wall[2])
            elif c == w - 1:
                row.append(wall[3])
            elif (not bottom) and c % 2 == 0:
                row.append(wall[1])
            else:
                row.append(wall[0])
        grid.append(row)
    return grid

def stamp_building(mat, tx, ty, w, wall_rows=2):
    grid = building(mat, w, wall_rows)
    for r, row in enumerate(grid):
        for c, idx in enumerate(row):
            canvas.alpha_composite(cut(bld, idx, 8), ((tx + c) * TILE, (ty + r) * TILE))

# north of main street (door faces down toward street at row 15)
stamp_building("red", 4, 11, 5, 2)
stamp_building("blue", 11, 10, 6, 3)
stamp_building("thatch", 25, 11, 5, 2)
stamp_building("red", 33, 11, 4, 2)
# south of main street
stamp_building("blue", 6, 24, 5, 2)
stamp_building("thatch", 14, 25, 4, 2)
stamp_building("red", 25, 24, 6, 2)
stamp_building("blue", 34, 25, 4, 2)
# stone keep up top
stamp_building("stone", 18, 5, 6, 3)


# --- props -----------------------------------------------------------------
def stamp_prop(idx, tx, ty):
    canvas.alpha_composite(cut(props, idx, 8), (tx * TILE, ty * TILE))
def stamp_prop2(top, base, tx, ty):  # 2-tall (well/fountain)
    canvas.alpha_composite(cut(props, top, 8), (tx * TILE, (ty - 1) * TILE))
    canvas.alpha_composite(cut(props, base, 8), (tx * TILE, ty * TILE))

stamp_prop2(8, 9, 21, 22)               # well at plaza
for tx, ty in [(2, 5), (40, 6), (3, 23), (41, 27), (9, 20), (31, 21), (16, 4), (38, 13)]:
    canvas.alpha_composite(cut(terr, rnd.choice([16, 17]), 8), (tx * TILE, (ty - 1) * TILE))  # trees (2-ish)
for tx, ty in [(19, 17), (24, 13)]:
    stamp_prop(10, tx, ty)              # signpost
for tx, ty in [(8, 18), (34, 18), (12, 22)]:
    stamp_prop(2, tx, ty)              # barrel
for c in range(4, 9):
    stamp_prop(12, c, 19)             # fence run
for tx, ty in [(28, 11), (6, 13), (37, 20), (22, 20)]:
    canvas.alpha_composite(cut(terr, 20, 8), (tx * TILE, ty * TILE))  # flowers

canvas.resize((W * TILE * 3, H * TILE * 3), Image.NEAREST).save(OUT)
print("wrote", OUT, canvas.size)
