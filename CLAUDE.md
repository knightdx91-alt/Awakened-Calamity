# CLAUDE.md — Awakened Calamity

Guidance for Claude Code working in this repo. **Read this first.**

## What this is
A browser-based, **GBA-style (240×160 logical) 2D top-down LitRPG survival sandbox**.
Core premise: *"The System helps you, and that's the horror."* Full design lives in the
`*.md` design docs (`DESIGN.md` is the entry point; companions: `WORLD.md`, `MAP_STREAMING.md`,
`PROGRESSION.md`, `CLASSES.md`, `SKILLS.md`, `CRAFTING.md`, `ECONOMY.md`, `ENCOUNTERS.md`,
`LIVING_WORLD.md`, `HIDDEN_LAYER.md`, `OVERFLOW.md`, `TRAVERSAL.md`, `WEATHER.md`,
`GAZETTEER.md`, `WORLD_MAP.md`).

The engine was lifted from a sibling Pokémon prototype repo (`Pokemon-Game`). That repo's
`CLAUDE.md` documents the engine internals in depth (input/menu bug history, start-menu
architecture, map system, save system) and is still the best reference for how the
`src/` code behaves — the code here is the same code.

## CRITICAL RULES
- **Branch: `main` ONLY.** All work and pushes go straight to `main`. **No feature branches,
  no PRs** (the owner confirmed: while we work on main, a PR would just be merging main into
  itself). Push directly.
- **No build system.** Plain HTML/CSS/JS, all globals (`window.GameXxx`). No npm/bundler.
- Serve over HTTP (`python3 -m http.server 8000`), not `file://`, so `fetch()` works.
- **Handle tasks directly** — do not spawn subagents.

## Deploy
- **GitHub Pages via Actions** (`.github/workflows/pages.yml`). On push to `main` it replaces
  `__CACHE_BUST__` in `*.html` with the commit SHA, then deploys the repo root.
- Live: **https://knightdx91-alt.github.io/Awakened-Calamity/**  ✅ confirmed live & rendering.

## File structure
```
index.html        — central hub (RetroPlay-style card-stack of tiles: Play / Create / World)
game.html         — the game (loads engine scripts in order; boots AwakeningCamp)
map-editor.html/.js — visual metatile map editor (saves to a `maps` branch via GitHub API)
worldmap.html     — original SVG world map ("The Drowned Reach & the Four Reaches")
styles.css        — all game CSS
cloud-saves.js    — cloud save sync (see SECURITY note below)
sw.js             — service worker
src/
  engine/  input.js camera.js map.js renderer.js script.js battle.js
  ui/      hud.js startmenu.js dialogue.js controls.js layout.js system.js flymenu.js summary.js
  data/    save.js achievements.js factions.js
  assets/  UI chrome art (PLACEHOLDER — see ASSETS_NOTICE.md)
  main.js  — game loop, player movement, warp/connection transitions
data/
  tilesets/  placeholder.png/.json + _index.json   (clean, generated)
  layouts/awakened/LAYOUT_AWAKENING_CAMP.json
  maps/awakened/AwakeningCamp.json + awakened_index.json
tools/     — map/asset generation scripts (from prototype)
docs/MAP_EDITING.md — full map authoring workflow
```

## Map system (how maps work — same as prototype)
Three layers: **tileset** (16×16 metatile PNG sheet, 16/row, + JSON `behaviors`/`collisions`),
**layout** (`width`/`height` + flat `metatiles[]` + `collision[]` + `tileset` name), **map**
(metadata: `layout`, `warps`, `connections`, `npcs`, …). Regions are registered in `INDEX_FILES`
in `src/engine/map.js`. `game.html?map=<Name>&region=<region>` boots any map directly.
- **`awakened` region is registered**; default boot map is **`AwakeningCamp`**
  (set in `src/main.js`: `currentRegion='awakened'`, default `_startMap='AwakeningCamp'`,
  and the fallback loader / `window._mapName`).

## ⚠️ SECURITY — cloud-saves token
`cloud-saves.js` embeds a GitHub token (stored reversed). Carried over from the prototype as a
**temporary** measure with owner sign-off. **Plan: move it to a Cloudflare Worker** so no secret
sits in the repo; rotate the token when that lands. Don't treat it as safe.

## ⚠️ ART / IP — read before any public release (see ASSETS_NOTICE.md)
- **Clean / shippable:** all `src/**` JS (engine code), the map format, `data/tilesets/placeholder.*`,
  `data/maps/awakened/*`, `data/layouts/awakened/*`, `worldmap.html`, all design docs.
- **Placeholder, MUST be replaced:** UI chrome art under `src/assets/` (start-menu icons, party
  screen, fonts, battle terrain, bag/journal/pokedex/trainer_card) — Game Freak/Nintendo-derived.
- **Deliberately NOT brought over:** the 538 ripped tileset PNGs, all real-region maps, Pokémon
  species/encounter/sprite data. We ship only our own generated tileset.

## Status — what's done
- ✅ Engine bundle imported and booting: tile renderer, map loader + connection system, camera,
  `justPressed` input, HUD, start-menu/window system, dialogue, orientation, on-screen controls,
  3-slot save / achievements / factions.
- ✅ Clean **generated placeholder tileset** (grass / tall grass / path / water / rock / sand /
  corrupted-void) + original **AwakeningCamp** starter map in the new `awakened` region.
- ✅ Central `index.html` hub (card-stack tiles), branded `game.html`, README, ASSETS_NOTICE,
  `.gitignore`, `.nojekyll`, Pages CI.
- ✅ Design docs + SVG world map in repo.
- ✅ Deployed & verified live on GitHub Pages.

## Next steps (priority)
1. **Original tilesets** ← *owner is producing these via the Design side now.* Drop new 16×16
   metatile sheets into `data/tilesets/` (PNG + matching JSON), run
   `tools/build_tileset_index.py` to refresh `_index.json`, then author zones in the map editor.
   The placeholder tileset/map can be replaced once real art exists.
2. **HUD survival meters** — wire Surveillance / Stamina / Exposure into `src/ui/hud.js`
   (cheap + thematic, `DESIGN.md §7`).
3. **Start menu** — strip Pokémon-flavored items down to the survival set
   (Camp / Supplies / Affinities / System) in `src/ui/startmenu.js`.
4. **Replace placeholder UI art** under `src/assets/` with originals.
5. **Battle system** — `src/engine/battle.js` is the prototype's turn-based combat (donor only);
   `DESIGN.md §1` calls for the **Tempo + Intervention** rewrite.
6. **Cloud saves → Cloudflare Worker** (remove token from repo).

## Session log
- **2026-06-12** — Created repo content from scratch: pushed design-doc bundle, then imported the
  IP-free engine + map editor + save systems, generated a clean placeholder tileset/map, built the
  hub, wired the `awakened` region, deployed to Pages (confirmed live). Ending session; owner
  switching to **Design** to get real tilesets made.
