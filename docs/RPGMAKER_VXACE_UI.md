# RPG Maker VX Ace — EDITOR UI reference (for replicating the look/flow)

Goal: a complete map of **every menu, dialog, and panel in the VX Ace editor** — how it opens,
what it contains, and what the GUI looks like — so our map editor can match it. This is the
target we're cloning (clean-room: structure/behavior, not their icons/art).

> Sourcing: compiled from the official VX Ace product page, the Steam "Beginner Guide" and
> "Database Guide", the RPG Maker Wiki, and the official blog (links at the bottom). Some exact
> pixel details are from those + hands-on knowledge; where a value might vary by version it's
> marked "≈". **Anything we can't verify is flagged, per the no-silent-guessing rule.**

---

## 0. Overall window layout & visual style
Classic **Windows desktop app** chrome (VX Ace is a native Win32 app):
- **Title bar** → **Menu bar** → **Icon toolbar** → main work area → **status bar** (bottom:
  shows cursor tile coords + map size).
- Main area = **3 docked panes**:
  1. **Map list (tree)** — bottom-left. Hierarchical list of all maps (drag to re-parent).
  2. **Tileset palette** — upper-left. Tabbed **A B C D E** (Ace tile tabs); scrollable.
  3. **Map canvas** — center/right, the big editable grid with a scrollbar frame.
- **Look:** light gray (Windows Classic/Aero), 3D-beveled buttons, tabbed property dialogs with
  **OK / Cancel / Apply**, group boxes with etched borders, native dropdowns/spinners/checkboxes.
- Modes and tools are **toggle buttons** on the toolbar (radio-style: one Mode, one Draw tool,
  one Scale active at a time).

---

## 1. Menu bar (every menu, item, and hotkey)
> Hotkeys verified from the Steam Beginner Guide.

**File**
- New Project… `Ctrl+N`
- Open Project… `Ctrl+O`
- Save Project `Ctrl+S`
- Close Project
- Compress Game Data… (package/encrypt for distribution)
- Recent Projects ▸ (list)
- Exit

**Edit** (operates on the current map selection — tiles or events)
- Undo `Ctrl+Z`
- Cut `Ctrl+X` · Copy `Ctrl+C` · Paste `Ctrl+V` · Delete `Del`

