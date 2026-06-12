# UI Kit — World Map (The Four Reaches)

An interactive, simplified recreation of the bright cartographic world map. Four
biome landmasses (Verdara, Halveth, Calderra, Vael) float on a deep-ocean
gradient; roads connect places; **geometric markers** encode place type and a
colored halo encodes hazard. A cyber **legend** (bottom-left) and an **info
panel** (bottom-right, on click) use the hub's double-cyan-stroke panel style.

**Files**
- `index.html` — self-contained SVG map. Marker shapes match the `MapMarker`
  component (diamond=Safe, rotated square=Holdfast, circle=route, triangle=
  dungeon, star=Calamity, dashed circle=Hidden).

Place data is lifted from the game's gazetteer (`WORLD.md`): towns, dungeons, and
named Calamity constructs with their death-line hooks. Danger rises by depth, not
by gating — the recommended hour-bands are bands, not walls.
