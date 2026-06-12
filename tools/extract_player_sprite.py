#!/usr/bin/env python3
"""
Extract Brendan walking sprite from pokeemerald source.
Converts palette-mode PNG (index 0 = transparent) to RGBA PNG.
Output: data/sprites/player.png
"""
import os
from PIL import Image

SRC = os.path.join(os.path.dirname(__file__), '..', 'source', 'pokeemerald',
                   'graphics', 'object_events', 'pics', 'people', 'brendan', 'walking.png')
DST = os.path.join(os.path.dirname(__file__), '..', 'data', 'sprites', 'player.png')

img = Image.open(SRC)
assert img.mode == 'P', f"Expected palette mode, got {img.mode}"

# Build RGBA version: palette index 0 → alpha=0, everything else opaque
rgba = img.convert('RGBA')

# Re-apply transparency: wherever original palette index is 0, set alpha to 0
orig_data = img.tobytes()
rgba_data = list(rgba.getdata())
for i, idx in enumerate(orig_data):
    if idx == 0:
        r, g, b, _ = rgba_data[i]
        rgba_data[i] = (r, g, b, 0)
rgba.putdata(rgba_data)

os.makedirs(os.path.dirname(DST), exist_ok=True)
rgba.save(DST)
print(f"Saved {rgba.size[0]}x{rgba.size[1]} RGBA sprite -> {DST}")
