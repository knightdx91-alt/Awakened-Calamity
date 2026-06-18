#!/usr/bin/env python3
"""mapcheck — validation + batch-preview harness for the map generator.

Generates maps across a seed matrix (or validates existing layout files), runs
STRUCTURAL validators on each (reachability, event interactability, overlaps,
prop sanity, route/connection edges, critical path), renders a contact sheet of
thumbnails, and writes a pass/fail report. Run this on every generator change to
catch broken maps automatically instead of by eye.

Usage:
  python3 tools/mapcheck.py batch [--seeds N] [--out /tmp/mapcheck]
  python3 tools/mapcheck.py file LAYOUT_DAWNHEARTH      # validate one existing map
"""
import json, os, sys, argparse
from collections import deque
try:
    from PIL import Image, ImageDraw   # only needed for the contact-sheet render
except ImportError:
    Image = ImageDraw = None           # validation (file/all) works without it

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS   = os.path.join(ROOT, "data", "tilesets")
LAY  = os.path.join(ROOT, "data", "layouts", "awakened")
MAPS = os.path.join(ROOT, "data", "maps", "awakened")
T    = 32

# ───────────────────────── tile rendering (thumbnails) ─────────────────────────
_sheets = {}
def _sheet(name):
    if name not in _sheets:
        p = os.path.join(TS, name + ".png")
        _sheets[name] = Image.open(p).convert("RGBA") if os.path.exists(p) else None
        meta = os.path.join(TS, name + ".json")
        _sheets[name + ".pr"] = (json.load(open(meta)).get("metatiles_per_row", 16)
                                 if os.path.exists(meta) else 16)
    return _sheets[name], _sheets[name + ".pr"]

def render_layout(layout, max_px=200):
    W, H = layout["width"], layout["height"]
    ts = layout.get("tileSize", T)
    base, bpr = _sheet(layout["tileset"])
    ov, opr = _sheet(layout["overlay_tileset"]) if layout.get("overlay_tileset") else (None, 16)
    up, upr = _sheet(layout.get("upper_tileset")) if layout.get("upper_tileset") else (None, 16)
    out = Image.new("RGBA", (W * ts, H * ts), (0, 0, 0, 255))
    def blit(src, pr, idx, x, y):
        if src is None or idx < 0:
            return
        c, r = idx % pr, idx // pr
        t = src.crop((c * ts, r * ts, c * ts + ts, r * ts + ts))
        out.alpha_composite(t, (x * ts, y * ts))
    mt = layout["metatiles"]; ovl = layout.get("overlay"); upl = layout.get("upper")
    for y in range(H):
        for x in range(W):
            i = y * W + x
            blit(base, bpr, mt[i], x, y)
            if ovl: blit(ov, opr, ovl[i], x, y)
            if upl and i < len(upl): blit(up, upr, upl[i], x, y)
    scale = min(1.0, max_px / max(out.size))
    return out.resize((max(1, int(out.width * scale)), max(1, int(out.height * scale))), Image.NEAREST)

# ───────────────────────── validators ─────────────────────────
def _components(W, H, walk):
    """4-connected components of walkable cells. Returns list of sets of i."""
    seen = [False] * (W * H); comps = []
    for s in range(W * H):
        if walk[s] or seen[s]:
            continue
        # walk[i]==0 means walkable here (collision array: 0 walkable, 1 blocked)
    # build over walkable (collision==0)
    seen = [False] * (W * H)
    for s in range(W * H):
        if seen[s] or walk[s] != 0:
            continue
        comp = set(); q = deque([s]); seen[s] = True
        while q:
            i = q.popleft(); comp.add(i)
            x, y = i % W, i // W
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H:
                    j = ny * W + nx
                    if not seen[j] and walk[j] == 0:
                        seen[j] = True; q.append(j)
        comps.append(comp)
    return comps

