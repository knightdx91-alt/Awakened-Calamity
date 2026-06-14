#!/usr/bin/env python3
"""Modular building constructor — assembles a correct building of ANY footprint.

Roof is AUTOTILED over a footprint mask (outer corners, edges, inner corners for
L-shapes), and a tall wall face hangs below every south-facing roof edge, with a
door and windows. Same material builds a hut, an L-shaped manor, or a keep.

Pieces come from build_building_tileset.synth_pieces (roof tl/t/tr/l/c/r/bl/b/br
+ inner corners ine/inw/ise/isw; wall c/l/r, door, window).
"""
import argparse
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_building_tileset import synth_pieces  # noqa: E402

TILE = 16


def _pieces(m):
    return m if isinstance(m, dict) else synth_pieces(m)


def _roof_piece(p, n, s, e, w, ne, nw, se, sw):
    if not n and not w: return p["roof_tl"]
    if not n and not e: return p["roof_tr"]
    if not s and not w: return p["roof_bl"]
    if not s and not e: return p["roof_br"]
    if not n: return p["roof_t"]
    if not s: return p["roof_b"]
    if not w: return p["roof_l"]
    if not e: return p["roof_r"]
    if not ne: return p.get("roof_ine", p["roof_c"])
    if not nw: return p.get("roof_inw", p["roof_c"])
    if not se: return p.get("roof_ise", p["roof_c"])
    if not sw: return p.get("roof_isw", p["roof_c"])
    return p["roof_c"]


def build_from_mask(material, mask, wall_rows=2):
    """mask: 2D list of bools (roof footprint). Returns an RGBA building image
    sized (cols) x (rows + wall_rows)."""
    p = _pieces(material)
    rows = len(mask)
    cols = max(len(r) for r in mask)
    mask = [list(r) + [False] * (cols - len(r)) for r in mask]
    H = rows + wall_rows
    img = Image.new("RGBA", (cols * TILE, H * TILE), (0, 0, 0, 0))

    def m(r, c):
        return 0 <= r < rows and 0 <= c < cols and mask[r][c]

    def put(c, r, tile):
        img.paste(tile, (c * TILE, r * TILE), tile)

    # wall cells: below every south-facing roof edge
    wall = {}              # (r,c) -> role
    for r in range(rows):
        for c in range(cols):
            if m(r, c) and not m(r + 1, c):
                for k in range(1, wall_rows + 1):
                    wr = r + k
                    if not m(wr, c) and wr < H:
                        wall[(wr, c)] = "wall"
    # choose a door: widest south-edge run, bottom-most
    edges = {}
    for (wr, c) in wall:
        edges.setdefault(wr, []).append(c)
    door_cell = None
    if edges:
        wr = max(edges)                       # lowest wall row
        cs = sorted(edges[wr])
        door_cell = (wr, cs[len(cs) // 2])

    # roof
    for r in range(rows):
        for c in range(cols):
            if not m(r, c):
                continue
            put(c, r, _roof_piece(
                p, m(r - 1, c), m(r + 1, c), m(r, c + 1), m(r, c - 1),
                m(r - 1, c + 1), m(r - 1, c - 1), m(r + 1, c + 1), m(r + 1, c - 1)))
    # walls
    for (wr, c), _role in wall.items():
        if door_cell == (wr, c):
            tile = p["wall_door"]
        elif (wr - 1, c) not in wall and "wall_window" in p and c % 2 == 1:
            tile = p["wall_window"]            # window on upper wall row
        elif not m(wr, c - 1) and (wr, c - 1) not in wall:
            tile = p["wall_l"]
        elif not m(wr, c + 1) and (wr, c + 1) not in wall:
            tile = p["wall_r"]
        else:
            tile = p["wall_c"]
        put(c, wr, tile)
    return img


def rect_mask(w, h):
    return [[True] * w for _ in range(h)]


def L_mask(w, h, cut_w, cut_h):
    """Rectangle w x h with the top-right cut_w x cut_h removed -> L shape."""
    g = rect_mask(w, h)
    for r in range(cut_h):
        for c in range(w - cut_w, w):
            g[r][c] = False
    return g


def build_house(material, w, h, wall_rows=2):
    return build_from_mask(material, rect_mask(w, max(2, h - wall_rows)), wall_rows)


def build_castle(material, w, h, parts_dir, wall_rows=3):
    """Stone keep + 4 corner towers + a gatehouse. Returns an RGBA image."""
    keep = build_from_mask(material, rect_mask(w, max(2, h - wall_rows)), wall_rows)
    tower = Image.open(os.path.join(parts_dir, "tower.png")).convert("RGBA")
    gate = Image.open(os.path.join(parts_dir, "gate.png")).convert("RGBA")
    pad = TILE * 2
    canvas = Image.new("RGBA", (keep.width + pad * 2, keep.height + pad * 2), (0, 0, 0, 0))
    canvas.alpha_composite(keep, (pad, pad))
    for cx, cy in [(pad, pad), (pad + keep.width, pad),
                   (pad, pad + keep.height), (pad + keep.width, pad + keep.height)]:
        canvas.alpha_composite(tower, (cx - tower.width // 2, cy - tower.height // 2))
    canvas.alpha_composite(gate, (pad + keep.width // 2 - gate.width // 2,
                                  pad + keep.height - gate.height + TILE))
    return canvas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--material", required=True)
    ap.add_argument("--shape", choices=["rect", "L"], default="rect")
    ap.add_argument("--w", type=int, default=6)
    ap.add_argument("--h", type=int, default=5)
    ap.add_argument("--wall-rows", type=int, default=2)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=int, default=4)
    args = ap.parse_args()
    if args.shape == "L":
        mask = L_mask(args.w, args.h, args.w // 2, args.h // 2)
    else:
        mask = rect_mask(args.w, args.h)
    house = build_from_mask(args.material, mask, args.wall_rows)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    house.resize((house.width * args.scale, house.height * args.scale),
                 Image.NEAREST).save(args.out)
    print(f"built {args.shape} {args.w}x{args.h} -> {args.out}")


if __name__ == "__main__":
    main()
