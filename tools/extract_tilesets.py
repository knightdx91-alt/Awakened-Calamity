#!/usr/bin/env python3
"""
extract_tilesets.py — Build tileset spritesheets and layout JSON files for the browser game.

Reads from source/pokefirered/ and writes to:
  data/tilesets/<tileset_name>.png   — metatile spritesheet (16x16 per metatile)
  data/tilesets/<tileset_name>.json  — collision + behavior per metatile, plus metatile count
  data/layouts/<layout_id>.json      — per-layout tile data (metatile indices, collision)
"""

import json
import os
import struct
import sys
from pathlib import Path
from PIL import Image

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR   = Path(__file__).parent
GAME_ROOT    = SCRIPT_DIR.parent
SOURCE_ROOT  = GAME_ROOT / "source" / "pokefirered"
LAYOUTS_JSON = SOURCE_ROOT / "data" / "layouts" / "layouts.json"
OUT_TILESETS = GAME_ROOT / "data" / "tilesets"
OUT_LAYOUTS  = GAME_ROOT / "data" / "layouts"

METATILES_PER_ROW = 16  # metatiles arranged 16-wide in the spritesheet

# ---------------------------------------------------------------------------
# Name → directory path helpers
# ---------------------------------------------------------------------------

def tileset_name_to_path(tileset_name: str, kind: str) -> Path:
    """
    "gTileset_General"    → data/tilesets/primary/general/
    "gTileset_PalletTown" → data/tilesets/secondary/pallet_town/
    kind is "primary" or "secondary".
    """
    # Strip "gTileset_" prefix
    raw = tileset_name.replace("gTileset_", "")
    snake = _camel_to_snake(raw)
    return SOURCE_ROOT / "data" / "tilesets" / kind / snake


def _camel_to_snake(raw: str) -> str:
    """
    CamelCase / acronym-aware snake_case:
      SSAnne        → ss_anne
      GenericBuilding1 → generic_building_1
      SilphCo       → silph_co
      SeviiIslands123 → sevii_islands_123
    Rules:
      - Insert _ before an uppercase that follows a lowercase/digit
      - Insert _ before an uppercase that is followed by a lowercase, when preceded by uppercase
        (handles acronym boundaries: SS|Anne → ss_anne)
      - Insert _ before a digit-run that follows a non-digit
    """
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
    """gTileset_PalletTown → pallet_town"""
    raw = secondary_tileset.replace("gTileset_", "")
    return _camel_to_snake(raw)


# ---------------------------------------------------------------------------
# JASC-PAL reader
# ---------------------------------------------------------------------------

def load_jasc_pal(path: Path):
    """Return list of 16 (R, G, B) tuples from a JASC-PAL file."""
    lines = path.read_text().splitlines()
    colors = []
    for line in lines:
        line = line.strip()
        parts = line.split()
        if len(parts) == 3:
            try:
                r, g, b = int(parts[0]), int(parts[1]), int(parts[2])
                colors.append((r, g, b))
            except ValueError:
                pass
    # Pad or trim to 16
    while len(colors) < 16:
        colors.append((0, 0, 0))
    return colors[:16]


def load_all_palettes(tileset_dir: Path):
    """
    Load all .pal files from <tileset_dir>/palettes/.
    Returns a dict: palette_index (int) → list of 16 (R,G,B).
    """
    pal_dir = tileset_dir / "palettes"
    palettes = {}
    if not pal_dir.exists():
        return palettes
    for pal_file in sorted(pal_dir.glob("*.pal")):
        idx = int(pal_file.stem)
        palettes[idx] = load_jasc_pal(pal_file)
    return palettes


# ---------------------------------------------------------------------------
# Tile pixel extraction
# ---------------------------------------------------------------------------

def get_tile_pixels(tiles_img_data: list, tile_index: int, num_tiles: int):
    """
    Extract raw 8x8 palette-index pixels for a given tile_index.
    tiles_img_data: flat list of palette indices (width=128, each row = 16 tiles * 8px).
    Returns list of 64 ints (palette indices 0-15).
    """
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


def render_tile_to_rgba(raw_pixels: list, palette: list, x_flip: bool, y_flip: bool):
    """
    Convert 64 palette-index pixels to 64 RGBA tuples using the given 16-color palette.
    Color index 0 is treated as transparent (alpha=0) for top-layer tiles.
    """
    result = []
    indices = list(raw_pixels)
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
    for idx in indices:
        r, g, b = palette[idx] if idx < len(palette) else (255, 0, 255)
        alpha = 0 if idx == 0 else 255
        result.append((r, g, b, alpha))
    return result


# ---------------------------------------------------------------------------
# Metatile rendering
# ---------------------------------------------------------------------------

