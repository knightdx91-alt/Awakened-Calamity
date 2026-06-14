# Awakened Calamity — Implementation Guide (for Claude Code)

This folder contains a **design system** for Awakened Calamity: finished tileset art,
reusable UI components (React reference implementations), full UI-kit mockups, design
tokens, and specimen cards. It is **not** a drop-in replacement for the game engine —
it is the source of truth for *how things should look*. Your job (Claude Code, working
in the real repo `knightdx91-alt/Awakened-Calamity`) is to **port these looks into the
actual game code** and **add the art**.

Work through the tasks below in order. Everything you need is in this bundle.

---

## 0. What's here

```
readme.md                      ← full design guide: colors, type, voice, motifs (READ FIRST)
styles.css + tokens/*.css      ← CSS custom properties (colors, type, spacing, effects)
assets/tilesets/*.png          ← FINISHED ART — drop straight into the repo
components/**/*.jsx + *.d.ts    ← reference React components (look + structure to copy)
ui_kits/game-system/*          ← the in-game UI (HUD + System menus) to port
ui_kits/map-editor/index.html  ← standalone tile editor (variable tile size, all sheets)
guidelines/*.card.html         ← visual specimens (open in a browser to see each piece)
```

> Auto-generated files (`_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json`)
> are **omitted** from this bundle — they are compiled from the sources above and aren't
> needed to port the look into the game. The `.jsx` sources are the truth.

The game itself is **vanilla JS + canvas** (`src/ui/*.js`, `src/engine/*`), not React.
So **do not copy the JSX verbatim** — read it for the exact colors, layout, spacing, and
states, then re-implement in the game's existing canvas/DOM idiom.

---

## TASK 1 — Add the tilesets (pure drop-in, do this first)

Copy every PNG from `assets/tilesets/` into the repo (suggested: `src/assets/tiles/`):

| Sheet | Native tile | Layout | Contents |
|---|---|---|---|
| `ac-terrain-16.png`   | 16 | 8×4 | base biomes (grass/path/water/tree/sand/rock/…) |
| `ac-terrain2-16.png`  | 16 | 8×4 | cobble, brick, farm, desert, swamp, river, ice |
| `ac-buildings-16.png` | 16 | 8×5 | assemblable house kit (roofs, walls, doors, tower) |
| `ac-props-16.png`     | 16 | 8×4 | **transparent** objects (chests, barrels, fences, …) |
| `ac-dungeon-16.png`   | 16 | 8×4 | dungeon/cave interior + rune floor + portal |
| `ac-corrupted-16.png` | 16 | 8×4 | System-overrun apocalypse (glitch, void, monolith) |
| `ac-wasteland-16.png` | 16 | 8×4 | generic post-apoc (rust, rubble, toxic, ruins) |
| `ac-enemies-16.png`   | 16 | 8×4 | **transparent** enemy sprites (affinities/constructs/mutants) |
| `ac-large-32.png`     | **32** | 4×2 | big features (oak, fountain, boss construct) |
| `ac-road-autotile-16.png` | 16 | 3×3 | road blob autotile patch |
| `ac-pond-autotile-16.png` | 16 | 3×3 | pond blob autotile patch |

A tile at index `i` is at `col = i % cols`, `row = floor(i / cols)`, pixel rect
`(col*tile, row*tile, tile, tile)`. **Props and enemies are transparent** → draw them
on an object/entity layer above terrain.

---

## TASK 2 — Variable tile size in the map system

Today the engine assumes 16×16. Generalize it so a map/sheet can declare its tile size.

- Give each **tileset** a `tile` field (16 or 32, extensible). When blitting, read the
  source rect from that sheet's native size; scale to the map's render cell size.
- Give each **map** a `tileSize` (render cell size). 16px art at a 32px cell scales 2×
  (keep `imageSmoothingEnabled = false` for crisp pixels).
- `ui_kits/map-editor/index.html` is a complete working reference for this exact model
  (per-sheet native size + selectable map cell size 16–64 + ground/object layers +
  JSON export). Mirror its `SHEETS` table and `drawCell()` logic. Its **export JSON**
  is a good on-disk map format:
  ```json
  { "tileSize":32, "width":28, "height":18,
    "sheets":[{"key":"terrain","path":"ac-terrain-16.png","tile":16,"cols":8}, …],
    "ground":[["terrain:0","terrain:1", …], …],
    "object":[[".", "enemies:3", …], …] }   // "sheet:idx", "." = empty
  ```

---

## TASK 3 — Make the in-game UI "The System OS"

