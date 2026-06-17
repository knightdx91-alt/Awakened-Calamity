#!/usr/bin/env python3
"""Batch-import the remaining RPG Maker VX Ace RTP graphics into data/ with index
JSONs: Battlebacks (1+2), Animations, Parallaxes, Titles (1+2), and the leftover
System sheets (Balloon/Shadow/BattleStart/GameOver/Window).

SRC defaults to the raw pack on branch vx-ace-rtp (override with env SRC=/path to
the Graphics dir).
"""
import json, os, struct, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.environ.get("SRC", os.path.join(ROOT, "assets-source", "vx-ace-rtp", "Graphics"))
DATA = os.path.join(ROOT, "data")

def png_size(path):
    with open(path, "rb") as f:
        d = f.read(24)
    assert d[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG: " + path
    return struct.unpack(">II", d[16:24])

def copy_dir(srcdir, dstdir, extra=None):
    """Copy all PNGs from srcdir->dstdir, return list of {id,file,w,h,...extra}."""
    os.makedirs(dstdir, exist_ok=True)
    rel = os.path.relpath(dstdir, DATA)
    out = []
    for f in sorted(os.listdir(srcdir)):
        if not f.lower().endswith(".png"):
            continue
        w, h = png_size(os.path.join(srcdir, f))
        shutil.copyfile(os.path.join(srcdir, f), os.path.join(dstdir, f))
        e = {"id": f[:-4], "file": rel.replace(os.sep, "/") + "/" + f, "w": w, "h": h}
        if extra: e.update(extra(w, h))
        out.append(e)
    return out

def main():
    src = "RPG Maker VX Ace RTP (prototype; raw pack on branch vx-ace-rtp)"

    # Battlebacks (two layers: 1=floor, 2=wall)
    bb1 = copy_dir(os.path.join(SRC, "Battlebacks1"), os.path.join(DATA, "battlebacks", "1"))
    bb2 = copy_dir(os.path.join(SRC, "Battlebacks2"), os.path.join(DATA, "battlebacks", "2"))
    json.dump({"source": src, "floor": bb1, "wall": bb2},
              open(os.path.join(DATA, "battlebacks", "rtp_battlebacks_index.json"), "w"))
    print(f"battlebacks: {len(bb1)} floor + {len(bb2)} wall")

    # Animations (192px cell sheets)
    anim = copy_dir(os.path.join(SRC, "Animations"), os.path.join(DATA, "animations"),
                    extra=lambda w, h: {"cell": 192, "cols": w // 192, "rows": h // 192, "cells": (w // 192) * (h // 192)})
    json.dump({"source": src, "cell": 192, "animations": anim},
              open(os.path.join(DATA, "animations", "rtp_animations_index.json"), "w"))
    print(f"animations: {len(anim)} sheets")

    # Parallaxes
    par = copy_dir(os.path.join(SRC, "Parallaxes"), os.path.join(DATA, "parallaxes"))
    json.dump({"source": src, "parallaxes": par},
              open(os.path.join(DATA, "parallaxes", "rtp_parallaxes_index.json"), "w"))
    print(f"parallaxes: {len(par)} sheets")

    # Titles (1=background, 2=overlay frame)
    t1 = copy_dir(os.path.join(SRC, "Titles1"), os.path.join(DATA, "titles", "1"))
    t2 = copy_dir(os.path.join(SRC, "Titles2"), os.path.join(DATA, "titles", "2"))
    json.dump({"source": src, "background": t1, "overlay": t2},
              open(os.path.join(DATA, "titles", "rtp_titles_index.json"), "w"))
    print(f"titles: {len(t1)} background + {len(t2)} overlay")

    # System leftovers
    sysdir = os.path.join(DATA, "system"); os.makedirs(sysdir, exist_ok=True)
    want = ["Balloon", "Shadow", "BattleStart", "GameOver", "Window"]
    entries = []
    for name in want:
        sp = os.path.join(SRC, "System", name + ".png")
        if not os.path.exists(sp): continue
        w, h = png_size(sp)
        shutil.copyfile(sp, os.path.join(sysdir, name + ".png"))
        entries.append({"id": name, "file": "system/" + name + ".png", "w": w, "h": h})
    # Balloon is an 8-wide grid of animated balloon icons (8 frames x 10 emotes @ tile=w/8)
    json.dump({"source": src, "balloon_grid": {"per_row": 8, "rows": 10}, "sheets": entries},
              open(os.path.join(sysdir, "rtp_system_index.json"), "w"))
    print(f"system: {len(entries)} sheets ({', '.join(e['id'] for e in entries)})")

if __name__ == "__main__":
    main()
