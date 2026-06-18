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


def _validate_map(layout, mapobj, name):
    """Generator self-check: run the structural validators (collision/spawn/
    reachability) and shout if anything FAILs. Imported lazily so a missing PIL in
    mapcheck doesn't break generation."""
    try:
        from mapcheck import validate
    except Exception as ex:
        print("  [check] (skipped — %s)" % ex); return
    issues, _ = validate(layout, mapobj, mapobj.get("map_type", ""))
    fails = [m for s, m in issues if s == "FAIL"]
    warns = [m for s, m in issues if s == "WARN"]
    if fails:
        print("  [check] ❌ %s FAIL: " % name + "; ".join(fails))
    elif warns:
        print("  [check] ⚠ %s: " % name + "; ".join(warns[:2]))
    else:
        print("  [check] ✓ %s — spawn walkable, events reachable" % name)
    return not fails

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

    def _walk_components(self):
        W, H = self.W, self.H; seen = [False] * (W * H); out = []
        for s in range(W * H):
            if seen[s] or not self.walk[s]:
                continue
            comp = []; stack = [s]; seen[s] = True
            while stack:
                i = stack.pop(); comp.append(i); x, y = i % W, i // W
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H:
                        j = ny * W + nx
                        if not seen[j] and self.walk[j]:
                            seen[j] = True; stack.append(j)
            out.append(comp)
        return out

    def ensure_connected(self):
        """REACHABILITY GUARANTEE — after carving rooms/corridors, no walkable area
        may be stranded. Connect every disconnected component to the main (largest)
        one by carving a corridor between their centroids. Run before finalize_walls.
        This is what stops the boss/entrance ever being walled off (a soft-lock)."""
        W = self.W
        def centroid(comp):
            sx = sum(i % W for i in comp) // len(comp); sy = sum(i // W for i in comp) // len(comp)
            # snap to an actual cell of the component (nearest to the average)
            return min(comp, key=lambda i: (i % W - sx) ** 2 + (i // W - sy) ** 2)
        guard = 0
        comps = self._walk_components()
        while len(comps) > 1 and guard < 40:
            guard += 1
            comps.sort(key=len, reverse=True)
            main_c = centroid(comps[0])
            mx, my = main_c % W, main_c // W
            for comp in comps[1:]:
                c = centroid(comp); cx, cy = c % W, c // W
                self.carve_corridor(cx, cy, mx, my, width=1)
            comps = self._walk_components()

    def repair_prop_connectivity(self):
        """FINAL reachability guarantee — after props are placed, a blocking prop
        may sit on a cut vertex and sever the COLLISION map even though the floor
        (walk) is connected. Find any floor-prop that bridges two passable regions
        and remove it until the whole map is one passable component. This is what
        makes the no-soft-lock guarantee hold end-to-end."""
        W, H = self.W, self.H
        def coll_comps():
            seen = [False] * (W * H); cid = [-1] * (W * H); out = 0
            for s in range(W * H):
                if seen[s] or self.coll[s]:
                    continue
                stack = [s]; seen[s] = True
                while stack:
                    i = stack.pop(); cid[i] = out; x, y = i % W, i // W
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < W and 0 <= ny < H:
                            j = ny * W + nx
                            if not seen[j] and not self.coll[j]:
                                seen[j] = True; stack.append(j)
                out += 1
            return cid, out
        for _ in range(200):
            cid, ncomp = coll_comps()
            if ncomp <= 1:
                return
            # a removable prop = a blocked floor cell (walk + overlay prop, not a wall)
            # whose orthogonal neighbours touch >=2 different passable components.
            removed = False
            for i in range(W * H):
                if not (self.walk[i] and self.coll[i] and self.over[i] >= 0):
                    continue
                x, y = i % W, i // W
                nbr = set()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and not self.coll[ny * W + nx]:
                        nbr.add(cid[ny * W + nx])
                if len(nbr) >= 2:
                    self.over[i] = -1; self.coll[i] = 0; removed = True
                    break
            if not removed:
                return

    def place_monster(self, x, y, key, level, sprite="Monster1", name="Roamer", sight=5, speed=420):
        """A ROAMING creature (Radiant-Mythology style): it wanders the room and
        CHASES the player once they're within sight; contact starts a battle, then
        it despawns. `behavior` drives the engine's roamer update; `touch` is the
        contact fallback if the player walks into it."""
        self.events.append({
            "x": x, "y": y, "name": name, "trigger": "touch", "through": False,
            "behavior": {"type": "roam", "sight": sight, "speed": speed},
            "graphic": {"sprite": sprite, "file": "rtp/%s.png" % sprite,
                        "frame_w": 32, "frame_h": 32, "cols": 3, "rows": 4, "single": False},
            "commands": [
                {"type": "text", "text": "A System-twisted creature lunges from the dark!"},
                {"type": "battle", "enemies": [{"key": key, "level": level}]},
                {"type": "despawn"}]})

    def place_relic_cache(self, x, y, count=3):
        """A relic cache: offers a choice of `count` rolled relics (the roguelite
        per-run reward layer). One-shot is handled by the run controller (relics are
        per-run); the cache itself just runs the `relic` command."""
        self.setp(x, y, "crate", block=True)
        self.events.append({
            "x": x, "y": y, "name": "RelicCache", "trigger": "action", "through": False,
            "graphic": {"sprite": "Chest", "file": "rtp/Chest.png",
                        "frame_w": 32, "frame_h": 32, "cols": 3, "rows": 4, "single": False},
            "commands": [{"type": "relic", "count": count}]})

    def place_chest(self, x, y, money=0, item=None, pocket="items"):
        """A ONE-TIME loot chest: the loot is gated behind self-switch A so it can
        only be claimed once. After opening, it reads as empty (the self-switch
        persists across saves via the engine's event-state store)."""
        loot = []
        gained = []
        if money: loot.append({"type": "money", "op": "+", "amount": money}); gained.append("%d Cr" % money)
        if item: loot.append({"type": "item", "op": "+", "id": item, "pocket": pocket, "qty": 1}); gained.append("a " + item.replace("_", " "))
        loot.append({"type": "text", "text": "You found " + (" and ".join(gained) if gained else "nothing of use") + "."})
        loot.append({"type": "selfswitch", "letter": "A", "value": True})
        cmds = [{
            "type": "conditional",
            "cond": {"kind": "selfswitch", "letter": "A", "value": True},
            "then": [{"type": "text", "text": "The chest lies open and empty."}],
            "else": [{"type": "text", "text": "A weathered chest, half-buried in the dust."}] + loot}]
        self.setp(x, y, "crate", block=True)
        self.events.append({
            "x": x, "y": y, "name": "Chest", "trigger": "action", "through": False,
            "graphic": {"sprite": "Chest", "file": "rtp/Chest.png",
                        "frame_w": 32, "frame_h": 32, "cols": 3, "rows": 4, "single": False},
            "commands": cmds})

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

    def _room_floor(self, room, away_from_events=False, open_only=False):
        """A random empty walkable floor tile inside a room (cx,cy,rw,rh), avoiding
        overlay props, walls, and (optionally) other event tiles. `open_only` keeps
        it off narrow corridors (for blocking placements). Returns (x,y) or (None,None)."""
        cx, cy, rw, rh = room
        evset = {(e["x"], e["y"]) for e in self.events} if away_from_events else set()
        for _ in range(40):
            x = cx + self.rng.randint(-(rw // 2) + 1, rw // 2 - 1)
            y = cy + self.rng.randint(-(rh // 2) + 1, rh // 2 - 1)
            i = y * self.W + x
            if (0 <= x < self.W and 0 <= y < self.H and self.walk[i]
                    and self.over[i] == -1 and not self.coll[i] and (x, y) not in evset
                    and (not open_only or self._is_open(x, y))):
                return x, y
        return None, None

    def _is_open(self, x, y):
        """True if (x,y) has >=3 walkable orthogonal neighbours — i.e. it's in a
        room body, not a 1-wide corridor. Placing a BLOCKING prop here can never
        sever a passage, so connectivity stays intact after prop placement."""
        n = 0
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < self.W and 0 <= ny < self.H and self.walk[ny * self.W + nx]:
                n += 1
        return n >= 3

    def scatter_in_rooms(self, name, n, block=True):
        placed = tries = 0
        while placed < n and tries < n * 80:
            tries += 1
            x, y = self.rng.randint(1, self.W - 2), self.rng.randint(1, self.H - 2)
            i = y * self.W + x
            if not self.walk[i] or self.over[i] != -1 or self.coll[i]: continue
            # a BLOCKING prop must sit in open room space, never plugging a corridor
            if block and not self._is_open(x, y): continue
            self.setp(x, y, name, block); placed += 1

    def write(self, name, region, map_type, door_text):
        lid, mid = "LAYOUT_" + name.upper(), "MAP_" + name.upper()
        layout = {"id": lid, "width": self.W, "height": self.H, "tileset": self.base_name,
                  "tileset_group": [{"name": self.base_name, "offset": 0, "count": self.base_n}],
                  "metatiles": self.meta, "collision": self.coll, "terrain": [""] * (self.W * self.H),
                  "overlay_tileset": self.props_name, "overlay": self.over, "tileSize": T}
        os.makedirs(os.path.join(ROOT, "data", "layouts", region), exist_ok=True)
        json.dump(layout, open(os.path.join(ROOT, "data", "layouts", region, lid + ".json"), "w"))
        events = [{"id": i + 1, "name": e.get("name", "Event%d" % (i + 1)),
                   "x": e["x"], "y": e["y"],
                   "graphic": e.get("graphic", {"sprite": "", "file": "", "single": True}),
                   "dir": e.get("dir", "down"), "trigger": e.get("trigger", "action"),
                   "through": e.get("through", False),
                   "behavior": e.get("behavior"),
                   "commands": e.get("commands", [{"type": "text", "text": e.get("text", door_text)}])}
                  for i, e in enumerate(self.events)]
        # explicit player spawn = the Entrance (walkable stairs), else first walkable tile.
        start = None
        for e in events:
            if e["name"] in ("Entrance", "StairsUp"):
                start = {"x": e["x"], "y": e["y"]}; break
        if start is None or self.coll[start["y"] * self.W + start["x"]]:
            for i, c in enumerate(self.coll):
                if not c: start = {"x": i % self.W, "y": i // self.W}; break
        mapobj = {"id": mid, "name": name, "region": region, "parent": "", "layout": lid,
                  "music": "MUS_NONE", "weather": "WEATHER_NONE", "map_type": map_type,
                  "allow_running": True, "show_map_name": True, "connections": [],
                  "start": start, "npcs": [], "warps": [], "triggers": [], "signs": [],
                  "events": events}
        # ── self-CHECK: validate collision/spawn/reachability before writing ──
        _validate_map(layout, mapobj, name)
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
    # connect each room to the previous (a spanning chain) + a couple of extra
    # edges so the layout has LOOPS / decision points, not a single corridor.
    for i in range(1, len(rooms)):
        ax, ay = rooms[i - 1][:2]; bx, by = rooms[i][:2]
        b.carve_corridor(ax, ay, bx, by, width=rng.choice([1, 2]))
    for _ in range(1 + tier):                       # extra loop edges
        if len(rooms) >= 3:
            r1, r2 = rng.sample(rooms, 2)
            b.carve_corridor(r1[0], r1[1], r2[0], r2[1], width=1)
    # REACHABILITY GUARANTEE: nothing may be walled off from the main area.
    b.ensure_connected()
    b.finalize_walls()
    b.render_north_faces()

    # ── critical path: Entrance = first room; Alpha lair = the room FARTHEST from
    # it (so the boss sits deep), measured by walking distance through the graph. ──
    ex, ey = rooms[0][:2]
    def far(r): return (r[0] - ex) ** 2 + (r[1] - ey) ** 2
    alpha_room = max(rooms, key=far)
    ax, ay = alpha_room[:2]
    b.setp(ex, ey, "stairs", block=False)
    b.events.append({"x": ex, "y": ey, "name": "Entrance",
                     "graphic": {"sprite": "Other3", "file": "rtp/Other3.png",
                                 "frame_w": 32, "frame_h": 32, "cols": 3, "rows": 4, "single": False},
                     "commands": [{"type": "text", "text": "Worn stairs lead back up to the surface."}]})
    # the Alpha = a real boss encounter (a tougher creature, level-scaled)
    boss_key = rng.choice(["thornwolf", "emberling"])
    boss_lvl = 2 + tier * 2
    b.events.append({"x": ax, "y": ay, "name": "Alpha", "trigger": "action", "through": False,
                     "graphic": {"sprite": "Monster2", "file": "rtp/Monster2.png",
                                 "frame_w": 32, "frame_h": 32, "cols": 3, "rows": 4, "single": False},
                     "commands": [
                         {"type": "text", "text": "The Alpha uncoils from the dark — far larger than its kin."},
                         {"type": "battle", "enemies": [{"key": boss_key, "level": boss_lvl},
                                                        {"key": boss_key, "level": max(1, boss_lvl - 2)}]},
                         {"type": "text", "text": "The Alpha falls. The dungeon goes still."},
                         {"type": "despawn"}]})

    # ── ENCOUNTERS: roaming creatures in the non-entrance rooms, scaled by tier
    # and by depth (distance from the entrance). Contact = battle. ──
    body_rooms = [r for r in rooms if r is not rooms[0] and r is not alpha_room]
    maxd = max((far(r) for r in rooms), default=1) or 1
    sprites = ["Monster1", "Monster3"]
    for r in body_rooms:
        if rng.random() < 0.75:
            depth = far(r) / maxd                    # 0 near entrance .. 1 deep
            lvl = max(1, tier + int(depth * 2 + rng.random()))
            key = "thornwolf" if depth > 0.5 and rng.random() < 0.6 else "emberling"
            sx, sy = b._room_floor(r)
            if sx is not None:
                b.place_monster(sx, sy, key, lvl, sprite=rng.choice(sprites))

    # ── LOOT: chests reward exploring the deep / dead-end rooms (risk→reward). ──
    loot_rooms = sorted(body_rooms, key=far, reverse=True)[:1 + tier]
    for r in loot_rooms:
        cx, cy = b._room_floor(r, away_from_events=True, open_only=True)
        if cx is not None:
            money = rng.randint(40, 80) * (1 + int(far(r) / maxd * 2))
            item = rng.choice([None, "potion", "bandage", "ration", "ether"])
            b.place_chest(cx, cy, money=money, item=item)

    # ── RELIC CACHE: one per floor, in the deepest body room (the run reward layer). ──
    if loot_rooms:
        rr = loot_rooms[0]
        rx, ry = b._room_floor(rr, away_from_events=True, open_only=True)
        if rx is not None:
            b.place_relic_cache(rx, ry, count=3)

    # props: pillars line big halls; clutter scattered (kept lighter now)
    for (cx, cy, rw, rh) in rooms:
        if rw >= 7 and rh >= 5:
            for dx in (-(rw // 2) + 1, (rw // 2) - 1):
                for py in (cy - rh // 2 + 1, cy + rh // 2 - 1):
                    if b.inb(cx + dx, py) and b.over[py * b.W + cx + dx] == -1 and b._is_open(cx + dx, py):
                        b.setp(cx + dx, py, "pillar")
    b.scatter_in_rooms("crystal", 4 + tier, block=True)
    b.scatter_in_rooms("rockpile", 6, block=True)
    b.scatter_in_rooms("bones", 4, block=False)
    b.repair_prop_connectivity()                     # guarantee: no prop soft-locks
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
    b.ensure_connected()
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
    b.repair_prop_connectivity()                     # guarantee: no prop soft-locks
    return b.write(name, region, "MAP_TYPE_INTERIOR", "...")
