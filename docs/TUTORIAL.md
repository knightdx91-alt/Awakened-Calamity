# The Opening / Tutorial — how it's wired (and how to edit it)

The opening is now authored **entirely with event commands** — nothing is hardcoded in
JS anymore. The engine only decides *when* a beat fires; the *content* is editable data
(map events + common events). Edit it in the map editor's event panel, or by hand in the
JSON files below.

## The flow, beat by beat

| # | Beat | Where it lives | How it's triggered |
|---|------|----------------|--------------------|
| 1 | **Cold-open** — the System's first words | `data/systems/common_events.json` → `awakening_intro` | **Autorun** common event. `_newGame` resets event state and flips switch `sys_intro` ON; the autorun plays, then sets `sys_intro` OFF. |
| 2 | **Mira** — greet → crystal → descent → cycle reveal | `data/maps/awakened/Dawnhearth.json` event **Mira** (id 16) | Action (talk). Quest-stage-gated: stage 0 greet, 1 nudge to crystal, 2 explain the descent, 3 reveal the cycle + complete quest (+`first_aid`, heal). |
| 3 | **System Hub crystal** — the "welcome" (Surveillance) | Dawnhearth event **SystemHub** (id 15) | Action. Opens the System Shop (`system` cmd), then advances the quest stage 1→2. |
| 4 | **TutorialFiend** — optional warm-up fight | Dawnhearth event **TutorialFiend** (id 17) | Touch. A `choice` → optional `battle`. Not a gate. |
| 5 | **NoticeBoard** — the hook (Joran taken) | Dawnhearth event **NoticeBoard** (id 18) | Action. Lore text. |
| 6 | **DescentGate** — tethered/untethered choice | Dawnhearth event **DescentGate** (id 23) | Action. `choice` → `descend` (start:true, tethered:true/false). The `descend` command transfers you into the run floor (no separate Transfer needed). |
| 7 | **First-descent return** — the cycle reveals itself | `common_events.json` → `first_descent_tethered` / `first_descent_untethered` / `first_descent_cleared` | `_endRun` calls the matching one on your FIRST descent's end (picked by how it ended). One-time. |

After the first return, Mira (stage 3) names the cycle and completes the `awakening` quest;
the **Remembrance** NPC (`meta` cmd) spends Memory Fragments on permanent unlocks.

## How to edit each piece
- **Cold-open / first-descent text:** edit the entries in `data/systems/common_events.json`.
  They're plain command lists — add/remove `text` (supports `[name]`/`[designation]` tokens),
  `se`, `flash`, etc. The cold-open is an **autorun** (it must end by setting `sys_intro` OFF,
  or it loops).
- **Town beats (Mira, crystal, fiend, board, gate):** open `Dawnhearth` in the map editor,
  click the event, edit its command list (or edit `Dawnhearth.json` directly). The quest gating
  is `conditional` commands with `kind:"quest"` (check: stage/active/done).
- **The quest itself** (stage names/objectives/reward): `data/systems/quests.json` → `awakening`.

## What the engine still controls (logic, not content)
- `_newGame` (`src/main.js`): fresh state, seeds the `awakening` quest, flips `sys_intro`.
- `_endRun`: increments the run, then on the FIRST descent calls the right `first_descent_*`
  common event. (It chooses *which*; the words are editable.)
- The `descend` command: runs `GameRun.start`/`descend` and transfers the player to the floor.

So to rewrite the opening you only touch DATA: `common_events.json`, `Dawnhearth.json`, and
`quests.json`. See `docs/EVENT_COMMANDS.md` for the full command reference.
