#!/usr/bin/env python3
"""PixelLab unified pixel-art generator (stdlib only).

Generates ANY 2D graphic for the game via the PixelLab REST API v2:
  image      single pixel-art image (menus, icons, UI, backgrounds, props)
  tileset    seamless Wang terrain-transition tileset (feeds wang8_lut autotiler)
  mapobject  a map object/building (house, tree, barrel) for placement on maps
  character  a creature/character with 8 directions (downloads each rotation)
  object     a standalone 8-direction object (downloads each rotation)

Requires PIXELLAB_API_KEY in the environment. Docs: https://api.pixellab.ai/v2/docs
"""
import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

BASE = "https://api.pixellab.ai/v2"


def key():
    k = os.environ.get("PIXELLAB_API_KEY", "").strip()
    if not k:
        sys.exit("Set PIXELLAB_API_KEY (your PixelLab API token).")
    return k


def _req(method, path, body=None):
    url = path if path.startswith("http") else BASE + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {key()}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} from {url}: {e.read().decode(errors='replace')[:400]}")
    except urllib.error.URLError as e:
        sys.exit(f"Network error reaching {url}: {e}")


def _bill(resp):
    usd = (resp.get("usage") or {}).get("usd")
    if usd is not None:
        print(f"  (billed ~${usd})")


def safe(s):
    return re.sub(r"[^A-Za-z0-9+_-]", "_", s or "out")


def save_b64(b64, out):
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "wb") as f:
        f.write(base64.b64decode(b64.split(",", 1)[-1]))
    return out


def dl_url(url, out):
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as r, open(out, "wb") as f:
        f.write(r.read())
    return out


def poll(job_id, timeout_s=900):
    start, last = time.time(), None
    while time.time() - start < timeout_s:
        r = _req("GET", f"/background-jobs/{job_id}")
        st = r.get("status")
        if st != last:
            print(f"  job status={st}")
            last = st
        if st == "completed":
            return
        if st in ("failed", "cancelled", "error"):
            sys.exit(f"Job ended: {st} :: {json.dumps(r)[:300]}")
        time.sleep(5)
    sys.exit("Timed out waiting for PixelLab job.")


# ---- subcommands ---------------------------------------------------------

def cmd_image(a):
    body = {"description": a.description,
            "image_size": {"width": a.width, "height": a.height}}
    if a.no_background:
        body["no_background"] = True
    if a.view:
        body["view"] = a.view
    if a.seed is not None:
        body["seed"] = a.seed
    print(f"Generating image: {a.description!r}")
    r = _req("POST", "/create-image-pixflux", body)
    _bill(r)
    img = r.get("image") or {}
    b64 = img.get("base64") if isinstance(img, dict) else img
    if not b64:
        sys.exit(f"No image in response: {json.dumps(r)[:300]}")
    print(f"DONE -> {save_b64(b64, a.out)}")


def cmd_tileset(a):
    body = {"lower_description": a.lower, "upper_description": a.upper,
            "tile_size": {"width": a.size, "height": a.size}}
    if a.transition:
        body["transition_description"] = a.transition
    if a.seed is not None:
        body["seed"] = a.seed
    print(f"Creating tileset: {a.lower!r} <-> {a.upper!r}")
    r = _req("POST", "/tilesets", body)
    _bill(r)
    job, tid = r.get("background_job_id"), r.get("tileset_id")
    if not (job and tid):
        sys.exit(f"Unexpected response: {json.dumps(r)[:300]}")
    print(f"tileset_id={tid} job={job}")
    poll(job)
    ts = _req("GET", f"/tilesets/{tid}").get("tileset", {})
    tiles = ts.get("tiles", [])
    os.makedirs(a.outdir, exist_ok=True)
    man = {"tileset_id": tid, "tile_size": ts.get("tile_size"),
           "terrain_types": ts.get("terrain_types"), "tiles": []}
    for t in tiles:
        raw = t.get("image_data") or (t.get("image") or {}).get("base64")
        if not raw:
            continue
        fn = f"{safe(t.get('name'))}.png"
        save_b64(raw, os.path.join(a.outdir, fn))
        man["tiles"].append({"id": t.get("id"), "name": t.get("name"),
                             "corners": t.get("corners"), "file": fn})
    json.dump(man, open(os.path.join(a.outdir, "manifest.json"), "w"), indent=2)
    print(f"DONE -> {len(man['tiles'])} tiles + manifest.json in {a.outdir}")


