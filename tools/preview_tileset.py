#!/usr/bin/env python3
"""Compose a review preview for a generated PixelLab tileset.

Reads a tileset dir (manifest.json + corner-named tile PNGs) and writes a
preview.png: the 16 tiles in a grid, scaled up for visibility, plus a small
"painted" patch that tiles the full-fill tile so the surface reads as terrain.
"""
import json
import os
import sys
from PIL import Image

SCALE = 6


def load_tiles(d):
    man = json.load(open(os.path.join(d, "manifest.json")))
    tiles = {}
    for t in man["tiles"]:
        p = os.path.join(d, t["file"])
        if os.path.exists(p):
            tiles[t["name"]] = Image.open(p).convert("RGBA")
    return man, tiles


def grid(tiles):
    imgs = list(tiles.values())
    if not imgs:
        return None
    tw, th = imgs[0].size
    cols = 4
    rows = (len(imgs) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * tw, rows * th), (40, 40, 48, 255))
    for i, im in enumerate(imgs):
        sheet.paste(im, ((i % cols) * tw, (i // cols) * th), im)
    return sheet


def main():
    d = sys.argv[1]
    man, tiles = load_tiles(d)
    g = grid(tiles)
    if g is None:
        print(f"no tiles in {d}")
        return
    g = g.resize((g.width * SCALE, g.height * SCALE), Image.NEAREST)
    out = os.path.join(d, "preview.png")
    g.save(out)
    print(out)


if __name__ == "__main__":
    main()