def validate(layout, mapobj, map_type=""):
    """Return (issues, stats). issue = (severity 'FAIL'|'WARN', message)."""
    W, H = layout["width"], layout["height"]
    coll = layout["collision"]
    overlay = layout.get("overlay") or [-1] * (W * H)
    terrain = layout.get("terrain") or [""] * (W * H)
    events = (mapobj or {}).get("events", [])
    issues = []

    comps = _components(W, H, coll)
    walk_total = sum(1 for c in coll if c == 0)
    main = max(comps, key=len) if comps else set()
    isolated = walk_total - len(main)

    # 1) Reachability: large isolated walkable pockets are a generation bug.
    if len(comps) > 1 and isolated > max(8, walk_total * 0.02):
        sizes = sorted((len(c) for c in comps), reverse=True)
        issues.append(("WARN", f"{len(comps)} disconnected walkable regions "
                               f"({isolated} tiles unreachable from the main area; sizes {sizes[:5]})"))

    # 2) Event interactability: an action event must have a reachable adjacent tile.
    def adj_reachable(x, y):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (0, 0)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and (ny * W + nx) in main:
                return True
        return False
    seen_xy = {}
    for e in events:
        x, y = e.get("x"), e.get("y")
        if x is None or y is None:
            continue
        key = (x, y)
        if key in seen_xy:
            issues.append(("WARN", f"events overlap at ({x},{y}): '{seen_xy[key]}' and '{e.get('name')}'"))
        seen_xy[key] = e.get("name")
        if not (0 <= x < W and 0 <= y < H):
            issues.append(("FAIL", f"event '{e.get('name')}' at ({x},{y}) is off-map"))
            continue
        if not adj_reachable(x, y):
            issues.append(("FAIL", f"event '{e.get('name')}' at ({x},{y}) is unreachable "
                                   f"(no adjacent tile in the main walkable area)"))

    # 3) Prop sanity: a blocking overlay prop sitting on water reads as a bug.
    on_water = 0
    for i in range(W * H):
        if overlay[i] >= 0 and terrain[i] == "water":
            on_water += 1
    if on_water:
        issues.append(("WARN", f"{on_water} overlay props placed on water tiles"))

    # 4) Route/connection edges: a route needs walkable tiles on both far borders.
    if "ROUTE" in (map_type or "") or "ROUTE" in (mapobj or {}).get("map_type", ""):
        left = any(coll[y * W + 0] == 0 for y in range(H))
        right = any(coll[y * W + (W - 1)] == 0 for y in range(H))
        top = any(coll[0 * W + x] == 0 for x in range(W))
        bot = any(coll[(H - 1) * W + x] == 0 for x in range(W))
        if not ((left and right) or (top and bot)):
            issues.append(("FAIL", "route has no walkable corridor reaching opposite borders"))

    # 5) Sanity: there must be a usable play area at all.
    if walk_total < (W * H) * 0.03:
        issues.append(("FAIL", f"almost no walkable space ({walk_total}/{W*H} tiles)"))

    # 6) PLAYER SPAWN: where the engine drops the player when no coords are given
    #    must be WALKABLE and in the main region — mirrors engine _mapStart():
    #    map.start -> Entrance/StairsUp event -> map centre. A spawn in a wall is the
    #    "descended into solid rock, can't move" bug.
    mobj = mapobj or {}
    start = None
    if mobj.get("start") and mobj["start"].get("x") is not None:
        start = (mobj["start"]["x"], mobj["start"]["y"], "map.start")
    if start is None:
        for e in events:
            if e.get("name") in ("Entrance", "StairsUp") and e.get("x") is not None:
                start = (e["x"], e["y"], f"'{e['name']}' event"); break
    if start is None:
        start = (W // 2, H // 2, "centre fallback")
    sx, sy, ssrc = start
    if not (0 <= sx < W and 0 <= sy < H):
        issues.append(("FAIL", f"player spawn ({ssrc}) at ({sx},{sy}) is off-map"))
    elif coll[sy * W + sx] != 0:
        issues.append(("FAIL", f"player spawn ({ssrc}) at ({sx},{sy}) is a WALL "
                               f"(engine will snap to nearest walkable, but fix the source)"))
    elif (sy * W + sx) not in main:
        issues.append(("WARN", f"player spawn ({ssrc}) at ({sx},{sy}) is walkable but in an "
                               f"isolated pocket (not the main reachable area)"))

    stats = {"w": W, "h": H, "walkable": walk_total, "regions": len(comps),
             "isolated": isolated, "events": len(events)}
    return issues, stats

# ───────────────────────── batch runner ─────────────────────────
ARCHES = ["town", "route", "forest", "dungeon", "interior"]

def _gen(arch, name, seed):
    import mapgen, mapgen_indoor
    if arch == "town":     return mapgen.gen_town(name, 40, 40, seed)
    if arch == "route":    return mapgen.gen_route(name, 60, 28, seed)
    if arch == "forest":   return mapgen.gen_forest(name, 40, 40, seed)
    if arch == "dungeon":  return mapgen_indoor.gen_dungeon(name, 44, 40, seed)
    if arch == "interior": return mapgen_indoor.gen_interior(name, 26, 18, seed)

def batch(seeds, out_dir):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    os.makedirs(out_dir, exist_ok=True)
    idx_path = os.path.join(MAPS + "_index.json")
    idx_backup = open(idx_path).read() if os.path.exists(idx_path) else None
    temp_names, thumbs, report = [], [], []
    n_fail = n_warn = 0
    for arch in ARCHES:
        for s in range(seeds):
            seed = 100 + s
            name = f"_chk_{arch}_{seed}"
            temp_names.append(name)
            try:
                _gen(arch, name, seed)
            except Exception as e:
                report.append((arch, seed, [("FAIL", f"generation crashed: {e}")], {}))
                n_fail += 1
                thumbs.append((f"{arch} s{seed}", None, "FAIL"))
                continue
            layout = json.load(open(os.path.join(LAY, "LAYOUT_" + name.upper() + ".json")))
            mapobj = json.load(open(os.path.join(MAPS, name + ".json")))
            issues, stats = validate(layout, mapobj, mapobj.get("map_type", ""))
            fails = [m for sev, m in issues if sev == "FAIL"]
            warns = [m for sev, m in issues if sev == "WARN"]
            n_fail += len(fails); n_warn += len(warns)
            status = "FAIL" if fails else ("WARN" if warns else "OK")
            report.append((arch, seed, issues, stats))
            thumbs.append((f"{arch} s{seed} [{status}]", render_layout(layout), status))

    # contact sheet
    _contact_sheet(thumbs, os.path.join(out_dir, "contact_sheet.png"))
    # text report
    lines = [f"MAPCHECK — {len(thumbs)} maps, {n_fail} FAIL, {n_warn} WARN", "=" * 60]
    for arch, seed, issues, stats in report:
        tag = "OK" if not issues else ("FAIL" if any(s == "FAIL" for s, _ in issues) else "WARN")
        lines.append(f"[{tag}] {arch} seed={seed}  {stats}")
        for sev, msg in issues:
            lines.append(f"     {sev}: {msg}")
    open(os.path.join(out_dir, "report.txt"), "w").write("\n".join(lines))

    # cleanup temp maps + restore index
    for name in temp_names:
        for p in (os.path.join(LAY, "LAYOUT_" + name.upper() + ".json"),
                  os.path.join(MAPS, name + ".json")):
            if os.path.exists(p): os.remove(p)
    if idx_backup is not None:
        open(idx_path, "w").write(idx_backup)
    print("\n".join(lines))
    print(f"\ncontact sheet -> {os.path.join(out_dir, 'contact_sheet.png')}")
    return n_fail

def _contact_sheet(thumbs, path):
    cols = 5
    cellw = max((t[1].width if t[1] else 120) for t in thumbs) + 8
    cellh = max((t[1].height if t[1] else 120) for t in thumbs) + 22
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cellw, rows * cellh), (24, 24, 28, 255))
    d = ImageDraw.Draw(sheet)
    COLOR = {"OK": (120, 220, 120), "WARN": (230, 200, 90), "FAIL": (235, 90, 90)}
    for i, (label, img, status) in enumerate(thumbs):
        cx, cy = (i % cols) * cellw + 4, (i // cols) * cellh + 18
        d.rectangle([cx - 3, cy - 16, cx + cellw - 8, cy + cellh - 24], outline=COLOR.get(status, (200, 200, 200)))
        d.text((cx - 1, cy - 15), label, fill=COLOR.get(status, (220, 220, 220)))
        if img: sheet.alpha_composite(img, (cx, cy))
    sheet.save(path)

def file_check(layout_name):
    layout = json.load(open(os.path.join(LAY, layout_name + ".json")))
    # find the map that references this layout
    mapobj = None
    for f in os.listdir(MAPS):
        if f.endswith(".json") and not f.startswith("_"):
            mo = json.load(open(os.path.join(MAPS, f)))
            if isinstance(mo, dict) and mo.get("layout") == layout_name:
                mapobj = mo; break
    issues, stats = validate(layout, mapobj or {}, (mapobj or {}).get("map_type", ""))
    print(f"{layout_name}: {stats}")
    for sev, msg in issues:
        print(f"  {sev}: {msg}")
    if not issues:
        print("  OK — no issues")
    return sum(1 for s, _ in issues if s == "FAIL")

def all_check():
    """Validate EVERY committed map against its layout — collision/reachability/
    spawn. Returns the FAIL count. This is the 'evaluate collision in all maps' pass."""
    n_fail = n_warn = n_ok = 0
    rows = []
    for f in sorted(os.listdir(MAPS)):
        if not f.endswith(".json") or f.startswith("_"):
            continue
        mo = json.load(open(os.path.join(MAPS, f)))
        if not isinstance(mo, dict) or not mo.get("layout"):
            continue
        lp = os.path.join(LAY, mo["layout"] + ".json")
        if not os.path.exists(lp):
            rows.append(("FAIL", f, [("FAIL", f"missing layout {mo['layout']}")])); n_fail += 1; continue
        layout = json.load(open(lp))
        issues, _ = validate(layout, mo, mo.get("map_type", ""))
        fails = [m for s, m in issues if s == "FAIL"]
        warns = [m for s, m in issues if s == "WARN"]
        status = "FAIL" if fails else ("WARN" if warns else "OK")
        if status == "FAIL": n_fail += 1
        elif status == "WARN": n_warn += 1
        else: n_ok += 1
        rows.append((status, f, issues))
    print(f"MAPCHECK ALL — {len(rows)} maps: {n_ok} OK, {n_warn} WARN, {n_fail} FAIL\n" + "=" * 60)
    for status, f, issues in rows:
        if status == "OK":
            continue
        print(f"[{status}] {f}")
        for sev, msg in issues:
            print(f"   {sev}: {msg}")
    if n_fail == 0:
        print("\nNo FAILs — every map's spawn is walkable and events are reachable.")
    return n_fail

def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("batch"); b.add_argument("--seeds", type=int, default=5); b.add_argument("--out", default="/tmp/mapcheck")
    f = sub.add_parser("file"); f.add_argument("layout")
    sub.add_parser("all")
    a = ap.parse_args()
    if a.cmd == "batch":
        sys.exit(1 if batch(a.seeds, a.out) else 0)
    elif a.cmd == "all":
        sys.exit(1 if all_check() else 0)
    else:
        sys.exit(1 if file_check(a.layout) else 0)

if __name__ == "__main__":
    main()
