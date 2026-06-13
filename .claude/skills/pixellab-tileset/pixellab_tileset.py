#!/usr/bin/env python3
"""PixelLab -> Wang terrain-transition tileset.

Stdlib only. Requires PIXELLAB_API_KEY in the environment.
Flow: POST /tilesets (202 -> background_job_id + tileset_id),
poll GET /background-jobs/{id} until completed, then
GET /tilesets/{tileset_id} and save each tile PNG + manifest.json.
Docs: https://api.pixellab.ai/v2/docs
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


def _req(method, url, key, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        sys.exit(f"HTTP {e.code} from {url}: {detail}")
    except urllib.error.URLError as e:
        sys.exit(f"Network error reaching {url}: {e}")


def create(key, lower, upper, transition, size, seed):
    body = {"lower_description": lower, "upper_description": upper,
            "tile_size": {"width": size, "height": size}}
    if transition:
        body["transition_description"] = transition
    if seed is not None:
        body["seed"] = seed
    _, resp = _req("POST", f"{BASE}/tilesets", key, body)
    job = resp.get("background_job_id")
    tid = resp.get("tileset_id")
    if not job or not tid:
        sys.exit(f"Unexpected create response: {json.dumps(resp)[:400]}")
    usd = (resp.get("usage") or {}).get("usd")
    if usd is not None:
        print(f"  (billed ~${usd})")
    return job, tid


def poll(key, job_id, timeout_s=900):
    start = time.time()
    last = None
    while time.time() - start < timeout_s:
        _, resp = _req("GET", f"{BASE}/background-jobs/{job_id}", key)
        status = resp.get("status")
        if status != last:
            print(f"  job status={status}")
            last = status
        if status == "completed":
            return
        if status in ("failed", "cancelled", "error"):
            sys.exit(f"Job ended: {status} :: {json.dumps(resp)[:400]}")
        time.sleep(5)
    sys.exit("Timed out waiting for PixelLab job.")


def _tile_png_bytes(tile):
    # Handle both {image_data:"data:image/png;base64,.."} and {image:{base64:..}}
    raw = tile.get("image_data")
    if isinstance(raw, str):
        raw = raw.split(",", 1)[-1]
        return base64.b64decode(raw)
    img = tile.get("image") or {}
    if img.get("base64"):
        return base64.b64decode(img["base64"])
    return None


def safe(name):
    return re.sub(r"[^A-Za-z0-9+_-]", "_", name or "tile")


def fetch_and_save(key, tid, outdir):
    _, resp = _req("GET", f"{BASE}/tilesets/{tid}", key)
    ts = resp.get("tileset", {})
    tiles = ts.get("tiles", [])
    if not tiles:
        sys.exit(f"No tiles returned: {json.dumps(resp)[:400]}")
    os.makedirs(outdir, exist_ok=True)
    manifest = {"tileset_id": tid,
                "tile_size": ts.get("tile_size"),
                "terrain_types": ts.get("terrain_types"),
                "total_tiles": ts.get("total_tiles"),
                "tiles": []}
    for t in tiles:
        png = _tile_png_bytes(t)
        if png is None:
            print(f"  WARN no image for tile {t.get('id')}")
            continue
        fname = f"{safe(t.get('name'))}.png"
        with open(os.path.join(outdir, fname), "wb") as f:
            f.write(png)
        manifest["tiles"].append({"id": t.get("id"), "name": t.get("name"),
                                  "corners": t.get("corners"), "file": fname})
    with open(os.path.join(outdir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    return len(manifest["tiles"]), outdir


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lower", required=True)
    ap.add_argument("--upper", required=True)
    ap.add_argument("--transition", default="")
    ap.add_argument("--size", type=int, choices=[16, 32], default=16)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--outdir", default="data/tilesets/generated/tileset")
    args = ap.parse_args()

    key = os.environ.get("PIXELLAB_API_KEY", "").strip()
    if not key:
        sys.exit("Set PIXELLAB_API_KEY (your PixelLab API token).")

    print(f"Creating tileset: lower={args.lower!r} upper={args.upper!r}")
    job, tid = create(key, args.lower, args.upper, args.transition,
                      args.size, args.seed)
    print(f"tileset_id={tid} job={job} — polling…")
    poll(key, job)
    n, out = fetch_and_save(key, tid, args.outdir)
    print(f"DONE -> {n} tiles + manifest.json in {out}")


if __name__ == "__main__":
    main()