**Mode** (which layer/thing you're painting)
- Map Editing Mode `F5`
- Event Editing Mode `F6`
- Region Editing Mode `F7`  (paint Region IDs 1–63 for script/encounter logic)

**Draw** (the active drawing tool — Map mode)
- Pencil · Rectangle · Ellipse · Flood Fill · Shadow Pen (quarter-tile shadow toggles)

**Scale** (map zoom)
- 1/1 · 1/2 · 1/4  (toolbar keys ≈ `Q`/`R`/`S`/`T`; renders the tile grid from full down to tiny)

**Tools**
- Database… `F9`
- Resource Manager… `F10`
- Script Editor… `F11`
- Sound Test…
- Character Generator…  (Ace's built-in face+sprite parts generator)
- Options…  (editor preferences)

**Game**
- Playtest `F12`
- Open Game Folder
- (Steam build adds Workshop options)

**Help**
- Contents `F1` · How to Use · About RPG Maker VX Ace

---

## 2. Icon toolbar
A single row of grouped buttons mirroring the menus, left→right:
- **File:** New · Open · Save
- **Edit:** Cut · Copy · Paste · Delete · Undo
- **Mode:** Map (F5) · Event (F6) · Region (F7)  ← radio group
- **Draw:** Pencil · Rectangle · Ellipse · Flood Fill · Shadow Pen  ← radio group
- **Scale:** 1/1 · 1/2 · 1/4  ← radio group
- **Tools:** Database · Resource Manager · Script Editor · Sound Test · Character Generator
- **Game:** Playtest

---

## 3. Map list (tree) — right-click context menu
Right-clicking a map (or empty tree) gives:
- **New Map…** (opens Map Properties for a new child map)
- **Edit Map Properties…**  (≡ double-click a map)
- **Copy / Paste / Delete** (whole maps, with their events)
- **Generate Dungeon!**  (built-in random dungeon filler for the selected map)
- **Shift Map…** (offset all tiles/events by an X/Y amount, resize-safe)
- **Save as Image…** (export the rendered map to PNG)
- Expand All / Collapse All

---

## 4. Map Properties dialog  ⭐ (the one ours differs from)
Opens via double-click a map / right-click ▸ Edit Map Properties / New Map. **Full field list:**

**General Settings**
- **Name** — the map's name in the tree (editor only).
- **Display Name** — shown on-screen to the player when entering the map (blank = none).
- **Tileset** — dropdown of Database tilesets.
- **Width** — 17–500 tiles.  **Height** — 13–500 tiles.  (mins = one screen: 17×13.)
- **Scroll Type** — `No Loop` / `Loop Vertically` / `Loop Horizontally` / `Loop Both`.

**Encounters**
- **Encounter List** — Troops that can appear, each with **Region** restriction + weight.
- **Steps Average** — avg steps between random battles (default **30**).

**Audio / battle**
- **Autoplay BGM** — checkbox + track selector (Volume / Pitch).
- **Autoplay BGS** — checkbox + track selector.
- **Specify Battleback** — checkbox + **Battleback1** (floor) and **Battleback2** (wall) dropdowns.
- **Disable Dashing** — checkbox (no run on this map).

**Parallax Background**
- **Graphic** — parallax image dropdown.
- **Loop Horizontal** (checkbox) + **Scroll X** (auto-scroll speed, −32…32 except 0).
- **Loop Vertical** (checkbox) + **Scroll Y**.
- **Show in Editor** — preview the parallax behind the map while editing.

**Note** — free multiline text (used by scripts/notetags; no gameplay effect by itself).

**Buttons:** OK / Cancel.

> **Our editor's Map Properties is missing:** Display Name, Scroll Type, Encounter list + Steps,
> Autoplay BGM/BGS, Specify Battleback, Disable Dashing, the whole Parallax group, and Note.
> Ours currently has ≈ Name / Width / Height / Tileset / (music). See the gap list in §13.

---

## 5. Event editor dialog (double-click a tile in Event mode)
A large modal. Layout:

**Top:** Event **Name** field + **Page tabs** (numbered) with **New / Copy / Paste / Delete /
Clear Page** buttons. Each event has independent pages; the **highest-numbered page whose
Conditions are all met** is the one that runs.

**Left column (per page):**
- **Conditions** (group of checkboxes, each with selectors):
  - Switch `[####]` is ON
  - Switch `[####]` is ON  (a second, independent switch)
  - Variable `[####]` is ≥ `[value]`
  - Self Switch `[A/B/C/D]` is ON
  - Item `[name]` is in inventory
  - Actor `[name]` is in the party
- **Graphic** — a preview box; double-click to pick the event's charset/tile + direction (or
  "blank" for an invisible trigger).
- **Autonomous Movement:**
  - **Type** — `Fixed` / `Random` / `Approach` / `Custom` (Custom enables a **Move Route…** button)
  - **Speed** — 1 (Slowest) … 6 (Fastest)  · **Frequency** — Lowest … Highest
- **Options** (checkboxes): **Walking Anime** · **Stepping Anime** · **Direction Fix** · **Through**
- **Priority** — `Below characters` / `Same as characters` / `Above characters`
- **Trigger** — `Action Button` / `Player Touch` / `Event Touch` / `Autorun` / `Parallel Process`

**Right/center:** **Contents** — the command list (large box). Double-click an empty line → the
**event command picker** (3 tabbed pages of commands, see §6). Existing lines can be edited /
inserted / deleted.

**Bottom:** OK / Cancel / Apply.

---

## 6. Event command picker (3 pages, by category)
Double-clicking in the Contents list opens a tabbed picker. Categories per page (Beginner Guide):
- **Page 1:** Message · Game Progression · Flow Control · Party · Actor
- **Page 2:** Movement · Character · Screen Effects · Timing · Picture and Weather · Music and Sounds
- **Page 3:** Scene Control · System Setting · Movie · Map · Battle · Advanced

(We already mirror most of these — full mapping in `docs/EVENT_COMMANDS.md`, incl. the VX Ace
commands we can't do yet and why.)

---

## 7. Right-click on the MAP (Event mode) — context menu
- **New Event** (blank event at the clicked tile)
- **Quick Event Creation ▸**  `Transfer` · `Door` · `Inn` · `Treasure Chest`  (wizard-filled events)
- **Set Starting Position ▸**  `Player` · `Boat` · `Ship` · `Airship`
- **Cut / Copy / Paste / Delete** (the event under the cursor)

> ⭐ **Starting position is set HERE in VX Ace** (right-click ▸ Set Starting Position ▸ Player),
> NOT in the Database. (RPG Maker XP / 2000/2003 put it in the Database/System instead — that's
> the source of the common confusion.) Our equivalent today lives in `data/systems/system.json`
> (`newGame`) — see `docs/SYSTEM_CONFIG.md`.

---

## 8. Database (F9) — 14 tabs
Tabbed window; each tab = a left-hand numbered **item list** (with a "Max" "Change Maximum…"
button) + a right-hand **property form**.

1. **Actors** — Name, Nickname, Class, Initial/Max Level, Graphic (face+charset), starting
   Equipment, Features, Note.
2. **Classes** — EXP Curve, parameter growth curves (the 8 params), Skills to Learn (by level),
   Features (element/state rates, equip types), Note.
3. **Skills** — Name/Icon/Description, Skill Type, MP/TP cost, Scope, Occasion, Speed, Success%,
   Repeats, Damage formula, Effects, Note.
4. **Items** — Name/Icon/Desc, Type (Regular/Key Item/etc.), Price, Consumable, Scope, Occasion,
   Effects, Note.
5. **Weapons** — Name/Icon/Desc, Weapon Type, Price, parameter changes, Features, Note.
6. **Armors** — Name/Icon/Desc, Armor Type, Equip Type (slot), Price, params, Features, Note.
7. **Enemies** — params, EXP/Gold rewards, Drop Items, Action Patterns (conditional), Features, Note.
8. **Troops** — enemy formations (positions), **Battle Events** (pages w/ conditions+commands).
9. **States** — Restriction, Priority, removal conditions (battle end / by time / by damage),
   parameter effects, messages, Features, Note.
10. **Animations** — frame cells over a pose, SE + flash timing (the visual FX for skills/items).
11. **Tilesets** — per-tileset: the A–E sheet assignments + **passage (○/✕)**, ladder, bush,
    counter, damage floor, terrain tags, directional passage.
12. **Common Events** — reusable command lists with Trigger (`None`/`Autorun`/`Parallel`) + a
    Switch condition.
13. **System** — see §9.
14. **Terms** — see §10.

---

## 9. Database ▸ System tab
- **Starting Party** — the actor(s) you begin with.
- **Vehicles** — Boat / Ship / Airship: each a **Graphic** + **BGM**.
- **Title Screen** — Graphic (Title1 background + Title2 frame), **Draw Game Title** checkbox.
- **Music** — **Title BGM**, **Battle BGM**, **Battle End ME**, **Gameover ME**, vehicle BGMs.
- **Sounds (System SE)** — the full UI/battle SE set: Cursor, Decision, Cancel, Buzzer, Equip,
  Save, Load, Battle Start, Escape, Enemy Attack, Enemy Damage, Enemy Collapse, Boss Collapse 1/2,
  Ally Damage, Recovery, Miss, Evasion, Magic Evasion, Magic Reflection, Shop, Use Item, Use Skill.
- **Window Tone** — RGB sliders for the message-window color.
- **Options / Initial settings** — starting party formation, etc.
- (No "starting position" field — that's the map right-click, §7. No side-view toggle — Ace is
  front-view; side-view needs a script.)

## 10. Database ▸ Terms tab
- **Basic Status** terms + abbreviations: Level (`Lv`), HP/MP/TP, EXP and short forms.
- **Parameters:** Max HP, Max MP, Attack, Defense, M.Attack, M.Defense, Agility, Luck.
- **Commands** (menu/battle words): Fight, Escape, Attack, Guard, Item, Skill, Equip, Status,
  Formation, Save, Game End, Weapon, Armor, Key Item, Equip/Optimize/Clear, New Game, Continue,
  Shut Down, To Title, Cancel, Buy, Sell.
- **Messages** — `%`-templated lines: join/level-up/obtain item/obtain gold, and all the battle
  log lines (emerge, attack, critical, miss, evade, damage, recovery, etc.).

---

## 11. Other Tools windows
- **Resource Manager (F10)** — left tree of resource folders (**Graphics:** Animations,
  Battlebacks1/2, Battlers, Characters, Faces, Parallaxes, System, Tilesets, Titles1/2;
  **Audio:** BGM, BGS, ME, SE). Buttons: **Import… / Export… / Delete** (+ play for audio).
- **Script Editor (F11)** — left = ordered script list (with a **Materials** region to paste
  plugins above **Main**); right = code editor (RGSS3 / Ruby).
- **Sound Test** — pick BGM/BGS/ME/SE, set Volume/Pitch, Play/Stop (audition assets).
- **Character Generator** — compose **face + walk sprite** from parts (face shape, hair, eyes,
  clothes, accessories…); export to Characters/Faces. (Ace's generator is basic vs. MV/MZ.)
- **Options** — editor preferences (grid, autosave, tone, etc.).

---

## 12. In-game default menus (what the engine ships, for reference)
Not the editor, but VX Ace's **runtime** menus (so our in-game menus can match too):
- **Main Menu:** Item · Skill · Equip · Status · Formation · Save · Game End.
- **Shop scene** (from Shop Processing): Buy / Sell / Cancel, with the goods list + gold.
- **Name Input**, **Save/Load** (slot list), **Game End** (To Title / Shut Down / Cancel),
  **Title** (New Game / Continue / Shut Down).

---

## 13. GAP ANALYSIS — ours vs. VX Ace (what to build to match)
Priority for matching the VX Ace feel (the user's explicit ask):
1. **Map Properties dialog** — add the missing fields (§4): Display Name, Scroll Type, Encounters
   + Steps Average, Autoplay BGM/BGS, Specify Battleback, Disable Dashing, Parallax group, Note.
   *(Some need engine support: parallax rendering, on-map random encounters, battleback per map —
   flag which are data-only vs. need a system before wiring.)*
2. **Event editor dialog** — confirm ours exposes all of §5 (pages, the 6 Conditions, Autonomous
   Movement type/speed/frequency, the 4 Options, Priority, Trigger). Match labels exactly.
3. **Right-click map menu** — add Quick Event Creation (Transfer/Door/Inn/Chest) + Set Starting
   Position (we have the data side via system.json; add the right-click setter).
4. **Database window** — ours is partial; the 14-tab structure is the target (many tabs map to our
   `data/systems/*.json`). System + Terms tabs especially.
5. **Map tree** — Generate Dungeon!, Shift Map, Save as Image, copy/paste maps.
6. **Tabs A–E tileset palette, Region mode, Resource Manager, Sound Test** — parity items.

---

## Sources
- RPG Maker VX Ace (official): https://www.rpgmakerweb.com/products/rpg-maker-vx-ace
- Steam "RPG Maker VX Ace Beginner Guide": https://steamcommunity.com/sharedfiles/filedetails/?id=116710665
- Steam "RPG Maker VX Ace Database Guide": https://steamcommunity.com/sharedfiles/filedetails/?id=123520832
- Official blog — Event Priorities and Triggers: https://www.rpgmakerweb.com/blog/event-priorities-and-triggers
- RPG Maker Wiki — Character generator: https://rpgmaker.fandom.com/wiki/Character_generator
- RPG Maker Wiki — VX Ace: https://rpgmaker.fandom.com/wiki/RPG_Maker_VX_Ace