def parse_metatiles(metatiles_bin: bytes):
    """
    Parse metatiles.bin.  Each metatile = 16 bytes = 8 uint16 subtiles.
    Layout (GBA FireRed format):
      subtiles 0-3 = bottom layer (TL, TR, BL, BR)
      subtiles 4-7 = top    layer (TL, TR, BL, BR)
    Returns list of metatile dicts.
    """
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
    """
    Render one metatile to a 16x16 RGBA PIL image.
    Primary tileset provides tiles 0..(primary_tile_count_total-1).
    Secondary tileset provides tiles primary_tile_count_total.. onwards.

    subtiles[0..3] = bottom layer (row-major: TL,TR,BL,BR)
    subtiles[4..7] = top layer
    """
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))

    def draw_subtile(subtile_val, dest_x, dest_y, transparent_zero):
        tile_idx   = subtile_val & 0x3FF
        x_flip     = bool(subtile_val & 0x400)
        y_flip     = bool(subtile_val & 0x800)
        pal_idx    = (subtile_val >> 12) & 0xF

        # Determine which tileset owns this tile
        if tile_idx < primary_tile_count_total:
            raw = get_tile_pixels(primary_tiles_data, tile_idx, primary_num_tiles)
            palette = primary_palettes.get(pal_idx, [(0,0,0)]*16)
        else:
            local_idx = tile_idx - primary_tile_count_total
            raw = get_tile_pixels(secondary_tiles_data, local_idx, secondary_num_tiles)
            palette = secondary_palettes.get(pal_idx, [(0,0,0)]*16)

        # Build RGBA pixels
        pixels = []
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
        for val in indices:
            r, g, b = palette[val] if val < len(palette) else (255, 0, 255)
            a = 0 if (transparent_zero and val == 0) else 255
            pixels.append((r, g, b, a))

        tile_img = Image.new("RGBA", (8, 8))
        tile_img.putdata(pixels)
        img.paste(tile_img, (dest_x, dest_y), tile_img)

    # Bottom layer (opaque)
    positions = [(0,0),(8,0),(0,8),(8,8)]
    for i, (dx, dy) in enumerate(positions):
        draw_subtile(subtiles[i], dx, dy, transparent_zero=False)

    # Top layer (color 0 = transparent)
    for i, (dx, dy) in enumerate(positions):
        draw_subtile(subtiles[4 + i], dx, dy, transparent_zero=True)

    return img


# ---------------------------------------------------------------------------
# Tileset processing
# ---------------------------------------------------------------------------

PRIMARY_TILE_COUNT = 640   # general tileset always has 640 tiles (128×320 / 8 / 8)


def process_tileset_pair(primary_name: str, secondary_name: str):
    """
    Build and return:
      spritesheet (PIL Image) — all metatiles arranged METATILES_PER_ROW wide
      meta_json  (dict)       — metatile count, collision[], behavior[]
    """
    primary_dir   = tileset_name_to_path(primary_name,   "primary")
    secondary_dir = tileset_name_to_path(secondary_name, "secondary")

    # --- Load tiles images ---
    primary_img   = Image.open(primary_dir / "tiles.png").convert("P")
    sec_tiles_path = secondary_dir / "tiles.png"
    # Some secondary tilesets (e.g. SilphCo) have no tiles.png — they reuse primary tiles only
    secondary_img = Image.open(sec_tiles_path).convert("P") if sec_tiles_path.exists() else primary_img

    pri_tiles = list(primary_img.getdata())
    sec_tiles = list(secondary_img.getdata())
    pri_num   = primary_img.width  * primary_img.height // 64   # number of 8×8 tiles
    sec_num   = secondary_img.width * secondary_img.height // 64

    # --- Load palettes ---
    pri_pals = load_all_palettes(primary_dir)
    sec_pals = load_all_palettes(secondary_dir)

    # GBA FireRed palette assignment:
    #   Slots 0-5  → primary tileset palettes
    #   Slots 6-15 → secondary tileset palettes (if present and non-placeholder)
    # Build one correct merged palette used for ALL tiles (both primary and secondary).
    # A "placeholder" palette is one where every color is the same (all-black, all-magenta, etc.)
    def is_placeholder(colors):
        return len(set(colors)) <= 1

    correct_pals = {}
    # Slots 0-5: primary wins
    for i in range(6):
        if i in pri_pals:
            correct_pals[i] = pri_pals[i]
        elif i in sec_pals:
            correct_pals[i] = sec_pals[i]
    # Slots 6-15: secondary wins, fall back to primary
    for i in range(6, 16):
        if i in sec_pals and not is_placeholder(sec_pals[i]):
            correct_pals[i] = sec_pals[i]
        elif i in pri_pals and not is_placeholder(pri_pals[i]):
            correct_pals[i] = pri_pals[i]
        elif i in sec_pals:
            correct_pals[i] = sec_pals[i]
        elif i in pri_pals:
            correct_pals[i] = pri_pals[i]
    merged_pri_pals = correct_pals
    merged_sec_pals = correct_pals


    # --- Load metatiles ---
    pri_meta_bin = (primary_dir   / "metatiles.bin").read_bytes()
    sec_meta_bin = (secondary_dir / "metatiles.bin").read_bytes()
    pri_metatiles = parse_metatiles(pri_meta_bin)
    sec_metatiles = parse_metatiles(sec_meta_bin)

    # Combined metatile list: primary first (index 0..N-1), then secondary (N..M)
    all_metatiles = pri_metatiles + sec_metatiles
    total = len(all_metatiles)

    # --- Load metatile attributes ---
    behaviors  = []
    collisions = []

    pri_attr_bin = (primary_dir   / "metatile_attributes.bin").read_bytes()
    sec_attr_bin = (secondary_dir / "metatile_attributes.bin").read_bytes()

    def parse_attrs(attr_bin, count):
        b_list = []
        c_list = []
        for i in range(count):
            if i * 2 + 2 <= len(attr_bin):
                val = struct.unpack_from("<H", attr_bin, i * 2)[0]
                b_list.append(val & 0xFF)
                # bit 8 of the attribute indicates impassable in FireRed metatile attrs
                c_list.append(1 if (val & 0x100) else 0)
            else:
                b_list.append(0)
                c_list.append(0)
        return b_list, c_list

    pri_b, pri_c = parse_attrs(pri_attr_bin, len(pri_metatiles))
    sec_b, sec_c = parse_attrs(sec_attr_bin, len(sec_metatiles))
    behaviors  = pri_b + sec_b
    collisions = pri_c + sec_c

    # --- Render spritesheet ---
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
        col = idx % cols
        row = idx // cols
        sheet.paste(mt_img, (col * 16, row * 16), mt_img)

    meta_json = {
        "total_metatiles": total,
        "primary_count":   len(pri_metatiles),
        "secondary_count": len(sec_metatiles),
        "metatiles_per_row": METATILES_PER_ROW,
        "behaviors":  behaviors,
        "collisions": collisions,
    }

    return sheet, meta_json


