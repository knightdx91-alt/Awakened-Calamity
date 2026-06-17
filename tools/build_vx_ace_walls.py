#!/usr/bin/env python3
"""Bake RPG Maker VX Ace RTP A3 (roofs) + A4 (walls) into the editor's formats.

A3/A4 building tiles use RM's WALL autotile shape, not the FLOOR shape: each tile
is a 2x2-TILE block (64x64 px = 4x4 quarters) and only the four ORTHOGONAL
neighbours matter (no diagonals, no inner-corner case) -> a 16-variant set. For
each of a tile's four corners we pick a quarter from the block based on that
corner's two orthogonal neighbours: outer corner / horizontal edge / vertical
edge / interior fill. Composing all 256 neighbour masks (diagonals ignored) and
de-duping yields the 16 blob tiles + a 256-entry LUT, baked in the same
`wang8_lut` scheme the editor terrain brush + engine already consume.

  A3 roofs  -> data/tilesets/rtp_outside_roof.{png,json,autotile.json}
              (overlay terrains over a transparent base; drawn on Layer 3)
  A4 walls  -> data/tilesets/rtp_<scene>_wall.{png,json,autotile.json}  (wall TOPs)
            + data/tilesets/rtp_<scene>_wallface.{png,json}             (side FACE
              strip: a structural 3-col [left/mid/right] x 3-row [cap/body/base]
              sheet the indoor builder stacks under a wall-top for the standard
              RM "wall comes up" side-view look)

A4 layout (16x15 tiles) = 3 vertical bands of 5 rows: 2 wall-TOP rows (2x2 blocks)
+ 3 wall-SIDE rows (2x3 blocks), 8 blocks wide. Verified against blob renders.
"""
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS   = os.path.join(ROOT, "data", "tilesets")
T    = 32
Q    = T // 2
PR   = 16

# ── 2x2-tile WALL block (64x64 px = 4x4 quarters) ─────────────────────────────
def wblock(im, bc, br):
    return im.crop((bc * 2 * T, br * 2 * T, bc * 2 * T + 2 * T, br * 2 * T + 2 * T))

# per-corner quarter pickers (orthogonal only): args = (orthoH same, orthoV same)
def tl_q(W, N): return (1, 1) if (W and N) else (0, 1) if N else (1, 0) if W else (0, 0)
def tr_q(E, N): return (2, 1) if (E and N) else (3, 1) if N else (2, 0) if E else (3, 0)
def bl_q(W, S): return (1, 2) if (W and S) else (0, 2) if S else (1, 3) if W else (0, 3)
def br_q(E, S): return (2, 2) if (E and S) else (3, 2) if S else (2, 3) if E else (3, 3)

def compose(blk, N, E, S, W):
    t = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    for (qx, qy), (dx, dy) in [(tl_q(W, N), (0, 0)), (tr_q(E, N), (Q, 0)),
                               (bl_q(W, S), (0, Q)), (br_q(E, S), (Q, Q))]:
        t.paste(blk.crop((qx * Q, qy * Q, qx * Q + Q, qy * Q + Q)), (dx, dy))
    return t

# mask bits (clockwise, set = SAME terrain): N=1 NE=2 E=4 SE=8 S=16 SW=32 W=64 NW=128
def wall_autotile(blk):
    """16 de-duped wall-top variants + a 256-entry LUT (diagonals ignored)."""
    variants = []
    for v in range(16):
        N, E, S, W = v & 1, v & 2, v & 4, v & 8
        variants.append(compose(blk, N, E, S, W))
    lut = [0] * 256
    for m in range(256):
        N = 1 if m & 1 else 0
        E = 2 if m & 4 else 0
        S = 4 if m & 16 else 0
        W = 8 if m & 64 else 0
        lut[m] = N | E | S | W
    return variants, lut


def _new_index_add(name):
    idx_path = os.path.join(TS, "_index.json")
    idx = json.load(open(idx_path))
    if name not in idx:
        json.dump(sorted(set(idx) | {name}), open(idx_path, "w"))


