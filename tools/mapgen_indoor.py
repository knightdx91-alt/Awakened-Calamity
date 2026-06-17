#!/usr/bin/env python3
"""mapgen_indoor — dungeon & interior archetypes for Awakened Calamity.

Shares the A4 9-slice plumbing from mapgen. Indoor maps use a flat floor BASE
(rtp_<scene>_ground, already baked) with a single OVERLAY sheet that packs the
wall 9-slice (so walls auto-edge toward the carved floor) + scene props/furniture.
Props are free-standing objects placed on the floor base — their transparency is
correct there (floor shows through), so only walls need compositing (they're
opaque 9-slice fills). Dungeons carve rooms+corridors; interiors are walled rooms
with furniture and an exit. Alpha/stairs are placed as action events.
"""
import json, os
from PIL import Image
import mapgen
from mapgen import T, TS, ROOT, _sheet, _register, nineslice

# floor base tileset per scene (baked autotiles); we use flat tile 0 = floor.
SCENE = {
    "dungeon": {"ground": "rtp_dungeon_ground", "a4": "rtp_dungeon_a4",
                "wall_block": (1, 0), "b": "rtp_dungeon_b",
                "wallface": ("rtp_dungeon_wallface", "wall_1_5"),  # grey stone side-view face
                "props": {"pillar": 128, "crystal": 100, "crystal2": 102, "rockpile": 108,
                          "barrel": 236, "crate": 220, "bones": 232, "grave": 71,
                          "stairs": 4, "goldpile": 110}},
    "interior": {"ground": "rtp_inside_ground", "a4": "rtp_inside_a4",
                 "wall_block": (0, 0), "b": "rtp_inside_b",
                 "wallface": ("rtp_inside_wallface", "wall_1_3"),  # plaster + baseboard face
                 "props": {"bed": 144, "bed2": 160, "table": 177, "chair": 124,
                           "shelf": 99, "cabinet": 154, "barrel": 156, "pot": 170,
                           "fireplace": 36, "throne": 123, "crate": 208, "rug": 90,
                           "stairs": 4, "exit": 39, "column": 140}},
}

def a4_block(bc, br):
    c, r = bc * 2, br * 2
    return [r * 16 + c, r * 16 + c + 1, (r + 1) * 16 + c, (r + 1) * 16 + c + 1]

