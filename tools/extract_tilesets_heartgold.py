#!/usr/bin/env python3
"""
extract_tilesets_heartgold.py — Build Johto tileset spritesheets from HeartGold NARC files.

Reads BMD0 models from source/pokeheartgold/files/fielddata/build_model/bm_field.narc.
Each BMD0 contains a TEX0 section with the terrain textures for that area.
Outputs to data/tilesets/johto_<index>.png + .json

Each output tileset = all textures from one BMD0 arranged in a spritesheet
(8 textures per row, each tile normalized to 32x32).

Usage:
  pip install ndspy pillow
  python3 tools/extract_tilesets_heartgold.py
"""

import json
import struct
from pathlib import Path
from PIL import Image
import ndspy.color
import ndspy.texture

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
GAME_ROOT  = SCRIPT_DIR.parent
NARC_PATH  = GAME_ROOT / "source" / "pokeheartgold" / "files" / "fielddata" / "build_model" / "bm_field.narc"
OUT_TILESETS = GAME_ROOT / "data" / "tilesets"

TILES_PER_ROW  = 8
REGION_PREFIX  = "johto_"
TILE_SIZE      = 32   # normalize all textures to 32x32

# ---------------------------------------------------------------------------
# NARC parser
# ---------------------------------------------------------------------------

def parse_narc(data: bytes):
    """Return (files, gmif_start) where files = list of (offset, size).
    NARC header: magic(4) BOM(2) ver(2) file_size(4) hdr_size(2) section_count(2)
    → hdr_size is at byte offset 12 (size = 16 bytes total header).
    """
    hdr_size = struct.unpack_from('<H', data, 12)[0]   # offset 12, not 10
    pos = hdr_size
    files = []
    gmif_start = None
    while pos < len(data) - 8:
        magic      = data[pos:pos+4]
        block_size = struct.unpack_from('<I', data, pos+4)[0]
        if block_size == 0 or block_size > len(data):
            break
        if magic == b'BTAF':
            file_count = struct.unpack_from('<I', data, pos+8)[0]
            for i in range(file_count):
                start, end = struct.unpack_from('<II', data, pos+12 + i*8)
                files.append((start, end - start))
        elif magic == b'GMIF':
            gmif_start = pos + 8
        pos += block_size
    return files, gmif_start


# ---------------------------------------------------------------------------
# BMD0 → TEX0 extractor
# ---------------------------------------------------------------------------

def extract_tex0(bmd: bytes):
    """Return raw TEX0 bytes from a BMD0 blob, or None."""
    if bmd[:4] != b'BMD0':
        return None
    _, _, _, hdr_size, section_count = struct.unpack_from('<HHIHH', bmd, 4)
    for i in range(section_count):
        sec_off = struct.unpack_from('<I', bmd, 16 + i*4)[0]
        if bmd[sec_off:sec_off+4] == b'TEX0':
            sec_size = struct.unpack_from('<I', bmd, sec_off+4)[0]
            return bmd[sec_off:sec_off+sec_size]
    return None


def wrap_in_btx0(tex0_bytes: bytes) -> bytes:
    """Wrap a TEX0 blob in a minimal BTX0 container so ndspy can parse it."""
    tex0_offset = 20
    file_size   = 20 + len(tex0_bytes)
    header = struct.pack('<4sHHIHHI',
                         b'BTX0', 0xFEFF, 1, file_size, 16, 1, tex0_offset)
    return header + tex0_bytes


# ---------------------------------------------------------------------------
# NDS texture decoder (formats 2, 3, 4)
# ---------------------------------------------------------------------------

def _5to8(v):
    return (v * 255) // 31

def decode_palette(pal):
    return [(_5to8(c.r), _5to8(c.g), _5to8(c.b)) for c in pal.colors]

