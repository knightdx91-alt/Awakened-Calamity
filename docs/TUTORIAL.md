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

## Every-run feedback is editable too
The per-run return narration, the fragments tally, and the ending verdict are also common
events (the engine sets result variables, the words are data):
- `run_return_cleared` / `run_return_collected` / `run_return_died_tethered` /
  `run_return_died_untethered` — shown each run by `_endRun`. They use `[v:run_fragments]`,
  `[v:run_total_fragments]`, `[v:run_deepest]` tokens.
- `ending_verdict_true` / `_good` / `_submit` — shown on a clear, picked by lifetime
  Surveillance; use `[v:life_surv]`.

## Character creation IS an event now (RPG-Maker style)
A new game runs the **autorun common event `character_creation`** (switch `do_creation`,
set by `_newGame`) — a Name Input + Show Choices flow you can fully edit:
`name_input` → `choice` Affinity (`affinity` cmd) → `choice` Appearance (`appearance` cmd) →
`choice` Class (`finalize_creation` cmd) → it flips `do_creation` off + `sys_intro` on (cold-open).
Edit the questions/options in `common_events.json` → `character_creation`.
- **`name_input`** — RPG Maker Name Input Processing → `player.name`.
- **`affinity {value}`** — sets `player.affinity` (ids in `affinities.json`).
- **`appearance {sheet,char}`** — crops one Actor-charset character into the player sprite.
  With `pick:true` (+ optional `chars:[...]`) it opens a **visual picker** (live preview, ◄ ►
  browse, CONFIRM) so you see the sprite before locking it in — what the creation flow uses.
- **`finalize_creation {classId}`** — sets the class fresh (+skills), a System designation, and
  seeds progression (the coordinated writes the old screen's Confirm did).
- Prefer the polished DOM screen instead? Make `character_creation` a single
  `{ "type": "creation" }` command (it launches `GamePlayerCreation`).

## What the engine still controls (logic, not content)
- `_newGame` (`src/main.js`): fresh state, seeds the `awakening` quest, flips `sys_intro`.
- `_endRun`: tallies the run, sets the result variables, then calls the right `run_return_*`
  / `first_descent_*` / `ending_verdict_*` common event. (It chooses *which*; words are data.)
- The `descend` command: runs `GameRun.start`/`descend` and transfers the player to the floor.

So to rewrite the opening or the run-feedback you only touch DATA: `common_events.json`,
`Dawnhearth.json`, `quests.json`. See `docs/EVENT_COMMANDS.md` for the full command reference.
