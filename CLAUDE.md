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
- **⚠️ PORTABILITY — this is a PROTOTYPE for a 3D Unity rebuild (PC/console, multiplayer).**
  Game **systems = engine-agnostic DATA (`data/systems/*.json`) + pure deterministic RULES
  (`src/systems/*.js`, no DOM)**, separate from **presentation** (canvas/DOM, the throwaway layer).
  Logic + data must port to Unity; rendering gets rebuilt. **Never put game logic in the renderer/UI.**
  See `ARCHITECTURE.md`.

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
- ✅ Engine bundle booting: tile renderer, map loader + connection system, camera, `justPressed`
  input, HUD, start-menu/window system, dialogue, orientation, on-screen controls, 3-slot save.
- ✅ **Official design system imported** (`design-system/`) — the owner's IP-clean art + UI:
  tokens (`tokens/colors.css` warm FireRed + cold System), components, ui_kits, guidelines,
  scene mockups, and original **16×16 tilesets** (terrain/buildings/dungeon/props + pond/road
  3×3 autotile patches). `game.html` links `design-system/tokens/colors.css`.
- ✅ **Tilesets** (`data/tilesets/_index.json`): official `ac_terrain/ac_terrain2/ac_buildings/
  ac_dungeon/ac_props`, autotile `ac_ground` (grass + pond/road 9-slice → wang8_lut). Plus
  license-clean imports kept as palettes/options: `forest_terrain` (CC0, .tres wang8),
  `synth_terrain` (layered grass/sand/stone/water/void synth autotiler), `coast_cc0`,
  `overworld_buch` (CC-BY), `punyworld`/`punyworld_full` (CC0), `oga_rpg16` (CC-BY-SA),
  `ufeff` (CC0), `puny_dungeon` (CC-BY). Each has a `.LICENSE.txt`. **Use the `ac_*` official art.**
- ✅ **Autotiler**: editor **Terrain brush** (`map-editor.js`) bakes `wang8_lut`/`edge4` autotile
  configs (`<tileset>.autotile.json`) into plain `metatiles[]` + persists `layout.terrain[]`.
  Layered priorities (terrain-vs-terrain edges). `tools/build_ac_ground.py`, `synth_terrain.py`,
  `import_forest_terrain.py` build configs.
- ✅ **Engine overlay layer** (`renderer.js`/`map.js`): `layout.overlay_tileset` + `overlay[]`
  draw buildings/props ON TOP of an autotiled base → towns with autotiled ground in one map.
- ✅ **Player sprite** wired (`data/sprites/player.png` from CC0 Puny Character-Base via
  `tools/build_player_sprite.py`). Fixed a loop-killing crash (`HUD.update` `visitedMaps.add`).
- ✅ **HUD survival meters** — Surveillance (cold System gauge) + Stamina/Exposure (warm bars);
  `GameHUD.setMeters({surveillance,stamina,exposure})`, persisted to `state.survival`.
- ✅ **Start menu rebuilt to survival** (no Pokémon): **CAMP · BONDS · SUPPLIES · AFFINITIES ·
  REACHES · SYSTEM** (+ Save/Options/Exit). BONDS hidden until `state.bonds[]` non-empty.
  SYSTEM is the cold interactive panel (services raise Surveillance). New DOM builders on the
  design-system palette.
- ✅ **Source purge**: removed ~2200 lines of dead Pokémon builders + scrubbed save/factions/
  achievements/hud; `pokemon_*` localStorage keys → `ac_*`; empty starter party. **Remaining
  Pokémon code = donor combat only** (`battle.js`, `summary.js`, `battle_assets.*`).
- ✅ **AwakeningCamp** (default boot map) + sample maps rebuilt on official art. Maps auto-sync
  to the editor's `maps` branch via `tools/sync_maps_branch.sh` (editor `GH_REPO` →
  `awakened-calamity`). Data fetches use `cache:'no-cache'` + `?b=<build>` so the live page
  always gets the latest map/art.
- ✅ Deployed & verified live on GitHub Pages.

## Next steps (priority)
1. **Battle system rewrite** — replace donor `battle.js`/`summary.js`/`battle_assets.*` (the only
   remaining Pokémon code, unreachable in AC) with **Tempo + Intervention** (`DESIGN.md §1`). This
   is also the *true* finish of the source purge.
2. **Wire survival systems to gameplay** — drive the HUD meters (Stamina drains in Wildlands,
   Exposure from biome hazards, **Surveillance rises** when using System services/REACHES
   fast-travel); real **SUPPLIES** inventory; **Bind** flow → populates `state.bonds[]`.
3. **REACHES fast-travel** — actual warp targets (raise Surveillance), unlock landmarks.
4. **More official-art content** — author zones with the `ac_*` tilesets + overlay (use the
   map editor Terrain brush + building overlay); add building stamps / overlay painting to editor.
5. **Re-skin remaining chrome** (dialogue, banners, options, hub) to the FireRed/System tokens.
6. **Cloud saves → Cloudflare Worker** (remove embedded token from repo; still present in
   `cloud-saves.js` + `map-editor.js`, reversed).