def bake_wall_set(out, src, blocks, collision, base_rgba=(0, 0, 0, 0), source_note=""):
    """blocks: list of (name, block_col, block_row). Bakes a wang8_lut tileset
    whose tile 0 is the (usually transparent) base and each block a terrain."""
    im = Image.open(os.path.join(TS, src)).convert("RGBA")
    tiles = [Image.new("RGBA", (T, T), base_rgba)]
    beh, col = [0], [0]
    cfg = {"tile": T, "per_row": PR, "scheme": "wang8_lut",
           "priority": ["base"] + [b[0] for b in blocks],
           "fills": {"base": 0}, "terrains": {}}
    print(f"=== {out} ({src}) ===")
    for name, bc, br in blocks:
        blk = wblock(im, bc, br)
        variants, local = wall_autotile(blk)
        start = len(tiles)
        for t in variants:
            tiles.append(t); beh.append(0); col.append(collision)
        lut = [start + local[m] for m in range(256)]
        cfg["terrains"][name] = {"lut": lut, "luts": {"base": lut},
                                 "behavior": 0, "collision": collision, "count": len(variants)}
        print(f"  {name}: wall-top autotile -> {len(variants)} tiles")
    _write_sheet(out, tiles, beh, col, source_note)
    json.dump(cfg, open(os.path.join(TS, out + ".autotile.json"), "w"))
    _new_index_add(out)
    print(f"  wrote {out}: {len(tiles)} tiles")


def bake_wallface(out, src, bands, source_note=""):
    """A4 wall-SIDE face: a structural [left/mid/right] x [cap/body/base] sheet
    per wall material. The 2x3-tile side block (64x96) splits into:
      row0 = top CAP (lit lip), row1 = BODY (repeats), row2 = BASE (bottom).
    Each row has a left column (left-edge half + interior half) and a right
    column (interior half + right-edge half); we synthesise a MID tile (both
    halves interior) so the builder can run cap_L cap_M* cap_R across any width.
    Slots are recorded in the .json `slots` map: {material:{cap:[l,m,r],body:[..],base:[..]}}.
    """
    im = Image.open(os.path.join(TS, src)).convert("RGBA")
    tiles, beh, col, slots = [], [], [], {}
    for name, bc, br in bands:
        blk = im.crop((bc * 2 * T, br * T, bc * 2 * T + 2 * T, br * T + 3 * T))  # 64x96
        mat = {}
        for ri, key in enumerate(("cap", "body", "base")):
            L = blk.crop((0, ri * T, T, ri * T + T))          # left column tile
            R = blk.crop((T, ri * T, 2 * T, ri * T + T))      # right column tile
            M = Image.new("RGBA", (T, T))                      # interior: L-right half + R-left half
            M.paste(L.crop((Q, 0, T, T)), (0, 0))
            M.paste(R.crop((0, 0, Q, T)), (Q, 0))
            ids = []
            for img in (L, M, R):
                ids.append(len(tiles)); tiles.append(img); beh.append(0); col.append(1)
            mat[key] = ids
        slots[name] = mat
        print(f"  {name}: wall face -> cap/body/base x L/M/R")
    _write_sheet(out, tiles, beh, col, source_note, extra={"slots": slots})
    _new_index_add(out)
    print(f"  wrote {out}: {len(tiles)} tiles")


