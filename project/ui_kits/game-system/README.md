# UI Kit — Game UI (The System OS)

The in-game UI. The whole interface **is The System** — dark holographic glass with a
glowing cyan edge — so it pops over any terrain and stays thematically honest.

**What it demonstrates**
- **Minimal on-screen HUD** — only `VitalBar` ×3 (HP / Mana / Stamina) and a
  conditional `ExposureTag` (shows only while a hazard is active). Each is
  self-backed + glowing so it holds contrast over any terrain.
- **The System menu** — `STATUS · BONDS · SUPPLIES · AFFINITIES · REACHES · SYSTEM ·
  SAVE · OPTIONS · EXIT`, built from `SysPanel` + `SysMenuItem`. **STATUS** holds
  everything that used to clutter the screen (designation, location, credits, build,
  Surveillance). **SYSTEM** holds the Surveillance gauge + paid services.
- **Contrast proof** — toggle the world between the bright village and the dark
  dungeon scene; the dark-glass HUD/menu reads clearly on both.

**Files**
- `index.html` — device frame, world background (toggleable), HUD overlay, demo controls.
- `SystemMenu.jsx` — the full pause menu + sub-screens, composing the design-system
  System/HUD primitives.

**Notes**
- HP / Mana are demo-driven here; wire them to the player's real vitals. Stamina,
  Exposure and Surveillance already exist in the game's `survival` save state.
- Menu items mirror the real `startmenu.js` (`CAMP` → renamed **STATUS**). Port the
  look by swapping the game's current tan/red GBA panels for these `SysPanel`s.
