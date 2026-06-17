#!/usr/bin/env python3
"""mapgen — reusable map generator for Awakened Calamity.

A small library the CLI (tools/gen_map.py) and the world-data driver use to
procedurally build playable maps from RTP art. Archetypes so far (outside
palette): town, route, forest. Dungeon/interior live in mapgen_indoor.py.

Design follows researched RPG-Maker mapping technique: houses = A3 roof/wall
9-slices (ridge+eave roofs, clean walls, details composited on so no grass shows
through a single overlay layer); winding-but-not-curvy paths with overgrown
patches; trees dense + varied + never in lines; clearings, ponds, walking space.

Engine constraint = 1 base tileset + 1 overlay per map. The OUTSIDE palette uses
a combined base `vt_ground` (rtp grass/dirt/road/cobble + A1 water) and one
overlay sheet `town_props` (A3 roof/wall 9-slices + composites, C towers/banners,
B details + nature). Both are built on demand and cached on disk.
"""
import json, os, random
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS = os.path.join(ROOT, "data", "tilesets")
T = 32

# ───────────────────────── A3 9-slice plumbing ─────────────────────────
def a3_block(bc, br):
    c, r = bc * 2, br * 2
    return [r * 16 + c, r * 16 + c + 1, (r + 1) * 16 + c, (r + 1) * 16 + c + 1]

ROOF_BLOCKS = {"orange": (0, 0), "brown": (1, 0), "green": (2, 0), "blue": (3, 0),
               "red": (4, 0), "gold": (5, 0), "sage": (6, 0)}
WALL_BLOCKS = {"stone": (0, 1), "brick": (1, 1), "block": (2, 1),
               "plank": (0, 2), "log": (1, 2), "thatch": (2, 2), "white": (5, 2)}

def roof_rows(ww, wh):
    """Roof height in tiles for a ww×wh house — kept proportional so a roof
    never out-towers its own footprint."""
    return 3 if ww >= 6 else 2

