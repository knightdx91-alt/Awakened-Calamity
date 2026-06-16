# RPG Maker VX Ace RTP — Asset Catalog & Usage

Full inventory of the RTP pack we pulled (extracted from the official installer with
`innoextract`). Lives raw on branch **`vx-ace-rtp`** under `assets-source/vx-ace-rtp/`.
**780 files · ~195 MB.** Only **Graphics / Audio / Fonts** (+ a `Game.ico`) — see
"What's NOT here" at the end.

For each category: what it is, the **RPG Maker VX Ace menu/feature that uses it**, the
file/format convention, and **how it maps to our engine**.

---

## GRAPHICS (632 files)

### Tilesets — 22 PNG (+ 22 `.txt` name tables)
`assets-source/vx-ace-rtp/Graphics/Tilesets/`
- **Sets:** `World_*`, `Outside_*`, `Inside_*`, `Dungeon_*`, each split into RPG Maker's
  tile **tabs**: `A1` (animated water/falls), `A2` (ground autotiles), `A3` (building
  roofs/walls, 2×… blocks), `A4` (wall tops+sides), `A5` (plain ground fills), and
  `B`/`C`(/`D`/`E`) (object/decoration pages of single 32px tiles).
- **Size/format:** 32px tiles. A-sheets are 512×384/480 (autotile block layout); B–E are
  512×512 grids of loose 32px tiles. Each `.txt` is the **tile-name label table**
  (`English|日本語`, e.g. `Cobblestones|石畳`) the editor shows when you hover tiles.
- **VX Ace menu:** *Database ▸ Tilesets* (assign sheets A1–A5/B–E to a Tileset, set
  passage/bush/counter/terrain-tag flags) → painted in the **Map editor** tileset palette.
