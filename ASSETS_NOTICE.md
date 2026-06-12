# Assets / IP Notice

This repository is a **development prototype**. The engine code and the map data format
are original / IP-free, but some carried-over **UI chrome art is Nintendo/Game Freak
derived** and is PLACEHOLDER ONLY. Replace before any public release.

## Clean (safe to ship)
- All `src/engine/*`, `src/ui/*`, `src/data/*` JavaScript (engine code)
- `map-editor.*`, `tools/*`, `docs/MAP_EDITING.md`
- `data/tilesets/placeholder.*` — procedurally generated, no third-party art
- `data/maps/awakened/*`, `data/layouts/awakened/*` — original placeholder map
- `worldmap.html` — original SVG, no ripped assets
- All design docs (`*.md`)

## Placeholder — MUST be replaced before public release
Located under `src/assets/`:
- `start_menu/` — start-menu icons (Emerald Enhanced ROM-hack art)
- `party/` — party-screen graphics (pokefirered-derived)
- `fonts/` — `pokefirered.*`, `gba_font.ttf` (replace with a licensed/own font)
- `battle/`, `battle_assets.js`, `battle_assets.json` — battle terrain (ripped art);
  also the battle SYSTEM itself is slated for the Tempo + Intervention rewrite (see DESIGN.md §1)
- `bag/`, `journal/`, `pokedex/`, `trainer_card/`, `ap/` — misc UI chrome

## NOT brought over (intentionally excluded)
The bulk Nintendo content was left in the source repo and is not present here:
the 538 ripped tileset PNGs, all real-region maps (kanto/hoenn/sinnoh/…), Pokémon
species/encounter/sprite data.
