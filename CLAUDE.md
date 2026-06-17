# CLAUDE.md — Awakened Calamity

Guidance for Claude Code working in this repo. **Read this first.**

> **2026-06-15 — Art switch: Pixel Fantasy → "XP-for-MV".** Owner decision: drop Pixel Fantasy,
> use the **"XP graphics reformatted for MV"** pack (RPG Maker XP RTP, LadyBaskerville) everywhere
> incl. the editor. Raw pack lives at `assets-source/xp-for-mv/` (59 tileset sheets 768×768@48px +
> 193 MV `$`/`!` character sprites) — ⚠️ **EULA-gated, prototype-only** (`LICENSE_FLAG.txt`; RM-engine-
> only + must own RM XP). `tools/import_xp_for_mv.py` imports the sheets → `data/tilesets/xp_*`
> (plain 48px grids). **Update: BOTH packs now coexist** — owner asked to restore Pixel Fantasy
> alongside XP, each as its own selectable **Set** (Set dropdown) with A1–A5/B/C/D tabs like RPG
> Maker XP. `_index.json` = 82 sheets (23 `pf_*` + 59 `xp_*`); `_rm_sets.json` = 7 sets: Outside/Town/
> Inside/Dungeon **(XP)** + Outside/Inside/Dungeon **(Pixel Fantasy)** (PF keeps its A3 roofs +
> baked `*_ground` autotiles). Starter `AwakeningCamp` on `xp_a2_outside` (grass gid 0); game boots clean. **Autotile (wang) bake for the A2 ground is a TODO**
> (A2 tabs paint raw for now; baker `tools/build_pixel_fantasy_autotiles.py` is PF-hardcoded — adapt it).
> **Deploy hygiene:** `pages.yml` now **strips `assets-source/` from the Pages artifact** so the raw
> EULA pack isn't publicly hosted (note: tiles the game actually renders are still served — only clean
> art truly ships). The 193 XP character sprites are ready for Stage 3 (events + sprite picker).