def _download_rotations(detail, outdir, stem):
    os.makedirs(outdir, exist_ok=True)
    rot = detail.get("rotation_urls") or {}
    n = 0
    for direction, url in rot.items():
        if url:
            dl_url(url, os.path.join(outdir, f"{stem}_{safe(direction)}.png"))
            n += 1
    # also grab any animation frame urls if present
    json.dump(detail, open(os.path.join(outdir, f"{stem}.json"), "w"), indent=2,
              default=str)
    return n


def cmd_mapobject(a):
    body = {"description": a.description,
            "image_size": {"width": a.width, "height": a.height}}
    if a.view:
        body["view"] = a.view
    if a.seed is not None:
        body["seed"] = a.seed
    print(f"Creating map object: {a.description!r}")
    r = _req("POST", "/map-objects", body)
    _bill(r)
    job, oid = r.get("background_job_id"), r.get("object_id")
    poll(job)
    detail = _req("GET", f"/objects/{oid}")
    n = _download_rotations(detail, a.outdir, safe(a.description)[:30])
    print(f"DONE -> {n} image(s) in {a.outdir}")


def cmd_character(a):
    body = {"description": a.description,
            "image_size": {"width": a.width, "height": a.height}}
    if a.view:
        body["view"] = a.view
    if a.seed is not None:
        body["seed"] = a.seed
    print(f"Creating 8-direction character/creature: {a.description!r}")
    r = _req("POST", "/create-character-with-8-directions", body)
    _bill(r)
    job, cid = r.get("background_job_id"), r.get("character_id")
    poll(job)
    detail = _req("GET", f"/characters/{cid}")
    n = _download_rotations(detail, a.outdir, safe(a.description)[:30])
    print(f"DONE -> {n} rotation sprite(s) in {a.outdir}")


def cmd_object(a):
    body = {"description": a.description, "size": a.size}
    if a.view:
        body["view"] = a.view
    if a.seed is not None:
        body["seed"] = a.seed
    print(f"Creating 8-direction object: {a.description!r}")
    r = _req("POST", "/create-8-direction-object", body)
    _bill(r)
    job, oid = r.get("background_job_id"), r.get("object_id")
    poll(job)
    detail = _req("GET", f"/objects/{oid}")
    n = _download_rotations(detail, a.outdir, safe(a.description)[:30])
    print(f"DONE -> {n} rotation sprite(s) in {a.outdir}")


def main():
    ap = argparse.ArgumentParser(description="PixelLab pixel-art generator")
    sub = ap.add_subparsers(dest="cmd", required=True)

    pi = sub.add_parser("image", help="single image (menu/icon/UI/prop/background)")
    pi.add_argument("--description", required=True)
    pi.add_argument("--width", type=int, default=128)
    pi.add_argument("--height", type=int, default=128)
    pi.add_argument("--no-background", action="store_true")
    pi.add_argument("--view", default="")
    pi.add_argument("--seed", type=int, default=None)
    pi.add_argument("--out", default="data/art/image.png")
    pi.set_defaults(fn=cmd_image)

    pt = sub.add_parser("tileset", help="Wang terrain-transition tileset")
    pt.add_argument("--lower", required=True)
    pt.add_argument("--upper", required=True)
    pt.add_argument("--transition", default="")
    pt.add_argument("--size", type=int, choices=[16, 32], default=16)
    pt.add_argument("--seed", type=int, default=None)
    pt.add_argument("--outdir", default="data/tilesets/generated/tileset")
    pt.set_defaults(fn=cmd_tileset)

    pm = sub.add_parser("mapobject", help="building/prop placed on a map")
    pm.add_argument("--description", required=True)
    pm.add_argument("--width", type=int, default=64)
    pm.add_argument("--height", type=int, default=64)
    pm.add_argument("--view", default="high top-down")
    pm.add_argument("--seed", type=int, default=None)
    pm.add_argument("--outdir", default="data/art/objects")
    pm.set_defaults(fn=cmd_mapobject)

    pc = sub.add_parser("character", help="creature/character, 8 directions")
    pc.add_argument("--description", required=True)
    pc.add_argument("--width", type=int, default=48)
    pc.add_argument("--height", type=int, default=48)
    pc.add_argument("--view", default="low top-down")
    pc.add_argument("--seed", type=int, default=None)
    pc.add_argument("--outdir", default="data/art/characters")
    pc.set_defaults(fn=cmd_character)

    po = sub.add_parser("object", help="standalone 8-direction object")
    po.add_argument("--description", required=True)
    po.add_argument("--size", type=int, default=64)
    po.add_argument("--view", default="high top-down")
    po.add_argument("--seed", type=int, default=None)
    po.add_argument("--outdir", default="data/art/objects")
    po.set_defaults(fn=cmd_object)

    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
