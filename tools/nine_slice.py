#!/usr/bin/env python3
"""Turn a PixelLab UI frame (hollow-center panel) into a scalable 9-slice.

Outputs:
  - <name>_9/{tl,t,tr,l,c,r,bl,b,br}.png  (the nine pieces, for canvas use)
  - appends a CSS `border-image` rule to data/art/ui/ui.css (for DOM menus)

A 9-slice lets one small frame stretch to any menu size: corners stay fixed,
edges tile, center fills. `--inset` is the border thickness in SOURCE pixels.
"""
import argparse
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def slice9(path, inset, outdir):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    t = r = b = l = inset
    if isinstance(inset, tuple):
        t, r, b, l = inset
    os.makedirs(outdir, exist_ok=True)
    boxes = {
        "tl": (0, 0, l, t), "t": (l, 0, w - r, t), "tr": (w - r, 0, w, t),
        "l": (0, t, l, h - b), "c": (l, t, w - r, h - b), "r": (w - r, t, w, h - b),
        "bl": (0, h - b, l, h), "b": (l, h - b, w - r, h), "br": (w - r, h - b, w, h),
    }
    for name, box in boxes.items():
        im.crop(box).save(os.path.join(outdir, name + ".png"))
    return (t, r, b, l), (w, h)


def css_rule(selector, rel_path, t, r, b, l):
    return (f"{selector} {{\n"
            f"  border-image: url('{rel_path}') {t} {r} {b} {l} fill repeat;\n"
            f"  border-width: {t}px {r}px {b}px {l}px;\n"
            f"  border-style: solid;\n"
            f"  image-rendering: pixelated;\n"
            f"}}\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--inset", type=int, default=12, help="border thickness (src px)")
    ap.add_argument("--selector", required=True, help="CSS selector for the rule")
    args = ap.parse_args()

    base = os.path.splitext(os.path.basename(args.image))[0]
    outdir = os.path.join(os.path.dirname(args.image), base + "_9")
    (t, r, b, l), (w, h) = slice9(args.image, args.inset, outdir)
    rel = os.path.relpath(args.image, os.path.join(ROOT, "data/art/ui"))
    css = css_rule(args.selector, rel, t, r, b, l)
    css_path = os.path.join(ROOT, "data/art/ui/ui.css")
    with open(css_path, "a") as f:
        f.write(css)
    print(f"sliced {base} ({w}x{h}, inset {t}) -> {outdir}")
    print(f"appended CSS rule for {args.selector} to {css_path}")


if __name__ == "__main__":
    main()
