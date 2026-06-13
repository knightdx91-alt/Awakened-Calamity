#!/usr/bin/env python3
"""Tripo3D text-to-3D: create a task, poll it, download the .glb.

Stdlib only. Requires TRIPO_API_KEY in the environment (key starts with tsk_).
Docs: https://platform.tripo3d.ai/docs  (POST/GET /v2/openapi/task)
"""
import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error

BASE = "https://api.tripo3d.ai/v2/openapi"


def _req(method, url, key, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        sys.exit(f"HTTP {e.code} from {url}: {detail}")
    except urllib.error.URLError as e:
        sys.exit(f"Network error reaching {url}: {e}")


def create_task(key, prompt, negative, model_version):
    body = {"type": "text_to_model", "prompt": prompt,
            "model_version": model_version}
    if negative:
        body["negative_prompt"] = negative
    resp = _req("POST", f"{BASE}/task", key, body)
    if resp.get("code") != 0:
        sys.exit(f"Tripo create failed: {json.dumps(resp)}")
    return resp["data"]["task_id"]


def poll(key, task_id, timeout_s=600):
    start = time.time()
    last = None
    while time.time() - start < timeout_s:
        resp = _req("GET", f"{BASE}/task/{task_id}", key)
        data = resp.get("data", {})
        status = data.get("status")
        prog = data.get("progress")
        if status != last or prog is not None:
            print(f"  status={status} progress={prog}")
            last = status
        if status == "success":
            return data
        if status in ("failed", "cancelled", "banned", "expired", "unknown"):
            sys.exit(f"Tripo task ended: {status} :: {json.dumps(data)}")
        time.sleep(5)
    sys.exit("Timed out waiting for Tripo task.")


def download(url, out):
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as r, open(out, "wb") as f:
        f.write(r.read())
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--negative", default="")
    ap.add_argument("--model-version", default="v2.5")
    ap.add_argument("--out", default="data/models/model.glb")
    ap.add_argument("--no-pbr", action="store_true")
    args = ap.parse_args()

    key = os.environ.get("TRIPO_API_KEY", "").strip()
    if not key:
        sys.exit("Set TRIPO_API_KEY (your Tripo key, starts with 'tsk_').")

    print(f"Creating Tripo text_to_model task: {args.prompt!r}")
    tid = create_task(key, args.prompt, args.negative, args.model_version)
    print(f"task_id={tid} — polling…")
    data = poll(key, tid)
    out_models = data.get("output", {})
    url = out_models.get("model") if args.no_pbr else (
        out_models.get("pbr_model") or out_models.get("model"))
    if not url:
        sys.exit(f"No model URL in output: {json.dumps(out_models)}")
    print(f"Downloading {url}")
    path = download(url, args.out)
    print(f"DONE -> {path}")


if __name__ == "__main__":
    main()