> **2026-06-15 — Map editor → RPG Maker rebuild, STAGE 1 (done).** Owner direction: rebuild the
> map editor to mirror RPG Maker (XP + MV/MZ) and **purge all tiles/maps except Pixel Fantasy
> (`pf_*`)**. ⚠️ PF is commercial/EULA/non-shippable (`PIXEL_FANTASY.LICENSE.txt`) — flagged to owner,
> proceeding as prototype. **Stage 1 shipped:** (a) deleted every non-`pf_*` tileset + all old
> maps/layouts; `_index.json` is PF-only; fresh PF grass starter `AwakeningCamp` (game boots clean,
> headless-verified). (b) `data/tilesets/_rm_sets.json` groups `pf_*` into RM A1–A5/B/C/D/E **sets**
> (Outside/Inside/Dungeon). (c) editor palette reworked: **Set selector + MV A–E tabs (one sheet) ⇄
> XP single stacked sheet** (`tabModeBtn`); cells still store global ids via the existing layer-group
> model. (d) **chrome reskinned to the RPG Maker XP layout**: menu bar (File/Edit/Mode/Draw/Scale/
> View/Tools/Game/Help) + grouped icon toolbar (file · edit · undo/redo · layers 1/2/3+event · draw
> tools · scale 1/1·1/2·1/4 · tools · playtest); W/H/Resize moved to the side panel. Buttons without
> features yet (cut/copy/paste, undo/redo, layer 3, event, database/materials/script/sound) show a
> "coming in a later stage" toast. **Agreed full scope (contract A–H):** A tab models (both), B layers
> (1/2/3 + auto upper/lower) + shadow pen + region IDs, C tools (shift-map/copy-paste/undo-redo),
> D events + list editor, E map props, **G sprite/charset event graphics**, **H Charas-style character
> GENERATOR on the open LPC part set** (CC-BY-SA/GPL/OGA — chosen for IP-clean). Formats may be
> extended (backward-compatible). **STAGE 2 DONE (live):** real **Layer 3** (upper, exported as
> `upper_*`, engine renders it above the player), **Undo/Redo** (snapshot history, Ctrl+Z/Y),
> **Region IDs** (paint 1–63, `region_ids[]`), **Select tool + Copy/Cut/Paste/Delete** (Ctrl+C/X/V,
> active-layer clipboard → paste arms a stamp) **+ Shift Map**, and **Shadow pen** (quarter-tile masks
> `shadow[]`, engine renders over tiles/below player). Also added an **orientation chooser matching the
> game** (Portrait/Landscape/reverses via styles.css `.orient-*` transforms; `dvh` fix so the menu bar
> isn't clipped on mobile) and a **📷 screenshot button** (uploads to the `screenshots` branch → shareable
> link; that branch was created). **Remaining stages:** 3 = events + sprite/charset picker; 4 = LPC
> character generator. Headless harness: serve `python3 -m http.server 8099`, run `/tmp/edcheck.mjs`
> (editor) / `tools/bootcheck.mjs` (game) with puppeteer-core from `/tmp` + chromium at
> `/opt/pw-browsers/chromium-1194` (CHROME env, `--ignore-certificate-errors` for live URLs).

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
- **NO agents / subagents — EVER.** Always run and handle every task yourself directly.
  Do not spawn the Task tool or any subagent. (Enforced in `.claude/settings.json` →
  `permissions.deny: ["Task"]`.)
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
  - **Class growth refined** (`CLASSES.md §1.7`): low Tier = flatter curve **not a free ride**
    (every level still costs more, `L^2.2`). **Evolutions are PATH-GATED** — the build you played
    (skill composition first, then stat/affinity) decides *which* branch is offered (Warrior+heal→
    Paladin; pure-damage→Reaver). Schema gained `EvolveBranch{class,requires,default}`. **Specialization
    steers + narrows:** `opensEvolution` hard-points a branch, `narrowsTo` restricts the post-evolution
    skill pool to that focus (Smith→runes→Runesmith learns rune skills only).
  - **Self-teaching skills** (`SKILLS.md §1.5`): bootstrap any non-signature skill with the right tool at
    Rank 0 (`untrainedPenalty`), grows by use; trainers = shortcut/key, not the only door. Canonical
    knife→skinning case. Skill schema gained `tags[]`/`selfTeachable`/`untrainedPenalty`/`toolRequired`.
  - **Content:** **Leatherworker** base class (leather/hide armor) + the **full Smith lineage Basic→
    Legendary** (25 nodes, all 6 tiers, branch-then-converge into 3 Legendary capstones + 1 Untethered
    apex "The Unmade", Original-System only). Renamed to drop the repeated "-wright" → **naming
    convention locked** (`CLASSES.md §1.5`: vary roots). Now **45 classes / 110 skills**, all refs
    resolve, combat deterministic.
  - **DECISION — Class Generation / Discovery Layer** (`CLASS_GENERATION.md`, designed NOT built):
    authored classes are the backbone; beyond them, a **deterministic, lazy, memoized generator** mints a
    class when a player meets an **EXACT condition-set** no class claims, **persists it to a registry**,
    and serves the same class to anyone meeting the same exact conditions. Exact-match (not fuzzy) =
    memoization, easy to code; only reached permutations ever materialize; on-theme (the System
    catalogues new classifications). Hard part = **condition granularity** tuning; shared registry =
    **server feature** (3D), local in 2D. Story/Claimed/Anomalous/Untethered stay hand-authored.
  - **Build space** (`BUILD_SPACE.md` + `tools/build_space.mjs`): a single-class start yields **≈10²⁰¹**
    distinct characters — emergent from linear content × systems (dominant term = skill composition,
    10¹⁰⁸, a consequence of self-teaching). Justifies "endless"; strategy = **vertical slice first**.
  - **Feasibility verdict** (solo + Claude): yes — the 10²⁰¹ is the *cheap* (emergent) part; the real
    bottlenecks are content VOLUME, balance/feel (needs owner playtest), and presentation/asset
    licensing. Build **vertically** (one playable loop) before widening content.
  - **Combat slice BUILT & wired** (`src/ui/combatview.js`): the **SELECT button starts a Tempo +
    Intervention battle** (Smith vs a creature) for testing. Pure rules core (`src/systems/rng.js` +
    `combat.js`) now **loaded in `game.html`**; the view is presentation-only (renders state, forwards
    input — no logic), GBA-dark with a cold-cyan **SYSTEM Intervention** bar + Surveillance readout.
    Menu shows the Smith's combat actions (Jab/Heavy Strike/Guard/Mend) with tempo costs; up/down + A
    to act, B to flee. Headless-verified: battle starts, turns resolve, result shows, view tears down.
    Smith (crafter, atk 16) is intentionally a weak fighter — winnable vs Emberling with Guard/Mend,
    loses to Thornwolf; Intervention fires only when a player actor drops ≤35% HP (the bait).
  - **Combat depth pass (real-time bars + effect types):**
    - **Real-time Tempo bars** — view now drives the core's new `GameCombat.step()` once per ~45ms via
      `requestAnimationFrame`, so bars FILL in real time (ATB feel); pauses on the player's turn
      (`pause_on_act`), surfaces the System Intervention as its own beat. Headless-verified (bars seen
      partially filled, not instant).
    - **Effect-type framework in the pure core** (`src/systems/combat.js` rewritten): status model +
      `step()`/`advanceToReady()` split. Implemented **AoE** (cleave splash), **slow**, **mark**,
      **sunder** (armor shred), **applyToxin** (DoT), **taunt** (forces enemy targeting), **summon**
      (AI ally), **partyBuff**, **selfCost**, **counter** + **evade** + **crit** (reactive/passive
      folded into traits at createBattle), **bonusVsUnaware**. `tools/test_effects.mjs` = 11 checks all
      green + determinism. Test Smith loadout now shows several live (Pin Shot→SLOW, Coat Blade→toxin,
      Unmake→armor↓, Riposte counter).
  - **Progression BUILT & wired** (`data/systems/progression.json` + `src/systems/progression.js`,
    pure): XP curve (B=100,p=2.2,tierMult), mob XP (K=17,q=1.6), level-diff bands, points-per-level by
    Tier, soft cap. `tools/test_progression.mjs` (12 checks). Combat awards level-diff-modified XP on a
    win, auto-levels, grants attribute points, persists (save or module-static), shows `+XP / LEVEL UP`.
    Added `dummy` (Hollow Husk) training creature for reliable SELECT testing.
  - **Multi-enemy combat VIEW + target select BUILT** (`combatview.js` rewritten actor-driven): renders
    N enemy/ally/summon cards (dynamic, dims the dead), **target selection** for single-target skills
    (◄►, B to back; auto for AoE/self/heal), **AoE hits all foes**, XP **sums across all kills**.
    `start({enemies:[{key,level},…]})` spawns multi; **SELECT itself now ~40% spawns a 2-3 foe pack**
    so multi-enemy is testable in-game. Headless-verified: 2 cards, target switch, Cleave hits both,
    +118 XP→Lv2. Player loadout gained `cleave`.
  - **Next on combat:** ally/party for the player side (summons already render & fight); `intercept`/
    `guardAlly` redirect (stubbed). Broader: wire survival meters + a real SUPPLIES inventory, encounters
    (so battles start from the world, not just SELECT), attribute-point allocation UI. Then resume class
    content / prototype the discovery-layer registry.