def _write_sheet(out, tiles, beh, col, source_note, extra=None):
    n = len(tiles); rows = (n + PR - 1) // PR
    sheet = Image.new("RGBA", (PR * T, rows * T), (0, 0, 0, 0))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % PR) * T, (i // PR) * T))
    sheet.save(os.path.join(TS, out + ".png"))
    meta = {"total_metatiles": n, "primary_count": n, "secondary_count": 0,
            "tile": T, "metatiles_per_row": PR,
            "source": source_note or "RPG Maker VX Ace RTP (prototype; raw pack on branch vx-ace-rtp)",
            "behaviors": beh, "collisions": col}
    if extra:
        meta.update(extra)
    json.dump(meta, open(os.path.join(TS, out + ".json"), "w"))


# ── jobs ──────────────────────────────────────────────────────────────────────
# A3 outside: the top two block-rows are roofs (8 colours each). Bake them as
# transparent-base overlay autotiles (drawn on the upper/Layer-3 tileset).
ROOF_JOBS = [
    dict(out="rtp_outside_roof", src="rtp_outside_a3.png",
         blocks=[(f"roof_{c}", c, 0) for c in range(8)] +
                [(f"roof_{8 + c}", c, 1) for c in range(8)],
         collision=0,
         note="RPG Maker VX Ace RTP A3 roofs (prototype; raw pack on branch vx-ace-rtp)"),
]

# A4 wall-tops: band top rows are at block-row 0, 2, 4 (each band is 2 top rows
# then 3 side rows => top blocks start at tile-rows 0,5,10 => block-rows 0,2,4).
WALL_JOBS = []
WALLFACE_JOBS = []
for scene in ("outside", "inside", "dungeon"):
    src = f"rtp_{scene}_a4.png"
    tops = []
    faces = []
    for band, top_trow in enumerate((0, 5, 10)):
        for bc in range(8):
            tops.append((f"wall_{band}_{bc}", bc, top_trow // 2))
    # wall-top block-rows: tile-rows 0-1,5-6,10-11 => block-row indices 0, 2(=row5? no)
    # block_row arg to wblock is in 2-tile units, so top rows 0,5,10 are NOT all even.
    # Use a tile-row aware variant below instead.
    WALL_JOBS.append(dict(out=f"rtp_{scene}_wall", src=src, scene=scene))
    WALLFACE_JOBS.append(dict(out=f"rtp_{scene}_wallface", src=src, scene=scene))


def wblock_trow(im, bc, trow):
    """2x2 wall block addressed by block-col and absolute TILE row (top row)."""
    return im.crop((bc * 2 * T, trow * T, bc * 2 * T + 2 * T, trow * T + 2 * T))


def bake_walls_scene(out, src):
    im = Image.open(os.path.join(TS, src)).convert("RGBA")
    tiles = [Image.new("RGBA", (T, T), (0, 0, 0, 0))]
    beh, col = [0], [0]
    cfg = {"tile": T, "per_row": PR, "scheme": "wang8_lut",
           "priority": ["base"], "fills": {"base": 0}, "terrains": {}}
    print(f"=== {out} ({src}) wall-tops ===")
    for band, top_trow in enumerate((0, 5, 10)):
        for bc in range(8):
            blk = wblock_trow(im, bc, top_trow)
            if _is_blank(blk):
                continue
            variants, local = wall_autotile(blk)
            start = len(tiles)
            for t in variants:
                tiles.append(t); beh.append(0); col.append(1)
            name = f"wall_{band}_{bc}"
            lut = [start + local[m] for m in range(256)]
            cfg["terrains"][name] = {"lut": lut, "luts": {"base": lut},
                                     "behavior": 0, "collision": 1, "count": len(variants)}
    print(f"  {len(cfg['terrains'])} wall-top terrains")
    _write_sheet(out, tiles, beh, col,
                 f"RPG Maker VX Ace RTP A4 wall-tops (prototype; raw pack on branch vx-ace-rtp)")
    json.dump(cfg, open(os.path.join(TS, out + ".autotile.json"), "w"))
    _new_index_add(out)
    print(f"  wrote {out}: {len(tiles)} tiles")


def bake_wallface_scene(out, src):
    bands = []
    for band, side_trow in enumerate((2, 7, 12)):  # side block starts after the 2 top rows
        for bc in range(8):
            bands.append((f"wall_{band}_{bc}", bc, side_trow))
    # filter blanks
    im = Image.open(os.path.join(TS, src)).convert("RGBA")
    bands = [b for b in bands
             if not _is_blank(im.crop((b[1] * 2 * T, b[2] * T, b[1] * 2 * T + 2 * T, b[2] * T + 3 * T)))]
    bake_wallface(out, src, bands,
                  source_note="RPG Maker VX Ace RTP A4 wall faces (prototype; raw pack on branch vx-ace-rtp)")


def _is_blank(img):
    ex = img.getextrema()
    return ex[3][1] == 0  # fully transparent


def main():
    only = [a for a in sys.argv[1:] if not a.startswith("-")]
    sel = lambda n: (not only) or n in only
    for job in ROOF_JOBS:
        if sel(job["out"]):
            bake_wall_set(job["out"], job["src"], job["blocks"], job["collision"],
                          source_note=job["note"])
    for job in WALL_JOBS:
        if sel(job["out"]):
            bake_walls_scene(job["out"], job["src"])
    for job in WALLFACE_JOBS:
        if sel(job["out"]):
            bake_wallface_scene(job["out"], job["src"])


if __name__ == "__main__":
    main()
