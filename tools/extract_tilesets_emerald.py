#!/usr/bin/env python3
"""
extract_tilesets_emerald.py — Build Hoenn tileset spritesheets and layout JSON files.

Reads from source/pokeemerald/ and writes to:
  data/tilesets/hoenn_<tileset_name>.png   — metatile spritesheet (16x16 per metatile)
  data/tilesets/hoenn_<tileset_name>.json  — collision + behavior per metatile
  data/layouts/<layout_id>.json            — per-layout tile data (metatile indices, collision)

Tilesets are prefixed with "hoenn_" to distinguish them from Kanto tilesets.
Existing layout files are not overwritten if they already exist.
"""

import json
import struct
from pathlib import Path
from PIL import Image

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR   = Path(__file__).parent
GAME_ROOT    = SCRIPT_DIR.parent
SOURCE_ROOT  = GAME_ROOT / "source" / "pokeemerald"
LAYOUTS_JSON = SOURCE_ROOT / "data" / "layouts" / "layouts.json"
OUT_TILESETS = GAME_ROOT / "data" / "tilesets"
OUT_LAYOUTS  = GAME_ROOT / "data" / "layouts" / "hoenn"

METATILES_PER_ROW = 16  # metatiles arranged 16-wide in the spritesheet

# pokeemerald reserves 512 tile slots for the primary tileset (vs 640 in pokefirered)
PRIMARY_TILE_COUNT = 512

# Tileset output prefix for Hoenn
REGION_PREFIX = "hoenn_"

# Primary tilesets that map to special Hoenn names (override default snake_case)
# "building" → hoenn_building, "general" → hoenn_general, "secret_base" → hoenn_secret_base
# (These follow the same camelCase→snake pattern; prefix is added automatically.)

# ---------------------------------------------------------------------------
# Name → directory path helpers
# ---------------------------------------------------------------------------

def tileset_name_to_path(tileset_name: str, kind: str) -> Path:
    """
    "gTileset_General" → data/tilesets/primary/general/
    "gTileset_Cave"    → data/tilesets/secondary/cave/
    kind is "primary" or "secondary".
    """
    raw = tileset_name.replace("gTileset_", "")
    snake = _camel_to_snake(raw)
    return SOURCE_ROOT / "data" / "tilesets" / kind / snake


def _camel_to_snake(raw: str) -> str:
    snake = ""
    n = len(raw)
    for i, ch in enumerate(raw):
        if i == 0:
            snake += ch.lower()
            continue
        prev = raw[i - 1]
        nxt  = raw[i + 1] if i + 1 < n else ""
        if ch.isupper():
            if prev.islower() or prev.isdigit():
                snake += "_"
            elif prev.isupper() and nxt and nxt.islower():
                snake += "_"
        elif ch.isdigit() and not prev.isdigit():
            snake += "_"
        snake += ch.lower()
    return snake


def tileset_output_name(secondary_tileset: str) -> str:
    """gTileset_Cave → hoenn_cave"""
    raw = secondary_tileset.replace("gTileset_", "")
    return REGION_PREFIX + _camel_to_snake(raw)


# ---------------------------------------------------------------------------
# JASC-PAL reader
# ---------------------------------------------------------------------------

def load_jasc_pal(path: Path):
    lines = path.read_text().splitlines()
    colors = []
    for line in lines:
        parts = line.strip().split()
        if len(parts) == 3:
            try:
                colors.append((int(parts[0]), int(parts[1]), int(parts[2])))
            except ValueError:
                pass
    while len(colors) < 16:
        colors.append((0, 0, 0))
    return colors[:16]


def load_all_palettes(tileset_dir: Path):
    pal_dir = tileset_dir / "palettes"
    palettes = {}
    if not pal_dir.exists():
        return palettes
    for pal_file in sorted(pal_dir.glob("*.pal")):
        # Palette slots are numbered 00.pal..15.pal. Some hacks drop extra
        # named .pal files (e.g. bellchime_12.pal) in the same dir — skip those.
        try:
            slot = int(pal_file.stem)
        except ValueError:
            continue
        palettes[slot] = load_jasc_pal(pal_file)
    return palettes


# ---------------------------------------------------------------------------
# Tile pixel extraction
# ---------------------------------------------------------------------------

def get_tile_pixels(tiles_img_data: list, tile_index: int, num_tiles: int):
    if tile_index >= num_tiles:
        return [0] * 64
    tile_col = tile_index % 16
    tile_row = tile_index // 16
    px = tile_col * 8
    py = tile_row * 8
    pixels = []
    for dy in range(8):
        for dx in range(8):
            pixels.append(tiles_img_data[(py + dy) * 128 + (px + dx)])
    return pixels


# ---------------------------------------------------------------------------
# Metatile rendering
# ---------------------------------------------------------------------------