- **2026-06-14** — Art pipeline + System OS UI + design-bundle adoption:
  - **Claude Skills installed** (`.claude/skills/`): game-dev/3D/shader set (Snyk roundup),
    `tripo-text-to-3d` (text→.glb), and **`pixellab`** (all-purpose pixel-art gen via PixelLab API:
    image/tileset/mapobject/character/object; now supports `--color-image` palette reference).
    Keys: `PIXELLAB_API_KEY`, `Tripo_Api` (env). PixelLab MCP also wired (`.mcp.json`).
  - **Procedural art tools** (`tools/`): `gen_zone.py` (autotiled terrain + object stamping →
    playable map JSON), `build_house.py`/`build_building_tileset.py` (modular buildings: rect/L-shape/
    hip roofs, keep + curtain-wall castle, 6 materials), `nine_slice.py` (UI 9-patch→CSS),
    `town_mockup.py` + `official_town_mockup.py`, `bootcheck.mjs` (headless boot verify via
    Playwright chromium + puppeteer-core).
  - **System OS UI shipped & headless-verified**: minimal HUD (HP/MP/SP vitals + conditional
    Exposure), start menu + sub-screens + title bars + dialogue + notifications reskinned to dark
    holographic glass + cyan (flipped `_FR` + `--fr-*` vars), SysPanel corner brackets, SAVE/OPTIONS
    fixed (DARK theme was returning light bg) + OPTIONS content cleaned (dropped Pokémon/theme cruft).
  - **Variable tile size**: renderer reads per-tileset native size + per-map `layout.tileSize`
    (camera viewport derives from it). `GenTown32` = 32px demo.
  - **DECISION — adopt the owner's official art** (the other Claude account pushed the design bundle
    to the `design-bundle` branch = Claude Design handoff). Imported **11 official `ac-*` tilesets**
    → `src/assets/tiles/`. The procedural PixelLab buildings looked bad (flat + clashing colors);
    the **official `ac-buildings-16` assemblable kit** (roof corners/eaves/walls/doors, one cohesive
    palette) is the building source of truth. `tools/official_town_mockup.py` proves it. PixelLab
    stays for **gap/bulk content**, palette-locked via `--color-image`. Owner wants colors leaning
    **RPG Maker XP** (warm/saturated) — `data/art/palettes/rmxp.png` started; direction not finalized.
  - Handoff doc for the design tool: `docs/CODE_SIDE_CAPABILITIES.md`. Research notes:
    `docs/TILE_CONSTRUCTION_NOTES.md`, `docs/BUILDING_TILESETS.md`, `docs/TILESHEET_CHECKLIST.md`.
