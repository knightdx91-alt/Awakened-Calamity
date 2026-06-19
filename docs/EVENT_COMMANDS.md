# Event Commands — the engine's scripting VM

The event system is a small, **serializable command VM**: an event's `commands` is a
JSON array the interpreter (`runCmdList`/`runCmd` in `src/main.js`) walks. This is the
portable equivalent of RPG Maker's `Game_Interpreter` — and the **intended** scripting
layer, because it's engine-agnostic DATA + pure RULES that ports to the 3D Unity rebuild
(see `ARCHITECTURE.md`). Authored in the map editor's event panel.

## Why NOT RPG Maker VX Ace's RGSS3 (Ruby)
RGSS3's value isn't Ruby-the-language — it's the **RGSS3 class library**
(`$game_switches`, `Window_Base`, `Sprite`, `Game_Interpreter`, …) welded to VX Ace's
proprietary, closed runtime + data model. To "use RGSS3" you'd reimplement RPG Maker
itself in the browser. (RPG Maker **MV/MZ** abandoned Ruby for **JavaScript** for exactly
this reason.) It's also EULA/IP-encumbered and the opposite of our portability goal.
**Decision: don't port RGSS3.** Instead we grow our own command VM (below) + the `script`
escape hatch.

## Scripting escape hatch — the `script` command
Runs JS with a sandboxed `$` api: `$.getSwitch/setSwitch`, `$.getVar/setVar`,
`$.getSelf/setSelf`, `$.say(text)`, `$.transfer(cmd)`, `$.player`, `$.map`, `$.event`.
Use it for one-offs the data commands don't cover; prefer data commands for portability.

