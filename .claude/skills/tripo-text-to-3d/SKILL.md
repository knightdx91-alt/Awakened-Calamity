---
name: tripo-text-to-3d
description: Generate a 3D character/object model from a TEXT prompt using the Tripo3D API (no image upload needed). Use when the user wants a stylized (cartoon / WoW / RuneScape / low-poly) or realistic 3D model created from a description, exported as .glb for Blender/Unity/three.js. Requires a Tripo API key in the TRIPO_API_KEY environment variable (key starts with "tsk_"). Runs fully server-side — no local app install and no file upload required.
license: MIT
metadata:
  author: Awakened Calamity (in-repo)
---

# Tripo Text → 3D

Turn a text description into a downloadable 3D model (`.glb`) via the Tripo3D
OpenAPI. Generation happens on Tripo's servers; this skill just orchestrates
create → poll → download. Designed for headless/browser-only use: the user
never installs anything or uploads a file.

## Requirements
- `TRIPO_API_KEY` set in the environment (a Tripo key, starts with `tsk_`).
  Get one in a browser at https://platform.tripo3d.ai (free trial credits).
- Outbound HTTPS to `api.tripo3d.ai` (verified reachable in this environment).
- Python 3 (stdlib only — no pip installs).

## Usage
```
TRIPO_API_KEY=tsk_xxx python3 .claude/skills/tripo-text-to-3d/tripo_gen.py \
  --prompt "stylized World of Warcraft style male human warrior, chunky proportions, ornate plate armor, hand-painted texture look, T-pose" \
  --out data/models/warrior.glb
```
Optional flags:
- `--negative "low quality, blurry, extra limbs"` — things to avoid.
- `--model-version v2.5` — Tripo model version (default v2.5).
- `--no-pbr` — download the plain model instead of the PBR-textured one.

## Getting a stylized / WoW / RuneScape look
Tripo steers style from the prompt. Put style descriptors IN the prompt, e.g.
`stylized`, `cartoon`, `hand-painted`, `chunky/exaggerated proportions`,
`low-poly` (RuneScape), `T-pose` (so it's riggable). The script passes the
prompt straight through, so iterate on wording and re-run.

## Output
On success, writes the `.glb` to `--out` and prints the path. The model can be
committed to the repo and viewed/downloaded in a browser; it imports directly
into Blender, Unity, or three.js. Tripo can also export FBX/OBJ — extend the
script's download step if you need those.

## Notes
- Never hardcode the key in the repo. Pass it via the environment per-run.
- This is the "text→3D" path; an "image-URL→3D" variant would add a
  `type: image_to_model` task that first uploads an image fetched from a URL.