- **2026-06-15** — **Systems-decisions pass: every "Open Calls" section in the design bible RESOLVED**
  (design-only session, no code). Walked the owner through each doc's open calls; locked each into the
  doc. **Eight docs closed + cross-cutting reworks:**
  - **`ENCOUNTERS.md`** — (1) down trigger = the **player** (targetable even with a creature out), not
    party-wipe; (2) material loss on death = **everything carried** (town stash is the safe store);
    (3) **creature death is PERMANENT** — no revive items, no Safe-Zone resurrection; (4) encounter
    model = **Tales-of-the-World: Radiant Mythology** (visible roaming monsters with detection cones
    that **chase**, contact = battle) + **ambush** spice; rates tune in playtest.
  - **`PROGRESSION.md`** — XP curve already pinned; (2) **creature XP = active-only, unshared** (earns
    only if it fought); (3) attr points/level tier-scaled; (4) **attributes reworked to a conventional
    8-stat LitRPG set: Strength/Agility/Constitution/Intelligence/Wisdom/Perception/Charisma/Luck**
    (Luck split out) — updated `data/systems/progression.json` (tests green); (5) **NO respec** — builds
    permanent (propagated to `CLASSES.md`×4 + `ECONOMY.md`).
  - **`CRAFTING.md`** — **capturing is class/Shop-gated** (Tamer line innate, else buy Bind from Shop;
    Tether is just the tool); recipes **expand like the class system** (tiered Basic→Legendary lineages,
    branching, discovery — "a lot"); gear **durability = items wear & BREAK**, DIY-or-pay-NPC repair,
    soft repair cap; gear slots **player 6 (incl. hazard slot) / creature 2**; node density scales
    inversely with depth.
  - **`ECONOMY.md`** — rep from **all sources** (bounties+discoveries+donations+story); catalog is
    **price-gated, NOT rep-gated** (full Legendary catalog visible from start, affordability is the
    wall; rep drives price+class access); class cost = super-linear Cr + escalating gates, **nothing in
    shops is free**; per-town rep + **fractional bleed along faction lines**.
  - **`TRAVERSAL.md`** — creature field-utility **passive** (always-on if in party, no exposure); keep
    **6 capabilities**; **gates SOFT by default** — reward ingenuity / multiple solution paths /
    cleverness is "special" (taming never required).
  - **`WEATHER.md`** — weather-only now (**seasons saved as a later option** on a compressed calendar —
    real-time-clock pacing flagged to revisit); forecast = **Skyguard guild service**; battle swing
    **small (~10–15%)** so weather's real weight is the survival/Exposure side.
  - **`LIVING_WORLD.md`** — traveler roster locked at **~50 named roamers** (make them distinct); pin
    list stays per-quest authoring (rule already set).
  - **`MAP_STREAMING.md`** — **prototype-scoped** (moot for 3D): ring depth **2** (full 3×3, seamless
    incl. corners), scene-based sea travel, instant indoor fade, cinematic boats.
  - **Cross-cutting:** **"era" framing purged game-wide** (Pokémon-prototype holdover) — kept the
    T1–T4 **tier bands**, renamed "level/depth tiers" (reworded across PROGRESSION/WORLD/ECONOMY/
    CRAFTING). **`DESIGN.md` reframed:** Tempo+Intervention is the **2D prototype's** combat; the **3D
    target = class-driven ACTION combat with the Intervention layer carried over** (the headline
    original mechanic, combat-model-agnostic). **Bind reframed as a class subsystem, NOT a headline
    pillar** — game positioned as a **System-horror LitRPG action-survival RPG**, not a creature
    collector. Added **creature-origin lore**: bonded creatures *are* the world's monsters — System
    onlining **mutated native fauna** (giant ant / fire salamander / dire wolf, overworld) + **pulled
    otherworld creatures** into dungeons (bipedal night-lizards); **bond-what-you-fight** flow (find →
    fight → attempt Bond before the kill → if it accepts, it's yours), tied to the Overflow loop.
  - **Emergent identity:** every decision points one way — **permanence & earned weight** (permadeath
    creatures, breakable gear, no respec, nothing free, choices you live with) under the System-horror
    hook. **Reviewer take (recorded in chat):** strong original hook in a hot (LitRPG) lane; works as a
    **3D single-player / small co-op** game; **does NOT scale to a themepark MMO** (personal
    System-horror dilutes); the one real risk is **content VOLUME**, not the design.
  - **Spawned (designed-not-built, deserve own docs):** **`CRAFT_DISCOVERY.md`** (recipe
    experimentation/discovery layer, mirrors `CLASS_GENERATION.md`) + a **3D per-class action-combat
    model** doc. **Next:** owner to direct (vertical slice, a new doc, or content).
  - **Pixel Fantasy RMMZ tile import** (owner-provided commercial pack on the `pixel-fantasy-assets`
    branch under `pixel-fantasy-rmmz/`). ⚠️ **Commercial / NOT CC0 / EULA-gated** (external RPG-Maker
    EULA likely restricts to RM engines) → flagged `data/tilesets/PIXEL_FANTASY.LICENSE.txt`,
    **placeholder/non-shippable** until cleared (consistent with `ASSETS_NOTICE.md`).
    - **Pass 1 (done, headless-verified):** imported all **20 sheets @native 48px** → `data/tilesets/
      pf_*` (Outside/Inside/Dungeon × A1–A5/B/C/D), plain-grid JSON (`tile:48`, per-row from width)
      via `tools/import_pixel_fantasy.py`. **Taught the editor per-tileset tile size** (`map-editor.js`:
      decoupled SOURCE size = `meta.tile`/`.metatiles_per_row` from a fixed 16px DISPLAY cell) so 48px
      sheets render in the picker/map; engine renderer already honored `meta.tile`. All object/prop/
      building (A5/B/C/D) sheets fully paintable; A1–A4 imported & manually paintable.
    - **Pass 2a (done, verified):** baked **outside A2 ground autotiles** → `pf_outside_ground`
      (grass base + cobble/stone/path, 28 tiles) in the project's **9-slice `wang8_lut`** scheme (same
      as `ac_ground`). `tools/build_pixel_fantasy_autotiles.py` classifies each RMMZ 24px quarter by
      terrain-coverage (self-calibrating per terrain vs its outside colour), collects the 9 nine-slice
      prototypes, assembles nine-patches. Verified: seamless stone-over-grass blob + editor terrain
      brush shows cobble/stone/path, no JS errors.
    - **Remaining for "all 21 w/ autotiles":** other A2 sheets (inside/dungeon floors) reuse the same
      baker; **A1** (animated water/waterfall), **A3** (2×2 roof tops), **A4** (2×3 wall top+side) each
      need their own block-structure handling. Pipeline proven; extension is mechanical per type.