def build_indoor_props(scene, force=False):
    cfg = SCENE[scene]
    tid = f"{scene[:3]}_props"
    gid_path = os.path.join(TS, tid + ".gid.json")
    if not force and os.path.exists(os.path.join(TS, tid + ".png")) and os.path.exists(gid_path):
        return json.load(open(gid_path)), json.load(open(os.path.join(TS, tid + ".json")))["total_metatiles"]
    a4 = _sheet(cfg["a4"]); b = _sheet(cfg["b"])
    tiles = []
    for s, im in nineslice(a4, a4_block(*cfg["wall_block"])).items():
        tiles.append((f"wall_{s}", im))
    bc = b.width // T
    for name, idx in cfg["props"].items():
        tiles.append((name, b.crop(((idx % bc) * T, (idx // bc) * T, (idx % bc) * T + T, (idx // bc) * T + T))))
    # Side-view wall FACE (cap/body/base x L/M/R) for north-facing walls, so walking
    # UP shows a wall with visible height in front of you (the RM interior look).
    # Appended LAST → existing indoor-prop gids stay stable.
    if "wallface" in cfg:
        wf_name, wf_mat = cfg["wallface"]
        wf = _sheet(wf_name); wpr = json.load(open(os.path.join(TS, wf_name + ".json")))["metatiles_per_row"]
        slots = json.load(open(os.path.join(TS, wf_name + ".json")))["slots"][wf_mat]
        def wf_tile(i): return wf.crop(((i % wpr) * T, (i // wpr) * T, (i % wpr) * T + T, (i // wpr) * T + T))
        for row in ("cap", "body", "base"):
            for col, i in zip("lmr", slots[row]):
                tiles.append((f"face_{row}_{col}", wf_tile(i)))
    PR = 16; n = len(tiles); rows = (n + PR - 1) // PR
    out = Image.new("RGBA", (PR * T, rows * T), (0, 0, 0, 0)); gid = {}
    for i, (name, im) in enumerate(tiles):
        out.paste(im, ((i % PR) * T, (i // PR) * T)); gid[name] = i
    out.save(os.path.join(TS, tid + ".png"))
    json.dump({"total_metatiles": n, "primary_count": n, "secondary_count": 0, "tile": T,
               "metatiles_per_row": PR, "source": f"RTP {scene} walls+props",
               "behaviors": [0] * n, "collisions": [0] * n}, open(os.path.join(TS, tid + ".json"), "w"))
    json.dump(gid, open(gid_path, "w"))
    _register(tid)
    return gid, n


class IndoorBuilder:
    def __init__(self, w, h, seed, scene):
        import random
        self.W, self.H, self.scene = w, h, scene
        self.rng = random.Random(seed)
        cfg = SCENE[scene]
        gj = json.load(open(os.path.join(TS, cfg["ground"] + ".json")))
        self.base_name = cfg["ground"]; self.base_n = gj["total_metatiles"]
        self.gid, _ = build_indoor_props(scene)
        self.props_name = f"{scene[:3]}_props"
        self.walk = [False] * (w * h)            # carved (passable) cells
        self.over = [-1] * (w * h)
        self.coll = [1] * (w * h)                # default solid until carved
        self.meta = [0] * (w * h)                # flat floor everywhere (tile 0)
        self.events = []

    def inb(self, x, y): return 0 <= x < self.W and 0 <= y < self.H
    def carve_rect(self, x0, y0, x1, y1):
        for y in range(max(1, min(y0, y1)), min(self.H - 1, max(y0, y1) + 1)):
            for x in range(max(1, min(x0, x1)), min(self.W - 1, max(x0, x1) + 1)):
                self.walk[y * self.W + x] = True
    def carve_corridor(self, x0, y0, x1, y1, width=1):
        x, y = x0, y0
        while x != x1:
            for w in range(width): self._mark(x, y + w)
            x += 1 if x1 > x else -1
        while y != y1:
            for w in range(width): self._mark(x + w, y)
            y += 1 if y1 > y else -1
        self._mark(x1, y1)
    def _mark(self, x, y):
        if self.inb(x, y) and 0 < x < self.W - 1 and 0 < y < self.H - 1:
            self.walk[y * self.W + x] = True
    def setp(self, x, y, name, block=True):
        if self.inb(x, y):
            self.over[y * self.W + x] = self.gid[name]
            self.coll[y * self.W + x] = 1 if block else 0

    def _wall_slice(self, x, y):
        def fl(nx, ny): return self.inb(nx, ny) and self.walk[ny * self.W + nx]
        up, dn, lf, rt = fl(x, y - 1), fl(x, y + 1), fl(x - 1, y), fl(x + 1, y)
        if dn and rt: return "br"
        if dn and lf: return "bl"
        if up and rt: return "tr"
        if up and lf: return "tl"
        if dn: return "b"
        if up: return "t"
        if lf: return "l"
        if rt: return "r"
        return "f"

    def finalize_walls(self):
        for y in range(self.H):
            for x in range(self.W):
                i = y * self.W + x
                if self.walk[i]:
                    self.over[i] = -1; self.coll[i] = 0
                else:
                    self.over[i] = self.gid["wall_" + self._wall_slice(x, y)]
                    self.coll[i] = 1

    def render_north_faces(self):
        """Overlay the side-view wall FACE on every north-facing wall (a wall cell
        directly above a floor cell). Walking UP toward it, the player sees the wall
        rise: base (meets floor) -> body -> cap (top). L/M/R picked by horizontal
        continuity. Requires the face_* tiles in the prop sheet."""
        if "face_base_m" not in self.gid:
            return
        def wall(x, y): return self.inb(x, y) and not self.walk[y * self.W + x]
        def floor(x, y): return self.inb(x, y) and self.walk[y * self.W + x]
        def edge(x, y): return floor(x, y) and wall(x, y - 1)   # north wall above floor (x,y)
        for y in range(self.H):
            for x in range(self.W):
                if not edge(x, y):
                    continue
                col = "l" if not edge(x - 1, y) else ("r" if not edge(x + 1, y) else "m")
                # base meets the floor; body + cap stack upward over wall cells
                rows = [("base", y - 1), ("body", y - 2), ("cap", y - 3)]
                for ri, (part, yy) in enumerate(rows):
                    if not wall(x, yy):
                        # ran out of wall: cap the highest available wall cell instead
                        if ri > 0 and wall(x, yy + 1):
                            self.over[(yy + 1) * self.W + x] = self.gid[f"face_cap_{col}"]
                        break
                    name = part
                    # if there is no wall above the planned cap, make this the cap
                    if part == "body" and not wall(x, yy - 1):
                        name = "cap"
                    self.over[yy * self.W + x] = self.gid[f"face_{name}_{col}"]
                    self.coll[yy * self.W + x] = 1

    def scatter_in_rooms(self, name, n, block=True):
        placed = tries = 0
        while placed < n and tries < n * 80:
            tries += 1
            x, y = self.rng.randint(1, self.W - 2), self.rng.randint(1, self.H - 2)
            i = y * self.W + x
            if not self.walk[i] or self.over[i] != -1 or self.coll[i]: continue
            # keep it off the very centre of corridors: require a wall neighbour
            self.setp(x, y, name, block); placed += 1

    def write(self, name, region, map_type, door_text):
        lid, mid = "LAYOUT_" + name.upper(), "MAP_" + name.upper()
        layout = {"id": lid, "width": self.W, "height": self.H, "tileset": self.base_name,
                  "tileset_group": [{"name": self.base_name, "offset": 0, "count": self.base_n}],
                  "metatiles": self.meta, "collision": self.coll, "terrain": [""] * (self.W * self.H),
                  "overlay_tileset": self.props_name, "overlay": self.over, "tileSize": T}
        os.makedirs(os.path.join(ROOT, "data", "layouts", region), exist_ok=True)
        json.dump(layout, open(os.path.join(ROOT, "data", "layouts", region, lid + ".json"), "w"))
        mapobj = {"id": mid, "name": name, "region": region, "parent": "", "layout": lid,
                  "music": "MUS_NONE", "weather": "WEATHER_NONE", "map_type": map_type,
                  "allow_running": True, "show_map_name": True, "connections": [],
                  "npcs": [], "warps": [], "triggers": [], "signs": [],
                  "events": [{"id": i + 1, "name": e.get("name", "Event%d" % (i + 1)),
                              "x": e["x"], "y": e["y"],
                              "graphic": {"sprite": "", "file": "", "single": True},
                              "dir": "down", "trigger": "action", "through": False,
                              "commands": [{"type": "text", "text": e.get("text", door_text)}]}
                             for i, e in enumerate(self.events)]}
        os.makedirs(os.path.join(ROOT, "data", "maps", region), exist_ok=True)
        json.dump(mapobj, open(os.path.join(ROOT, "data", "maps", region, name + ".json"), "w"))
        ipath = os.path.join(ROOT, "data", "maps", region + "_index.json")
        idx = json.load(open(ipath)) if os.path.exists(ipath) else []
        if isinstance(idx, list):                 # current registry format = flat list
            for k in (mid, name):
                if k not in idx: idx.append(k)
        else:                                     # legacy dict format
            idx[mid] = name; idx[name] = name
        json.dump(idx, open(ipath, "w"))
        return mid


def gen_dungeon(name, w=48, h=48, seed=4, region="awakened", tier=1, hazard=""):
    b = IndoorBuilder(w, h, seed, "dungeon")
    rng = b.rng
    # scatter rooms, connect sequentially with corridors (so it's fully traversable)
    rooms = []
    attempts = 0
    target = 6 + tier * 2
    while len(rooms) < target and attempts < target * 12:
        attempts += 1
        rw, rh = rng.randint(5, 9), rng.randint(4, 7)
        rx, ry = rng.randint(2, w - rw - 2), rng.randint(2, h - rh - 2)
        cx, cy = rx + rw // 2, ry + rh // 2
        if any(abs(cx - ox) < rw and abs(cy - oy) < rh for ox, oy, _, _ in rooms):
            continue
        b.carve_rect(rx, ry, rx + rw, ry + rh)
        rooms.append((cx, cy, rw, rh))
    rooms.sort(key=lambda r: (r[1], r[0]))
    for i in range(1, len(rooms)):
        ax, ay = rooms[i - 1][:2]; bx, by = rooms[i][:2]
        b.carve_corridor(ax, ay, bx, by, width=rng.choice([1, 2]))
    b.finalize_walls()
    b.render_north_faces()
    # entrance (first room) + Alpha lair (last room)
    ex, ey = rooms[0][:2]
    b.setp(ex, ey, "stairs", block=False)
    b.events.append({"x": ex, "y": ey, "name": "Entrance", "text": "Stairs back up."})
    ax, ay = rooms[-1][:2]
    b.setp(ax, ay, "grave", block=False)
    b.events.append({"x": ax, "y": ay, "name": "Alpha",
                     "text": "The Alpha stirs in the dark."})
    # props: pillars line big rooms; clutter scattered
    for (cx, cy, rw, rh) in rooms:
        if rw >= 7 and rh >= 5:
            for dx in (-(rw // 2) + 1, (rw // 2) - 1):
                b.setp(cx + dx, cy - rh // 2 + 1, "pillar")
                b.setp(cx + dx, cy + rh // 2 - 1, "pillar")
    b.scatter_in_rooms("crystal", 6 + tier * 2, block=True)
    b.scatter_in_rooms("rockpile", 8, block=True)
    b.scatter_in_rooms("barrel", 6); b.scatter_in_rooms("crate", 5)
    b.scatter_in_rooms("bones", 5, block=False); b.scatter_in_rooms("goldpile", 3)
    return b.write(name, region, "MAP_TYPE_DUNGEON", "The dark presses in.")


def gen_interior(name, w=26, h=18, seed=2, region="awakened", tier=1, hazard=""):
    b = IndoorBuilder(w, h, seed, "interior")
    rng = b.rng
    # Room floor starts at y=3, leaving a 2-tile-tall BACK WALL (rows 1-2) so the
    # top wall reads with height — the RM interior convention. Side/bottom walls
    # are the usual 1-tile border. Furniture sits IN FRONT of the walls.
    top = 3
    b.carve_rect(2, top, w - 3, h - 3)
    twin = (w >= 22 and rng.random() < 0.6)
    if twin:                                   # split into two rooms + a doorway
        mx = w // 2
        for y in range(top, h - 2):
            b.walk[y * b.W + mx] = (y == h - 4)
    b.finalize_walls()
    b.render_north_faces()
    # exit at the bottom-centre (back outside)
    exx = w // 2
    b.setp(exx, h - 3, "stairs", block=False)
    b.events.append({"x": exx, "y": h - 3, "name": "Exit", "text": "Leave."})
    fy = top                                    # first floor row (against back wall)
    by = h - 3                                  # last floor row (against front wall)
    # bedroom corner: bed against the back wall (1-wide, 2-tall: head over foot)
    b.setp(3, fy, "bed"); b.setp(3, fy + 1, "bed2")
    b.setp(4, fy, "cabinet")                    # nightstand/dresser beside it
    # storage along the back wall: bookshelf
    b.setp(w - 4, fy, "shelf"); b.setp(w - 5, fy, "shelf")
    # hearth on the front wall + a barrel beside it
    b.setp(3, by, "fireplace"); b.setp(4, by, "barrel")
    # dining set: a round table with a chair, roughly centred
    tx, ty = (w // 3 if twin else w // 2), h // 2
    b.setp(tx, ty, "table"); b.setp(tx, ty + 1, "chair", block=False)
    if "rug" in b.gid: b.setp(tx - 1, ty, "rug", block=False)
    # potted plants flanking the exit
    b.setp(exx - 2, by, "pot"); b.setp(exx + 2, by, "pot")
    # the second room (if split): a little store
    if twin:
        b.setp(w - 4, by, "crate"); b.setp(w - 5, by, "crate")
        b.setp(w - 4, fy + 2, "barrel")
    b.scatter_in_rooms("pot", 2); b.scatter_in_rooms("crate", 2)
    return b.write(name, region, "MAP_TYPE_INTERIOR", "...")
