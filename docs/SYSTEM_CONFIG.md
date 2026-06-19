# System config — `data/systems/system.json`

The RPG-Maker **"System" tab** analogue: game-wide settings you can change as **DATA, no code**.
Today it holds the **new-game Starting Position** (RM's System > Player Starting Position). It's
structured to grow — add more sections later (title, terms, default party, sounds…).

## `newGame` — where a fresh game begins
```json
{
  "newGame": {
    "region": "awakened",        // map region
    "creationMap": "Void",       // OPTIONAL blank black stage loaded FIRST (character
                                 //   creation autorun runs here). "" = skip creation,
                                 //   spawn straight at startMap.
    "creationSwitch": "do_creation",  // switch flipped ON to trigger the creation autorun
    "startMap": "Dawnhearth",    // the REAL start map (after creation)
    "startX": 8,
    "startY": 18,                // spawn tile (snaps to nearest walkable)
    "startDir": "down",
    "openingQuest": "awakening"  // quest started on new game ("" = none)
  }
}
```

## How the pieces fit (RPG-Maker style)
1. **New game** (`_newGame` in `src/main.js`) reads `newGame` and loads `creationMap` (or
   `startMap` directly if `creationMap` is `""`), flips `creationSwitch`, starts `openingQuest`.
2. The **`character_creation`** autorun common event (`data/systems/common_events.json`) runs the
   whole Awakening as editable event blocks on the black stage.
3. It ENDS with a **`transfer` command with `useSystemStart: true`** — which reads `startMap` /
   `startX` / `startY` / `startDir` from **this file** and drops the player there. So the start
   location lives in ONE editable place; the event doesn't hardcode it.

## To change the start (no code)
- **Move the start:** edit `startMap` / `startX` / `startY` here.
- **Change the creation stage map:** edit `creationMap` (must be a real map; use the black
  `Void` or any map you make).
- **Skip creation entirely:** set `creationMap` to `""` — the player spawns straight at
  `startMap`.
- The map editor's **Transfer Player** command has a **"Use System start"** checkbox that emits
  `useSystemStart: true`, so you can point any transfer at the configured start.