- **2026-06-17** — **Ludus mini-game, RPG Maker VX Ace RTP import + wiring, editor & combat overhaul.**
  - **Ludus** (the *Codex Alera* war-game) built standalone (`ludus.html` + `ludus/*.js`): pure
    rules engine (11×11 ground + 5×5 sky board over the centre — fixed the fan draft's impossible
    11→5 mapping), AI bot (easy/medium/hard alpha-beta), canvas renderer, **Firebase Realtime DB
    online 2-player** (owner pasted live `ludus-alera` config), screen-flow (opponent select =
    book characters/Canim/Vord, side choice, settings), styled **Rules** modal. Hub card added.
    High Lord furycraft restored. `LUDUS.md` documents canon-vs-designed.
  - **RPG Maker VX Ace RTP** (194 MB installer) couldn't be fetched (Cloudflare IP-block on
    pcgamingwiki, even headless) → pulled the **same RTP from the Internet Archive**
    (`rpgvxace-rtp_202606`), `innoextract`-ed it → **780 files** on branch **`vx-ace-rtp`**
    (`assets-source/vx-ace-rtp/`). ⚠️ EULA-gated prototype assets. **Catalog:** `docs/RTP_CATALOG.md`
    (every category, the RM menu that uses it, engine mapping; notes NO scripts / NO generator parts).
  - **Owner decision — purge license/EULA files:** deleted every `*.LICENSE.txt`/`LICENSE_FLAG`/
    EULA/font-license across ALL branches (kept only `.claude/skills/cad-agent/LICENSE`). Owner
    accepts the legal status is unchanged; prototype "everything together / leave it clean".
  - **RTP import + wiring to main** (importers `tools/import_vx_ace_*.py`, `build_vx_ace_autotiles.py`):
    - **Tilesets** (22 sheets → `data/tilesets/rtp_*`, raw 32px grids). **Real A2 ground autotiles
      baked** via a correct port of RM's A2 template (per-corner quarter map behind MV/MZ
      `FLOOR_AUTOTILE_TABLE`) → `rtp_{outside,inside,dungeon}_ground` (grass/dirt/road/cobble blend
      seamlessly; inside/dungeon floors + dungeon hole too). `_rm_sets.json` = RTP Outside/Inside/
      Dungeon/World sets. **Old packs (pf_*/xp_*/ac_*) removed from main → `graphics-backup` branch.**
    - **Character sprites** (48 → `data/sprites/rtp/`) merged into the editor sprite picker.
    - **IconSet** (624 @24px → `data/icons/`) + `src/ui/icons.js` (`GameIcons`); **wired into the
      SUPPLIES menu** (real item icons).
    - **Faces** (12 → `data/faces/`) + **dialogue portraits** (`GameDialogue.show(…,{face})`,
      event 'text' `c.face`, editor text-command face picker).
    - **Battlers** (74 → `data/battlers/`) **wired into combat**.
    - **Batch-imported** Battlebacks(108)/Animations(93)/Parallaxes(15)/Titles(29)/System(5) →
      `data/{battlebacks,animations,parallaxes,titles,system}/` (~88 MB). **Audio PARKED**
      (SE/ME/BGS imported ~7 MB; **BGM 78 MB indexed but NOT copied** — `--bgm` to pull; no
      `GameAudio` yet). **A1 water + A3/A4 wall/roof autotile bakes still TODO.**
  - **Map editor fixes:** **publishes map saves to `main`** (was the `maps` branch — now the game
    can load authored maps; deploy-on-save). Player-start honored (`?x=&y=` + saved start; editor
    Play passes them). Repo save "doesn't match" fixed (no-store GET + sha-conflict retry). Visible
    **Multi-tile palette toggle** (single tile by default). **Event layer + all mode buttons toggle
    off** (toolbar + side-panel + **menu** items). **Map Properties Save button**. **Large palettes
    scroll** (`touch-action:pan-x pan-y`).
  - **Combat view overhaul** (`src/ui/combatview.js`): **RTP battleback** backdrop; **real sprites
    not blocks** (player charset + enemy battlers/charsets, de-boxed); **side-view FF layout**
    (enemies left / hero right, facing inward); **bonded creatures wired into the battle party**
    (`buildAllies` from `GameSave.state.bonds` `{key,nickname?,level?}` — AI allies w/ sprite+Lv);
    summons get art; charset-enemy option (creature `charset`); **SYSTEM surveillance meter moved to
    a top bar**; **skill menu scrolls** (overflow + scrollIntoView).
  - **DESIGN.md** scrubbed of all Pokémon references (original-IP framing).
  - **IN PROGRESS (not committed):** a **50×50 RTP town** generator (`tools/build_rtp_town.py`) —
    researched 10+ RM town-mapping sources; v1 builds a town (central cobble plaza + well, dirt
    paths, ~14 colour-roof houses w/ door events, tree borders) on autotiled ground + a packed
    `town_props` overlay sheet (engine = 1 tileset/layer). Identified correct B-sheet tile indices
    (window 112, door 98, well 147, lamp 176, tree 189, crate 220, fence 165, stall 246, flowers/
    crops). **NEXT: rewrite with corrected tiles + polish** (2-tile walls, lamps along paths,
    gardens, leafy trees), re-render until good, then commit + register `VerdantTown`.
  - **📋 Agenda:** Bind flow (capture → `bonds[]`); A4 wall + A3 roof + A1 water autotile ports;
    audio (BGM + `GameAudio`); finish the 50×50 town.
