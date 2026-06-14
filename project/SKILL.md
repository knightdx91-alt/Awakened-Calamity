---
name: awakened-calamity-design
description: Use this skill to generate well-branded interfaces and assets for Awakened Calamity, a GBA-style LitRPG survival sandbox — either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# Awakened Calamity — design skill

*"The System helps you, and that's the horror."*

Read `readme.md` first — it covers **The System OS** (the entire UI is the
surveillance intelligence: dark holographic glass + neon cyan), the bright
cartographic world it sits on, the two writing voices, the visual foundations,
and the iconography. Then explore:

- `styles.css` + `tokens/` — link `styles.css` for all color/type/spacing/shadow tokens.
- `components/` — React primitives (`SysPanel`, `SysMenuItem`, `SystemNotify`,
  `VitalBar`, `ExposureTag`, `MeterBar`, `SurveillanceMeter`, `DialogueBox`,
  `HazardChip`, `AffinityBadge`, `MapMarker`, `LaunchCard`). Read each `*.prompt.md`
  for usage.
- `ui_kits/` — full-screen recreations: `game-system/` (minimal HUD + System menus),
  `map-editor/` (all tilesets, variable tile size), `hub/` (launcher),
  `worldmap/` (the Four Reaches).
- `assets/tilesets/` — **16×16 terrain tileset** (`ac-terrain-16.png`, 32 tiles, all
  four biomes + corruption + structures) plus road/pond **autotile patches** for
  stamping map regions. Render with `image-rendering: pixelated`. See `readme.md` →
  Tilesets and the `guidelines/tilesets.card.html` specimen.
- `guidelines/` — foundation specimen cards.

## How to work

If creating visual artifacts (slides, mocks, throwaway prototypes), copy the assets
you need and produce static HTML the user can open. Load `styles.css`, then the
compiled `_ds_bundle.js`, and read components via `window.AwakenedCalamityDesignSystem_475ed3`.
If working in production code, copy the tokens/components and follow the rules here.

Two non-negotiables:
1. **The UI is the System.** Every panel — menus, HUD, dialogue, alerts — is dark
   holographic glass + cyan glow. The only warmth is the pixel world underneath. The
   System speaks in menacing corporate cheer; lore speaks in quiet elegy — never mix
   those two voices.
2. **Stay on the pixel grid.** `Press Start 2P` for headings/labels, Courier-family
   mono for body/terminal/System. `image-rendering: pixelated` for all sprite art.
   No smooth modern icons, no photographic gradients on UI panels.

If invoked with no other guidance, ask what the user wants to build, ask a few
sharp questions (which surface? in-game System UI, hub, map, or map editor?
production or throwaway?), then act as an expert designer who outputs HTML artifacts
or production code as needed.
