#!/usr/bin/env python3
"""Render a baked town layout (base + overlay) to a single PNG for visual review."""
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS = os.path.join(ROOT, "data", "tilesets")

def load(name):
    j = json.load(open(os.path.join(TS, name + ".json")))
    im = Image.open(os.path.join(TS, name + ".png")).convert("RGBA")
    return im, j.get("tile", 32), j.get("metatiles_per_row", 16)

def main():
    lay = sys.argv[1] if len(sys.argv) > 1 else "LAYOUT_VERDANT_TOWN"
    L = json.load(open(os.path.join(ROOT, "data", "layouts", "awakened", lay + ".json")))
    W, H = L["width"], L["height"]
    base, T, bpr = load(L["tileset"])
    ov, ovT, opr = load(L["overlay_tileset"]) if L.get("overlay_tileset") else (None, T, 16)
    out = Image.new("RGBA", (W * T, H * T), (0, 0, 0, 255))
    def blit(src, idx, pr, x, y):
        c, r = idx % pr, idx // pr
        out.paste(src.crop((c * T, r * T, c * T + T, r * T + T)), (x * T, y * T), src.crop((c * T, r * T, c * T + T, r * T + T)))
    for y in range(H):
        for x in range(W):
            blit(base, L["metatiles"][y * W + x], bpr, x, y)
    if ov is not None:
        ovl = L["overlay"]
        for y in range(H):
            for x in range(W):
                g = ovl[y * W + x]
                if g >= 0: blit(ov, g, opr, x, y)
    if L.get("upper_tileset"):
        up, uT, upr = load(L["upper_tileset"])
        ul = L.get("upper", [])
        for y in range(H):
            for x in range(W):
                g = ul[y * W + x] if y * W + x < len(ul) else -1
                if g >= 0: blit(up, g, upr, x, y)
    p = os.path.join("/tmp", lay + ".png")
    out.save(p)
    out.resize((W * T // 2, H * T // 2), Image.NEAREST).save(os.path.join("/tmp", lay + "_half.png"))
    print("wrote", p, out.size)

if __name__ == "__main__":
    main()
