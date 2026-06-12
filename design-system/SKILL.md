---
name: awakened-calamity-design
description: Use this skill to generate well-branded interfaces and assets for Awakened Calamity, a GBA-style LitRPG survival sandbox — either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# Awakened Calamity — design skill

*"The System helps you, and that's the horror."*

Read `readme.md` first — it covers the **dual identity** (warm FireRed game chrome
vs. cold System horror overlay), the two writing voices, the visual foundations,
and the iconography. Then explore:

- `styles.css` + `tokens/` — link `styles.css` for all color/type/spacing/shadow tokens.
- `components/` — React primitives (`FrWindow`, `FrButton`, `MenuRow`, `DialogueBox`,
  `MeterBar`, `SurveillanceMeter`, `SystemNotify`, `HazardChip`, `AffinityBadge`,
  `MapMarker`, `LaunchCard`). Read each `*.prompt.md` for usage.
- `ui_kits/` — full-screen recreations: `game/` (overworld + menu + battle + System),
  `hub/` (launcher), `worldmap/` (the Four Reaches).
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
1. **Never mix the voices.** Warm chrome = what the player owns. Cold System = what
   is done to the player. The System speaks in menacing corporate cheer; lore speaks
   in quiet elegy.
2. **Stay on the pixel grid.** `Press Start 2P` for chrome/headings, Courier-family
   mono for body/terminal/System. `image-rendering: pixelated` for all sprite art.
   No smooth modern icons, no photographic gradients on UI panels.

If invoked with no other guidance, ask what the user wants to build, ask a few
sharp questions (which surface? warm game UI, cold System, hub, or map? production
or throwaway?), then act as an expert designer who outputs HTML artifacts or
production code as needed.