**Goal:** replace the game's current tan/red GBA-style chrome (the tan panels, slate
borders, red `▶` cursor, blue description bar in `startmenu.js` / `hud.js`) with **The
System's own interface** — dark holographic glass + glowing cyan. It reads over any
terrain (fixes the wash-out problem) and is thematically honest (the menus you trust are
the thing watching you). The design system has **no** tan/red chrome — this is the only
UI look.

### 3a. Color tokens (from `tokens/colors.css`)
```
--os-glass:   rgba(6,10,20,0.92)   panel fill (dark holographic)
--os-glass-2: rgba(3,6,14,0.96)    deeper inset
--os-scrim:   rgba(2,4,10,0.62)    contrast plate behind HUD/menus
--os-line:    rgba(0,200,255,0.22) hairline / scanline cyan
--os-edge:    #00ccff              panel edge
--os-ink:     #bfeeff              body text on glass
--os-ink-dim: #5f86a0              secondary text
--os-glow:    0 0 12px rgba(0,200,255,.28), 0 6px 22px rgba(0,0,0,.6)
alerts: warn #f8d000 · danger #ff3030  (recolor the edge + brackets)
vitals: hp #ff3b54 (crit #ff7a3c) · mana #3aa0ff · stamina #ffc23a
```
Font: `Press Start 2P` for labels/headings (it's already used), Courier-family mono for
body/readouts.

### 3b. The panel (port `components/system/SysPanel.jsx`)
A `SysPanel` is: `--os-glass` fill, 1px `--os-edge` border, `--os-glow`, 8px corner
**brackets** (2px cyan L-shapes in each corner), faint cyan **scanlines** (repeating
1px line every 3px, ~0.5 opacity), and a bracketed title bar `[ THE SYSTEM ]` in
letter-spaced cyan with a glow. Alerts pass `accent = warn|danger`.

Menu rows (`components/system/SysMenuItem.jsx`): dim `--os-ink-dim` at rest; selected/
hover → `#eafaff` text, 3px cyan left-bar, `rgba(0,200,255,.10)` wash, text glow.
Optional left glyph + right hint.

### 3c. Rebuild `src/ui/startmenu.js` with this look
Keep your real items (`CAMP/BONDS/SUPPLIES/AFFINITIES/REACHES/SYSTEM/SAVE/OPTIONS/EXIT`)
but **rename `CAMP` → `STATUS`** and make STATUS the catch-all readout. Layout = left
nav `SysPanel` + right content `SysPanel` over a scrim. See `ui_kits/game-system/
SystemMenu.jsx` for every sub-screen (STATUS, SUPPLIES, AFFINITIES, REACHES with the
"fast-travel is watched" warning, SYSTEM with the Surveillance gauge + paid services,
SAVE, OPTIONS). REACHES uses the `warn` accent.

### 3d. Rebuild the on-screen HUD in `src/ui/hud.js` — **MINIMAL BY RULE**
Remove the on-screen **version, map name, coordinates, FPS** text. The play screen shows
**only**:
- **HP, Mana, Stamina** — always, as `VitalBar`s (port `components/hud/VitalBar.jsx`):
  a small `--os-scrim` plate + glow, colored fill, `HP/MP/SP` tag, numeric readout. HP
  flashes orange under 25%.
- **Exposure** — *only while a hazard is active* (`components/hud/ExposureTag.jsx`):
  pulses in the hazard color; hidden otherwise.

Everything else (designation, location, credits, build, **Surveillance**) moves into the
menu's **STATUS** screen. Note: HP/Mana don't exist in the `survival` save state yet —
**add `hp` and `mana` to the player model**; stamina/exposure/surveillance already exist.

### 3e. System notifications (`components/system/SystemNotify.jsx`)
Keep the existing System-voice toasts but standardize on this style: neon glass, the
`[ THE SYSTEM ]` label, info/warning/danger accents, danger pulses. Copy stays in
"menacing corporate cheer."

---

## TASK 4 — (optional) Wire the editor

`ui_kits/map-editor/index.html` runs standalone if the `assets/tilesets/` PNGs sit at
`../../assets/tilesets/` relative to it. To ship it as a page in the repo, drop it at a
path with that relative layout (or fix the `SHEETS[].path` values to match your repo).

---

## Notes / gotchas
- Keep `image-rendering: pixelated` everywhere; never anti-alias the pixel art.
- Honor `prefers-reduced-motion` for the pulses/scanlines (the reference components do).
- Full rationale for every visual decision is in `readme.md` → "The System OS — the UI"
  and "Visual Foundations".
