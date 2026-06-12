#!/usr/bin/env python3
"""
extract_tilesets_platinum.py — Build Sinnoh tileset spritesheets from Platinum NSBTX files.

Reads from source/pokeplatinum/res/field/maps/texture_sets/
Outputs to data/tilesets/sinnoh_<name>.png + .json

Each NSBTX file contains multiple terrain textures (32x32 or 16x16 or 64x64).
These are laid out as a sprite sheet: all textures tiled left-to-right, top-to-bottom,
each cell normalized to 32x32, arranged 8 textures per row.

Unlike GBA, DS games don't use a metatile+collision binary. Collision for Sinnoh maps
is encoded separately in map_data_*.bin using the prop/terrain type system. For now
we write placeholder collision (0 = passable) for all tiles.

Usage:
  pip install ndspy pillow
  python3 tools/extract_tilesets_platinum.py
"""

import struct
from pathlib import Path
from PIL import Image
import ndspy.color
import ndspy.texture

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR      = Path(__file__).parent
GAME_ROOT       = SCRIPT_DIR.parent
TEXTURE_SET_DIR = GAME_ROOT / "source" / "pokeplatinum" / "res" / "field" / "maps" / "texture_sets"
OUT_TILESETS    = GAME_ROOT / "data" / "tilesets"

TILES_PER_ROW   = 8   # textures per row in the spritesheet
REGION_PREFIX   = "sinnoh_"

# ---------------------------------------------------------------------------
# NDS texture decoder (formats 2 and 3, the only ones used in map texture sets)
# ---------------------------------------------------------------------------

def _5bit_to_8bit(v):
    return (v * 255) // 31

def decode_palette(pal):
    """Convert ndspy Palette to list of (R, G, B, A) 8-bit tuples."""
    colors = []
    for c in pal.colors:
        r = _5bit_to_8bit(c.r)
        g = _5bit_to_8bit(c.g)
        b = _5bit_to_8bit(c.b)
        # DS alpha: 0 in NDS means opaque for palette textures (except color0 = transparent)
        colors.append((r, g, b))
    return colors

def render_texture(tex, pal_colors):
    """
    Render an ndspy Texture to a PIL RGBA Image.
    Handles format 2 (2bpp, 4-color) and format 3 (4bpp, 16-color).
    Color index 0 is treated as transparent.
    """
    w, h = tex.width, tex.height
    data = tex.data1
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    pixels = []

    if tex.format == 2:  # 2bpp — 4 palette indices per byte
        for byte in data:
            for shift in (0, 2, 4, 6):
                idx = (byte >> shift) & 0x3
                if idx < len(pal_colors):
                    r, g, b = pal_colors[idx]
                else:
                    r, g, b = 255, 0, 255
                a = 0 if idx == 0 else 255
                pixels.append((r, g, b, a))

    elif tex.format == 3:  # 4bpp — 2 palette indices per byte
        for byte in data:
            for shift in (0, 4):
                idx = (byte >> shift) & 0xF
                if idx < len(pal_colors):
                    r, g, b = pal_colors[idx]
                else:
                    r, g, b = 255, 0, 255
                a = 0 if idx == 0 else 255
                pixels.append((r, g, b, a))

    elif tex.format == 4:  # 8bpp — 1 palette index per byte
        for idx in data:
            if idx < len(pal_colors):
                r, g, b = pal_colors[idx]
            else:
                r, g, b = 255, 0, 255
            a = 0 if idx == 0 else 255
            pixels.append((r, g, b, a))

    else:
        # Fallback: magenta placeholder
        pixels = [(255, 0, 255, 255)] * (w * h)

    img.putdata(pixels[:w * h])
    return img


# ---------------------------------------------------------------------------
# NSBTX → spritesheet
# ---------------------------------------------------------------------------

def process_nsbtx(path: Path, set_index: int):
    """
    Load one NSBTX, render all textures, output a spritesheet PNG + JSON.
    Returns (out_name, num_tiles) or None on failure.
    """
    data = path.read_bytes()
    btx = ndspy.texture.NSBTX()
    btx._initFromData(data)

    if not btx.textures:
        return None

    # Build palette lookup by name
    pal_lookup = {name: decode_palette(pal) for name, pal in btx.palettes}

    rendered = []
    names    = []

    for tex_name, tex in btx.textures:
        # Prefer palette whose name matches the texture name (common convention)
        pal_colors = (
            pal_lookup.get(tex_name) or
            pal_lookup.get(tex_name + "p") or    # e.g. "allpeak" → "apeak"
            next(iter(pal_lookup.values()), [(0,0,0)] * 16)
        )
        try:
            img = render_texture(tex, pal_colors)
            # Normalize to 32x32
            if img.size != (32, 32):
                img = img.resize((32, 32), Image.NEAREST)
            rendered.append(img)
            names.append(tex_name)
        except Exception as e:
            # Use magenta placeholder on failure
            placeholder = Image.new("RGBA", (32, 32), (255, 0, 255, 255))
            rendered.append(placeholder)
            names.append(tex_name)

    total = len(rendered)
    cols  = TILES_PER_ROW
    rows  = (total + cols - 1) // cols

    sheet = Image.new("RGBA", (cols * 32, rows * 32), (0, 0, 0, 0))
    for i, img in enumerate(rendered):
        sheet.paste(img, ((i % cols) * 32, (i // cols) * 32), img)

    out_name = f"{REGION_PREFIX}{set_index:03d}"
    meta_json = {
        "total_metatiles":   total,
        "primary_count":     total,
        "secondary_count":   0,
        "metatiles_per_row": TILES_PER_ROW,
        "tile_size":         32,
        "texture_names":     names,
        "behaviors":         [0] * total,
        "collisions":        [0] * total,
    }
    return sheet, meta_json, out_name


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    ndspy.color.prepareLUTs()
    OUT_TILESETS.mkdir(parents=True, exist_ok=True)

    nsbtx_files = sorted(TEXTURE_SET_DIR.glob("map_texture_set_*.nsbtx"))
    if not nsbtx_files:
        print(f"No NSBTX files found in {TEXTURE_SET_DIR}")
        return

    print(f"Found {len(nsbtx_files)} Sinnoh map texture sets.")
    ok = 0
    for path in nsbtx_files:
        idx = int(path.stem.split("_")[-1])
        result = process_nsbtx(path, idx)
        if result is None:
            print(f"[SKIP] {path.name} — no textures")
            continue

        sheet, meta_json, out_name = result
        import json
        sheet.save(str(OUT_TILESETS / f"{out_name}.png"))
        (OUT_TILESETS / f"{out_name}.json").write_text(
            json.dumps(meta_json, separators=(",", ":"))
        )
        print(f"  → {out_name}.png  ({sheet.width}×{sheet.height}, {meta_json['total_metatiles']} tiles)")
        ok += 1

    print(f"\nDone: {ok} Sinnoh tilesets written to {OUT_TILESETS}/")


if __name__ == "__main__":
    main()