def parse_metatiles(metatiles_bin: bytes):
    metatiles = []
    n = len(metatiles_bin) // 16
    for i in range(n):
        off = i * 16
        subtiles = struct.unpack_from("<8H", metatiles_bin, off)
        metatiles.append(subtiles)
    return metatiles


def render_metatile(subtiles, primary_tiles_data, primary_num_tiles, primary_palettes,
                    secondary_tiles_data, secondary_num_tiles, secondary_palettes,
                    primary_tile_count_total):
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))

    def draw_subtile(subtile_val, dest_x, dest_y, transparent_zero):
        tile_idx = subtile_val & 0x3FF
        x_flip   = bool(subtile_val & 0x400)
        y_flip   = bool(subtile_val & 0x800)
        pal_idx  = (subtile_val >> 12) & 0xF

        if tile_idx < primary_tile_count_total:
            raw     = get_tile_pixels(primary_tiles_data, tile_idx, primary_num_tiles)
            palette = primary_palettes.get(pal_idx, [(0, 0, 0)] * 16)
        else:
            local_idx = tile_idx - primary_tile_count_total
            raw     = get_tile_pixels(secondary_tiles_data, local_idx, secondary_num_tiles)
            palette = secondary_palettes.get(pal_idx, [(0, 0, 0)] * 16)

        indices = list(raw)
        if x_flip:
            flipped = []
            for row in range(8):
                flipped.extend(reversed(indices[row*8:(row+1)*8]))
            indices = flipped
        if y_flip:
            flipped = []
            for row in reversed(range(8)):
                flipped.extend(indices[row*8:(row+1)*8])
            indices = flipped

        pixels = []
        for val in indices:
            r, g, b = palette[val] if val < len(palette) else (255, 0, 255)
            a = 0 if (transparent_zero and val == 0) else 255
            pixels.append((r, g, b, a))

        tile_img = Image.new("RGBA", (8, 8))
        tile_img.putdata(pixels)
        img.paste(tile_img, (dest_x, dest_y), tile_img)

    positions = [(0, 0), (8, 0), (0, 8), (8, 8)]
    for i, (dx, dy) in enumerate(positions):
        draw_subtile(subtiles[i], dx, dy, transparent_zero=False)
    for i, (dx, dy) in enumerate(positions):
        draw_subtile(subtiles[4 + i], dx, dy, transparent_zero=True)

    return img


# ---------------------------------------------------------------------------
# Tileset processing
# ---------------------------------------------------------------------------

