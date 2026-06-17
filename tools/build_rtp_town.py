#!/usr/bin/env python3
"""Generate VerdantTown — a 50x50 RTP town for Awakened Calamity (v2).

Built following researched RPG-Maker town/castle mapping technique (see the
session log + tools/render_town.py preview):
  - Houses = A3 roof (2x2 autotile, ridge row + eave row) with a 1-tile overhang,
    over A3/A4 wall faces (<=2 tiles tall so the 1-tile hero reads), with a B-sheet
    arched door (event) + windows + a chimney.  (Walls >2 tall "look very large".)
  - A stone keep: A3 grey walls + roof, 4 crenellated C-sheet corner towers
    (71/87/103/119), an arched gate, banners.  ("Combine walls and towers; leave
    room inside.")
  - Organic cobble avenues + plaza (well + market), dirt paths branching to every
    door, a pond (new rtp A1 water autotile), layered tree borders + clusters,
    gardens (fences/crops/flowers), scattered nature.

Engine constraint = one base tileset + one overlay per map, so we bake a combined
BASE tileset `vt_ground` (rtp_outside_ground grass/dirt/road/cobble + rtp water)
and pack a single OVERLAY sheet `town_props` (A3 roofs/walls + C towers/banners +
B details/nature). Buildings are solid; roofs sit in the overlay (below player) so
you never walk "behind" them.

Output: data/tilesets/vt_ground.*, data/tilesets/town_props.*,
data/layouts/awakened/LAYOUT_VERDANT_TOWN.json, data/maps/awakened/VerdantTown.json.
"""
import json, os, random
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS   = os.path.join(ROOT, "data", "tilesets")
T    = 32
W = H = 50
random.seed(11)

# ─────────────────────────── combined BASE tileset ───────────────────────────
GJ   = json.load(open(os.path.join(TS, "rtp_outside_ground.json")))
GCFG = json.load(open(os.path.join(TS, "rtp_outside_ground.autotile.json")))
WCFG = json.load(open(os.path.join(TS, "rtp_outside_water.autotile.json")))
GCOUNT = GJ["total_metatiles"]
WCOUNT = WCFG["terrains"]["water"]["count"]            # 47 water blob tiles

