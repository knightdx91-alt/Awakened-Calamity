# Awakened Calamity

A browser-based, GBA-style (240×160 logical) 2D top-down **LitRPG survival sandbox**.
Core premise: *"The System helps you, and that's the horror."* See `DESIGN.md` and the
companion docs (`WORLD.md`, `MAP_STREAMING.md`, `PROGRESSION.md`, …) for the full design.

**Status:** prototype skeleton. The engine boots and is walkable; combat/capture/survival
systems are designed but not yet implemented.

## Run it

No build system — plain HTML/CSS/JS with `window.GameXxx` globals. Serve over HTTP
(not `file://`) so `fetch()` of the map/tileset JSON works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

- `index.html` — hub
- `game.html` — the game (boots `AwakeningCamp` in the `awakened` region)
- `game.html?map=<Name>&region=<region>` — load any map directly
- `map-editor.html` — visual metatile map editor (see `docs/MAP_EDITING.md`)
- `worldmap.html` — original SVG world map

## What's here (reused engine)

Lifted from the Pokémon-Game prototype's IP-free engine layer:

- `src/engine/` — tile renderer, map loader + connection system, camera, input (`justPressed` latch)
- `src/ui/` — HUD, start-menu/window system, dialogue, orientation, on-screen controls
- `src/data/` — 3-slot save system, achievements, factions
- `map-editor.*` + `tools/` + `docs/MAP_EDITING.md` — map authoring pipeline
- `data/tilesets/placeholder.*` + `data/maps/awakened/` — a **clean, generated** starter
  tileset and map (no third-party art)

## ⚠️ Art / IP notice — read before any public release

This is a dev skeleton. Some **UI chrome art under `src/assets/`** (start-menu icons,
party-screen graphics, fonts, battle terrain) was carried over from the Pokémon prototype
and is **derived from copyrighted Game Freak / Nintendo material**. It is placeholder only
and **must be replaced with original art before any public release**. The map *tilesets*
and *engine code* are clean — only `data/tilesets/placeholder.*` ships here; no ripped
tileset PNGs were brought over. See `ASSETS_NOTICE.md`.

## ⚠️ Security notice — cloud saves token

`cloud-saves.js` currently embeds a GitHub token (stored reversed). This is a **temporary**
measure carried over from the source project. **It will be moved to a Cloudflare Worker** so
no secret lives in the repo. Do not treat this token as safe; rotate it when the Worker lands.