def process_tileset_pair(primary_name: str, secondary_name: str):
    primary_dir   = tileset_name_to_path(primary_name,   "primary")
    secondary_dir = tileset_name_to_path(secondary_name, "secondary")

    primary_img = Image.open(primary_dir / "tiles.png").convert("P")
    sec_tiles_path = secondary_dir / "tiles.png"
    secondary_img = Image.open(sec_tiles_path).convert("P") if sec_tiles_path.exists() else primary_img

    pri_tiles = list(primary_img.getdata())
    sec_tiles = list(secondary_img.getdata())
    pri_num   = primary_img.width  * primary_img.height // 64
    sec_num   = secondary_img.width * secondary_img.height // 64

    pri_pals = load_all_palettes(primary_dir)
    sec_pals = load_all_palettes(secondary_dir)

    merged_pri_pals = {**sec_pals, **pri_pals}
    merged_sec_pals = {**pri_pals, **sec_pals}

    pri_meta_bin  = (primary_dir   / "metatiles.bin").read_bytes()
    sec_meta_bin  = (secondary_dir / "metatiles.bin").read_bytes()
    pri_metatiles = parse_metatiles(pri_meta_bin)
    sec_metatiles = parse_metatiles(sec_meta_bin)

    all_metatiles = pri_metatiles + sec_metatiles
    total = len(all_metatiles)

    pri_attr_bin = (primary_dir   / "metatile_attributes.bin").read_bytes()
    sec_attr_bin = (secondary_dir / "metatile_attributes.bin").read_bytes()

    def parse_attrs(attr_bin, count):
        b_list, c_list = [], []
        for i in range(count):
            if i * 2 + 2 <= len(attr_bin):
                val = struct.unpack_from("<H", attr_bin, i * 2)[0]
                b_list.append(val & 0xFF)
                c_list.append(1 if (val & 0x100) else 0)
            else:
                b_list.append(0)
                c_list.append(0)
        return b_list, c_list

    pri_b, pri_c = parse_attrs(pri_attr_bin, len(pri_metatiles))
    sec_b, sec_c = parse_attrs(sec_attr_bin, len(sec_metatiles))

    cols = METATILES_PER_ROW
    rows = (total + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * 16, rows * 16), (0, 0, 0, 0))

    for idx, subtiles in enumerate(all_metatiles):
        mt_img = render_metatile(
            subtiles,
            pri_tiles, pri_num, merged_pri_pals,
            sec_tiles, sec_num, merged_sec_pals,
            PRIMARY_TILE_COUNT
        )
        sheet.paste(mt_img, ((idx % cols) * 16, (idx // cols) * 16), mt_img)

    meta_json = {
        "total_metatiles":  total,
        "primary_count":    len(pri_metatiles),
        "secondary_count":  len(sec_metatiles),
        "metatiles_per_row": METATILES_PER_ROW,
        "behaviors":        pri_b + sec_b,
        "collisions":       pri_c + sec_c,
    }

    return sheet, meta_json


# ---------------------------------------------------------------------------
# Layout processing
# ---------------------------------------------------------------------------

def process_layout(layout: dict):
    map_bin_path = SOURCE_ROOT / layout["blockdata_filepath"]
    if not map_bin_path.exists():
        print(f"  [SKIP] map.bin not found: {map_bin_path}")
        return None, None

    data   = map_bin_path.read_bytes()
    width  = layout["width"]
    height = layout["height"]

    metatiles  = []
    collisions = []
    for i in range(width * height):
        if i * 2 + 2 <= len(data):
            val = struct.unpack_from("<H", data, i * 2)[0]
        else:
            val = 0
        metatiles.append(val & 0x3FF)
        collisions.append(0 if (val >> 10) & 0x3 == 0 else 1)

    secondary_name = layout.get("secondary_tileset", "")
    tileset_name   = tileset_output_name(secondary_name) if secondary_name else "unknown"

    layout_json = {
        "id":                layout["id"],
        "width":             width,
        "height":            height,
        "primary_tileset":   layout.get("primary_tileset", ""),
        "secondary_tileset": secondary_name,
        "tileset":           tileset_name,
        "metatiles":         metatiles,
        "collision":         collisions,
    }
    return layout["id"], layout_json


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    OUT_TILESETS.mkdir(parents=True, exist_ok=True)
    OUT_LAYOUTS.mkdir(parents=True, exist_ok=True)

    layouts_data = json.loads(LAYOUTS_JSON.read_text())
    layouts = layouts_data["layouts"]

    # Optional prototype filter: EXTRACT_LAYOUT_FILTER=NEW_BARK,CHERRYGROVE
    # restricts to layouts whose id contains any of the given substrings (and
    # only builds the tilesets those layouts use). Empty/unset = full run.
    import os as _os
    _flt = [s.strip().upper() for s in _os.environ.get("EXTRACT_LAYOUT_FILTER", "").split(",") if s.strip()]
    if _flt:
        layouts = [L for L in layouts if any(s in L.get("id", "").upper() for s in _flt)]
        print(f"[filter] {len(layouts)} layouts match {_flt}")

    # Collect unique tileset pairs
    tileset_pairs = {}
    for layout in layouts:
        pri = layout.get("primary_tileset", "")
        sec = layout.get("secondary_tileset", "")
        if pri and sec:
            tileset_pairs[(pri, sec)] = tileset_output_name(sec)

    print(f"Found {len(tileset_pairs)} unique tileset pairs across {len(layouts)} layouts.")

    ok_tilesets = 0
    for (pri_name, sec_name), out_name in sorted(tileset_pairs.items()):
        pri_dir = tileset_name_to_path(pri_name, "primary")
        sec_dir = tileset_name_to_path(sec_name, "secondary")
        if not pri_dir.exists():
            print(f"[SKIP] Primary tileset not found: {pri_dir}")
            continue
        if not sec_dir.exists():
            print(f"[SKIP] Secondary tileset not found: {sec_dir}")
            continue

        print(f"Processing: {out_name}  ({pri_name} + {sec_name})")
        try:
            sheet, meta_json = process_tileset_pair(pri_name, sec_name)
            sheet.save(str(OUT_TILESETS / f"{out_name}.png"))
            (OUT_TILESETS / f"{out_name}.json").write_text(
                json.dumps(meta_json, separators=(",", ":"))
            )
            print(f"  → {out_name}.png  ({sheet.width}×{sheet.height}, {meta_json['total_metatiles']} metatiles)")
            ok_tilesets += 1
        except Exception as e:
            print(f"  [ERROR] {e}")
            import traceback; traceback.print_exc()

    print(f"\nProcessing {len(layouts)} layouts …")
    ok_layouts = 0
    for layout in layouts:
        if not layout.get("blockdata_filepath"):
            continue
        layout_id, layout_json = process_layout(layout)
        if layout_id is None:
            continue
        out_path = OUT_LAYOUTS / f"{layout_id}.json"
        out_path.write_text(json.dumps(layout_json, separators=(",", ":")))
        ok_layouts += 1

    print(f"  → {ok_tilesets} tilesets, {ok_layouts} layouts written.")


if __name__ == "__main__":
    main()