def build_base_tileset():
    g = Image.open(os.path.join(TS, "rtp_outside_ground.png")).convert("RGBA")
    w = Image.open(os.path.join(TS, "rtp_outside_water.png")).convert("RGBA")
    PR = 16
    n = GCOUNT + WCOUNT
    rows = (n + PR - 1) // PR
    sheet = Image.new("RGBA", (PR * T, rows * T), (0, 0, 0, 0))
    def blit(src, idx, dst):
        sc = src.width // T
        sheet.paste(src.crop(((idx % sc) * T, (idx // sc) * T, (idx % sc) * T + T, (idx // sc) * T + T)),
                    ((dst % PR) * T, (dst // PR) * T))
    for i in range(GCOUNT):
        blit(g, i, i)
    # water blob tiles live at water-sheet indices 1..WCOUNT
    for k in range(WCOUNT):
        blit(w, 1 + k, GCOUNT + k)
    sheet.save(os.path.join(TS, "vt_ground.png"))
    beh = GJ["behaviors"] + [16] * WCOUNT
    col = GJ["collisions"] + [1] * WCOUNT
    json.dump({"total_metatiles": n, "primary_count": n, "secondary_count": 0,
               "tile": T, "metatiles_per_row": PR,
               "source": "rtp_outside_ground + rtp A1 water (combined town base)",
               "behaviors": beh, "collisions": col},
              open(os.path.join(TS, "vt_ground.json"), "w"))
    ip = os.path.join(TS, "_index.json"); idx = json.load(open(ip))
    json.dump(sorted(set(idx) | {"vt_ground"}), open(ip, "w"))
    # LUTs remapped into the combined sheet
    dirt   = GCFG["terrains"]["dirt"]["lut"]
    cobble = GCFG["terrains"]["cobble"]["lut"]
    road   = GCFG["terrains"]["road"]["lut"]
    water  = [GCOUNT + (v - 1) for v in WCFG["terrains"]["water"]["lut"]]
    return n, {"dirt": dirt, "cobble": cobble, "road": road, "water": water}

BASE_N, LUT = build_base_tileset()

# ─────────────────────────── OVERLAY props sheet ───────────────────────────
# A3 roof colours: block (col,row) -> 4 tiles TL,TR,BL,BR (2x2 autotile = seamless
# ridge row + eave row when repeated). A3 sheet is 16 wide.
def a3_block(bc, br):  # block coords -> the 4 metatile indices
    c, r = bc * 2, br * 2
    return [r * 16 + c, r * 16 + c + 1, (r + 1) * 16 + c, (r + 1) * 16 + c + 1]

ROOF_BLOCKS = {"orange": (0, 0), "brown": (1, 0), "green": (2, 0), "blue": (3, 0),
               "red": (4, 0), "gold": (5, 0), "sage": (6, 0)}
# A3 block rows: 1 = stone/brick walls, 2 = wood/log/thatch, (verified from sheet)
WALL_BLOCKS = {"stone": (0, 1), "brick": (1, 1), "block": (2, 1),
               "plank": (0, 2), "log": (1, 2), "thatch": (2, 2), "white": (5, 2)}

# A3 building blocks are 2x2 TRUE autotiles: each tile carries top-cap / base /
# left / right edges, so a raw repeat puts edges on every tile (the "missing
# pieces" look). Compose a proper 9-slice from the block's 16px quarters instead:
# each output tile = 4 quarters chosen so interior=edge-free fill, borders get a
# single edge, corners get two. Quarter spec per slice = [TL,TR,BL,BR] as
# (block_tile 0=A 1=B 2=C 3=D, qx, qy). A=top-left tile … D=bottom-right tile.
NINE = {
    "tl": [(0, 0, 0), (1, 0, 0), (2, 0, 0), (3, 0, 0)],
    "t":  [(0, 1, 0), (1, 0, 0), (2, 1, 0), (3, 0, 0)],
    "tr": [(0, 1, 0), (1, 1, 0), (2, 1, 0), (3, 1, 0)],
    "l":  [(0, 0, 1), (1, 0, 1), (2, 0, 0), (3, 0, 0)],
    "f":  [(0, 1, 1), (1, 0, 1), (2, 1, 0), (3, 0, 0)],
    "r":  [(0, 1, 1), (1, 1, 1), (2, 1, 0), (3, 1, 0)],
    "bl": [(0, 0, 1), (1, 0, 1), (2, 0, 1), (3, 0, 1)],
    "b":  [(0, 1, 1), (1, 0, 1), (2, 1, 1), (3, 0, 1)],
    "br": [(0, 1, 1), (1, 1, 1), (2, 1, 1), (3, 1, 1)],
}

def nineslice(sheet, block_idx):
    """block_idx = [A,B,C,D] metatile indices in `sheet`. Returns {slice: Image}."""
    cols = sheet.width // T
    def tile(idx):
        return sheet.crop(((idx % cols) * T, (idx // cols) * T,
                           (idx % cols) * T + T, (idx // cols) * T + T))
    A, B, C, D = [tile(i) for i in block_idx]
    blk = [A, B, C, D]
    dst = [(0, 0), (16, 0), (0, 16), (16, 16)]
    out = {}
    for name, picks in NINE.items():
        im = Image.new("RGBA", (T, T), (0, 0, 0, 0))
        for (ti, qx, qy), (dx, dy) in zip(picks, dst):
            im.paste(blk[ti].crop((qx * 16, qy * 16, qx * 16 + 16, qy * 16 + 16)), (dx, dy))
        out[name] = im
    return out

PACK = []   # raw (source_sheet, source_index, name) items; 9-slices added in builder
# C-sheet castle parts + banners
PACK += [("rtp_outside_c", 71, "tower_top"), ("rtp_outside_c", 87, "tower_mid"),
         ("rtp_outside_c", 103, "tower_door"), ("rtp_outside_c", 119, "tower_base"),
         ("rtp_outside_c", 32, "banner_red"), ("rtp_outside_c", 33, "banner_blue")]
# B-sheet building details
PACK += [("rtp_outside_b", 54, "window"), ("rtp_outside_b", 112, "window_arch"),
         ("rtp_outside_b", 116, "door"), ("rtp_outside_b", 100, "door2"),
         ("rtp_outside_b", 128, "chimney"), ("rtp_outside_b", 83, "window_stained")]
# B-sheet town objects
PACK += [("rtp_outside_b", 147, "well"), ("rtp_outside_b", 149, "barrel"),
         ("rtp_outside_b", 145, "sign_h"), ("rtp_outside_b", 146, "sign_v"),
         ("rtp_outside_b", 226, "crate"), ("rtp_outside_b", 161, "barrel_open"),
         ("rtp_outside_b", 148, "steps"), ("rtp_outside_b", 144, "oven")]
# B-sheet nature (2x2 leafy tree = 224/225 over 240/241; plus singles)
PACK += [("rtp_outside_b", 224, "tree_tl"), ("rtp_outside_b", 225, "tree_tr"),
         ("rtp_outside_b", 240, "tree_bl"), ("rtp_outside_b", 241, "tree_br"),
         ("rtp_outside_b", 181, "pine"), ("rtp_outside_b", 198, "tree_round"),
         ("rtp_outside_b", 177, "bush"), ("rtp_outside_b", 166, "bush2"),
         ("rtp_outside_b", 176, "flower_w"), ("rtp_outside_b", 179, "flower_r"),
         ("rtp_outside_b", 192, "flower_p"), ("rtp_outside_b", 195, "flower_y"),
         ("rtp_outside_b", 210, "grass_tuft"), ("rtp_outside_b", 209, "firewood"),
         ("rtp_outside_b", 163, "boulder"), ("rtp_outside_b", 164, "rock")]

def build_props_sheet():
    cache = {}
    def sheet(n):
        if n not in cache:
            cache[n] = Image.open(os.path.join(TS, n + ".png")).convert("RGBA")
        return cache[n]
    a3 = sheet("rtp_outside_a3")
    # build the full tile list: 9-slice roofs + walls first, then raw PACK items
    tiles = []   # list of (name, Image)
    for col, blk in ROOF_BLOCKS.items():
        for s, im in nineslice(a3, a3_block(*blk)).items():
            tiles.append((f"roof_{col}_{s}", im))
    for mat, blk in WALL_BLOCKS.items():
        for s, im in nineslice(a3, a3_block(*blk)).items():
            tiles.append((f"wall_{mat}_{s}", im))
    for (sn, idx, name) in PACK:
        s = sheet(sn); cols = s.width // T
        tiles.append((name, s.crop(((idx % cols) * T, (idx // cols) * T,
                                    (idx % cols) * T + T, (idx // cols) * T + T))))
    PR = 16
    n = len(tiles); rows = (n + PR - 1) // PR
    out = Image.new("RGBA", (PR * T, rows * T), (0, 0, 0, 0))
    gid = {}
    for i, (name, im) in enumerate(tiles):
        out.paste(im, ((i % PR) * T, (i // PR) * T))
        gid[name] = i
    out.save(os.path.join(TS, "town_props.png"))
    json.dump({"total_metatiles": n, "primary_count": n, "secondary_count": 0, "tile": T,
               "metatiles_per_row": PR, "source": "RTP A3/C/B packed for VerdantTown",
               "behaviors": [0] * n, "collisions": [0] * n},
              open(os.path.join(TS, "town_props.json"), "w"))
    ip = os.path.join(TS, "_index.json"); idx = json.load(open(ip))
    json.dump(sorted(set(idx) | {"town_props"}), open(ip, "w"))
    return gid, n

GID, NPROPS = build_props_sheet()

# ─────────────────────────── town grids ───────────────────────────
terr   = [["grass"] * W for _ in range(H)]      # grass|dirt|cobble|water
over   = [-1] * (W * H)
coll   = [0] * (W * H)
events = []

def inb(x, y): return 0 <= x < W and 0 <= y < H
def setp(x, y, name, block=True):
    if inb(x, y):
        over[y * W + x] = GID[name]
        if block: coll[y * W + x] = 1
def blk(x, y):
    if inb(x, y): coll[y * W + x] = 1
def setterr(x, y, t):
    if inb(x, y) and terr[y][x] != "water": terr[y][x] = t

# ---- terrain features ----
# pond (organic) tucked into the SE corner, clear of buildings
PCX, PCY = 42, 42
for y in range(H):
    for x in range(W):
        d = ((x - PCX) / 1.2) ** 2 + (y - PCY) ** 2
        if d <= 17 + random.randint(-2, 3):
            terr[y][x] = "water"; coll[y * W + x] = 1

# central cobble plaza
PX0, PY0, PX1, PY1 = 20, 20, 29, 29
for y in range(PY0, PY1 + 1):
    for x in range(PX0, PX1 + 1):
        setterr(x, y, "cobble")

# cobble avenues (main roads) crossing at the plaza
def avenue_h(y, x0, x1):
    for x in range(min(x0, x1), max(x0, x1) + 1):
        for w in (0, 1): setterr(x, y + w, "cobble")
def avenue_v(x, y0, y1):
    for y in range(min(y0, y1), max(y0, y1) + 1):
        for w in (0, 1): setterr(x + w, y, "cobble")
avenue_h(24, 0, PX0); avenue_h(24, PX1, W - 1)
avenue_v(24, 14, PY0); avenue_v(24, PY1, H - 1)

def dirt_path(x0, y0, x1, y1, jitter=0.0):
    """L-path of dirt from (x0,y0) toward (x1,y1)."""
    x, y = x0, y0
    while (x, y) != (x1, y1):
        setterr(x, y, "dirt")
        if x != x1 and (y == y1 or random.random() < 0.5):
            x += 1 if x1 > x else -1
        elif y != y1:
            y += 1 if y1 > y else -1
        if jitter and random.random() < jitter:
            setterr(x + random.choice([-1, 1]), y, "dirt")
    setterr(x1, y1, "dirt")

# ─────────────────────────── houses ───────────────────────────
ROOF_COLS = list(ROOF_BLOCKS)
WALL_MATS = list(WALL_BLOCKS)

def _grid9(prefix, x0, y0, w, h):
    """Stamp a w x h rectangle of `prefix` 9-slice tiles (corners/edges/fill)."""
    for j in range(h):
        for i in range(w):
            vy = "t" if j == 0 else ("b" if j == h - 1 else "")
            vx = "l" if i == 0 else ("r" if i == w - 1 else "")
            s = (vy + vx) or "f"          # tl/t/tr/l/f/r/bl/b/br
            setp(x0 + i, y0 + j, f"{prefix}_{s}")

def house(wx, wy, ww, wh, roof, wall, wall_h=2):
    """wx,wy = top-left of the WALL face; ww x wh wall footprint (solid).
    Roof = 2 rows above the wall, overhanging 1 tile each side (9-slice). Door at
    centre, windows flanking. Returns (door_x, door_y) for path carving."""
    # ---- roof: 2 rows tall, 1-tile overhang each side, full 9-slice ----
    rx0 = wx - 1
    rw = ww + 2
    rh = 2
    ry0 = wy - rh
    _grid9(f"roof_{roof}", rx0, ry0, rw, rh)
    # ---- walls: full 9-slice (clean fill + edges + corners) ----
    _grid9(f"wall_{wall}", wx, wy, ww, wh)
    # door + windows on the FRONT (bottom) wall row, over the wall tiles
    fy = wy + wh - 1
    dxr = ww // 2
    door_x = wx + dxr
    setp(door_x, fy, "door"); events.append({"x": door_x, "y": fy})
    for wxi in (dxr - 1, dxr + 1):
        if 0 < wxi < ww - 1 and wxi != dxr:
            setp(wx + wxi, fy, "window")
    # upper-row windows for taller walls (skip the very corners)
    if wh >= 2:
        for wxi in range(1, ww - 1, 2):
            if wxi != dxr:
                setp(wx + wxi, wy, "window")
    # chimney sits on the roof ridge
    if ww >= 3:
        setp(wx + ww - 1, ry0, "chimney")
    return door_x, fy + 1

# placed houses: (wx,wy,ww,wh,roof,wall, garden?)
HOUSES = [
    (6, 16, 4, 2, "red", "plank", True),
    (12, 15, 5, 2, "orange", "log", False),
    (33, 15, 4, 2, "blue", "stone", False),
    (40, 17, 5, 2, "green", "thatch", True),
    (6, 30, 4, 2, "gold", "plank", True),
    (13, 33, 5, 2, "sage", "white", False),
    (6, 40, 4, 2, "orange", "log", False),
    (14, 42, 5, 2, "red", "brick", True),
    (41, 16, 4, 2, "blue", "thatch", False),
    (40, 28, 5, 2, "brown", "stone", True),
    (32, 31, 4, 2, "green", "plank", False),
    # inn / town hall near the plaza
    (31, 22, 6, 3, "red", "brick", False),
]
for (wx, wy, ww, wh, rf, wl, gdn) in HOUSES:
    dx, dy = house(wx, wy, ww, wh, rf, wl)
    # carve a dirt path from the door to the nearest avenue
    tgt_y = 24 if dy < 24 else 25
    tgt_x = 24 if abs(wx - 24) < 18 else (PX0 if wx < 24 else PX1)
    dirt_path(dx, dy, dx, tgt_y if abs(dy - 24) < abs(dx - 24) else dy)
    dirt_path(dx, dy, 24 if dx < 24 else (24 if dx > 30 else dx), 24)
    if gdn:
        # flowers in the front yard
        for fx in range(wx - 1, wx + ww + 1):
            if inb(fx, dy + 1) and terr[dy + 1][fx] == "grass" and over[(dy + 1) * W + fx] == -1:
                if random.random() < 0.5: setp(fx, dy + 1, random.choice(["flower_r", "flower_y", "flower_w", "flower_p"]), block=False)

# ─────────────────────────── stone keep (north) ───────────────────────────
def keep(x0, y0, w, h):
    # crenellated corner towers (1 wide, 4 tall): top/mid/door/base
    for (tx, ty) in [(x0, y0), (x0 + w - 1, y0), (x0, y0 + h - 1), (x0 + w - 1, y0 + h - 1)]:
        for k, name in enumerate(["tower_top", "tower_mid", "tower_door", "tower_base"]):
            setp(tx, ty - 3 + k, name)
    # stone curtain walls between towers (2 tall, clean 9-slice)
    _grid9("wall_stone", x0 + 1, y0 - 1, w - 2, 2)
    # inner keep building
    kx, ky, kw = x0 + 2, y0 + 1, w - 4
    house(kx, ky + 2, kw, 2, "sage", "stone", wall_h=2)
    # gate (arched door) centred on the front wall + banners flanking
    gx = x0 + w // 2
    setp(gx, y0, "door2"); events.append({"x": gx, "y": y0})
    setp(gx - 1, y0 - 1, "banner_red"); setp(gx + 1, y0 - 1, "banner_blue")
    # courtyard cobble + a path down to the avenue
    for yy in range(y0 + 1, y0 + h):
        for xx in range(x0 + 1, x0 + w - 1):
            if over[yy * W + xx] == -1: setterr(xx, yy, "cobble")
    dirt_path(gx, y0 + 1, 24, 23)

keep(18, 8, 14, 6)

# ─────────────────────────── plaza market + well ───────────────────────────
setp(24, 24, "well")
for (dx, dy, obj) in [(-3, -2, "barrel"), (-3, -1, "barrel_open"), (3, -2, "crate"),
                      (3, -1, "crate"), (-2, 3, "sign_h"), (2, 3, "sign_v"),
                      (-3, 2, "barrel"), (3, 2, "crate"), (0, -3, "oven")]:
    setp(24 + dx, 24 + dy, obj)

# ─────────────────────────── nature ───────────────────────────
def place_tree2(x, y):
    """2x2 leafy tree, trunk (bottom row) is the solid part."""
    if not (inb(x, y) and inb(x + 1, y + 1)): return False
    for (ox, oy) in [(0, 0), (1, 0), (0, 1), (1, 1)]:
        if over[(y + oy) * W + (x + ox)] != -1 or terr[y + oy][x + ox] != "grass":
            return False
    setp(x, y, "tree_tl", block=False); setp(x + 1, y, "tree_tr", block=False)
    setp(x, y + 1, "tree_bl"); setp(x + 1, y + 1, "tree_br")
    return True

def scatter(name, n, block=True):
    placed = tries = 0
    while placed < n and tries < n * 50:
        tries += 1
        x, y = random.randint(1, W - 2), random.randint(1, H - 2)
        if over[y * W + x] != -1 or coll[y * W + x] or terr[y][x] != "grass": continue
        setp(x, y, name, block=block); placed += 1

# forest border: leafy 2x2 trees + pines around the edges
border = []
for x in range(1, W - 2, 2):
    border += [(x, 1), (x, H - 3)]
for y in range(3, H - 3, 2):
    border += [(1, y), (W - 3, y)]
random.shuffle(border)
for (x, y) in border:
    if random.random() < 0.7: place_tree2(x, y)
# clusters
for _ in range(22):
    place_tree2(random.randint(2, W - 3), random.randint(2, H - 3))
scatter("pine", 14); scatter("tree_round", 12)
scatter("bush", 26, block=False); scatter("bush2", 16, block=False)
for f in ("flower_w", "flower_r", "flower_p", "flower_y"):
    scatter(f, 9, block=False)
scatter("grass_tuft", 34, block=False)
scatter("boulder", 8); scatter("rock", 8, block=False)
scatter("firewood", 4)

# ─────────────────────────── bake ground metatiles ───────────────────────────
def same(x, y, t): return inb(x, y) and terr[y][x] == t
DIRS = [(0, -1, 1), (1, -1, 2), (1, 0, 4), (1, 1, 8), (0, 1, 16), (-1, 1, 32), (-1, 0, 64), (-1, -1, 128)]
meta = [0] * (W * H); flat = [""] * (W * H)
PRI = {"grass": 0, "dirt": 1, "cobble": 2, "water": 3}
for y in range(H):
    for x in range(W):
        t = terr[y][x]; i = y * W + x; flat[i] = "" if t == "grass" else t
        if t == "grass":
            meta[i] = 0
        else:
            # higher-priority neighbours count as same (terrain extends under them)
            m = 0
            for dx, dy, b in DIRS:
                nx, ny = x + dx, y + dy
                nt = terr[ny][nx] if inb(nx, ny) else "grass"
                if nt == t or PRI.get(nt, 0) > PRI[t]: m |= b
            meta[i] = LUT[t][m]

# ─────────────────────────── write layout + map ───────────────────────────
layout = {"id": "LAYOUT_VERDANT_TOWN", "width": W, "height": H,
          "tileset": "vt_ground",
          "tileset_group": [{"name": "vt_ground", "offset": 0, "count": BASE_N}],
          "metatiles": meta, "collision": coll, "terrain": flat,
          "overlay_tileset": "town_props", "overlay": over, "tileSize": T}
os.makedirs(os.path.join(ROOT, "data", "layouts", "awakened"), exist_ok=True)
json.dump(layout, open(os.path.join(ROOT, "data", "layouts", "awakened", "LAYOUT_VERDANT_TOWN.json"), "w"))

mapobj = {"id": "MAP_VERDANT_TOWN", "name": "VerdantTown", "region": "awakened", "parent": "",
          "layout": "LAYOUT_VERDANT_TOWN", "music": "MUS_NONE", "weather": "WEATHER_NONE",
          "map_type": "MAP_TYPE_TOWN", "allow_running": True, "show_map_name": True,
          "connections": [], "npcs": [], "warps": [], "triggers": [], "signs": [],
          "events": [{"id": i + 1, "name": "Door%d" % (i + 1), "x": e["x"], "y": e["y"],
                      "graphic": {"sprite": "Door1", "file": "rtp/!Door1.png", "frame_w": 32,
                                  "frame_h": 32, "cols": 3, "rows": 4, "single": True},
                      "dir": "down", "trigger": "action", "through": False,
                      "commands": [{"type": "text", "text": "The door is locked."}]}
                     for i, e in enumerate(events)]}
os.makedirs(os.path.join(ROOT, "data", "maps", "awakened"), exist_ok=True)
json.dump(mapobj, open(os.path.join(ROOT, "data", "maps", "awakened", "VerdantTown.json"), "w"))

ipath = os.path.join(ROOT, "data", "maps", "awakened_index.json"); idx = json.load(open(ipath))
idx["MAP_VERDANT_TOWN"] = "VerdantTown"; idx["VerdantTown"] = "VerdantTown"
json.dump(idx, open(ipath, "w"))

print(f"VerdantTown: {len(HOUSES)} houses + keep, {len(events)} doors, "
      f"base {BASE_N} tiles, props {NPROPS} tiles.")
