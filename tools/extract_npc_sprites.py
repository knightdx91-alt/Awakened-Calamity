#!/usr/bin/env python3
"""Extract NPC sprites from pokefirered source graphics to data/sprites/npcs/."""

import os
import json
from pathlib import Path
from PIL import Image

SRC_DIR = Path(__file__).parent.parent / "source/pokefirered/graphics/object_events/pics/people"
OUT_DIR = Path(__file__).parent.parent / "data/sprites/npcs"
INDEX_FILE = OUT_DIR / "index.json"


def convert_palette_png(src_path: Path, dst_path: Path):
    """Convert a palette-mode PNG: index 0 → transparent, others opaque."""
    img = Image.open(src_path)
    if img.mode != "P":
        img = img.convert("P")
    rgba = img.convert("RGBA")
    # Get original palette as list of (R,G,B,A) tuples
    palette = img.getpalette()  # flat list of R,G,B values (256*3)
    # Find which pixels correspond to index 0 in the original palette image
    # We need to work on the indexed image directly
    width, height = img.size
    src_pixels = list(img.getdata())
    dst_pixels = list(rgba.getdata())
    new_pixels = []
    for i, idx in enumerate(src_pixels):
        r, g, b, a = dst_pixels[i]
        if idx == 0:
            new_pixels.append((r, g, b, 0))
        else:
            new_pixels.append((r, g, b, 255))
    rgba.putdata(new_pixels)
    rgba.save(dst_path, "PNG")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    index = {}

    png_files = sorted(SRC_DIR.glob("*.png"))
    print(f"Found {len(png_files)} PNG files in {SRC_DIR}")

    for src in png_files:
        stem = src.stem  # e.g. "woman_1"
        dst = OUT_DIR / src.name
        try:
            convert_palette_png(src, dst)
            rel_path = f"data/sprites/npcs/{src.name}"
            index[stem] = rel_path
            print(f"  OK  {stem}")
        except Exception as e:
            print(f"  ERR {stem}: {e}")

    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2, sort_keys=True)
    print(f"\nWrote index with {len(index)} entries to {INDEX_FILE}")


if __name__ == "__main__":
    main()