- **Our engine:** these are the headline grab. They are the **same A1–A5/B–E model** our
  editor already speaks (Pixel Fantasy / XP-for-MV use it). They need the **importer**
  (`tools/import_*` pattern → `data/tilesets/rtp_*` + `_index.json`/`_rm_sets.json`), and
  the A1/A2/A3/A4 autotile **bakes** (the wang/9-slice step that's already TODO for PF).

### Characters — 48 PNG (charset sprites)
`Graphics/Characters/`
- Walk/animation sprites. Naming convention (matters!):
  - Plain (`Actor1.png`, `People1.png`, `Monster1.png`…) = **8 characters per sheet**
    (4×2), each char a 3×4 grid of 32×32 frames (3 walk frames × 4 facings). `Actor1.png`
    is 384×256.
  - **`$`** prefix (`$BigMonster1.png` 192×256, `$Coffin`) = **one** larger character filling
    the whole sheet (3×4 frames).
  - **`!`** prefix (`!Door1`, `!Chest`, `!Switch1`, `!Flame`, `!Crystal`, `!Gate*`) = object
    sprites drawn **without the ground shadow** and aligned to tile (doors, chests, etc.).
  - **`!$`** = both (single + no-shadow, e.g. `!$Gate1`).
- **VX Ace menu:** *Event ▸ (page) Graphic* picker, plus *Database ▸ Actors ▸ Character*
  and Vehicles. The player/party and every map event use these.
- **Our engine:** maps to our **player/event sprites** (`data/sprites/`). The 193 XP MV
  sprites were already earmarked for "Stage 3 (events + sprite picker)" — these are the
  same role. Frame layout differs from our current player sheet, so the sprite renderer /
  picker needs to read the 3×4 (×8) convention (incl. `$`/`!` prefixes).

### Faces — 12 PNG (portrait sets)
`Graphics/Faces/` — `Actor1..5`, `People1..4`, `Monster1`, `Evil`, `Spiritual`.
- 8 faces per sheet (4×2), each face 96×96.
- **VX Ace menu:** *Show Text ▸ Face* and *Database ▸ Actors ▸ Face*; shown in the menu/HUD.
- **Our engine:** dialogue portraits (`src/ui/dialogue.js`) + party/BONDS screens. Not yet
  wired — would need a face picker + 96×96 crop logic.

### Battlers — 74 PNG (enemy graphics)
`Graphics/Battlers/` — `Bat`, `Bandit`, `Behemoth`, `Chimera`, `Cleric_m/f`, `Darklord`…
- Front-view enemy stills (the RTP is front-view default; no `sv_` actor sheets in base RTP).
- **VX Ace menu:** *Database ▸ Enemies ▸ Battler graphic* → drawn in the battle scene.
- **Our engine:** candidate **creature/enemy art** for the Tempo+Intervention battle view
  (`src/ui/combatview.js`), which currently draws abstract cards. Could skin enemy cards.

### Animations — 93 PNG (battle-animation cell sheets)
`Graphics/Animations/` — `Attack1..`, magic/element sheets. 5×… grids of 192×192 cells
(`Attack1.png` 576×192).
- **VX Ace menu:** *Database ▸ Animations* (frame/timing/SE editor) → played on
  skill/item use in battle.
- **Our engine:** optional polish — skill VFX in combat. No animation system yet; would be
  a new feature.

### Battlebacks1 (54) + Battlebacks2 (54) — battle backgrounds
`Graphics/Battlebacks1/` (floor) + `Battlebacks2/` (wall). e.g. `Castle`, `Cobblestones1`,
`Clouds`.
- **VX Ace menu:** *Database ▸ Tilesets ▸ (battleback fields)* / battle test; the two layers
  composite into the battle scene backdrop.
- **Our engine:** backgrounds for the battle view. Single-image use is trivial; the
  two-layer floor+wall compositing is RPG-Maker-specific.

### Parallaxes — 15 PNG (scrolling backgrounds)
`Graphics/Parallaxes/` — `BlueSky`, `CloudySky*`, `DarkSpace*`…
- **VX Ace menu:** *Map ▸ Properties ▸ Parallax Background* (loop/scroll options).
- **Our engine:** would need a parallax layer in the renderer (none today).

### System — 6 PNG (UI chrome)
`Graphics/System/`
| File | Size | What / VX Ace use |
|------|------|-------------------|
| `Window.png` | 128×128 | **Windowskin** — the 9-slice message/menu frame + cursor + arrows + tone. *Database ▸ System ▸ Window*. |
| `IconSet.png` | 384×936 | **All item/skill/weapon/state icons**, 24×24 each in a 16-wide grid (624 icons). *Everywhere an icon index is set.* |
| `Balloon.png` | 256×320 | **Balloon icons** (!,?,♪,…) for *Show Balloon Icon* over events. |
| `BattleStart.png` | 544×416 | Battle-transition flash image. |
| `GameOver.png` | 544×416 | The **Game Over** screen. *Database ▸ System*. |
| `Shadow.png` | 32×32 | The soft drop-shadow bldg/character shadow blob. |
- **Our engine:** `IconSet.png` is the most reusable (SUPPLIES/skill icons). `Window.png`
  is RPG-Maker-specific (our UI uses the System-glass CSS skin, not a windowskin).

### Titles1 (20) + Titles2 (9) — title screen
`Graphics/Titles1/` (background art: `Castle`, `Crystal`, `DemonCastle`…) +
`Graphics/Titles2/` (overlay frames: `Dragons`, `Fire`, `Heroes`…).
- **VX Ace menu:** *Database ▸ System ▸ Title Screen (Graphic 1 / Graphic 2)* — composited.
- **Our engine:** possible art for the hub/title; we use our own `index.html` card stack.

---

## AUDIO (340 files) — `assets-source/vx-ace-rtp/Audio/`
| Folder | Count | VX Ace use |
|--------|------:|------------|
| `BGM/` | 42 | Background music loops — *map/battle/event BGM* (Ogg Vorbis, loop tags in-engine). |
| `BGS/` | 10 | Background ambience (rain, sea…) — *map BGS / Play BGS*. |
| `ME/` | 13 | Music Effects (victory, level-up, game-over jingles) — *Play ME*. |
| `SE/` | 275 | Sound Effects (cursor, attack, magic, doors…) — *Play SE*, system sounds, animation SE. |
- **Our engine:** no audio system yet. These are a ready SFX/music bank for when we add one.

## FONTS (2, + their own license files) — `assets-source/vx-ace-rtp/Fonts/`
`VL-Gothic-Regular.ttf`, `VL-PGothic-Regular.ttf` — the RTP's bundled default fonts
(open-licensed; the per-font license files were removed per the prototype decision).
- **VX Ace use:** default game font when a project ships without its own.
- **Our engine:** web font option via `@font-face`; our UI currently uses system fonts.

## MISC
- `Game.ico` — the default Windows game-window icon. (Could be a favicon.)
- The `.txt` files in `Tilesets/` are **tile-name tables**, not data/scripts.

---

## What's NOT in this pack (important)
- **No scripts / RGSS3 code.** The RTP is *runtime materials only*. The default battle
  system, menus, and any script logic live in the **editor's** project template + the RGSS3
  runtime, **not** in the RTP. So there's nothing here to port as "game logic."
- **No Character Generator parts.** VX Ace's built-in **Generator** (face/body/hair/clothes
  layers it composites into Faces + Characters) ships **with the RPG Maker VX Ace editor**
  (its `Generator/` folder), **not** in the RTP. This pack only contains the *pre-made*
  finished Faces/Characters above — not the mix-and-match generator layers. (Our planned
  LPC character generator, `CLASS_GENERATION`/Stage 4, stays the IP-clean route for that.)
- **No `sv_actors` side-view battler sheets.** Base VX Ace is front-view; side-view actor
  sheets are a separate (DS/other) resource pack, not in the base RTP.

## Usefulness ranking for our prototype
1. **Tilesets** (World/Outside/Inside/Dungeon, A1–A5/B–E) — direct fit to our editor's tab
   model; needs the importer + autotile bake. **Highest value.**
2. **Characters** (charsets) — player/event sprites; needs the 3×4×8 + `$`/`!` picker.
3. **IconSet.png** — instant icon bank for SUPPLIES/skills.
4. **Faces / Battlers** — dialogue portraits / enemy art when those screens are built.
5. **Audio (SE/BGM/ME/BGS)** — ready bank for a future audio system.
6. Animations / Battlebacks / Parallaxes / Titles / Fonts — polish, need new subsystems.