- **2026-06-17 (2)** — **Audio system + character-creation slice.**
  - **`GameAudio` BUILT** (`src/ui/audio.js`, wired in `game.html` + `GameAudio.init()` in
    `src/main.js`): SE (one-shot, overlapping) / ME (fanfare, ducks BGM) / BGS (looped ambience) /
    BGM (looped; **no-op when not pulled** — index `bgm.present:false`). Mixer (per-channel volume +
    mute) persisted to `localStorage ac_audio`. Plays the imported RTP `data/audio/*`; the event
    runner's existing `case 'se'` now actually sounds. **Still TODO:** pull BGM (`--bgm`), wire BGS
    ambience per-biome + BGM per-area, hook UI nav SE into start menu, Animations/Parallaxes/Titles.
  - **The Awakening — player creation BUILT** (`src/ui/creation.js`): cold-System DOM overlay shown
    on a fresh game (no `player.name`, and not when `?map=` overrides for editor Play). Pick name +
    appearance (8 RTP Actor1 chars, live canvas preview) + Affinity (11, tinted chips + blurbs).
    Confirm → writes `player.{name,appearance,affinity}` to save, **crops the chosen charset
    character into a single-char 96×128 sheet** (data URL → `ac_player_sprite`), calls new
    `GameRenderer.reloadPlayer()` so the choice shows in the overworld, plays `Fanfare1` ME.
    `gameLoop` pauses the world while `GamePlayerCreation.isActive()`. Node-stub + HTTP-200 verified;
    **not browser-verified** (no headless Chromium this session).
  - **Event commands — 10 new RPG-Maker-style commands** added to BOTH the engine event runner
    (`src/main.js runCmd`/`runCmdList`) and the **map editor events tab** (`map-editor.js` CMD_TYPES +
    `newCmd` + form editors): **Move Route** (player/this/Ev#, step tokens up/down/left/right/wait,
    wall-aware), **Set Direction**, **Change Money** (+/−/=), **Give/Take Item** (any inventory
    pocket), **Battle Processing** (enemies `key:level`; awaits combat via new `GameCombatView`
    `onEnd` callback), **Fade Screen** (out/in + color), **Shake Screen**, **Label** + **Jump to
    Label** (flow control in `runCmdList`), **Comment** (no-op note). All engine-honored (no stubs).
    Syntax-checked; core test suites still pass; **not browser-verified**.
  - **2 more event commands:** **Change Graphic** (`setgfx` — swap a target's charset; player target
    rewrites `ac_player_sprite` + `reloadPlayer()`) and **Spawn NPC/Monster** (`spawn` — drops a new
    event at x,y; NPC = action+optional dialogue, Monster = touch→`battle`→auto-`despawn`). Editor
    forms reuse the charset sprite picker via new `openSpriteModalForCmd`. Internal `despawn` removes
    the running event.
  - **Title / New Game / Continue + save fallback + Dawnhearth start:**
    - **`src/ui/title.js`** (`GameTitle`) — boot title shown unless `?map=` override; **CONTINUE**
      (only when a save exists, shows name/map/playtime) + **NEW GAME** (confirms overwrite if a save
      exists). `gameLoop` pauses the world while title/creation active.
    - **`main.js`**: title drives `_continueGame()` (load first non-empty slot → `_enterMap` saved
      location) or `_newGame()` (fresh state → the Awakening → **Dawnhearth**, spiral-search a walkable
      tile near a door, save slot 0). New `_enterMap`/`_findWalkable` helpers.
    - **Save storage = localStorage PRIMARY + IndexedDB BACKUP, each a fallback** (`save.js`): writes
      mirror to both; `initStorage()` (awaited at boot) restores localStorage from IndexedDB if LS was
      cleared (or seeds IDB from LS). Added `hasAnySave()`. Node-harness verified the full
      save→wipe-LS→restore round-trip; storage logic + all files syntax-checked. **Not browser-verified.**
  - **Class screen + class wired into play (start of class build-out):**
    - **Creation now has a CLASS step** (`src/ui/creation.js`): loads `data/systems/classes.json`,
      shows the **20 Basic classes** as a scrollable grid (lifestyle-tinted), with a detail panel
      (signature, HP/ATK/DEF/SPD stat bars, starting skills). AWAKEN now requires name + appearance +
      affinity + **class**. Persists `player.class = {id,level:1,xp:0}` + `player.skills` (the class's
      `grantsSkills`).
    - **Combat reads the chosen class** (`src/ui/combatview.js buildPlayer`): player actor's name,
      affinity, stat profile, and skill loadout now come from `player.class` + `player.skills`
      (was a hardcoded Smith). Node-stub verified (classes fetched, chips build, no errors).
    - **Next on classes:** sync `player.class.level` with `progression.js`; attribute-point allocation;
      specializations/evolutions UI; non-combat lifestyle skill use; the STATUS menu to show class.
  - **BASE TIER COMPLETE — 50 Basic classes** (was 20 → +30) + **54 new foundation skills** (→166
    total). New classes span every lifestyle: combat (brawler/lancer/fencer/archer/sentinel/spellblade/
    monk), tamer (beastmaster/falconer/rider), craft (woodwright/tailor/jeweler/mason/fletcher),
    support (apothecary/cleric/shaman), survival (ranger/survivalist/hermit), social (performer/
    emissary), espionage (saboteur/infiltrator), scholar (arcanist/cartographer/seer), gathering
    (logger/farmer). Each: statProfile + 5 grantsSkills + signature (specializations/evolvesInto left
    `[]` for the per-tier build order). New skills use the existing schema (combat power/effect ones
    are engine-honored; craft/gather/social/etc. are data hooks). **Added `tools/validate_classes.mjs`**
    (every grantsSkill resolves; reports per-tier counts) — 0 errors; combat/effects/progression tests
    still pass. **Next tier: author the ~50 Advanced classes as the basics' path-gated evolutions.**
  - **Build-out: leveling made real + STATUS screen.**
    - **Unified progression with the class** (`combatview.js` + `creation.js`): `state.progress` is now
      the single source of truth, seeded from the chosen class's tier/level at creation; combat's
      `_saveProg` mirrors `level`/`xp` back onto `player.class`. So combat XP/level-ups actually advance
      the character's class.
    - **STATUS menu rebuilt** (`startmenu.js _buildCamp`): shows real **Class name + Level**, Affinity,
      an **XP-to-next bar** (via `GameProgression.xpToNext` + lazy-loaded `progression.json`), **Attribute
      Points** when any are banked, and a **SKILLS** chip list (player's learned/class-granted skills) —
      plus the existing survival meters. Lazy-loads `classes.json`/`progression.json` and re-renders.
      (Fixes the old stale `state.klass` read.) Syntax-checked; core tests still pass. **Not browser-verified.**
    - **Still pending build-out:** attribute-point *allocation* UI (count shown, no spend yet);
      specializations/evolutions UI; non-combat lifestyle skill use.

## ⏳ PENDING (next session) — RESUME Pixel Fantasy autotile bakes
**Owner asked to resume this next session so it isn't forgotten.** Pass 1 (all 20 sheets imported
@48px, editor supports per-tileset tile size) + Pass 2a (outside A2 ground → `pf_outside_ground`,
grass+cobble/stone/path) are DONE & verified. **Still to bake (see 2026-06-15 log for the proven
pipeline):**
- **Other A2 sheets** — Inside + Dungeon floors. Reuse `tools/build_pixel_fantasy_autotiles.py`
  as-is (just point it at `pf_inside_a2` / `pf_dungeon_a2` and pick their terrains). Quick.