# ---------------------------------------------------------------------------
# Layout processing
# ---------------------------------------------------------------------------

def process_layout(layout: dict):
    """
    Read a layout's map.bin and return (layout_id, layout_json).
    """
    map_bin_path = SOURCE_ROOT / layout["blockdata_filepath"]
    if not map_bin_path.exists():
        print(f"  [SKIP] map.bin not found: {map_bin_path}")
        return None, None

    data = map_bin_path.read_bytes()
    width  = layout["width"]
    height = layout["height"]
    expected = width * height * 2
    if len(data) < expected:
        print(f"  [WARN] map.bin too small: {len(data)} < {expected} for {layout['id']}")

    metatiles  = []
    collisions = []
    for i in range(width * height):
        if i * 2 + 2 <= len(data):
            val = struct.unpack_from("<H", data, i * 2)[0]
        else:
            val = 0
        metatile  = val & 0x3FF
        collision = (val >> 10) & 0x3
        metatiles.append(metatile)
        collisions.append(0 if collision == 0 else 1)

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

    # Collect unique tileset pairs
    tileset_pairs = {}
    for layout in layouts:
        pri = layout.get("primary_tileset", "")
        sec = layout.get("secondary_tileset", "")
        if pri and sec:
            key = (pri, sec)
            tileset_pairs[key] = tileset_output_name(sec)

    print(f"Found {len(tileset_pairs)} unique tileset pairs across {len(layouts)} layouts.")

    # Process each unique tileset pair
    for (pri_name, sec_name), out_name in sorted(tileset_pairs.items()):
        pri_dir = tileset_name_to_path(pri_name, "primary")
        sec_dir = tileset_name_to_path(sec_name, "secondary")
        if not pri_dir.exists():
            print(f"[SKIP] Primary tileset not found: {pri_dir}")
            continue
        if not sec_dir.exists():
            print(f"[SKIP] Secondary tileset not found: {sec_dir}")
            continue

        print(f"Processing tileset: {out_name}  ({pri_name} + {sec_name})")
        try:
            sheet, meta_json = process_tileset_pair(pri_name, sec_name)

            sheet_path = OUT_TILESETS / f"{out_name}.png"
            json_path  = OUT_TILESETS / f"{out_name}.json"

            sheet.save(str(sheet_path))
            json_path.write_text(json.dumps(meta_json, separators=(",", ":")))
            print(f"  → {sheet_path.name}  ({sheet.width}x{sheet.height}, {meta_json['total_metatiles']} metatiles)")
        except Exception as e:
            print(f"  [ERROR] {e}")
            import traceback; traceback.print_exc()

    # Process layouts
    print(f"\nProcessing {len(layouts)} layouts …")
    ok = 0
    for layout in layouts:
        if not layout.get("blockdata_filepath"):
            continue
        layout_id, layout_json = process_layout(layout)
        if layout_id is None:
            continue
        out_path = OUT_LAYOUTS / f"{layout_id}.json"
        out_path.write_text(json.dumps(layout_json, separators=(",", ":")))
        ok += 1
    print(f"  → {ok} layout files written to {OUT_LAYOUTS}/")


if __name__ == "__main__":
    main()