## Session log
- **2026-06-12 (1)** — Created repo content from scratch: pushed design-doc bundle, imported the
  IP-free engine + map editor + save systems, generated a clean placeholder tileset/map, built the
  hub, wired the `awakened` region, deployed to Pages (confirmed live).
- **2026-06-12 (2)** — Big build-out session:
  - Fixed the `SessionStart` hook to force `main` across all repos (multi-repo, robust path).
  - **Tilesets/autotiling:** license-vetted & imported many sets (kept the CC0/CC-BY ones as
    palettes), built the **editor Terrain brush autotiler** (`wang8_lut`/`edge4`, layered
    priorities, terrain-grid persistence), a **universal `synth_terrain`** synthesizer, and the
    correct `.tres`-based `forest_terrain`. Added an **engine overlay layer** for buildings on
    autotiled ground. Fixed live-page **caching** (no-cache + build-id PNG bust). Editor maps
    auto-sync to the `maps` branch; repo pointer fixed to `awakened-calamity`.
  - **Sprites/HUD:** wired the **player sprite** (CC0 Puny), fixed a loop-killing `visitedMaps`
    crash, added **HUD survival meters** (Surveillance/Stamina/Exposure).
  - **Owner's design system** pulled from Drive → `design-system/` + imported official `ac_*`
    tilesets; rebuilt **AwakeningCamp** + sample maps on the official art.
  - **Menus:** full rebuild to the survival set (Camp/Bonds/Supplies/Affinities/Reaches/System),
    cold interactive SYSTEM panel, FireRed reskin, then a **source purge** of all Pokémon/trainer
    references (everything except the donor combat engine).
  - Verified throughout with headless Chromium. Ending session at usage limit. **Next: the
    Tempo + Intervention battle rewrite (finishes the purge) and wiring survival systems to play.**
- **2026-06-13** — Fixes + **systems-design pass** (deliberately design-before-visuals):
  - **Fixes:** start-menu **back button** (strict-mode `ReferenceError` from the purge — re-declared
    the dropped `_battle*` callback vars); HUD **meters move to the RIGHT in portrait** + **hide when
    the menu/sub-menus are open**; **landscape orientation now actually rotates 90°** (was a no-op
    reflow). All headless-verified.
  - **Design docs locked** (no code — pinned the systems before building combat):
    - `LIVING_WORLD.md §4.5` — **NPC mortality**: permanent death (player kills + Overflow Breaks +
      wild deaths), **no respawn** — the world repopulates with brand-new NPCs; **memory/gossip**
      spreads speed-bounded; story NPCs immortal.
    - `PROGRESSION.md §3.7` — **XP curve pinned**: `mob_XP = K·Lᵠ·speciesXpYield` (K=17, B=100,
      p=2.2, q=1.6 → ~6 kills for level 1); **per-species** XP yield (Lv5 spider ≠ Lv5 wolf).
    - `DESIGN.md §6.5` — the one-time **Original System** choice: irreversible **full permadeath**
      (player + bonded creatures); difficulty from the System *withdrawing help*, not stat inflation;
      rewards = exclusive class/skill **evolutions** + slower Surveillance + true endings.
    - `CLASSES.md` — **class framework**: hard targets (50 Base / ~50 per Tier / 50 Special), data
      schema, ~half-unique skill rule, **cumulative foundation-skill synergy**, **hidden-objective
      unlocks**; **Claimed Classes & the Reckoning** (stolen order/race/world classes → a roaming
      enforcer finds you → revoke / fight / legitimize); all Open Calls resolved.
  - **Next: Skills** (`SKILLS.md`) — the shared skill library + per-class unique sets the class
    framework assembles from — then build the **Tempo + Intervention combat**.
  - **Combat slice built** (portable, pure): `src/systems/rng.js` (seeded mulberry32) +
    `src/systems/combat.js` (Tempo + System Intervention, no DOM, deterministic) +
    `data/systems/{combat,skills,creatures,affinities,classes}.json`; `tools/test_combat.mjs`
    verifies a full battle + same-seed determinism. `ARCHITECTURE.md` written (Data→Rules→
    Presentation; combat = most volatile layer, skill cost = abstract `weight`).
  - **Classes — 4 growth axes locked** (`CLASSES.md §1.7`): **level** (no forced evolution, NO
    hard cap), **specialize** (in-class focus → mastery bonuses; the reason to stay), **evolve**
    (climb lineage), **change** (lateral, keep skills). Schema gained `maxLevel`+`specializations`
    (§1.5); `PROGRESSION.md §4` notes no per-class cap (only the ~450 character soft cap).
  - **Data authored:** `data/systems/classes.json` = **19 Basic classes** (toward 50), each with
    `specializations`; `data/systems/skills.json` = **80 skills** (all class refs resolve).
  - **Next: more Basic classes toward 50**, then Advanced-tier evolutions; build the combat VIEW
    (presentation) and `src/systems/progression.js` (XP/leveling).