def render_texture(tex, pal_colors):
    w, h = tex.width, tex.height
    data = tex.data1
    pixels = []

    if tex.format == 2:   # 2bpp
        for byte in data:
            for shift in (0, 2, 4, 6):
                idx = (byte >> shift) & 0x3
                r, g, b = pal_colors[idx] if idx < len(pal_colors) else (255, 0, 255)
                pixels.append((r, g, b, 0 if idx == 0 else 255))

    elif tex.format == 3:  # 4bpp
        for byte in data:
            for shift in (0, 4):
                idx = (byte >> shift) & 0xF
                r, g, b = pal_colors[idx] if idx < len(pal_colors) else (255, 0, 255)
                pixels.append((r, g, b, 0 if idx == 0 else 255))

    elif tex.format == 4:  # 8bpp
        for idx in data:
            r, g, b = pal_colors[idx] if idx < len(pal_colors) else (255, 0, 255)
            pixels.append((r, g, b, 0 if idx == 0 else 255))

    else:
        pixels = [(255, 0, 255, 255)] * (w * h)

    img = Image.new("RGBA", (w, h))
    img.putdata(pixels[:w * h])
    return img


# ---------------------------------------------------------------------------
# Process one BMD0 → spritesheet
# ---------------------------------------------------------------------------

def process_bmd0(bmd: bytes, model_index: int):
    tex0 = extract_tex0(bmd)
    if tex0 is None:
        return None

    btx0_data = wrap_in_btx0(tex0)
    try:
        btx = ndspy.texture.NSBTX()
        btx._initFromData(btx0_data)
    except Exception:
        return None

    if not btx.textures:
        return None

    pal_lookup = {name: decode_palette(pal) for name, pal in btx.palettes}

    rendered = []
    names    = []

    for tex_name, tex in btx.textures:
        pal_colors = (
            pal_lookup.get(tex_name) or
            next(iter(pal_lookup.values()), [(0, 0, 0)] * 16)
        )
        try:
            img = render_texture(tex, pal_colors)
            if img.size != (TILE_SIZE, TILE_SIZE):
                img = img.resize((TILE_SIZE, TILE_SIZE), Image.NEAREST)
        except Exception:
            img = Image.new("RGBA", (TILE_SIZE, TILE_SIZE), (255, 0, 255, 255))

        rendered.append(img)
        names.append(tex_name)

    total = len(rendered)
    cols  = TILES_PER_ROW
    rows  = (total + cols - 1) // cols

    sheet = Image.new("RGBA", (cols * TILE_SIZE, rows * TILE_SIZE), (0, 0, 0, 0))
    for i, img in enumerate(rendered):
        sheet.paste(img, ((i % cols) * TILE_SIZE, (i // cols) * TILE_SIZE), img)

    out_name  = f"{REGION_PREFIX}{model_index:03d}"
    meta_json = {
        "total_metatiles":   total,
        "primary_count":     total,
        "secondary_count":   0,
        "metatiles_per_row": TILES_PER_ROW,
        "tile_size":         TILE_SIZE,
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

    data = NARC_PATH.read_bytes()
    files, gmif_start = parse_narc(data)

    if not files or gmif_start is None:
        print(f"Failed to parse NARC: {NARC_PATH}")
        return

    print(f"Found {len(files)} BMD0 models in bm_field.narc")
    ok = 0

    for idx, (off, size) in enumerate(files):
        bmd    = data[gmif_start + off:gmif_start + off + size]
        result = process_bmd0(bmd, idx)
        if result is None:
            continue

        sheet, meta_json, out_name = result
        sheet.save(str(OUT_TILESETS / f"{out_name}.png"))
        (OUT_TILESETS / f"{out_name}.json").write_text(
            json.dumps(meta_json, separators=(",", ":"))
        )
        print(f"  → {out_name}.png  ({sheet.width}×{sheet.height}, {meta_json['total_metatiles']} tiles)")
        ok += 1

    print(f"\nDone: {ok} Johto tilesets written to {OUT_TILESETS}/")


if __name__ == "__main__":
    main()