- **A1** — animated water / waterfalls (different block structure: animated frames + waterfall edges).
- **A3** — 2×2 roof-top autotiles (building tops).
- **A4** — 2×3 wall autotiles (wall-top 2×2 + wall-side 2×2).
- Also consider adding the **A2 base fills** (sand/dirt/water) as fill options + their row autotiles.
- Tool already proven: classify 24px quarters by terrain coverage → 9-slice `wang8_lut`. Verify each
  with a blob-render + headless editor load (see `/tmp` test pattern in the 2026-06-15 work).
- ⚠️ Keep the **EULA/non-shippable flag** (`data/tilesets/PIXEL_FANTASY.LICENSE.txt`) in mind.

## ⏳ PENDING (next session) — World Area Bible (spec LOCKED, approved, NOT started)
Goal: a **complete, exhaustively-named** area catalog — every enterable building named + its owner
NPC ("Bob's House"), every dungeon with **floor count + each floor named** (theme/hazard/gimmick +
which floor the Alpha is on), everything named & cross-referenced. Builds ON `GAZETTEER.md` (keep all
existing names; only fill gaps). Names are **generated** in the existing tone (Dawnhearth/Hollow Vein).
- **Format = BOTH**: source of truth `data/world/<region>.json`; auto-generated readable view
  `docs/gazetteer/<region>.md` via `tools/build_gazetteer.py`; cross-ref validator `tools/validate_world.py`.
- **NPC depth = ALL**: id, name, role, faction, personality (1 line), hook (1 line), `home`+`workplace` building links.
- **Dungeon floors = ALL**: n, id, name, theme, hazard, gimmick; mark Alpha's floor.
- **IDs**: `vd_town_dawnhearth`, `vd_dawnhearth_smithy`, `npc_vd_bob_emberhand`,
  `vd_dungeon_hollow_vein_f3`, `alpha_veinmother`, `fac_vanguard_order`.
- **Sequencing**: REGION BY REGION — start **Verdara**, show the owner the format to approve before
  doing Halveth → Calderra → Vael → Open Sea.
- This is the STARTING population (per `LIVING_WORLD.md` NPCs can die/repopulate).