## Command reference
**Message** — `text` (+ optional RTP `face`), `choice`, `scroll_text` (credits-style), `voice`.
Text tokens: `[name]`, `[designation]`, `[v:id]` = a variable's value (RPG Maker `\V[n]`),
`[s:id]` = a switch's ON/OFF.
**Creation/identity** — `name_input` (Name Input Processing → player.name), `affinity` (set
player.affinity), `appearance` (crop an Actor charset char into the player sprite),
`finalize_creation` (set class fresh + designation + seed progression), `creation` (launch the
polished DOM screen instead). The default new-game flow is the editable `character_creation`
common event built from these.
**Flow** — `conditional` (kinds: switch/selfswitch/variable/quest/**timer**), `loop` +
`break_loop`, `label` + `jump`, `common_event` (call a reusable list from
`data/systems/common_events.json`), `comment`, `exit`, `script`.
**Variables/state** — `switch`, `selfswitch`, `variable`, `input_number` (→ variable),
`timer` (start/stop; shows MM:SS), `location_info` (collision/walkable/region/event → variable).

## Run loop (roguelite descent) — authorable in event blocks
These drive the descent loop entirely from editable event commands (no hardcoded JS flow), so
the Fracture gate, stairs, relic caches, and the Remembrance NPC are all just event blocks.

**Fine-grained primitives (compose your own descent, RPG-Maker style):**
- **`run`** — manage run STATE only. `op`:
  - `start` — begin a fresh run at floor 1. Params: `tethered` (true = System catches you,
    Surveillance climbs; false = untethered/off-grid, death is real), `seed` (optional explicit
    seed; blank = random, honors the `run_seed_in` variable a replay board can set).
  - `deeper` — advance one floor. Past the boss floor this sets `run.cleared`.
  - `end` — finish the run (carry-over to meta). Param: `reason` (`cleared`/`died`/`collected`).
- **`gendungeon`** — generate the CURRENT floor (from `run.seed + run.floor`) and transfer the
  player onto it (pool fallback when runtime-gen is off). The "transfer to a generated map" step.
- **`conditional` kind `run`** — branch on run state. `check`: `cleared` / `active` / `boss`
  (current floor is the boss floor) / `floor` (+ `op` + `value`, e.g. floor >= 3).

Typical authored flow (what the DescentGate + generated StairsDown now use):
```
# gate:           run(start, tethered) → gendungeon
# stairs/Alpha:   run(deeper) → conditional(run cleared) ? run(end, cleared) : gendungeon
```

**Convenience macro:**
- **`descend`** — `run start`+`gendungeon` (or `run deeper` + clear/gendungeon) in one command.
  Params: `start`, `tethered`, `seed`. Use when you don't need the granular steps.
- **`relic`** — offer relics from a cache. Params: `count` (how many seeded choices to present,
  default 3) OR `guaranteed` (a relic id to force-grant instead of offering a choice). Active
  descent only. Placed one-per-floor by the generator (`RelicCache`).
- **`meta`** — open the **Remembrance** menu (spend Memory Fragments on permanent unlocks). No
  params. Put it on a hub NPC.

All three are first-class commands in the map editor (palette + forms), like any other command.

## Common-event triggers
A `common_events.json` entry may carry `trigger` + optional `switch` (omit = always on):
- **`autorun`** — runs BLOCKING (pauses the player, like a cutscene) while its switch is ON;
  conventionally turns the switch off to stop. One autorun at a time.
- **`parallel`** — runs CONCURRENTLY (non-blocking) while its switch is ON; restarts after each
  pass. Use for background processes (ambient ticks, watchers).
- No trigger = **call-only** (via the `common_event` command).
Pumped each free-roam frame; not pumped during dialogue/menus/battle.
**Party/economy** — `money`, `item`, `heal`, `relic`, plus LitRPG: `grantclass`,
`grantspec`, `grantskill`, `quest`, `descend`, `meta`, `system` (System Shop).
**Movement** — `transfer`, `move` (route: up/down/left/right/wait), `setdir`, `scroll_map`.
**Character** — `setgfx`, `spawn`, `despawn`, `balloon` (real RTP Balloon.png emote over
player/event), `animation` (Show Animation — flipbooks an RTP animation sheet over a target).
**Screen** — `fade`, `tint` (persistent overlay), `flash`, `shake`, `weather`
(none/rain/storm/snow/fog + power; resets to none on map change).
**Audio** — `se`, `stop_se`, `bgm` (play/stop), `bgs` (play/stop), `me`.
**Battle** — `battle`.
**Character (more)** — `setevloc` (Set Event Location — teleport an event/player),
`transparency` (Change Transparency — hide/show the player), `erase_event` (= Erase Event).
**Scene/system** — `openmenu` (Open Menu Screen), `opensave` (Open Save Screen → saves the
current slot), `gameover` (Game Over → fanfare + title), `totitle` (Return to Title).
**Actor** — `recover_all` (Recover All vitals), `change_level` (Change Level +/−/=),
`change_exp` (Change EXP +/−), `select_item` (Select Item → variable = chosen item id).

### Show Animation — note on fidelity
The RTP ships only the animation *sheets*, not RM's frame-timing data (that lives in a
project's `Animations.rvdata2`, which we don't have). So `animation` plays the sheet's cells
in sequence (a flipbook) — a faithful-enough hit/cast effect. An optional per-animation
frames JSON could drive exact RM timing later; the renderer would use it when present.

## VX Ace coverage — what's still BLOCKED (and why) — owner FYI
Per the "build it like RPG Maker" directive, these VX Ace commands are NOT wired because they
need a system this prototype doesn't have yet. Flagging them rather than silently faking it:
- **Show / Move / Rotate / Tint / Erase Picture** — no picture layer (a stack of positioned
  image sprites over the map). Needs a Picture subsystem first.
- **Change Weapons / Change Armors / Change Equipment** — no equipment/gear system yet (item
  DB has a `gear` stub; equip slots aren't implemented).
- **Change Party Member / Change Followers / Gather Followers** — no multi-actor party (we have
  `bonds`, not RM party slots/followers).
- **Vehicles** (Set Vehicle Location, Get On/Off, Vehicle BGM/Graphic) — no vehicle system.
- **Battle-scene-only** (Change Enemy HP/MP/TP/State, Enemy Appear/Transform, Force Action,
  Show Battle Animation, Abort Battle) — our combat is a custom Tempo/Intervention engine, not
  the VX Ace battle scene; these don't map 1:1.
- **Shop Processing (generic goods list)** — we have the `system` command (System Shop). A
  generic data-driven shop (arbitrary goods) needs a small shop UI. *Tell me if you want it.*
- **Change Parameters / Change Skills→remove / Change Class via menu / Change Nickname** —
  partial: we have `grantclass`/`grantspec`/`grantskill`/`change_level`/`change_exp`/`heal`/
  `hurt`. The remaining stat-edit variants can be added when needed.
- **N/A to this game:** Change Tileset/Parallax/Vehicle graphics, Change Battle BGM/Victory ME
  toggles (we play these directly), Change Formation/Encounter access flags.
