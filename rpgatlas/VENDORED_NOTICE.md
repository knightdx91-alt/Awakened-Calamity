# RPGAtlas — vendored standalone tool

This directory is a **verbatim copy of [RPGAtlas](https://github.com/DriftwoodGaming/RPGAtlas)**,
an original, free, open-source RPG-maker-style engine + editor. It is included here as a
**standalone tool** (reachable from the hub as its own card), NOT integrated into the
Awakened Calamity game or our `src/`/`data/` code.

## License — IMPORTANT
- RPGAtlas is licensed **GPLv3** (see `LICENSE` in this folder).
- It is kept here under **"mere aggregation"** (GNU GPL §5): it ships in the same repo but is
  a **separate program**. The GPL applies to the files in **this folder only**. It does NOT
  attach to the Awakened Calamity game, editor, or any code outside `rpgatlas/`.
- **Do NOT copy RPGAtlas source code into our game/editor** (`src/`, `map-editor.*`, `data/`,
  etc.). Doing so would make that code a derivative work and subject it to GPLv3 — which
  collides with the planned closed/commercial 3D Unity rebuild. Use it as a **reference /
  oracle** for ideas and behavior; reimplement in our own code if we want a feature.

## What was vendored
Web-essential files only (`index.html`, `play.html`, `css/`, `js/`, `img/`, `docs/`, `wiki/`,
sample `Atlas_Quest*.json`, `LICENSE`, `README.md`). Excluded: the Windows `.exe` launchers,
`src-tauri/` (Rust desktop wrapper), build scripts, tests, and `.git`/CI — none needed to run
it from the browser over HTTP.

## Running
Served over HTTP (same as the rest of the repo). Open `rpgatlas/index.html` for the editor,
`rpgatlas/play.html` for the bundled sample game. No build step, no dependencies.

Upstream: https://github.com/DriftwoodGaming/RPGAtlas