# 9-slice quarter spec: each output tile = [TL,TR,BL,BR] quarters as
# (block_tile 0=A 1=B 2=C 3=D, qx, qy). Interior = edge-free fill.
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
    cols = sheet.width // T
    def tile(i):
        return sheet.crop(((i % cols) * T, (i // cols) * T, (i % cols) * T + T, (i // cols) * T + T))
    blk = [tile(i) for i in block_idx]
    dst = [(0, 0), (16, 0), (0, 16), (16, 16)]
    out = {}
    for name, picks in NINE.items():
        im = Image.new("RGBA", (T, T), (0, 0, 0, 0))
        for (ti, qx, qy), (dx, dy) in zip(picks, dst):
            im.paste(blk[ti].crop((qx * 16, qy * 16, qx * 16 + 16, qy * 16 + 16)), (dx, dy))
        out[name] = im
    return out

# ───────────────────────── shared asset builders ─────────────────────────
_sheet_cache = {}
def _sheet(n):
    if n not in _sheet_cache:
        _sheet_cache[n] = Image.open(os.path.join(TS, n + ".png")).convert("RGBA")
    return _sheet_cache[n]

def _register(tid):
    ip = os.path.join(TS, "_index.json"); idx = json.load(open(ip))
    if tid not in idx:
        json.dump(sorted(set(idx) | {tid}), open(ip, "w"))

def build_outside_base(force=False):
    """Combined OUTSIDE base = rtp_outside_ground + A1 water. Returns (n, LUT)."""
    GJ = json.load(open(os.path.join(TS, "rtp_outside_ground.json")))
    GCFG = json.load(open(os.path.join(TS, "rtp_outside_ground.autotile.json")))
    WCFG = json.load(open(os.path.join(TS, "rtp_outside_water.autotile.json")))
    GCOUNT = GJ["total_metatiles"]; WCOUNT = WCFG["terrains"]["water"]["count"]
    n = GCOUNT + WCOUNT
    LUT = {"dirt": GCFG["terrains"]["dirt"]["lut"],
           "cobble": GCFG["terrains"]["cobble"]["lut"],
           "road": GCFG["terrains"]["road"]["lut"],
           "water": [GCOUNT + (v - 1) for v in WCFG["terrains"]["water"]["lut"]]}
    if not force and os.path.exists(os.path.join(TS, "vt_ground.png")):
        return n, LUT
    g = _sheet("rtp_outside_ground"); w = _sheet("rtp_outside_water")
    PR = 16; rows = (n + PR - 1) // PR
    sheet = Image.new("RGBA", (PR * T, rows * T), (0, 0, 0, 0))
    def blit(src, idx, dst):
        sc = src.width // T
        sheet.paste(src.crop(((idx % sc) * T, (idx // sc) * T, (idx % sc) * T + T, (idx // sc) * T + T)),
                    ((dst % PR) * T, (dst // PR) * T))
    for i in range(GCOUNT): blit(g, i, i)
    for k in range(WCOUNT): blit(w, 1 + k, GCOUNT + k)
    sheet.save(os.path.join(TS, "vt_ground.png"))
    json.dump({"total_metatiles": n, "primary_count": n, "secondary_count": 0,
               "tile": T, "metatiles_per_row": PR,
               "source": "rtp_outside_ground + rtp A1 water (combined outside base)",
               "behaviors": GJ["behaviors"] + [16] * WCOUNT,
               "collisions": GJ["collisions"] + [1] * WCOUNT},
              open(os.path.join(TS, "vt_ground.json"), "w"))
    _register("vt_ground")
    return n, LUT

def build_outside_props(force=False):
    """OUTSIDE overlay sheet `town_props`. Returns (gid, n)."""
    out_png = os.path.join(TS, "town_props.png")
    gid_path = os.path.join(TS, "town_props.gid.json")
    if not force and os.path.exists(out_png) and os.path.exists(gid_path):
        return json.load(open(gid_path)), json.load(open(os.path.join(TS, "town_props.json")))["total_metatiles"]
    a3 = _sheet("rtp_outside_a3")
    def b_tile(sn, idx):
        s = _sheet(sn); cols = s.width // T
        return s.crop(((idx % cols) * T, (idx // cols) * T, (idx % cols) * T + T, (idx // cols) * T + T))
    tiles = []
    roof_slices, wall_slices = {}, {}
    for col, blk in ROOF_BLOCKS.items():
        sl = nineslice(a3, a3_block(*blk)); roof_slices[col] = sl
        for s, im in sl.items(): tiles.append((f"roof_{col}_{s}", im))
    for mat, blk in WALL_BLOCKS.items():
        sl = nineslice(a3, a3_block(*blk)); wall_slices[mat] = sl
        for s, im in sl.items(): tiles.append((f"wall_{mat}_{s}", im))
    window = b_tile("rtp_outside_b", 54); door = b_tile("rtp_outside_b", 116)
    chimney = b_tile("rtp_outside_b", 128)
    def over(base, top):
        c = base.copy(); c.alpha_composite(top); return c
    for mat, sl in wall_slices.items():
        # NOTE: keep this order stable — existing maps store gids into this sheet.
        tiles.append((f"wall_{mat}_door", over(sl["b"], door)))
        tiles.append((f"wall_{mat}_window", over(sl["b"], window)))    # front row
        tiles.append((f"wall_{mat}_window_t", over(sl["t"], window)))  # under-eave row
    for col, sl in roof_slices.items():
        tiles.append((f"roof_{col}_chimney", over(sl["t"], chimney)))
    PACK = [
        ("rtp_outside_c", 71, "tower_top"), ("rtp_outside_c", 87, "tower_mid"),
        ("rtp_outside_c", 103, "tower_door"), ("rtp_outside_c", 119, "tower_base"),
        ("rtp_outside_c", 32, "banner_red"), ("rtp_outside_c", 33, "banner_blue"),
        ("rtp_outside_b", 147, "well"), ("rtp_outside_b", 149, "barrel"),
        ("rtp_outside_b", 145, "sign_h"), ("rtp_outside_b", 146, "sign_v"),
        ("rtp_outside_b", 226, "crate"), ("rtp_outside_b", 161, "barrel_open"),
        ("rtp_outside_b", 148, "steps"), ("rtp_outside_b", 144, "oven"),
        ("rtp_outside_b", 224, "tree_tl"), ("rtp_outside_b", 225, "tree_tr"),
        ("rtp_outside_b", 240, "tree_bl"), ("rtp_outside_b", 241, "tree_br"),
        ("rtp_outside_b", 181, "pine"), ("rtp_outside_b", 198, "tree_round"),
        ("rtp_outside_b", 177, "bush"), ("rtp_outside_b", 166, "bush2"),
        ("rtp_outside_b", 176, "flower_w"), ("rtp_outside_b", 179, "flower_r"),
        ("rtp_outside_b", 192, "flower_p"), ("rtp_outside_b", 195, "flower_y"),
        ("rtp_outside_b", 210, "grass_tuft"), ("rtp_outside_b", 209, "firewood"),
        ("rtp_outside_b", 163, "boulder"), ("rtp_outside_b", 164, "rock"),
        ("rtp_outside_b", 150, "grave"), ("rtp_outside_b", 154, "deadtree"),
    ]
    for (sn, idx, name) in PACK:
        tiles.append((name, b_tile(sn, idx)))
    # Appended LAST so older maps' gids stay stable: middle-row window variant
    # (lets a multi-row wall column carry windows on every floor).
    for mat, sl in wall_slices.items():
        tiles.append((f"wall_{mat}_window_f", over(sl["f"], window)))
    # More appended-last props (kept after window_f to preserve every prior gid).
    for (sn, idx, name) in [("rtp_outside_b", 165, "fence")]:
        tiles.append((name, b_tile(sn, idx)))
    PR = 16; n = len(tiles); rows = (n + PR - 1) // PR
    out = Image.new("RGBA", (PR * T, rows * T), (0, 0, 0, 0))
    gid = {}
    for i, (name, im) in enumerate(tiles):
        out.paste(im, ((i % PR) * T, (i // PR) * T)); gid[name] = i
    out.save(out_png)
    json.dump({"total_metatiles": n, "primary_count": n, "secondary_count": 0, "tile": T,
               "metatiles_per_row": PR, "source": "RTP A3/C/B packed (outside overlay)",
               "behaviors": [0] * n, "collisions": [0] * n},
              open(os.path.join(TS, "town_props.json"), "w"))
    json.dump(gid, open(gid_path, "w"))
    _register("town_props")
    return gid, n


# ───────────────────────── the builder ─────────────────────────
class MapBuilder:
    def __init__(self, w, h, seed=0, palette="outside"):
        self.W, self.H = w, h
        self.rng = random.Random(seed)
        self.base_n, self.LUT = build_outside_base()
        self.gid, self.props_n = build_outside_props()
        self.base_name, self.props_name = "vt_ground", "town_props"
        self.terr = [["grass"] * w for _ in range(h)]
        self.over = [-1] * (w * h)
        self.upper = [-1] * (w * h)        # Layer 3 (drawn above the player)
        self.coll = [0] * (w * h)
        self.events = []
        # terrain priority for autotile baking (low->high)
        self.PRI = {"grass": 0, "dirt": 1, "cobble": 2, "road": 2, "water": 3}

    # ---- primitives ----
    def inb(self, x, y): return 0 <= x < self.W and 0 <= y < self.H
    def setp(self, x, y, name, block=True):
        if self.inb(x, y):
            self.over[y * self.W + x] = self.gid[name]
            if block: self.coll[y * self.W + x] = 1
    def setu(self, x, y, name):                 # Layer 3 — above the player, never blocks
        if self.inb(x, y) and name in self.gid:
            self.upper[y * self.W + x] = self.gid[name]
    def blkc(self, x, y):
        if self.inb(x, y): self.coll[y * self.W + x] = 1
    def setterr(self, x, y, t):
        if self.inb(x, y) and self.terr[y][x] != "water":
            self.terr[y][x] = t
    def empty(self, x, y):
        return self.inb(x, y) and self.over[y * self.W + x] == -1 and not self.coll[y * self.W + x]

    def rect_terr(self, x0, y0, x1, y1, t):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            for x in range(min(x0, x1), max(x0, x1) + 1):
                self.setterr(x, y, t)

    def pond(self, cx, cy, rx, ry, t="water"):
        for y in range(self.H):
            for x in range(self.W):
                d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                if d <= 1.0 + self.rng.uniform(-0.18, 0.22):
                    if self.inb(x, y):
                        self.terr[y][x] = t
                        if t == "water": self.coll[y * self.W + x] = 1

    def path(self, x0, y0, x1, y1, t="dirt", width=1, wander=0.5, overgrow=0.0):
        """Winding path from A->B. `width` tiles thick (perpendicular to travel);
        `wander` = side-step chance; `overgrow` = chance to skip a tile (leave it as
        grass, an overgrown trail)."""
        horiz = abs(x1 - x0) >= abs(y1 - y0)
        x, y = x0, y0
        guard = 0
        while (x, y) != (x1, y1) and guard < (self.W + self.H) * 4:
            guard += 1
            self._brush(x, y, t, width, horiz, overgrow)
            stepx = x != x1 and (y == y1 or self.rng.random() < 0.5)
            if stepx:
                x += 1 if x1 > x else -1
            elif y != y1:
                y += 1 if y1 > y else -1
            if self.rng.random() < wander:
                if horiz:
                    self._brush(x, max(0, min(self.H - 1, y + self.rng.choice([-1, 1]))), t, width, horiz, overgrow)
                else:
                    self._brush(max(0, min(self.W - 1, x + self.rng.choice([-1, 1]))), y, t, width, horiz, overgrow)
        self._brush(x1, y1, t, width, horiz, overgrow)

    def _brush(self, x, y, t, width, horiz, overgrow):
        for w in range(width):
            ax, ay = (x, y + w) if horiz else (x + w, y)
            if self.rng.random() >= overgrow:
                self.setterr(ax, ay, t)

    # ---- buildings ----
    def _grid9(self, prefix, x0, y0, w, h, up=False):
        for j in range(h):
            for i in range(w):
                vy = "t" if j == 0 else ("b" if j == h - 1 else "")
                vx = "l" if i == 0 else ("r" if i == w - 1 else "")
                nm = f"{prefix}_{(vy + vx) or 'f'}"
                (self.setu if up else self.setp)(x0 + i, y0 + j, nm)

    def house(self, wx, wy, ww, wh, roof, wall):
        """wx,wy = top-left of WALL face. Flush RM-style house: ONE solid
        ww-wide rectangle — rh roof rows stacked directly on top of wh wall
        rows, the same width, so nothing overhangs into open ground (the roof's
        own bottom row is the eave). Roof + chimney go on Layer 3 so the player
        walks under the eaves; door (an event) + windows on the walls.
        Returns (door_x, path_y)."""
        rh = roof_rows(ww, wh)
        self._grid9(f"roof_{roof}", wx, wy - rh, ww, rh, up=True)
        self._grid9(f"wall_{wall}", wx, wy, ww, wh)
        fy = wy + wh - 1
        dxr = ww // 2
        door_x = wx + dxr
        self.setp(door_x, fy, f"wall_{wall}_door")
        self.events.append({"x": door_x, "y": fy})
        # Window columns: symmetric, flanking the door, never on the corner or
        # door columns. Each column gets a window on EVERY wall row (edge-correct
        # variant) so multi-row walls read as a real facade — no floating boxes.
        win_cols = [c for c in (dxr - 2, dxr + 2, dxr - 1, dxr + 1)
                    if 0 < c < ww - 1 and c != dxr]
        if ww <= 4:
            win_cols = [c for c in (dxr - 1, dxr + 1) if 0 < c < ww - 1 and c != dxr][:1]
        seen = set()
        for c in win_cols:
            if c in seen:
                continue
            seen.add(c)
            for j in range(wh):
                yy = wy + j
                if yy == fy and c == dxr:
                    continue
                variant = "window_t" if j == 0 else ("window" if yy == fy else "window_f")
                self.setp(wx + c, yy, f"wall_{wall}_{variant}")
        if ww >= 4:                              # chimney on the ridge, off the corner
            self.setu(wx + ww - 2, wy - rh, f"roof_{roof}_chimney")
        return door_x, fy + 1

    def tower(self, x, y0):
        """2-wide crenellated corner tower, 4 tall (top of base at row y0)."""
        for dx in (0, 1):
            for k, nm in enumerate(["tower_top", "tower_mid", "tower_door", "tower_base"]):
                self.setp(x + dx, y0 - 3 + k, nm)

    def keep(self, x0, y0, w, h):
        """Compact stone castle (footprint x0,y0 .. x0+w-1,y0+h-1): a curtain
        wall ring around a cobbled courtyard, four corner towers, a front gate
        with banners, and a tall inner keep building. y0 is the TOP wall row."""
        # cobble the whole footprint (courtyard floor under everything)
        for yy in range(y0, y0 + h):
            for xx in range(x0, x0 + w):
                self.setterr(xx, yy, "cobble")
        # curtain wall ring (1-tile-thick stone 9-slice), courtyard carved back out
        self._grid9("wall_stone", x0, y0, w, h)
        for yy in range(y0 + 1, y0 + h - 1):
            for xx in range(x0 + 1, x0 + w - 1):
                self.over[yy * self.W + xx] = -1
                self.coll[yy * self.W + xx] = 0
        # four corner towers sit on the ring corners
        for (tx, ty) in [(x0 - 1, y0 + 1), (x0 + w - 1, y0 + 1),
                         (x0 - 1, y0 + h - 1), (x0 + w - 1, y0 + h - 1)]:
            self.tower(tx, ty)
        # front gate (bottom-centre) + flanking banners on the wall above
        gx = x0 + w // 2
        self.setp(gx, y0 + h - 1, "wall_stone_door")
        self.events.append({"x": gx, "y": y0 + h - 1})
        self.setp(gx - 1, y0, "banner_red"); self.setp(gx + 1, y0, "banner_blue")
        # tall inner keep building, centred in the courtyard, facing the gate
        kw = min(6, w - 4)
        if kw >= 4:
            kx = x0 + (w - kw) // 2
            self.house(kx, y0 + h - 4, kw, 2, "blue", "block")
        return gx

    # ---- nature ----
    def tree2(self, x, y):
        if not (self.inb(x, y) and self.inb(x + 1, y + 1)): return False
        for ox, oy in [(0, 0), (1, 0), (0, 1), (1, 1)]:
            if self.over[(y + oy) * self.W + (x + ox)] != -1 or self.terr[y + oy][x + ox] != "grass":
                return False
        self.setp(x, y, "tree_tl", False); self.setp(x + 1, y, "tree_tr", False)
        self.setp(x, y + 1, "tree_bl"); self.setp(x + 1, y + 1, "tree_br")
        return True

    def scatter(self, name, n, block=True, on=("grass",)):
        placed = tries = 0
        while placed < n and tries < n * 60:
            tries += 1
            x, y = self.rng.randint(1, self.W - 2), self.rng.randint(1, self.H - 2)
            if self.over[y * self.W + x] != -1 or self.coll[y * self.W + x]: continue
            if self.terr[y][x] not in on: continue
            self.setp(x, y, name, block); placed += 1

    def scatter_any(self, names, n, block=True, on=("grass",)):
        for _ in range(n):
            self.scatter(self.rng.choice(names), 1, block, on)

    # ---- finalize ----
    def bake(self):
        DIRS = [(0, -1, 1), (1, -1, 2), (1, 0, 4), (1, 1, 8), (0, 1, 16),
                (-1, 1, 32), (-1, 0, 64), (-1, -1, 128)]
        meta = [0] * (self.W * self.H); flat = [""] * (self.W * self.H)
        for y in range(self.H):
            for x in range(self.W):
                t = self.terr[y][x]; i = y * self.W + x
                flat[i] = "" if t == "grass" else t
                if t == "grass":
                    meta[i] = 0; continue
                m = 0
                for dx, dy, b in DIRS:
                    nx, ny = x + dx, y + dy
                    nt = self.terr[ny][nx] if self.inb(nx, ny) else "grass"
                    if nt == t or self.PRI.get(nt, 0) > self.PRI[t]: m |= b
                meta[i] = self.LUT[t][m]
        return meta, flat

    def write(self, name, region="awakened", map_type="MAP_TYPE_TOWN",
              music="MUS_NONE", weather="WEATHER_NONE", door_text="The door is locked."):
        meta, flat = self.bake()
        lid = "LAYOUT_" + name.upper()
        mid = "MAP_" + name.upper()
        layout = {"id": lid, "width": self.W, "height": self.H,
                  "tileset": self.base_name,
                  "tileset_group": [{"name": self.base_name, "offset": 0, "count": self.base_n}],
                  "metatiles": meta, "collision": self.coll, "terrain": flat,
                  "overlay_tileset": self.props_name, "overlay": self.over, "tileSize": T}
        if any(v >= 0 for v in self.upper):
            layout["upper_tileset"] = self.props_name
            layout["upper_group"] = [{"name": self.props_name, "offset": 0, "count": self.props_n}]
            layout["upper"] = self.upper
        os.makedirs(os.path.join(ROOT, "data", "layouts", region), exist_ok=True)
        json.dump(layout, open(os.path.join(ROOT, "data", "layouts", region, lid + ".json"), "w"))
        mapobj = {"id": mid, "name": name, "region": region, "parent": "", "layout": lid,
                  "music": music, "weather": weather, "map_type": map_type,
                  "allow_running": True, "show_map_name": True, "connections": [],
                  "npcs": [], "warps": [], "triggers": [], "signs": [],
                  "events": [{"id": i + 1, "name": "Door%d" % (i + 1), "x": e["x"], "y": e["y"],
                              "graphic": {"sprite": "Door1", "file": "rtp/Door1.png", "frame_w": 32,
                                          "frame_h": 32, "cols": 3, "rows": 4, "single": True},
                              "dir": "down", "trigger": "action", "through": False,
                              "commands": [{"type": "text", "text": door_text}]}
                             for i, e in enumerate(self.events)]}
        os.makedirs(os.path.join(ROOT, "data", "maps", region), exist_ok=True)
        json.dump(mapobj, open(os.path.join(ROOT, "data", "maps", region, name + ".json"), "w"))
        ipath = os.path.join(ROOT, "data", "maps", region + "_index.json")
        idx = json.load(open(ipath)) if os.path.exists(ipath) else {}
        idx[mid] = name; idx[name] = name
        json.dump(idx, open(ipath, "w"))
        return mid


# ───────────────────────── archetypes (outside) ─────────────────────────
# Only the A3 blocks that actually read as roofs (gold & sage are a berry/mat
# texture, not a roof — excluded from random selection).
ROOFS = ["orange", "brown", "green", "blue", "red"]
WALLS = list(WALL_BLOCKS)
FLOWERS = ["flower_w", "flower_r", "flower_p", "flower_y"]

def _tree_border(b, density=0.55, ring=2):
    for x in range(1, b.W - 2, 2):
        for y in list(range(0, ring)) + list(range(b.H - ring - 1, b.H - 1)):
            if b.rng.random() < density: b.tree2(x, y)
    for y in range(1, b.H - 2, 2):
        for x in list(range(0, ring)) + list(range(b.W - ring - 1, b.W - 1)):
            if b.rng.random() < density: b.tree2(x, y)

def _nature_pass(b, trees, bushes, flowers, tufts, rocks):
    for _ in range(trees): b.tree2(b.rng.randint(2, b.W - 3), b.rng.randint(2, b.H - 3))
    b.scatter("pine", trees // 3); b.scatter("tree_round", trees // 3)
    b.scatter("bush", bushes, False); b.scatter("bush2", bushes // 2, False)
    for f in FLOWERS: b.scatter(f, flowers, False)
    b.scatter("grass_tuft", tufts, False)
    b.scatter("boulder", rocks); b.scatter("rock", rocks, False)
    b.scatter("firewood", max(2, rocks // 2))

def _house_fits(b, wx, wy, ww, wh, rh):
    # footprint = roof rows (wy-rh..wy-1) + wall rows (wy..wy+wh-1), ww wide,
    # plus 1 tile of clearance all round so houses never butt against anything.
    for yy in range(wy - rh - 1, wy + wh + 2):
        for xx in range(wx - 1, wx + ww + 1):
            if not b.inb(xx, yy): return False
            if b.terr[yy][xx] != "grass" or b.over[yy * b.W + xx] != -1: return False
    return True

def _place_houses(b, n, cx, cy):
    placed = tries = 0
    while placed < n and tries < n * 40:
        tries += 1
        ww, wh = b.rng.choice([(4, 2), (5, 2), (4, 2), (6, 3), (5, 3), (4, 2)])
        rh = roof_rows(ww, wh)
        wx = b.rng.randint(3, b.W - ww - 3); wy = b.rng.randint(rh + 2, b.H - wh - 3)
        if not _house_fits(b, wx, wy, ww, wh, rh): continue
        dx, dy = b.house(wx, wy, ww, wh, b.rng.choice(ROOFS), b.rng.choice(WALLS))
        if abs(dy - cy) <= abs(dx - cx): b.path(dx, dy, dx, cy, "dirt", 1, 0.3)
        else: b.path(dx, dy, cx, dy, "dirt", 1, 0.3)
        if b.rng.random() < 0.4:
            for fx in range(wx - 1, wx + ww + 1):
                if b.empty(fx, dy + 1) and b.terr[dy + 1][fx] == "grass" and b.rng.random() < 0.5:
                    b.setp(fx, dy + 1, b.rng.choice(FLOWERS), False)
        placed += 1

def gen_town(name, w=50, h=50, seed=11, region="awakened", houses=12, keep=True, pond=True):
    b = MapBuilder(w, h, seed)
    cx = w // 2 + b.rng.randint(-3, 3); cy = h // 2 + b.rng.randint(-3, 3)
    if pond and b.rng.random() < 0.8:
        pc = b.rng.choice([(0.82, 0.82), (0.18, 0.82), (0.84, 0.2), (0.18, 0.2)])
        b.pond(int(w * pc[0]), int(h * pc[1]), 4 + b.rng.random() * 2, 3 + b.rng.random() * 2)
    ph = b.rng.randint(4, 6)
    b.rect_terr(cx - ph, cy - ph, cx + ph - 1, cy + ph - 1, "cobble")
    for ax in (cx, cx + 1):
        for y in range(0, h): b.setterr(ax, y, "cobble")
    for ay in (cy, cy + 1):
        for x in range(0, w): b.setterr(x, ay, "cobble")
    if b.rng.random() < 0.5:
        ry = b.rng.randint(6, h - 6)
        for x in range(0, w): b.setterr(x, ry, "dirt"); b.setterr(x, ry + 1, "dirt")
    if keep and b.rng.random() < 0.8:
        kw, kh = 12, 11                            # squarer, castle-like footprint
        for _ in range(40):                        # find a clear (grass) keep site
            kx = b.rng.randint(5, w - kw - 5); ky = b.rng.randint(4, 8)
            if all(b.inb(xx, yy) and b.terr[yy][xx] == "grass"
                   for yy in range(ky - 2, ky + kh + 1)
                   for xx in range(kx - 2, kx + kw + 2)):
                b.keep(kx, ky, kw, kh)
                break
    _place_houses(b, houses, cx, cy)
    b.setp(cx, cy, "well")
    for (dx, dy, obj) in [(-3, -2, "barrel"), (-3, -1, "barrel_open"), (3, -2, "crate"),
                          (3, -1, "crate"), (-2, 3, "sign_h"), (2, 3, "sign_v"), (0, -3, "oven")]:
        if b.empty(cx + dx, cy + dy): b.setp(cx + dx, cy + dy, obj)
    _tree_border(b, 0.6)
    _nature_pass(b, trees=22, bushes=24, flowers=8, tufts=30, rocks=8)
    return b.write(name, region, "MAP_TYPE_TOWN")

def gen_route(name, w=64, h=30, seed=5, region="awakened", vertical=False):
    b = MapBuilder(w, h, seed)
    # A route is a thoroughfare: one CONTINUOUS wide road (no holes), gently
    # wandering, with the playable corridor kept clear and dense tree walls
    # channelling the player along it (RM field convention).
    if vertical:
        mid = w // 2
        b.path(mid, 0, mid, h - 1, "dirt", 3, 0.35, 0.0)
        corridor = lambda x, y: abs(x - mid) <= 3        # keep this band walkable
    else:
        mid = h // 2
        b.path(0, mid, w - 1, mid, "dirt", 3, 0.35, 0.0)
        corridor = lambda x, y: abs(y - mid) <= 3
    # a pond off to one side, away from the road
    if b.rng.random() < 0.7:
        px, py = (int(w * 0.72), int(h * 0.2)) if not vertical else (int(w * 0.2), int(h * 0.72))
        b.pond(px, py, 4.0, 3.0)
    # dense tree walls hug the long edges (3 deep), never in straight lines
    _tree_border(b, 0.78, ring=3)
    # fence posts skirt the road shoulder here and there
    for _ in range(w // 6):
        if not vertical:
            fx = b.rng.randint(3, w - 4); fy = mid + b.rng.choice([-2, 2])
        else:
            fy = b.rng.randint(3, h - 4); fx = mid + b.rng.choice([-2, 2])
        if b.empty(fx, fy) and b.terr[fy][fx] == "grass":
            b.setp(fx, fy, "fence", False)
    # decoration: scattered, not clumped, off the road
    _nature_pass(b, trees=18, bushes=22, flowers=12, tufts=34, rocks=12)
    # signposts where the road leaves the map
    if not vertical:
        if b.empty(2, mid - 2): b.setp(2, mid - 2, "sign_v", False)
        if b.empty(w - 3, mid + 2): b.setp(w - 3, mid + 2, "sign_v", False)
    else:
        if b.empty(mid - 2, 2): b.setp(mid - 2, 2, "sign_v", False)
        if b.empty(mid + 2, h - 3): b.setp(mid + 2, h - 3, "sign_v", False)
    # a small rest camp tucked beside the road (a clearing, not a clump)
    cx2 = int(w * 0.32); cy2 = (mid - 3) if not vertical else int(h * 0.32)
    if not vertical and b.empty(cx2, cy2):
        for o, dx in [("firewood", 0), ("crate", 1), ("barrel", 2)]:
            if b.empty(cx2 + dx, cy2): b.setp(cx2 + dx, cy2, o)
    # nothing must block the walking corridor
    for y in range(h):
        for x in range(w):
            if corridor(x, y) and b.terr[y][x] in ("dirt", "road"):
                if b.over[y * w + x] != -1: b.over[y * w + x] = -1
                b.coll[y * w + x] = 0
    return b.write(name, region, "MAP_TYPE_ROUTE")

def gen_forest(name, w=50, h=50, seed=9, region="awakened"):
    b = MapBuilder(w, h, seed)
    # winding trails crossing the map (both axes) — continuous (no holes) so they
    # read as real paths, just gently wandering through the trees.
    b.path(0, int(h * 0.4), w - 1, int(h * 0.6), "dirt", 2, 0.5, 0.0)
    b.path(int(w * 0.55), 0, int(w * 0.45), h - 1, "dirt", 1, 0.5, 0.0)
    # a stream/pond
    b.pond(int(w * 0.25), int(h * 0.7), 4.5, 3.2)
    # clearings (open grass pockets with flowers) — break up the density
    for (gx, gy) in [(int(w * 0.7), int(h * 0.3)), (int(w * 0.35), int(h * 0.45))]:
        for f in FLOWERS:
            for _ in range(4):
                b.setp(gx + b.rng.randint(-2, 2), gy + b.rng.randint(-2, 2), f, False)
    # VERY dense, varied trees, never linear, avoiding trail cells
    for _ in range(140):
        x, y = b.rng.randint(1, b.W - 3), b.rng.randint(1, b.H - 3)
        if b.terr[y][x] != "grass": continue
        r = b.rng.random()
        if r < 0.6: b.tree2(x, y)
        elif r < 0.8: b.scatter("pine", 1)
        else: b.scatter("tree_round", 1)
    b.scatter("bush", 40, False); b.scatter("bush2", 24, False)
    for f in FLOWERS: b.scatter(f, 7, False)
    b.scatter("grass_tuft", 44, False)
    b.scatter("boulder", 12); b.scatter("rock", 10, False)
    b.scatter("firewood", 4); b.scatter("deadtree", 6)
    return b.write(name, region, "MAP_TYPE_FOREST")
