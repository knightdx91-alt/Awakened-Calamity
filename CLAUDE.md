# CLAUDE.md — Awakened Calamity

Guidance for Claude Code working in this repo. **Read this first.**

## 📌 SESSION WRAP — 2026-06-19 (big session; all pushed to `main`)
Five things shipped this session (each has its own detailed ✅ DONE block below):
1. **Wired the inert combat skills** — `skills.json` real inert combat skills 22 → 0; every class's
   FIGHT menu is now real (data retags + new `combat.js` trait handlers). `commit` early in session.
2. **Reactive run-state NPCs + replay-seed board** — GameVoice NPCs react to deepest/clears/
   collections/untethered/lifeSurv; a `ReplaySeedBoard` in Dawnhearth pins `run_seed`/`run_seed_in`.
3. **sim_run enjoyability metrics** — critical-choices/run + death-cause + death-by-floor histograms
   (`--untethered` honest read vs tethered `--collect` budget). Finding: untethered brutality is an
   **attrition/scaling** problem, deaths front-loaded floors 1–2 → the player-vs-enemy growth gap is
   the tuning lever.
4. **Hub redesign** — Dawnhearth zoned + signed (CRYSTAL/BOARD/FRACTURE+Replay Slate/STILL PLACE),
   directory signpost, Infirmary healer (Sister Wenna), Inn wired (Door12↔DawnhearthInn + Innkeeper
   + RestBed), 13 facade doors blanked diegetically. Onboarding #3 done.
5. **Runtime floor generation (generator roadmap #1)** — `src/systems/mapgen.js` (`GameMapGen`, pure)
   grows a fresh dungeon floor per descent from `run.seed+floor`; `GameMap.loadGenerated` injection;
   browser-verified render. Same seed → identical descent (replay-safe).

### ▶ STILL TO GO (next sessions, priority order)
- **Generator roadmap #2 — biome system** (HIGHEST ROI next): one biome def per region = palette +
  tileset + enemy roster + hazard + mini-boss, so floors read as different places. Now sits on the
  runtime generator. (Then #3 run/act composer — also unlocks onboarding #5 legible run shape;
  #5 cellular-automata cave rooms for organic shape; #4 prefab/template rooms for set-pieces.)
- **Difficulty tuning pass** — use the new `sim_run` histograms: close the player-vs-enemy growth
  gap (deaths cluster floors 1–2, mostly "outleveled"). Needs a human playtest to confirm feel.
- **Expand relics (24 → ~40) + relic editor command.**
- **Tier XP review / full battle-seed determinism** (derive battle seed from run.seed+floor+encIdx).
- **Onboarding #5** — the Board shows the run's SHAPE (Slay-the-Spire act map; needs the composer).
- **Shipping blockers** — original art to replace EULA-gated RTP; human playtest of the curve.
- **Carried-over threads** (older, still open): Pixel-Fantasy autotile bakes; World Area Bible
  (spec locked, region-by-region); interior wall-face look + room sectioning/furniture; Master tier
  content (6 → ~50); survival systems → gameplay (Stamina/Exposure/Bind); cloud-saves → CF Worker.
- **Note on research:** this env's **egress policy blocks reddit.com** (and similar) — to pull
  Reddit/forum content either loosen the environment's network policy (allowlist reddit domains) or
  paste the content into chat. `example.com`/GitHub/raw.githubusercontent are reachable.

## ✅ DONE 2026-06-19 — Inert combat skills wired (priority #1: 0 inert combat skills remain)
Audited `skills.json` (193 entries): real inert combat skills went **22 → 0** (the 9 still-"inert"
passives are all genuine NON-combat lifestyle hooks — exposureResist/craftQuality/repGain/bindChance/
yield/detect — correct to be out-of-battle). All node-verified (`test_effects.mjs` now 21 checks, all
suites green, `validate_design` still ✅ MECHANICALLY SOUND):
- **Data retags (active skills → engine-honored effects)** in `skills.json`: `soul_tether`/
  `monster_lore` `mark`→`markTarget`; `rouse` `influence`→`partyBuff`(atk); `rally_beasts`
  `creatureBuff`→`partyBuff`(atk); `ward` `exposureShield`→`partyBuff`(defense); `beast_call`
  `creatureAssist`→`summon`. These map to types the FIGHT-menu filter already shows.
- **New engine handlers in `combat.js`** (folded as actor traits in `_mkActor`): passive
  `affinityPower` (boosts the bearer's affinity-skill damage in `_damage`), `healBoost` (boosts heal
  done), `resourceRegen` (enlarges the MP pool — no in-battle regen by design), `creatureBuff`/
  `summonPower` (scale summon stats in `_summon`), `partyBuff` aura (Rally Aura — summed side-wide in
  `createBattle` into `sideAura{Atk,Def}`, applied in `_damage`); reactive `guardAlly` (**Intercept**
  now really redirects a single-target hit onto the guardian in `_attack`).
- Updated the `_meta` note in `skills.json` to list the full honored-effect set.

## ✅ DONE 2026-06-19 — Reactive NPCs + replay-seed board (priority #2, partial)
Hub reactivity + the replay board are in (onboarding #4 + the replay-seed ask). Node-verified
(10 reactive picks resolve, opening unaffected, suites green, `validate_design` ✅; Dawnhearth
boots headless with 0 errors). Details in `docs/ONBOARDING_DESIGN.md` STATUS 2026-06-19:
- **NPCs react to run-state** via GameVoice: `_voiceCtx` (`main.js`) now carries `deepest`/`clears`/
  `runs`/`collections`/`untethered`/`lifeSurv`/`ending`; `whenMatches` (`dialogue_gen.js`) gained
  the matching `when` keys; authored run-aware lines into all 5 speakers (`data/dialogue/*.json`),
  milestones `once`-gated so they fire then fall back to live Surveillance reactivity.
- **Replay-seed board** — new `ReplaySeedBoard` event in `Dawnhearth.json` (@32,28 by the gate)
  shows/pins `run_seed`/`run_seed_in` (replay last / enter by hand / clear); descend already honors
  `run_seed_in`, so a pinned seed re-grows the same floors + relic caches.
- **Still open from onboarding:** #3 zone/sign the hub + wire 2–3 interiors; #5 the Board shows the
  run's SHAPE (needs the run/act composer, generator roadmap).

## ✅ DONE 2026-06-19 — Hub redesign: zoned + signed Dawnhearth, Inn wired (onboarding #3)
Made Dawnhearth read like a control room (all event-data, no retiling; both maps boot headless
with 0 errors):
- **Zoned the 5 stations** out of the 6-tile blob into functional zones: THE CRYSTAL (System hub,
  north @28,18), THE BOARD (notices, east @40,24), THE FRACTURE (DescentGate, south @30,34) with the
  Replay Slate beside it @32,34, THE STILL PLACE (Remembrance, southwest @20,34). Each station's
  examine text now leads with a ❖ ZONE NAME ❖ header (legible on interaction).
- **Directory signpost** (`PlazaDirectory` @10,18 by the spawn/Mira) = a "you are here" board
  listing all five zones + the Inn — the single biggest legibility win.
- **THE INFIRMARY**: new healer NPC **Sister Wenna** (@22,20, People5 face) — full heal at no
  Surveillance cost (the off-grid alternative to the System's paid Restore).
- **Wired the Inn** (the one real interior): Door12 → `DawnhearthInn` (transfer); the Inn's Exit
  transfers back; added an **Innkeeper** + a **RestBed** (choice → full heal + fade — a rest point).
- **Blanked the 13 facade doors diegetically** — each locked door now says WHY in-world (audits,
  the taken, reassigned property, Joran's watched house), not a flat "The door is locked."
Still open from onboarding: #5 the Board shows the run's SHAPE (needs the run/act composer below).

## ✅ DONE 2026-06-19 — Runtime floor generation (generator roadmap #1)
The engine now grows a FRESH dungeon floor per descent instead of reusing the 6-map pool.
`src/systems/mapgen.js` (`GameMapGen`, pure/deterministic) ports the Python dungeon generator:
seeded room/corridor carve, reachability guarantee, 9-slice walls + side-view north faces (baked
`dun_props` gids), and the full gameplay layer (Entrance, StairsDown/Alpha boss, roamers, chests,
relic cache, traps). Engine injection via new `GameMap.loadGenerated` (in-memory layout, no fetch);
`main.js` descent grows a floor from `run.seed + floor` (tier ramps with depth) when `run.json
runtimeGen:true` (the baked pool stays as fallback); `_purgeRunFloors` clears the reused `RunGenF*`
names so chests refill each run. Same seed → identical descent (replay-safe, pairs with the Replay
Slate). `tools/test_mapgen.mjs` = 12 checks; browser-verified a generated floor loads + renders
cleanly. Details in `docs/GENERATOR_ROADMAP.md`.

## 🔴 NEXT SESSION — PRIORITY LIST (updated 2026-06-19)
Ordered by bang-for-buck. (#1 inert-skills, reactive-NPCs/replay-board, hub redesign, runtime
mapgen all DONE.)
1. **Generator roadmap #2–3 — biome system + run/act composer (`docs/GENERATOR_ROADMAP.md`).** One
   biome def per region (palette + tileset + enemy roster + hazard) so floors read as different
   places; then a Slay-the-Spire act composer (normal→elite→treasure→rest→boss). The composer also
   unlocks onboarding #5 (legible run shape). Now sits on the runtime generator just landed.
2. **Expand relics further (24 → ~40) + the relic editor command.** Pure data + a small editor form;
   author more dilemma-axis and build-defining relics. (Pool is at 24 now.)
3. **Tier XP review / run-seed full determinism.** Floor + relic rolls are seed-reproducible now;
   combat RNG still uses live-timing seeds, so battles aren't frame-identical — derive the battle
   seed from `run.seed + floor + encounterIdx` for full replay if desired.
4. **Shipping blockers (not yet):** original art to replace EULA-gated RTP; human playtest of the
   untethered difficulty curve (sims say it's brutal-by-design — needs a human read; the new
   `sim_run` death-cause histogram says it's an attrition/scaling problem, deaths front-loaded
   floors 1–2 — the player-vs-enemy growth gap is the lever).

## ✅ DONE 2026-06-19 — Combat feel + relics + reproducible seeds
Short polish session (all pushed to `main`, headless/node-verified):
- **Combat JUICE pass** (`combatview.js`, presentation-only, no balance change): floating damage/heal
  numbers over the target (crit / super / resist / poison / heal styled), hit-flash on the struck
  sprite, screenshake on the field (bigger on crit/super-effective), and per-affinity RTP impact SE
  (Fire/Ice/Thunder/Earth/Water/Wind/Poison/Darkness/Saint; physical Blow fallback) + miss/down cues
  + Powerup on level-up. All driven off `combat.js`'s log. Browser-verified: floats spawn with correct
  affinity classes, 0 errors.
- **Victory/defeat fanfare** — Victory1 ME on a win, Gameover1 on defeat (ducks BGM), fired in `_finish`.
- **Relics 16 → 24** (`relics.json`): +8 (Barbed Vest, Gut Brace, Duelist's Glove, Thorn Buckler,
  Stalker's Cowl, Bloodletter, Dead Man's Dial glass-cannon, Null Shroud dilemma). All effect keys
  validated; `test_relics.mjs` green.
- **Reproducible run seeds** (`main.js` descend): honors an explicit `c.seed` or a `run_seed_in`
  variable (a replay board can set it), writes the chosen seed to `run_seed` so `[v:run_seed]` shows/
  shares it; kept positive 31-bit nonzero. Floor + relic rolls were already seed-derived → a shared
  seed reproduces the descent layout.

## ✅ DONE 2026-06-18 — Combat feel pass: tempo reset, save-as-CHOICE, sprite fixes
Owner-requested battle changes (all browser-verified, suites green, validate_design still
✅ MECHANICALLY SOUND):
- **Tempo resets to 0 on ANY action** (Mega Man Battle Network style) — `combat.js act()` sets
  `a.tempo = 0` instead of subtracting the skill's tempoCost (cost no longer carries over).
- **System help is now a DELIBERATE CHOICE, and the free multi-heal is GONE.** Removed the periodic
  emergency auto-heal entirely. The lethal save no longer auto-revives — `_guardLethal` sets
  `state.pendingSave` and the fight PAUSES; the view shows **[A] ACCEPT — live (Surveillance ↑N) /
  [B] REFUSE — die**. New `GameCombat.resolveSave(state, accept)`; `step()`/`advanceToReady()` pause
  on `pendingSave`; sims auto-accept (the leaning bot). Dying is real and tense now (curve clear
  17%→5%). Only the Subject (p1) is offered the save.
- **Player battle sprite now matches the chosen appearance** — `_buildPlayerSprite` honored only
  `ov.file` but creation writes a cropped `ov.dataUrl`; now uses either.
- **Each creature has its OWN roaming sprite** (was a generic Monster1 for all): creatures gained a
  `charset {file,char,charCols}`; the renderer now offsets to the right character block in a
  multi-char monster sheet; `migrate_roamer_sprites.py` + `mapgen_indoor.place_monster` set roamers
  from the creature's charset (battle keeps the detailed `battler`).

## ✅ DONE 2026-06-18 — Character creation is now an EVENT flow (RPG-Maker style)
New game now runs the **autorun common event `character_creation`** (switch `do_creation`, set by
`_newGame` instead of launching the DOM screen): Name Input → Show Choices (Affinity / Appearance /
Class) → flips `do_creation` off + `sys_intro` on (cold-open). Fully editable in
`common_events.json`. Backed by 4 commands: `name_input` (→player.name), `affinity` (→player.affinity),
`appearance` (crops one Actor-charset char into the player sprite, same crop the screen did),
`finalize_creation` (sets class fresh +skills, generates the SUBJECT designation, seeds
GameProgression). The polished DOM `GamePlayerCreation` screen is kept and still launchable via the
`creation` command (swap `character_creation` to a single `{type:'creation'}` to use it). Editor
forms added for all 4. Browser-verified a full new-game run: name/affinity/appearance/class/skills/
designation/progress all set, switches hand off to the cold-open; 0 errors.

## ✅ DONE 2026-06-18 — Run-feedback eventified + name_input/creation commands + [v:] tokens
Finished moving the LAST hardcoded narrative out of `_endRun`: the per-run return text +
fragments tally + ending verdict are now **editable common events** (`run_return_cleared/
collected/died_tethered/died_untethered`, `ending_verdict_true/good/submit`). `_endRun` sets
result VARIABLES (`run_fragments`, `run_total_fragments`, `run_deepest`, `life_surv`) and calls
the right common event — words are data. New **`[v:id]`/`[s:id]` text tokens** (RPG-Maker `\V[n]`
variable + switch interpolation) in `_subTokens`. **Creation as events:** new `name_input`
command (RM Name Input Processing → player.name) + `creation` command (launch the Awakening
screen from any event; its affinities/classes are already data). Editor forms + CMD_TYPES added.
Browser-verified: `[v:]` numbers interpolate, descent-clear plays run_return + verdict commons,
name_input writes the name; 0 errors. Docs: `docs/TUTORIAL.md`, `docs/EVENT_COMMANDS.md`.

## ✅ DONE 2026-06-18 — Opening/tutorial fully COMMAND-AUTHORED (editable, no hardcoded JS)
The two hardcoded opening beats were moved into editable common events so the whole tutorial is
now data: (1) the **cold-open** → `awakening_intro` **autorun** common event (switch `sys_intro`;
`_newGame` resets event state + flips it on, the autorun self-clears it); (2) the **first-descent
return** beat → `first_descent_tethered`/`_untethered`/`_cleared` common events, called by `_endRun`
(engine picks WHICH by how the run ended; the words are editable). Everything else was already map
events (Mira/crystal/fiend/board/DescentGate in `Dawnhearth.json`). `text` already token-substitutes
`[name]`/`[designation]`. Full beat-by-beat map + how-to-edit in **`docs/TUTORIAL.md`**. Browser-
verified: cold-open autoruns with token substitution + self-clears, first-descent common event
plays; 0 errors. To rewrite the opening you now only touch DATA (`common_events.json`,
`Dawnhearth.json`, `quests.json`).

## ✅ DONE 2026-06-18 — Show Animation + auto/parallel common-event triggers
- **Show Animation** (`animation` command): flipbooks an RTP animation sheet's 192px cells over a
  target (player/this/event). NOTE the RTP ships only the sheets, NOT RM's frame-timing data
  (`Animations.rvdata2` is project data we don't have — re-import wouldn't get it), so it's a
  cell-sequence flipbook; an optional per-anim frames JSON could add exact timing later. Loader
  `_loadAnimDb` + `_animation`; editor form w/ a datalist of anim ids.
- **Balloon upgraded to the real RTP `system/Balloon.png`** (8 frames × 10 emotes, 32px) instead of
  the emoji stub. `_tileScreenPct` positions balloons/animations over the target tile via the camera.
- **Auto/parallel common-event triggers:** `common_events.json` entries can carry `trigger`
  ('autorun' = BLOCKING cutscene while `switch` ON, usually self-clears; 'parallel' = CONCURRENT
  background process while `switch` ON) + optional `switch` (omit = always on). `_pumpCommonEvents()`
  runs each free-roam frame (not during dialogue/menus/battle); one autorun at a time, parallels
  restart after each pass. Browser-verified: animation renders, balloon uses real art, a parallel
  ticked a variable in the background, an autorun ran + turned its own switch off; 0 errors.

## ✅ DONE 2026-06-18 — VX Ace event-command expansion + scripting decision
Added 16 RPG-Maker-VX-Ace event commands (engine `runCmd` + editor forms, browser-verified):
**flow** `loop`/`break_loop`, `input_number`, `common_event` (calls reusable lists in
`data/systems/common_events.json`), `timer` (+ `conditional` kind `timer`, on-screen MM:SS);
**audio** `bgm`/`bgs`/`me`/`stop_se` (via `GameAudio`, + new `stopAllSE`); **screen** `tint`
(persistent), `flash`, `scroll_map`; **character/message** `balloon` (emote), `scroll_text`,
`location_info` (collision/walkable/region/event → variable). `runCmdList` now honors
`ctx._break`; `_camScroll` overrides player-follow during a scroll. **Scripting decision:
DON'T port RGSS3 (Ruby)** — its value is the proprietary VX Ace class library, not the
language; MV/MZ themselves moved to JS. We grow our own serializable **command VM** (portable
to Unity) + the existing `script` JS escape-hatch (`$` api). Full reference + the "not yet /
N/A" list in `docs/EVENT_COMMANDS.md`. ~54 commands total now.

## ✅ DONE 2026-06-18 — RELIC SYSTEM (roguelite per-run reward layer)
Built the relic layer. `data/systems/relics.json` (16 relics: common/rare/epic — atk/hp/def/spd
mults, crit, evade, lifesteal, thorns, Surveillance/collection modifiers) + pure
`src/systems/relics.js` (`GameRelics`: weighted SEEDED roll / grant / effects-aggregate). Relics
live on `run.relics`, wiped each run (`GameRun.start`). **Combat integration:** `combatview.buildPlayer`
applies stat mults + passes a data-driven `bonuses` bundle into the pure core — `combat.js _mkActor`
folds crit/evade/defBonus and stores lifesteal/thorns; `_attack` applies lifesteal (heal on hit) +
thorns (reflect). **Dilemma relics** (`survPerSaveMult`, `collectionBonus`) fold into the collection
threshold + per-fight Surveillance. New **`relic` event command** (offer a choice of 3 seeded-rolled,
or `guaranteed:<id>`); a **RelicCache** is placed one-per-floor (generator `place_relic_cache` +
`tools/migrate_relic_caches.py` retro-added to the existing 6 floors). Held relics show on the STATUS
screen (cyan section, active-run only). `tools/test_relics.mjs` = 10 checks; browser-verified
grant→hold→combat-bonus→STATUS, 0 errors. Loaded in game.html. (Future: more relics, editor command,
icons.)

## ✅ DONE 2026-06-18 — Run floors are EPHEMERAL (state purged) + procedural-gen status
- **Map/dungeon generators ARE procedural** (`tools/mapgen_indoor.py`: seeded RNG carves rooms/
  corridors, scatters props/monsters/chests) but run **OFFLINE at build time** → static
  `RunFloor A–F`/`RunBoss1–2` JSON. The runtime descent picks from that fixed POOL by seed; it does
  NOT generate fresh floors in-engine. (True per-run runtime gen = port the Python generator to JS —
  future task.)
- **No map memory leak:** the engine holds only one `GameMap.current` and re-fetches a fresh copy on
  every visit (cache:'no-cache'), so old floors are GC'd and in-memory mutations (roamer positions,
  despawned monsters) reset each entry. Nothing accumulates.
- **The real lingering artifact was per-floor event state** (opened-chest self-switches in
  localStorage, keyed by static map name) — it persisted across runs, so chests wouldn't refill and
  the store grew unbounded. **Fixed:** run floors are now treated as ephemeral — `GameEventState`
  gained `clearMap`/`clearMaps`, and `main.js._purgeRunFloors()` wipes the whole run pool's
  self-switches on **run start AND run end**. Verified: open a chest → new descent → chest refilled;
  non-run (Dawnhearth/town) self-switches preserved.

## ✅ DONE 2026-06-18 — Launch skills wired + ending gates live + meta confirmed
- **Launch-class skills:** 34/38 already active; the 4 inert ones (`track`/`set_snare`/`sneak`/
  `pick_lock`) were world-utility and are now reframed into combat effects the engine supports
  (mark / slow / self def-up / sunder). **0 inert among the 12 launch classes**; they show in the
  FIGHT menu. (~99 globally-inert skills remain on non-launch classes — defer.)
- **Ending gates LIVE** (the Act-IV finale isn't built, so this is a roguelite EPILOGUE): clearing
  a descent → a System verdict gated by LIFETIME Surveillance (`GameCorruption.endingsOpen`) —
  ≤40 keeps the **true** ending open, ≤120 **good**, else **submit**; stored as `meta.endingTier`.
  Wired the corruption-tier atk penalty earlier; this closes the loop on the dilemma's stakes.
- **Meta-progression (the "what you unlock on a run" system) CONFIRMED working:** completing a run
  earns Memory Fragments (depth + clear/clean/untethered bonuses); the **Remembrance** NPC (`meta`
  cmd) spends them on 9 permanent unlocks (+HP ×2, start Potions ×2, +fragments, Collection-leash
  +40, untethered bonus, 2 lore recalls). The 2 **lore unlocks now reveal** their buried-cycle
  memory text on purchase (was a dangling hook). `src/systems/meta.js` + `data/systems/meta.json`.

## ✅ DONE 2026-06-18 — Launch roster + craft-class floor + recovery finding
Resolved three P1 items. (1) **Craft-class floor:** every class in `classes.json` now has a
`combatRole` — **75 combatant / 44 support / 6 noncombat** (measured untethered L4 win-band +
whether it has a real combat kit). Surfaced in creation: support/noncombat picks show a caution
("weak in solo descents — pair with a bonded ally"), allowed not gated. (2) **Launch roster:**
`_meta.launchRoster` = 12 curated fair basics (warrior/brawler/monk/fencer/lancer/scout/hunter/
archer/rogue/spellblade/cleric/vanguard), shown with a ★ "Recommended start" badge + detail line
(`creation.js`). Browser-verified. (3) **Recovery economy — finding:** it's NOT the lever —
untethered (System-OFF) descents clear **0% at every recovery rate 0→0.6** because you die *in*
a fight at depth (under-leveled vs floor + enemy growth > player growth). Untethered is
**meta-gated by design** (refusing the System is meant to be brutal until meta-progression makes
it viable) — coherent with "you need the System, that's the horror." Deeper tuning needs human
playtest. Details in `docs/FIX_LIST.md`.

## ✅ DONE 2026-06-18 — P0 RUN LOOP verified in-engine + corruption wired into play
The roguelite run loop was found already BUILT (FIX_LIST was stale) and is now **headless-verified
end-to-end**: Dawnhearth **DescentGate** (tethered/untethered choice) → `descend` chains the
`RunFloor*` pool → `RunBoss*` boss → clear/death/collection → return to the hub with carry-over
(Memory Fragments + deepest floor); a **Remembrance** NPC (`meta` cmd) spends fragments on
permanent unlocks. Pure controller = `src/systems/run.js` (`GameRun`); engine wiring in `main.js`
(`descend`/`meta` cmds, `_runReact`, `_endRun`, `_metaMenu`). Verified: start→RunFloorC→D→E→
RunBoss2→**cleared**, meta `runs/clears/deepest/fragments` update; combat inits with 0 errors.
**Also wired this pass:** the **corruption tier atk penalty** now applies in LIVE combat
(`combatview.buildPlayer` → `GameCorruption.atkMod` on the active run's Surveillance), so leaning
on the System's saves costs you atk that mounts tier-by-tier until Collection — the dilemma now
has felt teeth in actual play, not just the sims. Added a small `window.GameDebug` hook
(player/teleport/fireEvent/run/meta) for headless tests + content authoring. **Remaining:** the
good/true **ending gates** (`GameCorruption.endingsOpen`) need an actual ending sequence to gate;
recovery-economy tuning (`sim_run --rest`) and the launch-roster/craft-floor decisions are next.

## ✅ DONE 2026-06-18 — P1 combat/balance pass: `validate_design` now ✅ MECHANICALLY SOUND
The core balance pass is complete. `validate_design.mjs` went from 🟡 CONDITIONAL (2 WARN) to
✅ MECHANICALLY SOUND — all four checks PASS: Build diversity (53/101 fair, 1 legit-dominant
apex), Difficulty curve (avg depth 5.4/8, 21% clear), No degenerate build (0 unkillable / 0
one-shot), ★ Intervention dilemma (tempting +4.67 depth / costly +701 Surv/run). **What was
done:** auto-tuned the 19 overtuned advanced/master combat classes' `statProfile` (atk/hp
scaled into the 0.3–0.9 untethered-skill win band, intervention OFF) and gave `the_unmade` a
dignified non-degenerate profile (150hp/28atk/45def). The earlier "combat is too hard" framing
was stale — the live blocker had flipped to **overtuned** (125/125 dominant in the tethered
read; everything won 100%). The tethered `sim_run`/`sim_balance` 100% is BY DESIGN (System
saves you → you clear but get collected); the honest skill read is the intervention-OFF Build
diversity check. `sweep_tether` still shows ~99% collected because its bot always accepts the
save — that's the intended punishment for leaning, not a balance bug (the careful/reckless mix
is a player-choice axis, validated by the dilemma check, not the one-policy sweep). Updated
notes in `docs/FIX_LIST.md`.

### 🔴 NEXT — remaining P1 + the P0 run loop
- **Decide the craft-class floor** (~47 below-fair lifestyle classes): survivable minimum kit
  vs. formally "non-combat, needs an ally" (then the tutorial fight must not hard-gate them).
- **Pick the launch roster** (~10–15) from the 53 fair classes.
- **Build the run loop in-engine** (P0) — the roguelite descent only exists in the sims; until
  it runs, the game is the Dawnhearth opening only. The sweep's careful-accept survivability
  (recovery economy / save-trigger tuning) is best finished once the loop is in-engine.

## ⏳ PENDING (next session) — MAP GENERATOR: gameplay + content next steps
Owner asked to save these for next time (the "act as a game dev" roadmap). **#1 and #2 are
DONE** (2026-06-18): `tools/mapcheck.py` = validation + batch-preview harness (reachability /
event-interactability / overlap / route-edge validators + color-coded contact sheet; run
`python3 tools/mapcheck.py batch`). Gameplay layer in dungeons: a **reachability GUARANTEE**
(`ensure_connected` + `_is_open` prop gating + `repair_prop_connectivity`; towns get
`ensure_doors_reachable` — mapcheck now 0 FAIL), **roaming encounters** (tier+depth scaled,
contact→battle), **loot chests** (deep/dead-end rooms, money+consumable), a **critical path**
(Alpha = farthest room, real boss battle) and **loop edges**. `write()` now honors per-event
graphic/trigger/commands. **Still TODO (in priority order):**
- **#3 — Data-driven templates / recipes.** Author intent in JSON (`{town, biome, anchors,
  buildings:[{type,npc}], landmarks, hook}`) and let the generator fill detail. This is the bridge
  to the **World Area Bible** (`data/world/<region>.json`) and enables **hybrid authoring** —
  hand-place anchors/quest spots, generate the filler around them (the proper way to "regenerate
  Dawnhearth" without wiping its tutorial events).
- **Extend the gameplay layer to routes/forests** — roaming encounters + the frayed-road ends and
  one deliberate landmark per route/forest (see `docs/MAPGEN_SPEC.md` §3–4).
- **Dungeon room-shape variety** — mix small chambers / large halls (pillars) / **organic cave
  rooms** (cellular-automata blob carve), break rectangles by merging/blocking (MAPGEN_SPEC §6).
- **Biome system** — one biome def (palette + autotile set + prop tables + encounters + weather)
  driving every archetype so Verdara/Halveth/Calderra/Vael read as different places.
- **World-graph connectivity** — edge-matched warps so a route's exit aligns to the next map's
  entrance (seamless world; MAP_STREAMING ring-2).

### House/building polish still open (from `docs/MAPGEN_BUILDINGS.md`)
✅ DONE: real door+window tiles (was blank window 54 / boulder-ish recess 116 → real Outside_B 67
window + Door1 closed-door, one window per column), and the **interior/dungeon back-wall side-view
FACE** (`render_north_faces` — walk up, see the wall rise). **TODO:** eave depth/shadow on house
roofs, per-town roof/wall palette, L/3×3/landmark footprints, match interior side/bottom walls to
the face material, and the bigger interior room-sectioning + furniture-by-function rework.

## ⏳ EARLIER PENDING — MAP GENERATOR autotile/interior follow-ups
Done so far (`tools/mapgen.py` + `tools/mapgen_indoor.py`, RM-convention research): flush
same-width house roofs (no side overhang), curated roofs, fixed the `!Door1`→`Door1` sprite
path (doors render again), windows in clean columns, continuous routes/forest trails, a compact
walled castle (keep), and interior furniture arranged against the walls. **Still TODO:**
- ✅ **Autotile bakes DONE** (`tools/build_vx_ace_walls.py`, 2026-06-17): A3 roof-tops + A4 wall-tops
  baked as RM WALL-shape (2x2-block, orthogonal-only) `wang8_lut` autotiles → `rtp_outside_roof`
  (16 roof colours), `rtp_<scene>_wall` (24 wall-top terrains ea.); A4 wall-SIDE faces baked as a
  structural cap/body/base × L/M/R sheet → `rtp_<scene>_wallface` (`.json` `slots` map). All wired
  into `_rm_sets.json` (A3/A4 tabs = baked, raw kept as A3raw/A4raw, new A4face tab). Blob-render +
  LUT-validity verified. **A1 water already baked**; **A1 "waterfall" found to NOT exist in the RTP
  A1 sheets** (rightmost A1 columns are extra sea/ice water *variants*, not a vertical waterfall) —
  nothing to bake; could optionally add those water variants as fills later.
- **Interior wall LOOK — walls should "come up" like real RM interiors.** Right now interior/dungeon
  walls render as a flat bordered band (top-down A4 wall-top 9-slice). Owner wants the proper
  **side-view wall FACE with visible height** — you can see the wall rise (the lower wall lip with
  shading), the standard RM look. **Art is now ready** (`rtp_<scene>_wallface` slots); remaining work
  is to consume it in the **indoor prop sheet + builder** (stack cap row + repeating body face below
  a wall-top), not just the single wall block.
- **Room construction in interiors AND dungeons** — rework how rooms are **sectioned off by walls**
  (proper interior walls dividing rooms/hallways, doorways between them) and **how items are placed**
  within rooms (purposeful, against walls, room-function-driven — not scattered).
- **Furniture orientation** — beds and some other furniture come in **vertical AND horizontal**
  variants; the generator should pick/place the correct orientation per spot (e.g. bed along a side
  wall = horizontal, against the back wall = vertical). Add the horizontal tiles + orientation logic.


> **2026-06-15 — Art switch: Pixel Fantasy → "XP-for-MV".** Owner decision: drop Pixel Fantasy,
> use the **"XP graphics reformatted for MV"** pack (RPG Maker XP RTP, LadyBaskerville) everywhere
> incl. the editor. Raw pack lives at `assets-source/xp-for-mv/` (59 tileset sheets 768×768@48px +
> 193 MV `$`/`!` character sprites) — ⚠️ **EULA-gated, prototype-only** (`LICENSE_FLAG.txt`; RM-engine-
> only + must own RM XP). `tools/import_xp_for_mv.py` imports the sheets → `data/tilesets/xp_*`
> (plain 48px grids). **Update: BOTH packs now coexist** — owner asked to restore Pixel Fantasy
> alongside XP, each as its own selectable **Set** (Set dropdown) with A1–A5/B/C/D tabs like RPG
> Maker XP. `_index.json` = 82 sheets (23 `pf_*` + 59 `xp_*`); `_rm_sets.json` = 7 sets: Outside/Town/
> Inside/Dungeon **(XP)** + Outside/Inside/Dungeon **(Pixel Fantasy)** (PF keeps its A3 roofs +
> baked `*_ground` autotiles). Starter `AwakeningCamp` on `xp_a2_outside` (grass gid 0); game boots clean. **Autotile (wang) bake for the A2 ground is a TODO**
> (A2 tabs paint raw for now; baker `tools/build_pixel_fantasy_autotiles.py` is PF-hardcoded — adapt it).
> **Deploy hygiene:** `pages.yml` now **strips `assets-source/` from the Pages artifact** so the raw
> EULA pack isn't publicly hosted (note: tiles the game actually renders are still served — only clean
> art truly ships). The 193 XP character sprites are ready for Stage 3 (events + sprite picker).

> **2026-06-15 — Map editor → RPG Maker rebuild, STAGE 1 (done).** Owner direction: rebuild the
> map editor to mirror RPG Maker (XP + MV/MZ) and **purge all tiles/maps except Pixel Fantasy
> (`pf_*`)**. ⚠️ PF is commercial/EULA/non-shippable (`PIXEL_FANTASY.LICENSE.txt`) — flagged to owner,
> proceeding as prototype. **Stage 1 shipped:** (a) deleted every non-`pf_*` tileset + all old
> maps/layouts; `_index.json` is PF-only; fresh PF grass starter `AwakeningCamp` (game boots clean,
> headless-verified). (b) `data/tilesets/_rm_sets.json` groups `pf_*` into RM A1–A5/B/C/D/E **sets**
> (Outside/Inside/Dungeon). (c) editor palette reworked: **Set selector + MV A–E tabs (one sheet) ⇄
> XP single stacked sheet** (`tabModeBtn`); cells still store global ids via the existing layer-group
> model. (d) **chrome reskinned to the RPG Maker XP layout**: menu bar (File/Edit/Mode/Draw/Scale/
> View/Tools/Game/Help) + grouped icon toolbar (file · edit · undo/redo · layers 1/2/3+event · draw
> tools · scale 1/1·1/2·1/4 · tools · playtest); W/H/Resize moved to the side panel. Buttons without
> features yet (cut/copy/paste, undo/redo, layer 3, event, database/materials/script/sound) show a
> "coming in a later stage" toast. **Agreed full scope (contract A–H):** A tab models (both), B layers
> (1/2/3 + auto upper/lower) + shadow pen + region IDs, C tools (shift-map/copy-paste/undo-redo),
> D events + list editor, E map props, **G sprite/charset event graphics**, **H Charas-style character
> GENERATOR on the open LPC part set** (CC-BY-SA/GPL/OGA — chosen for IP-clean). Formats may be
> extended (backward-compatible). **STAGE 2 DONE (live):** real **Layer 3** (upper, exported as
> `upper_*`, engine renders it above the player), **Undo/Redo** (snapshot history, Ctrl+Z/Y),
> **Region IDs** (paint 1–63, `region_ids[]`), **Select tool + Copy/Cut/Paste/Delete** (Ctrl+C/X/V,
> active-layer clipboard → paste arms a stamp) **+ Shift Map**, and **Shadow pen** (quarter-tile masks
> `shadow[]`, engine renders over tiles/below player). Also added an **orientation chooser matching the
> game** (Portrait/Landscape/reverses via styles.css `.orient-*` transforms; `dvh` fix so the menu bar
> isn't clipped on mobile) and a **📷 screenshot button** (uploads to the `screenshots` branch → shareable
> link; that branch was created). **Remaining stages:** 3 = events + sprite/charset picker; 4 = LPC
> character generator. Headless harness: serve `python3 -m http.server 8099`, run `/tmp/edcheck.mjs`
> (editor) / `tools/bootcheck.mjs` (game) with puppeteer-core from `/tmp` + chromium at
> `/opt/pw-browsers/chromium-1194` (CHROME env, `--ignore-certificate-errors` for live URLs).

## What this is
A browser-based, **GBA-style (240×160 logical) 2D top-down LitRPG survival sandbox**.
Core premise: *"The System helps you, and that's the horror."* Full design lives in the
`*.md` design docs (`DESIGN.md` is the entry point; companions: `WORLD.md`, `MAP_STREAMING.md`,
`PROGRESSION.md`, `CLASSES.md`, `SKILLS.md`, `CRAFTING.md`, `ECONOMY.md`, `ENCOUNTERS.md`,
`LIVING_WORLD.md`, `HIDDEN_LAYER.md`, `OVERFLOW.md`, `TRAVERSAL.md`, `WEATHER.md`,
`GAZETTEER.md`, `WORLD_MAP.md`).

The engine was lifted from a sibling Pokémon prototype repo (`Pokemon-Game`). That repo's
`CLAUDE.md` documents the engine internals in depth (input/menu bug history, start-menu
architecture, map system, save system) and is still the best reference for how the
`src/` code behaves — the code here is the same code.

## CRITICAL RULES
- **🎮 BUILD IT LIKE RPG MAKER — OWNER DIRECTIVE (highest priority for new features).**
  The owner wants **as much as possible to be authorable/editable BY THEM without touching code** —
  i.e. **data + editable event blocks** (the map-editor event commands, `data/systems/*.json`,
  `common_events.json`), exactly like RPG Maker. When building or changing ANY feature:
  1. Prefer **editable event commands** (register them in BOTH the engine `runCmd` AND the
     map-editor palette + forms) and **data files** over hardcoded JS flow.
  2. Decompose monolithic behaviors into **fine-grained, composable commands** (e.g. the descent
     loop = `run` start/deeper/end + `gendungeon` + a `conditional` kind, not one fat `descend`).
  3. Game-wide settings go in a **System config** (`data/systems/system.json`, the RM "System
     tab" analogue) — e.g. the new-game start position — so the owner changes them without code.
  4. **If something genuinely CANNOT be made data/event-driven, STOP and TELL THE OWNER why**
     (don't silently hardcode it). Default to data; escalate the exceptions.
- **Branch: `main` ONLY.** All work and pushes go straight to `main`. **No feature branches,
  no PRs** (the owner confirmed: while we work on main, a PR would just be merging main into
  itself). Push directly.
- **No build system.** Plain HTML/CSS/JS, all globals (`window.GameXxx`). No npm/bundler.
- Serve over HTTP (`python3 -m http.server 8000`), not `file://`, so `fetch()` works.
- **NO agents / subagents — EVER.** Always run and handle every task yourself directly.
  Do not spawn the Task tool or any subagent. (Enforced in `.claude/settings.json` →
  `permissions.deny: ["Task"]`.)
- **⚠️ PORTABILITY — this is a PROTOTYPE for a 3D Unity rebuild (PC/console, multiplayer).**
  Game **systems = engine-agnostic DATA (`data/systems/*.json`) + pure deterministic RULES
  (`src/systems/*.js`, no DOM)**, separate from **presentation** (canvas/DOM, the throwaway layer).
  Logic + data must port to Unity; rendering gets rebuilt. **Never put game logic in the renderer/UI.**
  See `ARCHITECTURE.md`.

## Deploy
- **GitHub Pages via Actions** (`.github/workflows/pages.yml`). On push to `main` it replaces
  `__CACHE_BUST__` in `*.html` with the commit SHA, then deploys the repo root.
- Live: **https://knightdx91-alt.github.io/Awakened-Calamity/**  ✅ confirmed live & rendering.

## File structure
```
index.html        — central hub (RetroPlay-style card-stack of tiles: Play / Create / World)
game.html         — the game (loads engine scripts in order; boots AwakeningCamp)
map-editor.html/.js — visual metatile map editor (saves to a `maps` branch via GitHub API)
worldmap.html     — original SVG world map ("The Drowned Reach & the Four Reaches")
styles.css        — all game CSS
cloud-saves.js    — cloud save sync (see SECURITY note below)
sw.js             — service worker
src/
  engine/  input.js camera.js map.js renderer.js script.js battle.js
  ui/      hud.js startmenu.js dialogue.js controls.js layout.js system.js flymenu.js summary.js
  data/    save.js achievements.js factions.js
  assets/  UI chrome art (PLACEHOLDER — see ASSETS_NOTICE.md)
  main.js  — game loop, player movement, warp/connection transitions
data/
  tilesets/  placeholder.png/.json + _index.json   (clean, generated)
  layouts/awakened/LAYOUT_AWAKENING_CAMP.json
  maps/awakened/AwakeningCamp.json + awakened_index.json
tools/     — map/asset generation scripts (from prototype)
docs/MAP_EDITING.md — full map authoring workflow
```

## Map system (how maps work — same as prototype)
Three layers: **tileset** (16×16 metatile PNG sheet, 16/row, + JSON `behaviors`/`collisions`),
**layout** (`width`/`height` + flat `metatiles[]` + `collision[]` + `tileset` name), **map**
(metadata: `layout`, `warps`, `connections`, `npcs`, …). Regions are registered in `INDEX_FILES`
in `src/engine/map.js`. `game.html?map=<Name>&region=<region>` boots any map directly.
- **`awakened` region is registered**; default boot map is **`AwakeningCamp`**
  (set in `src/main.js`: `currentRegion='awakened'`, default `_startMap='AwakeningCamp'`,
  and the fallback loader / `window._mapName`).

## ⚠️ SECURITY — cloud-saves token
`cloud-saves.js` embeds a GitHub token (stored reversed). Carried over from the prototype as a
**temporary** measure with owner sign-off. **Plan: move it to a Cloudflare Worker** so no secret
sits in the repo; rotate the token when that lands. Don't treat it as safe.

## ⚠️ ART / IP — read before any public release (see ASSETS_NOTICE.md)
- **Clean / shippable:** all `src/**` JS (engine code), the map format, `data/tilesets/placeholder.*`,
  `data/maps/awakened/*`, `data/layouts/awakened/*`, `worldmap.html`, all design docs.
- **Placeholder, MUST be replaced:** UI chrome art under `src/assets/` (start-menu icons, party
  screen, fonts, battle terrain, bag/journal/pokedex/trainer_card) — Game Freak/Nintendo-derived.
- **Deliberately NOT brought over:** the 538 ripped tileset PNGs, all real-region maps, Pokémon
  species/encounter/sprite data. We ship only our own generated tileset.

## Status — what's done
- ✅ Engine bundle booting: tile renderer, map loader + connection system, camera, `justPressed`
  input, HUD, start-menu/window system, dialogue, orientation, on-screen controls, 3-slot save.
- ✅ **Official design system imported** (`design-system/`) — the owner's IP-clean art + UI:
  tokens (`tokens/colors.css` warm FireRed + cold System), components, ui_kits, guidelines,
  scene mockups, and original **16×16 tilesets** (terrain/buildings/dungeon/props + pond/road
  3×3 autotile patches). `game.html` links `design-system/tokens/colors.css`.
- ✅ **Tilesets** (`data/tilesets/_index.json`): official `ac_terrain/ac_terrain2/ac_buildings/
  ac_dungeon/ac_props`, autotile `ac_ground` (grass + pond/road 9-slice → wang8_lut). Plus
  license-clean imports kept as palettes/options: `forest_terrain` (CC0, .tres wang8),
  `synth_terrain` (layered grass/sand/stone/water/void synth autotiler), `coast_cc0`,
  `overworld_buch` (CC-BY), `punyworld`/`punyworld_full` (CC0), `oga_rpg16` (CC-BY-SA),
  `ufeff` (CC0), `puny_dungeon` (CC-BY). Each has a `.LICENSE.txt`. **Use the `ac_*` official art.**
- ✅ **Autotiler**: editor **Terrain brush** (`map-editor.js`) bakes `wang8_lut`/`edge4` autotile
  configs (`<tileset>.autotile.json`) into plain `metatiles[]` + persists `layout.terrain[]`.
  Layered priorities (terrain-vs-terrain edges). `tools/build_ac_ground.py`, `synth_terrain.py`,
  `import_forest_terrain.py` build configs.
- ✅ **Engine overlay layer** (`renderer.js`/`map.js`): `layout.overlay_tileset` + `overlay[]`
  draw buildings/props ON TOP of an autotiled base → towns with autotiled ground in one map.
- ✅ **Player sprite** wired (`data/sprites/player.png` from CC0 Puny Character-Base via
  `tools/build_player_sprite.py`). Fixed a loop-killing crash (`HUD.update` `visitedMaps.add`).
- ✅ **HUD survival meters** — Surveillance (cold System gauge) + Stamina/Exposure (warm bars);
  `GameHUD.setMeters({surveillance,stamina,exposure})`, persisted to `state.survival`.
- ✅ **Start menu rebuilt to survival** (no Pokémon): **CAMP · BONDS · SUPPLIES · AFFINITIES ·
  REACHES · SYSTEM** (+ Save/Options/Exit). BONDS hidden until `state.bonds[]` non-empty.
  SYSTEM is the cold interactive panel (services raise Surveillance). New DOM builders on the
  design-system palette.
- ✅ **Source purge**: removed ~2200 lines of dead Pokémon builders + scrubbed save/factions/
  achievements/hud; `pokemon_*` localStorage keys → `ac_*`; empty starter party. **Remaining
  Pokémon code = donor combat only** (`battle.js`, `summary.js`, `battle_assets.*`).
- ✅ **AwakeningCamp** (default boot map) + sample maps rebuilt on official art. Maps auto-sync
  to the editor's `maps` branch via `tools/sync_maps_branch.sh` (editor `GH_REPO` →
  `awakened-calamity`). Data fetches use `cache:'no-cache'` + `?b=<build>` so the live page
  always gets the latest map/art.
- ✅ Deployed & verified live on GitHub Pages.

## Next steps (priority)
1. **THE STORY** (next focus) — opening beat (arrive in **Dawnhearth** → first crystal/System contact
   → the hook) + main throughline, built with the event-command + map tools (see "Event commands" below).
2. **Master tier content** — flesh the Master tier from 6 → ~50 (authored as Advanced→Master path-gated
   evolutions); it's already wired into the creation grid (ringed gold) + the evolve logic. Then GM+.
3. **Wire survival systems to gameplay** — Stamina drains in Wildlands, Exposure from biome hazards,
   **Surveillance** already rises from System-shop services; **Bind** flow → `state.bonds[]`.
4. **Non-combat lifestyle skills** — craft/gather/social skill `effect` hooks exist as DATA but are inert;
   build the systems that consume them.
5. **REACHES fast-travel** — actual warp targets (raise Surveillance), unlock landmarks.
6. **Cloud saves → Cloudflare Worker** (remove embedded token; still in `cloud-saves.js`+`map-editor.js`).
7. **Cleanup** — startmenu's old `_buildSystem` panel is dead code (System is now the town crystal hub);
   remove when convenient.

## Dawnhearth opening — content/writing pass (2026-06-17)
Fleshed the opening from a 16-box skeleton to **32 faced text boxes** + a 4-option Mira info choice +
the cold-open. Added townsfolk (all with RTP face portraits, browser-verified): **Old Bram** (cycle
foreshadow), **Tessa** (Surveillance/Audit dread), **Pip** (child flavor/nudge), **Lys** (the hook —
brother Joran taken for going off-grid), **Vanguard Sentry Corwin** (enforcer). Examinable props:
**Well**, **System Poster**, **Memorial** (cycle hints, faceless). Mira now has personality + an
[name]/[designation]-aware info choice (System / Dawnhearth / Self). **`docs/DAWNHEARTH.md`** tracks
street content (built) + the **interiors to BUILD** (Mira's Hearth, Infirmary w/ Sister Wenna, the Inn
[DawnhearthInn.json exists — wire Door12], Market/off-grid supplier, Joran's locked house, the Ashlab
OWPS annex [DawnhearthLab.json exists]) with door→building links + contents. Verified in headless
chromium: faces render, the choice menu shows, zero errors.

## Dawnhearth opening tutorial — SCRIPTED & browser-verified (2026-06-17)
The `awakening` quest is now a playable opening, authored as map events in `data/maps/awakened/
Dawnhearth.json` + a cold-open in `_newGame`:
1. **Cold open** — `_newGame` runs a System intro (`runCmdList`: "Welcome, [designation]…") then nudges
   toward Mira. (New `_subTokens` substitutes `[name]`/`[designation]` in dialogue text.)
2. **Mira** (id14 @12,18, face People1) — quest-stage-gated: greets + directs to the crystal
   (`quest stage 1`); reminds during the hunt; on return **completes the quest**, grants `first_aid`,
   heals, (quest `reward.money:200` pays once).
3. **System crystal** (id13) — opens the shop, then advances `stage 1→2` (nested conditional).
4. **TutorialFiend** (id15 @34,24, Monster1, touch) — `stage 2`: battle an emberling →
   advance `stage 3` → despawn.
5. **NoticeBoard** (id16 @24,28) — the hook (Vanguard notice + scratched plea about Joran taken for
   going off-grid).
**Verified end-to-end via headless chromium:** Mira→1, crystal/shop→2, monster fight→3, return→done +
200Cr + First Aid + full heal; zero JS errors. (Engine only fires touch/auto on stepping, so the
cold-open is triggered from `_newGame`, not an auto tile.)

## No in-battle regen + persistent vitals + healing (2026-06-17)
- **No passive HP/MP/SP regen in battle** (removed the per-turn regen). Recovery only via items,
  healing skills, or a healer ally. To avoid soft-locks, every fighter always has a **free basic
  `strike`** (cost 0; `skillCost` honors an explicit `sk.cost`). AI falls back to `strike` when it
  can't afford anything; the player FIGHT menu always lists Strike first.
- **Persistent vitals:** HP/MP/SP carry **between battles** via `state.survival.{hp,mana,stamina}`
  (the HUD %s). Combat **seeds** the player actor from those % at start (`_seedVitals`) and **writes
  back** on win/flee (`_persistVitals`); defeat = System "rescue" to 50% HP (TODO real down/penalty).
  Added `hp`/`mana` to the default `survival` (migration backfills old saves).
- **Out-of-battle healing:** System Shop **Full Restore** now restores HP/MP/Stamina (+purge Exposure);
  new **`heal` event command** (engine + editor — what: all/hp/mp/sp, amount% or full) for healer NPCs
  in town / wild healers / infirmaries.
- **Enemy display:** reverted — enemies **can** show status tags again; only their **MP/SP bars** stay
  hidden (player-only). Browser-verified (headless): wounded 40% HP carries into battle, Strike is the
  free first option, vitals persist after the fight. Suites pass.

## Battle overhaul + MP/SP + items-in-battle + designation (2026-06-17)
- **Battle menu = FIGHT / ITEM / RUN** (`combatview.js`): the player turn opens a top action menu
  (▲▼ + A), not a bare skill list. FIGHT → skills (with cost shown, unaffordable greyed) → target;
  ITEM → battle-usable inventory items → choose **which ally/self** to use on → apply; RUN flees.
  Existing enemy target-select kept; item target-select added.
- **MP / Stamina (SP) resource model** (`combat.js`, pure): actors gained `mp/maxMp` + `sp/maxSp`
  (defaults 30/100, build can override). `skillCost(sk)` — **magical (has affinity) → MP, physical
  (power>0) → SP**, support → small SP, scaled by tempo weight. `canAfford` gates the player UI; `act()`
  spends the cost. New `useItem(state,{actorId,targetId,restore})` restores HP/MP/SP to a target and
  consumes the turn. Player cards now show **HP + MP + SP** bars; enemies show HP.
- **Recovery items** (`items.json` + `GameItems.battleRestore/battleUsable`): Potion/Hi-Potion (HP),
  Ether (MP), Elixir (all); Stimulant/food restore SP. Usable in battle (consumed from inventory) with
  ally/self targeting; buyable in the System Shop.
- **Random designation:** creation generates a unique System catalog tag `SUBJECT-XXXX`
  (`player.designation`); `_subjectId()` prefers it (STATUS + System greet). Added to save default.
- Core suites pass (combat/effects/progression); `useItem`/cost logic node-tested. **Not browser-verified.**
- **AI bound by MP/SP too:** `enemyAction` now picks the strongest **affordable** skill (falls back to
  the full loadout only if nothing's affordable). Added **modest per-turn regen** (~MP +6%/+1,
  SP +5%/+2 on each actor's turn) so neither side stalls while resources still gate spam. Node-tested
  (low-res AI picks Jab; full-res picks Heavy Strike); suites green.

## Story + quest/dialogue scaffolding (2026-06-17)
- **`STORY.md`** — canonical story outline (premise, the cycle/buried truth, four acts across the Four
  Reaches, the four endings tilted by Hidden-Layer usage, the Dawnhearth opening beat, cast seed).
- **Quest system:** `data/systems/quests.json` (schema: name/giver/summary/stages[{id,text}]/reward;
  opening quest **`awakening`**) + **`src/systems/quests.js` (`GameQuests`)** pure logic
  (start/advance/complete/fail/setStage/status/objective/list/check). State = `GameSave.state.quests
  { <id>:{status,stage} }` (legacy `{active,completed}` shape migrated to `{}` in `migrate` v1→v2;
  added to DEFAULT). Wired in `game.html`.
- **Event integration:** new **`quest`** command (op start/advance/complete/fail/stage; applies
  `reward` on complete) + **`conditional` kind `quest`** (active/done/failed/notstarted/stage≥) in the
  engine (`runCmd`/`_evalCond`, quest DB preloaded at boot) AND the map editor (command form + cond
  params, quest dropdown via `loadQuestList`).
- **Journal screen:** new **JOURNAL** start-menu page (`_buildJournal`) lists ACTIVE quests (name +
  current objective, selectable → summary) and COMPLETED (struck-through). New Game seeds the
  `awakening` quest so it's live. Dialogue trees use the existing event commands (text+face / choice /
  conditional / switches). Node-tested (quest lifecycle, migration) + suites pass. **Not browser-verified.**
  **Next: script the Dawnhearth opening beat (Mira, crystal, first fight) on this scaffolding.**

## Instant freshness + SAVE-screen fix (2026-06-17)
- **Network-first service worker** (`sw.js`, was a kill-switch): every same-origin GET fetches from
  **network first** (beats GitHub Pages' HTML cache → always the latest deploy on reload), cache only
  as **offline fallback**; `skipWaiting`+`clients.claim` so it controls pages immediately. This is the
  freshness *guarantee*; the `version.txt` check stays as an advisory reload notice for long sessions
  (kept as notify, not auto-reload, to avoid any reload-loop before the SW controls the page).
- **SAVE screen** (`_drawSaveCanvas`) now shows **Class + Level** (+ Subject, Map, Time) instead of
  **Bonds** (which never belonged there). Loads class data on the save page so the class name resolves.

## Updates & save compatibility (2026-06-17)
**Save migration (`save.js`):** `SAVE_VERSION` → 2. `migrate()` now does (1) explicit version steps
then (2) **`_ensureShape`** — a deep backfill that adds any field in the current `DEFAULT_SLOT_DATA`
missing from an old save (recurses plain objects, never overwrites, leaves arrays alone). So additive
schema changes (new menus/systems/fields) load old saves safely **without a version bump each time**.
Verified: a v1 save (no class/skills/progress, partial survival, missing pockets) loads → fields
backfilled, money/name/meters/items preserved, Sets re-inflated. `DEFAULT_SLOT_DATA` gained
`player.{affinity,appearance,class,skills,ownedClasses}` + top-level `progress`.
**Stale-client updates:** deploy writes **`version.txt`** = commit SHA (`pages.yml`). On boot
`_checkForUpdate()` (main.js) fetches it `no-store` and, if it differs from `window.__BUILD__`, shows a
non-blocking "A new version is available. Reload to update." notice (skipped locally where `__BUILD__`
is the placeholder). Saves stay compatible regardless, so it's purely advisory. (Assets already bust
per-commit via `?v=<SHA>`; `sw.js` is a kill-switch that clears caches + unregisters.)

## Item database (2026-06-17)
**`data/systems/items.json`** (21 items) + **`src/systems/items.js` (`GameItems`)** access module
(load/get/all/name/byPocket/shopItems/fieldUsable). Schema: name, pocket (matches inventory pockets),
desc, icon (RTP IconSet), value, stack, `use{type,amount}` (stamina/exposure/cure applied by the
field menu; heal later), `field`/`battle` flags, `gear{slot,…}` for the future equip system,
`shop:true` to list in the System Shop. **SUPPLIES** now shows real names/desc/icons and `_useItem`
applies the DB effect + consumes; **System Shop SUPPLIES** is sourced from `GameItems.shopItems()`
(price = `value`). Wired in `game.html`. Validated + suites pass; **not browser-verified.**

## Deeper survival sub-menus (2026-06-17)
Start-menu sub-pages got a **selectable-row + drill-down** framework (`startmenu.js`): `_subRows`
registry + `_sel(rowEl,onSelect)` + `_runSel()`; `_subCount` returns the row count so up/down move a
**cursor** (highlighted, scrolled into view), A/click activates, B backs out one level. Pages with no
selectable rows still scroll. **SUPPLIES** now drills **pocket list → pocket contents → USE** (Food→
Stamina, Tonics→Exposure, Items→minor; Camp Kits/Tethers note where they're used; consumes + updates
HUD). **BONDS/AFFINITIES/REACHES** rows are selectable (A → detail notify; Reaches notes "not yet
unlocked"). STATUS stays display + the attribute `+` buttons. Notify types fixed to info/warning/danger.
Syntax-checked + suites pass; **not browser-verified**.

## CURRENT STATE (2026-06-17, post class/system build-out)
- **Boot flow:** Title (`title.js`, Continue/New Game) → **Awakening** char-creation (`creation.js`:
  name, appearance from RTP charsets, Affinity, **Class**) → drop into **Dawnhearth**. `?map=` skips
  the title (editor Play). Saves = **localStorage primary + IndexedDB backup**, each a fallback
  (`save.js initStorage`).
- **Classes:** **126 authored** (50 Basic + 53 Advanced + 6 Master + 6 GM + 6 Heroic + 4 Legendary),
  **191 skills**, all refs resolve (`tools/validate_classes.mjs`). Creation grid shows Basic+Advanced+
  Master, **tier-ringed/glowing**; Advanced+ shows a **one-time slow-leveling warning**.
- **Growth loop (all 4 axes):** level (combat XP via `progression.js`) · allocate **attribute points**
  (STATUS screen) · **specialize** + **change class** (System Shop) · **evolve** (auto **pop-up** at
  Lv≥10, `evolve.js`). Logic is pure in `src/systems/{progression,classes}.js`.
- **The System = town hub:** removed from the pause menu; reached via the **floating crystal** in
  Dawnhearth → **`GameSystemShop`** (`systemshop.js`): SUPPLIES / SERVICES / CLASSES; purchases raise
  Surveillance. Opened by the **`system`** event command (reusable on any event/NPC).
- **Audio:** `GameAudio` (`audio.js`) — SE/ME/BGS play; BGM no-ops until pulled.
- **Event commands (engine `runCmd` + map-editor):** text, choice, conditional, switch, selfswitch,
  variable, transfer, **move, setdir, setgfx, spawn, money, item, battle, fade, shake, label, jump,
  comment, se, system, grantclass, grantspec, grantskill**, script, exit.
- **Combat** reads the player's **class + learned skills + allocated attributes**; `onEnd` hook drives
  the evolve check. Pure core unchanged (`combat.js`/`rng.js`), tests green.
- ⚠️ Most UI work this session is **headless/node-verified only — NOT browser-verified** (no Chromium).

## Session log
- **2026-06-12 (1)** — Created repo content from scratch: pushed design-doc bundle, imported the
  IP-free engine + map editor + save systems, generated a clean placeholder tileset/map, built the
  hub, wired the `awakened` region, deployed to Pages (confirmed live).
- **2026-06-12 (2)** — Big build-out session:
  - Fixed the `SessionStart` hook to force `main` across all repos (multi-repo, robust path).
  - **Tilesets/autotiling:** license-vetted & imported many sets (kept the CC0/CC-BY ones as
    palettes), built the **editor Terrain brush autotiler** (`wang8_lut`/`edge4`, layered
    priorities, terrain-grid persistence), a **universal `synth_terrain`** synthesizer, and the
    correct `.tres`-based `forest_terrain`. Added an **engine overlay layer** for buildings on
    autotiled ground. Fixed live-page **caching** (no-cache + build-id PNG bust). Editor maps
    auto-sync to the `maps` branch; repo pointer fixed to `awakened-calamity`.
  - **Sprites/HUD:** wired the **player sprite** (CC0 Puny), fixed a loop-killing `visitedMaps`
    crash, added **HUD survival meters** (Surveillance/Stamina/Exposure).
  - **Owner's design system** pulled from Drive → `design-system/` + imported official `ac_*`
    tilesets; rebuilt **AwakeningCamp** + sample maps on the official art.
  - **Menus:** full rebuild to the survival set (Camp/Bonds/Supplies/Affinities/Reaches/System),
    cold interactive SYSTEM panel, FireRed reskin, then a **source purge** of all Pokémon/trainer
    references (everything except the donor combat engine).
  - Verified throughout with headless Chromium. Ending session at usage limit. **Next: the
    Tempo + Intervention battle rewrite (finishes the purge) and wiring survival systems to play.**
- **2026-06-13** — Fixes + **systems-design pass** (deliberately design-before-visuals):
  - **Fixes:** start-menu **back button** (strict-mode `ReferenceError` from the purge — re-declared
    the dropped `_battle*` callback vars); HUD **meters move to the RIGHT in portrait** + **hide when
    the menu/sub-menus are open**; **landscape orientation now actually rotates 90°** (was a no-op
    reflow). All headless-verified.
  - **Design docs locked** (no code — pinned the systems before building combat):
    - `LIVING_WORLD.md §4.5` — **NPC mortality**: permanent death (player kills + Overflow Breaks +
      wild deaths), **no respawn** — the world repopulates with brand-new NPCs; **memory/gossip**
      spreads speed-bounded; story NPCs immortal.
    - `PROGRESSION.md §3.7` — **XP curve pinned**: `mob_XP = K·Lᵠ·speciesXpYield` (K=17, B=100,
      p=2.2, q=1.6 → ~6 kills for level 1); **per-species** XP yield (Lv5 spider ≠ Lv5 wolf).
    - `DESIGN.md §6.5` — the one-time **Original System** choice: irreversible **full permadeath**
      (player + bonded creatures); difficulty from the System *withdrawing help*, not stat inflation;
      rewards = exclusive class/skill **evolutions** + slower Surveillance + true endings.
    - `CLASSES.md` — **class framework**: hard targets (50 Base / ~50 per Tier / 50 Special), data
      schema, ~half-unique skill rule, **cumulative foundation-skill synergy**, **hidden-objective
      unlocks**; **Claimed Classes & the Reckoning** (stolen order/race/world classes → a roaming
      enforcer finds you → revoke / fight / legitimize); all Open Calls resolved.
  - **Next: Skills** (`SKILLS.md`) — the shared skill library + per-class unique sets the class
    framework assembles from — then build the **Tempo + Intervention combat**.
  - **Combat slice built** (portable, pure): `src/systems/rng.js` (seeded mulberry32) +
    `src/systems/combat.js` (Tempo + System Intervention, no DOM, deterministic) +
    `data/systems/{combat,skills,creatures,affinities,classes}.json`; `tools/test_combat.mjs`
    verifies a full battle + same-seed determinism. `ARCHITECTURE.md` written (Data→Rules→
    Presentation; combat = most volatile layer, skill cost = abstract `weight`).
  - **Classes — 4 growth axes locked** (`CLASSES.md §1.7`): **level** (no forced evolution, NO
    hard cap), **specialize** (in-class focus → mastery bonuses; the reason to stay), **evolve**
    (climb lineage), **change** (lateral, keep skills). Schema gained `maxLevel`+`specializations`
    (§1.5); `PROGRESSION.md §4` notes no per-class cap (only the ~450 character soft cap).
  - **Data authored:** `data/systems/classes.json` = **19 Basic classes** (toward 50), each with
    `specializations`; `data/systems/skills.json` = **80 skills** (all class refs resolve).
  - **Next: more Basic classes toward 50**, then Advanced-tier evolutions; build the combat VIEW
    (presentation) and `src/systems/progression.js` (XP/leveling).
  - **Class growth refined** (`CLASSES.md §1.7`): low Tier = flatter curve **not a free ride**
    (every level still costs more, `L^2.2`). **Evolutions are PATH-GATED** — the build you played
    (skill composition first, then stat/affinity) decides *which* branch is offered (Warrior+heal→
    Paladin; pure-damage→Reaver). Schema gained `EvolveBranch{class,requires,default}`. **Specialization
    steers + narrows:** `opensEvolution` hard-points a branch, `narrowsTo` restricts the post-evolution
    skill pool to that focus (Smith→runes→Runesmith learns rune skills only).
  - **Self-teaching skills** (`SKILLS.md §1.5`): bootstrap any non-signature skill with the right tool at
    Rank 0 (`untrainedPenalty`), grows by use; trainers = shortcut/key, not the only door. Canonical
    knife→skinning case. Skill schema gained `tags[]`/`selfTeachable`/`untrainedPenalty`/`toolRequired`.
  - **Content:** **Leatherworker** base class (leather/hide armor) + the **full Smith lineage Basic→
    Legendary** (25 nodes, all 6 tiers, branch-then-converge into 3 Legendary capstones + 1 Untethered
    apex "The Unmade", Original-System only). Renamed to drop the repeated "-wright" → **naming
    convention locked** (`CLASSES.md §1.5`: vary roots). Now **45 classes / 110 skills**, all refs
    resolve, combat deterministic.
  - **DECISION — Class Generation / Discovery Layer** (`CLASS_GENERATION.md`, designed NOT built):
    authored classes are the backbone; beyond them, a **deterministic, lazy, memoized generator** mints a
    class when a player meets an **EXACT condition-set** no class claims, **persists it to a registry**,
    and serves the same class to anyone meeting the same exact conditions. Exact-match (not fuzzy) =
    memoization, easy to code; only reached permutations ever materialize; on-theme (the System
    catalogues new classifications). Hard part = **condition granularity** tuning; shared registry =
    **server feature** (3D), local in 2D. Story/Claimed/Anomalous/Untethered stay hand-authored.
  - **Build space** (`BUILD_SPACE.md` + `tools/build_space.mjs`): a single-class start yields **≈10²⁰¹**
    distinct characters — emergent from linear content × systems (dominant term = skill composition,
    10¹⁰⁸, a consequence of self-teaching). Justifies "endless"; strategy = **vertical slice first**.
  - **Feasibility verdict** (solo + Claude): yes — the 10²⁰¹ is the *cheap* (emergent) part; the real
    bottlenecks are content VOLUME, balance/feel (needs owner playtest), and presentation/asset
    licensing. Build **vertically** (one playable loop) before widening content.
  - **Combat slice BUILT & wired** (`src/ui/combatview.js`): the **SELECT button starts a Tempo +
    Intervention battle** (Smith vs a creature) for testing. Pure rules core (`src/systems/rng.js` +
    `combat.js`) now **loaded in `game.html`**; the view is presentation-only (renders state, forwards
    input — no logic), GBA-dark with a cold-cyan **SYSTEM Intervention** bar + Surveillance readout.
    Menu shows the Smith's combat actions (Jab/Heavy Strike/Guard/Mend) with tempo costs; up/down + A
    to act, B to flee. Headless-verified: battle starts, turns resolve, result shows, view tears down.
    Smith (crafter, atk 16) is intentionally a weak fighter — winnable vs Emberling with Guard/Mend,
    loses to Thornwolf; Intervention fires only when a player actor drops ≤35% HP (the bait).
  - **Combat depth pass (real-time bars + effect types):**
    - **Real-time Tempo bars** — view now drives the core's new `GameCombat.step()` once per ~45ms via
      `requestAnimationFrame`, so bars FILL in real time (ATB feel); pauses on the player's turn
      (`pause_on_act`), surfaces the System Intervention as its own beat. Headless-verified (bars seen
      partially filled, not instant).
    - **Effect-type framework in the pure core** (`src/systems/combat.js` rewritten): status model +
      `step()`/`advanceToReady()` split. Implemented **AoE** (cleave splash), **slow**, **mark**,
      **sunder** (armor shred), **applyToxin** (DoT), **taunt** (forces enemy targeting), **summon**
      (AI ally), **partyBuff**, **selfCost**, **counter** + **evade** + **crit** (reactive/passive
      folded into traits at createBattle), **bonusVsUnaware**. `tools/test_effects.mjs` = 11 checks all
      green + determinism. Test Smith loadout now shows several live (Pin Shot→SLOW, Coat Blade→toxin,
      Unmake→armor↓, Riposte counter).
  - **Progression BUILT & wired** (`data/systems/progression.json` + `src/systems/progression.js`,
    pure): XP curve (B=100,p=2.2,tierMult), mob XP (K=17,q=1.6), level-diff bands, points-per-level by
    Tier, soft cap. `tools/test_progression.mjs` (12 checks). Combat awards level-diff-modified XP on a
    win, auto-levels, grants attribute points, persists (save or module-static), shows `+XP / LEVEL UP`.
    Added `dummy` (Hollow Husk) training creature for reliable SELECT testing.
  - **Multi-enemy combat VIEW + target select BUILT** (`combatview.js` rewritten actor-driven): renders
    N enemy/ally/summon cards (dynamic, dims the dead), **target selection** for single-target skills
    (◄►, B to back; auto for AoE/self/heal), **AoE hits all foes**, XP **sums across all kills**.
    `start({enemies:[{key,level},…]})` spawns multi; **SELECT itself now ~40% spawns a 2-3 foe pack**
    so multi-enemy is testable in-game. Headless-verified: 2 cards, target switch, Cleave hits both,
    +118 XP→Lv2. Player loadout gained `cleave`.
  - **Next on combat:** ally/party for the player side (summons already render & fight); `intercept`/
    `guardAlly` redirect (stubbed). Broader: wire survival meters + a real SUPPLIES inventory, encounters
    (so battles start from the world, not just SELECT), attribute-point allocation UI. Then resume class
    content / prototype the discovery-layer registry.
- **2026-06-14** — Art pipeline + System OS UI + design-bundle adoption:
  - **Claude Skills installed** (`.claude/skills/`): game-dev/3D/shader set (Snyk roundup),
    `tripo-text-to-3d` (text→.glb), and **`pixellab`** (all-purpose pixel-art gen via PixelLab API:
    image/tileset/mapobject/character/object; now supports `--color-image` palette reference).
    Keys: `PIXELLAB_API_KEY`, `Tripo_Api` (env). PixelLab MCP also wired (`.mcp.json`).
  - **Procedural art tools** (`tools/`): `gen_zone.py` (autotiled terrain + object stamping →
    playable map JSON), `build_house.py`/`build_building_tileset.py` (modular buildings: rect/L-shape/
    hip roofs, keep + curtain-wall castle, 6 materials), `nine_slice.py` (UI 9-patch→CSS),
    `town_mockup.py` + `official_town_mockup.py`, `bootcheck.mjs` (headless boot verify via
    Playwright chromium + puppeteer-core).
  - **System OS UI shipped & headless-verified**: minimal HUD (HP/MP/SP vitals + conditional
    Exposure), start menu + sub-screens + title bars + dialogue + notifications reskinned to dark
    holographic glass + cyan (flipped `_FR` + `--fr-*` vars), SysPanel corner brackets, SAVE/OPTIONS
    fixed (DARK theme was returning light bg) + OPTIONS content cleaned (dropped Pokémon/theme cruft).
  - **Variable tile size**: renderer reads per-tileset native size + per-map `layout.tileSize`
    (camera viewport derives from it). `GenTown32` = 32px demo.
  - **DECISION — adopt the owner's official art** (the other Claude account pushed the design bundle
    to the `design-bundle` branch = Claude Design handoff). Imported **11 official `ac-*` tilesets**
    → `src/assets/tiles/`. The procedural PixelLab buildings looked bad (flat + clashing colors);
    the **official `ac-buildings-16` assemblable kit** (roof corners/eaves/walls/doors, one cohesive
    palette) is the building source of truth. `tools/official_town_mockup.py` proves it. PixelLab
    stays for **gap/bulk content**, palette-locked via `--color-image`. Owner wants colors leaning
    **RPG Maker XP** (warm/saturated) — `data/art/palettes/rmxp.png` started; direction not finalized.
  - Handoff doc for the design tool: `docs/CODE_SIDE_CAPABILITIES.md`. Research notes:
    `docs/TILE_CONSTRUCTION_NOTES.md`, `docs/BUILDING_TILESETS.md`, `docs/TILESHEET_CHECKLIST.md`.
- **2026-06-15** — **Systems-decisions pass: every "Open Calls" section in the design bible RESOLVED**
  (design-only session, no code). Walked the owner through each doc's open calls; locked each into the
  doc. **Eight docs closed + cross-cutting reworks:**
  - **`ENCOUNTERS.md`** — (1) down trigger = the **player** (targetable even with a creature out), not
    party-wipe; (2) material loss on death = **everything carried** (town stash is the safe store);
    (3) **creature death is PERMANENT** — no revive items, no Safe-Zone resurrection; (4) encounter
    model = **Tales-of-the-World: Radiant Mythology** (visible roaming monsters with detection cones
    that **chase**, contact = battle) + **ambush** spice; rates tune in playtest.
  - **`PROGRESSION.md`** — XP curve already pinned; (2) **creature XP = active-only, unshared** (earns
    only if it fought); (3) attr points/level tier-scaled; (4) **attributes reworked to a conventional
    8-stat LitRPG set: Strength/Agility/Constitution/Intelligence/Wisdom/Perception/Charisma/Luck**
    (Luck split out) — updated `data/systems/progression.json` (tests green); (5) **NO respec** — builds
    permanent (propagated to `CLASSES.md`×4 + `ECONOMY.md`).
  - **`CRAFTING.md`** — **capturing is class/Shop-gated** (Tamer line innate, else buy Bind from Shop;
    Tether is just the tool); recipes **expand like the class system** (tiered Basic→Legendary lineages,
    branching, discovery — "a lot"); gear **durability = items wear & BREAK**, DIY-or-pay-NPC repair,
    soft repair cap; gear slots **player 6 (incl. hazard slot) / creature 2**; node density scales
    inversely with depth.
  - **`ECONOMY.md`** — rep from **all sources** (bounties+discoveries+donations+story); catalog is
    **price-gated, NOT rep-gated** (full Legendary catalog visible from start, affordability is the
    wall; rep drives price+class access); class cost = super-linear Cr + escalating gates, **nothing in
    shops is free**; per-town rep + **fractional bleed along faction lines**.
  - **`TRAVERSAL.md`** — creature field-utility **passive** (always-on if in party, no exposure); keep
    **6 capabilities**; **gates SOFT by default** — reward ingenuity / multiple solution paths /
    cleverness is "special" (taming never required).
  - **`WEATHER.md`** — weather-only now (**seasons saved as a later option** on a compressed calendar —
    real-time-clock pacing flagged to revisit); forecast = **Skyguard guild service**; battle swing
    **small (~10–15%)** so weather's real weight is the survival/Exposure side.
  - **`LIVING_WORLD.md`** — traveler roster locked at **~50 named roamers** (make them distinct); pin
    list stays per-quest authoring (rule already set).
  - **`MAP_STREAMING.md`** — **prototype-scoped** (moot for 3D): ring depth **2** (full 3×3, seamless
    incl. corners), scene-based sea travel, instant indoor fade, cinematic boats.
  - **Cross-cutting:** **"era" framing purged game-wide** (Pokémon-prototype holdover) — kept the
    T1–T4 **tier bands**, renamed "level/depth tiers" (reworded across PROGRESSION/WORLD/ECONOMY/
    CRAFTING). **`DESIGN.md` reframed:** Tempo+Intervention is the **2D prototype's** combat; the **3D
    target = class-driven ACTION combat with the Intervention layer carried over** (the headline
    original mechanic, combat-model-agnostic). **Bind reframed as a class subsystem, NOT a headline
    pillar** — game positioned as a **System-horror LitRPG action-survival RPG**, not a creature
    collector. Added **creature-origin lore**: bonded creatures *are* the world's monsters — System
    onlining **mutated native fauna** (giant ant / fire salamander / dire wolf, overworld) + **pulled
    otherworld creatures** into dungeons (bipedal night-lizards); **bond-what-you-fight** flow (find →
    fight → attempt Bond before the kill → if it accepts, it's yours), tied to the Overflow loop.
  - **Emergent identity:** every decision points one way — **permanence & earned weight** (permadeath
    creatures, breakable gear, no respec, nothing free, choices you live with) under the System-horror
    hook. **Reviewer take (recorded in chat):** strong original hook in a hot (LitRPG) lane; works as a
    **3D single-player / small co-op** game; **does NOT scale to a themepark MMO** (personal
    System-horror dilutes); the one real risk is **content VOLUME**, not the design.
  - **Spawned (designed-not-built, deserve own docs):** **`CRAFT_DISCOVERY.md`** (recipe
    experimentation/discovery layer, mirrors `CLASS_GENERATION.md`) + a **3D per-class action-combat
    model** doc. **Next:** owner to direct (vertical slice, a new doc, or content).
  - **Pixel Fantasy RMMZ tile import** (owner-provided commercial pack on the `pixel-fantasy-assets`
    branch under `pixel-fantasy-rmmz/`). ⚠️ **Commercial / NOT CC0 / EULA-gated** (external RPG-Maker
    EULA likely restricts to RM engines) → flagged `data/tilesets/PIXEL_FANTASY.LICENSE.txt`,
    **placeholder/non-shippable** until cleared (consistent with `ASSETS_NOTICE.md`).
    - **Pass 1 (done, headless-verified):** imported all **20 sheets @native 48px** → `data/tilesets/
      pf_*` (Outside/Inside/Dungeon × A1–A5/B/C/D), plain-grid JSON (`tile:48`, per-row from width)
      via `tools/import_pixel_fantasy.py`. **Taught the editor per-tileset tile size** (`map-editor.js`:
      decoupled SOURCE size = `meta.tile`/`.metatiles_per_row` from a fixed 16px DISPLAY cell) so 48px
      sheets render in the picker/map; engine renderer already honored `meta.tile`. All object/prop/
      building (A5/B/C/D) sheets fully paintable; A1–A4 imported & manually paintable.
    - **Pass 2a (done, verified):** baked **outside A2 ground autotiles** → `pf_outside_ground`
      (grass base + cobble/stone/path, 28 tiles) in the project's **9-slice `wang8_lut`** scheme (same
      as `ac_ground`). `tools/build_pixel_fantasy_autotiles.py` classifies each RMMZ 24px quarter by
      terrain-coverage (self-calibrating per terrain vs its outside colour), collects the 9 nine-slice
      prototypes, assembles nine-patches. Verified: seamless stone-over-grass blob + editor terrain
      brush shows cobble/stone/path, no JS errors.
    - **Remaining for "all 21 w/ autotiles":** other A2 sheets (inside/dungeon floors) reuse the same
      baker; **A1** (animated water/waterfall), **A3** (2×2 roof tops), **A4** (2×3 wall top+side) each
      need their own block-structure handling. Pipeline proven; extension is mechanical per type.
- **2026-06-17** — **Ludus mini-game, RPG Maker VX Ace RTP import + wiring, editor & combat overhaul.**
  - **Ludus** (the *Codex Alera* war-game) built standalone (`ludus.html` + `ludus/*.js`): pure
    rules engine (11×11 ground + 5×5 sky board over the centre — fixed the fan draft's impossible
    11→5 mapping), AI bot (easy/medium/hard alpha-beta), canvas renderer, **Firebase Realtime DB
    online 2-player** (owner pasted live `ludus-alera` config), screen-flow (opponent select =
    book characters/Canim/Vord, side choice, settings), styled **Rules** modal. Hub card added.
    High Lord furycraft restored. `LUDUS.md` documents canon-vs-designed.
  - **RPG Maker VX Ace RTP** (194 MB installer) couldn't be fetched (Cloudflare IP-block on
    pcgamingwiki, even headless) → pulled the **same RTP from the Internet Archive**
    (`rpgvxace-rtp_202606`), `innoextract`-ed it → **780 files** on branch **`vx-ace-rtp`**
    (`assets-source/vx-ace-rtp/`). ⚠️ EULA-gated prototype assets. **Catalog:** `docs/RTP_CATALOG.md`
    (every category, the RM menu that uses it, engine mapping; notes NO scripts / NO generator parts).
  - **Owner decision — purge license/EULA files:** deleted every `*.LICENSE.txt`/`LICENSE_FLAG`/
    EULA/font-license across ALL branches (kept only `.claude/skills/cad-agent/LICENSE`). Owner
    accepts the legal status is unchanged; prototype "everything together / leave it clean".
  - **RTP import + wiring to main** (importers `tools/import_vx_ace_*.py`, `build_vx_ace_autotiles.py`):
    - **Tilesets** (22 sheets → `data/tilesets/rtp_*`, raw 32px grids). **Real A2 ground autotiles
      baked** via a correct port of RM's A2 template (per-corner quarter map behind MV/MZ
      `FLOOR_AUTOTILE_TABLE`) → `rtp_{outside,inside,dungeon}_ground` (grass/dirt/road/cobble blend
      seamlessly; inside/dungeon floors + dungeon hole too). `_rm_sets.json` = RTP Outside/Inside/
      Dungeon/World sets. **Old packs (pf_*/xp_*/ac_*) removed from main → `graphics-backup` branch.**
    - **Character sprites** (48 → `data/sprites/rtp/`) merged into the editor sprite picker.
    - **IconSet** (624 @24px → `data/icons/`) + `src/ui/icons.js` (`GameIcons`); **wired into the
      SUPPLIES menu** (real item icons).
    - **Faces** (12 → `data/faces/`) + **dialogue portraits** (`GameDialogue.show(…,{face})`,
      event 'text' `c.face`, editor text-command face picker).
    - **Battlers** (74 → `data/battlers/`) **wired into combat**.
    - **Batch-imported** Battlebacks(108)/Animations(93)/Parallaxes(15)/Titles(29)/System(5) →
      `data/{battlebacks,animations,parallaxes,titles,system}/` (~88 MB). **Audio PARKED**
      (SE/ME/BGS imported ~7 MB; **BGM 78 MB indexed but NOT copied** — `--bgm` to pull; no
      `GameAudio` yet). **A1 water + A3/A4 wall/roof autotile bakes still TODO.**
  - **Map editor fixes:** **publishes map saves to `main`** (was the `maps` branch — now the game
    can load authored maps; deploy-on-save). Player-start honored (`?x=&y=` + saved start; editor
    Play passes them). Repo save "doesn't match" fixed (no-store GET + sha-conflict retry). Visible
    **Multi-tile palette toggle** (single tile by default). **Event layer + all mode buttons toggle
    off** (toolbar + side-panel + **menu** items). **Map Properties Save button**. **Large palettes
    scroll** (`touch-action:pan-x pan-y`).
  - **Combat view overhaul** (`src/ui/combatview.js`): **RTP battleback** backdrop; **real sprites
    not blocks** (player charset + enemy battlers/charsets, de-boxed); **side-view FF layout**
    (enemies left / hero right, facing inward); **bonded creatures wired into the battle party**
    (`buildAllies` from `GameSave.state.bonds` `{key,nickname?,level?}` — AI allies w/ sprite+Lv);
    summons get art; charset-enemy option (creature `charset`); **SYSTEM surveillance meter moved to
    a top bar**; **skill menu scrolls** (overflow + scrollIntoView).
  - **DESIGN.md** scrubbed of all Pokémon references (original-IP framing).
  - **IN PROGRESS (not committed):** a **50×50 RTP town** generator (`tools/build_rtp_town.py`) —
    researched 10+ RM town-mapping sources; v1 builds a town (central cobble plaza + well, dirt
    paths, ~14 colour-roof houses w/ door events, tree borders) on autotiled ground + a packed
    `town_props` overlay sheet (engine = 1 tileset/layer). Identified correct B-sheet tile indices
    (window 112, door 98, well 147, lamp 176, tree 189, crate 220, fence 165, stall 246, flowers/
    crops). **NEXT: rewrite with corrected tiles + polish** (2-tile walls, lamps along paths,
    gardens, leafy trees), re-render until good, then commit + register `VerdantTown`.
  - **📋 Agenda:** Bind flow (capture → `bonds[]`); A4 wall + A3 roof + A1 water autotile ports;
    audio (BGM + `GameAudio`); finish the 50×50 town.
- **2026-06-17 (2)** — **Audio system + character-creation slice.**
  - **`GameAudio` BUILT** (`src/ui/audio.js`, wired in `game.html` + `GameAudio.init()` in
    `src/main.js`): SE (one-shot, overlapping) / ME (fanfare, ducks BGM) / BGS (looped ambience) /
    BGM (looped; **no-op when not pulled** — index `bgm.present:false`). Mixer (per-channel volume +
    mute) persisted to `localStorage ac_audio`. Plays the imported RTP `data/audio/*`; the event
    runner's existing `case 'se'` now actually sounds. **Still TODO:** pull BGM (`--bgm`), wire BGS
    ambience per-biome + BGM per-area, hook UI nav SE into start menu, Animations/Parallaxes/Titles.
  - **The Awakening — player creation BUILT** (`src/ui/creation.js`): cold-System DOM overlay shown
    on a fresh game (no `player.name`, and not when `?map=` overrides for editor Play). Pick name +
    appearance (8 RTP Actor1 chars, live canvas preview) + Affinity (11, tinted chips + blurbs).
    Confirm → writes `player.{name,appearance,affinity}` to save, **crops the chosen charset
    character into a single-char 96×128 sheet** (data URL → `ac_player_sprite`), calls new
    `GameRenderer.reloadPlayer()` so the choice shows in the overworld, plays `Fanfare1` ME.
    `gameLoop` pauses the world while `GamePlayerCreation.isActive()`. Node-stub + HTTP-200 verified;
    **not browser-verified** (no headless Chromium this session).
  - **Event commands — 10 new RPG-Maker-style commands** added to BOTH the engine event runner
    (`src/main.js runCmd`/`runCmdList`) and the **map editor events tab** (`map-editor.js` CMD_TYPES +
    `newCmd` + form editors): **Move Route** (player/this/Ev#, step tokens up/down/left/right/wait,
    wall-aware), **Set Direction**, **Change Money** (+/−/=), **Give/Take Item** (any inventory
    pocket), **Battle Processing** (enemies `key:level`; awaits combat via new `GameCombatView`
    `onEnd` callback), **Fade Screen** (out/in + color), **Shake Screen**, **Label** + **Jump to
    Label** (flow control in `runCmdList`), **Comment** (no-op note). All engine-honored (no stubs).
    Syntax-checked; core test suites still pass; **not browser-verified**.
  - **2 more event commands:** **Change Graphic** (`setgfx` — swap a target's charset; player target
    rewrites `ac_player_sprite` + `reloadPlayer()`) and **Spawn NPC/Monster** (`spawn` — drops a new
    event at x,y; NPC = action+optional dialogue, Monster = touch→`battle`→auto-`despawn`). Editor
    forms reuse the charset sprite picker via new `openSpriteModalForCmd`. Internal `despawn` removes
    the running event.
  - **Title / New Game / Continue + save fallback + Dawnhearth start:**
    - **`src/ui/title.js`** (`GameTitle`) — boot title shown unless `?map=` override; **CONTINUE**
      (only when a save exists, shows name/map/playtime) + **NEW GAME** (confirms overwrite if a save
      exists). `gameLoop` pauses the world while title/creation active.
    - **`main.js`**: title drives `_continueGame()` (load first non-empty slot → `_enterMap` saved
      location) or `_newGame()` (fresh state → the Awakening → **Dawnhearth**, spiral-search a walkable
      tile near a door, save slot 0). New `_enterMap`/`_findWalkable` helpers.
    - **Save storage = localStorage PRIMARY + IndexedDB BACKUP, each a fallback** (`save.js`): writes
      mirror to both; `initStorage()` (awaited at boot) restores localStorage from IndexedDB if LS was
      cleared (or seeds IDB from LS). Added `hasAnySave()`. Node-harness verified the full
      save→wipe-LS→restore round-trip; storage logic + all files syntax-checked. **Not browser-verified.**
  - **Class screen + class wired into play (start of class build-out):**
    - **Creation now has a CLASS step** (`src/ui/creation.js`): loads `data/systems/classes.json`,
      shows the **20 Basic classes** as a scrollable grid (lifestyle-tinted), with a detail panel
      (signature, HP/ATK/DEF/SPD stat bars, starting skills). AWAKEN now requires name + appearance +
      affinity + **class**. Persists `player.class = {id,level:1,xp:0}` + `player.skills` (the class's
      `grantsSkills`).
    - **Combat reads the chosen class** (`src/ui/combatview.js buildPlayer`): player actor's name,
      affinity, stat profile, and skill loadout now come from `player.class` + `player.skills`
      (was a hardcoded Smith). Node-stub verified (classes fetched, chips build, no errors).
    - **Next on classes:** sync `player.class.level` with `progression.js`; attribute-point allocation;
      specializations/evolutions UI; non-combat lifestyle skill use; the STATUS menu to show class.
  - **BASE TIER COMPLETE — 50 Basic classes** (was 20 → +30) + **54 new foundation skills** (→166
    total). New classes span every lifestyle: combat (brawler/lancer/fencer/archer/sentinel/spellblade/
    monk), tamer (beastmaster/falconer/rider), craft (woodwright/tailor/jeweler/mason/fletcher),
    support (apothecary/cleric/shaman), survival (ranger/survivalist/hermit), social (performer/
    emissary), espionage (saboteur/infiltrator), scholar (arcanist/cartographer/seer), gathering
    (logger/farmer). Each: statProfile + 5 grantsSkills + signature (specializations/evolvesInto left
    `[]` for the per-tier build order). New skills use the existing schema (combat power/effect ones
    are engine-honored; craft/gather/social/etc. are data hooks). **Added `tools/validate_classes.mjs`**
    (every grantsSkill resolves; reports per-tier counts) — 0 errors; combat/effects/progression tests
    still pass. **Next tier: author the ~50 Advanced classes as the basics' path-gated evolutions.**
  - **Build-out: leveling made real + STATUS screen.**
    - **Unified progression with the class** (`combatview.js` + `creation.js`): `state.progress` is now
      the single source of truth, seeded from the chosen class's tier/level at creation; combat's
      `_saveProg` mirrors `level`/`xp` back onto `player.class`. So combat XP/level-ups actually advance
      the character's class.
    - **STATUS menu rebuilt** (`startmenu.js _buildCamp`): shows real **Class name + Level**, Affinity,
      an **XP-to-next bar** (via `GameProgression.xpToNext` + lazy-loaded `progression.json`), **Attribute
      Points** when any are banked, and a **SKILLS** chip list (player's learned/class-granted skills) —
      plus the existing survival meters. Lazy-loads `classes.json`/`progression.json` and re-renders.
      (Fixes the old stale `state.klass` read.) Syntax-checked; core tests still pass. **Not browser-verified.**
    - **Still pending build-out:** attribute-point *allocation* UI (count shown, no spend yet);
      specializations/evolutions UI; non-combat lifestyle skill use.
  - **Build-out: attribute-point allocation DONE.** The 8-attribute LitRPG set (PROGRESSION.md §2:
    STR/AGI/CON/INT/WIS/PER/CHA/LUK) is now spendable. `progression.json` gained **`attrEffects`**
    (per-point derived-stat bonuses: STR+2 atk, CON+6 hp, AGI+2 speed, WIS+1 def; INT/PER/CHA/LUK
    reserved for later systems). `progression.js` (pure) gained **`spendPoint`** + **`applyAttributes`**,
    and `createProgress` now seeds all 8 attributes at 0. **Combat `buildPlayer` applies attribute
    bonuses** on top of the class base stats, so points actually change battle stats. **STATUS screen**
    lists the 8 attributes (value + per-point effect hint) with a **`+` button** that spends a banked
    point and re-renders. Node-tested (seed/spend/apply math, point drain) + core suites pass.
    **Not browser-verified.** Pending: specializations/evolutions UI; non-combat lifestyle skill use.
  - **ADVANCED TIER AUTHORED — 53 Advanced classes** (was 3 → +50) + **25 advanced foundation skills**
    (→191). Completes the **30 evolution targets** the original 20 basics referenced (paladin, reaver,
    pyromancer, ninja, juggernaut, physician, artificer, … tanner) AND adds **`evolvesInto` to all 30
    new basics** → 20 more advanced (champion, dragoon, blademaster, sharpshooter, bastion, battlemage,
    packlord, cavalier, builder, artisan, chemist, priest, spiritualist, huntsman, sage, ambassador,
    shadow_operative, mage, explorer, steward), converging related basics. **`validate_classes.mjs`:
    0 errors, 0 evolve-warns** (every basic now resolves its evolution). Now **126 classes / 191
    skills**; combat/effects/progression suites pass. Tiers: basic 50, advanced 53, master 6,
    grandmaster 6, heroic 6, legendary 4. **Next: specialize/evolve UI, then Master tier.**
  - **Specialize / Evolve UI BUILT.** New pure module **`src/systems/classes.js`** (`GameClasses`,
    portable, no DOM): `evolveOptions` (path-gated — checks level ≥ `EVOLVE_MIN_LEVEL` 10, `requires`
    skillTags vs learned-skill tags, stat, affinity; default branches always offered), `evolve`
    (switch class + grant new skills + raise progression Tier), `specOptions`/`chooseSpec` (permanent
    focus pick, grants its skill). Wired into the **STATUS screen** (`startmenu.js`): a **SPECIALIZE**
    section (PICK buttons, gated by unlock level; shows chosen focus once set) and an **EVOLVE** section
    (lists branches with eligibility/reason; eligible ones get a two-click EVOLVE→CONFIRM with a
    Fanfare). STATUS loader now also fetches `skills.json` (for tag gating). Node-tested
    (brawler→champion gated by level; warrior specs; tier/skill grants) + combat/progression suites
    pass. **Not browser-verified.** Next: Master tier content; non-combat lifestyle skill use.
  - **Class-growth ACCESS reworked to the owner's design (evolve = pop-up; specialize/change = System
    Shop).** Removed the EVOLVE/SPECIALIZE sections from STATUS (now display-only: shows chosen spec).
    - **Evolve = automatic pop-up** (`src/ui/evolve.js`, `GameEvolvePopup`): `check()` fires after combat
      (combatview teardown) and shows a System modal when an evolution becomes eligible (Lv≥10 + path
      gates). Pick an ascension or NOT YET (deferred per-level via `player.class.evoDeferredAt`; re-offers
      on next level). `gameLoop` pauses the world while active.
    - **System Shop services** in the SYSTEM start-menu panel: **Specialize Class** (pick a focus,
      +5 Surveillance) and **Reclassify** (switch among **owned** classes free; **acquire a new Basic
      class** for Cr 500 + 15 Surveillance — the only non-reward way to get a new class). Sub-screens
      with BACK; `_sysSub` state reset on enter/back.
    - **`GameClasses` gained `changeClass`** (lateral: keep level/xp/skills, set Tier, record
      `ownedClasses`) + `classesOfTier` (shop catalogue). `ownedClasses` seeded at creation.
    - Node-tested (changeClass union/owned, catalogue=50) + suites pass. **Not browser-verified.**
  - **System = town-only hub (floating crystal).** The System is no longer in the pause menu —
    **removed `SYSTEM` from the start-menu** ITEMS. New standalone **`src/ui/systemshop.js`
    (`GameSystemShop`)**: a cold full-screen hub with SUPPLIES (buy Tether/Tonic/Camp Kit/Ration for
    credits), SERVICES (Restore/Fast-Travel/Register Camp), and CLASSES (Specialize · Reclassify =
    switch owned free / buy a new Basic class Cr500). Every purchase raises Surveillance; pauses the
    world. Opened by a new **`system` event command** (engine `runCmd` + editor `🔮 Open System Shop`),
    placed on a **Crystal-graphic event in Dawnhearth (id 13 @28,28)** — the hub. Wired guards + script;
    suites pass, assets serve 200. **Not browser-verified** (crystal placement @28,28 may need nudging
    in the editor). Note: startmenu's old `_buildSystem` panel is now unreachable (left as dead code).
  - **Reward event commands (NPC/quest sources for class/spec/skill).** System-shop access is the
    existing **`system`** command (reusable on any event/NPC, not just the crystal). Added three reward
    commands (engine `runCmd` + editor forms, all engine-honored): **`grantclass`** (🎓 — give a
    Classification; `unlockOnly` adds to `ownedClasses` without switching, else `GameClasses.changeClass`),
    **`grantspec`** (✦ — set the current class's specialization + grant its skill, bypassing level
    gate as a reward), **`grantskill`** (📖 — teach a skill id). Engine lazily loads classes/skills
    (`_loadClassDb`); editor gained `loadClassList`/`loadSkillList` for dropdowns. Node-tested; suites
    pass. **Not browser-verified.**
  - **Class-selection screen now shows Advanced classes, ringed by tier.** Creation (`creation.js`)
    grids classes grouped by tier (`TIERS=['basic','advanced']`, Master+ slot in later) with per-tier
    section headers. **Advanced and up get a glowing colored ring** (`TIER_RING`: advanced cyan, master
    gold, grandmaster purple, heroic orange, legendary pale-gold) via a pulsing `pcRing` animation;
    basic stays un-ringed. Detail panel shows a tier tag. Now 50 basic + 53 advanced selectable.
    DOM-stub verified. **Not browser-verified.**

## ⏳ PENDING (next session) — RESUME Pixel Fantasy autotile bakes
**Owner asked to resume this next session so it isn't forgotten.** Pass 1 (all 20 sheets imported
@48px, editor supports per-tileset tile size) + Pass 2a (outside A2 ground → `pf_outside_ground`,
grass+cobble/stone/path) are DONE & verified. **Still to bake (see 2026-06-15 log for the proven
pipeline):**
- **Other A2 sheets** — Inside + Dungeon floors. Reuse `tools/build_pixel_fantasy_autotiles.py`
  as-is (just point it at `pf_inside_a2` / `pf_dungeon_a2` and pick their terrains). Quick.
- **A1** — animated water / waterfalls (different block structure: animated frames + waterfall edges).
- **A3** — 2×2 roof-top autotiles (building tops).
- **A4** — 2×3 wall autotiles (wall-top 2×2 + wall-side 2×2).
- Also consider adding the **A2 base fills** (sand/dirt/water) as fill options + their row autotiles.
- Tool already proven: classify 24px quarters by terrain coverage → 9-slice `wang8_lut`. Verify each
  with a blob-render + headless editor load (see `/tmp` test pattern in the 2026-06-15 work).
- ⚠️ Keep the **EULA/non-shippable flag** (`data/tilesets/PIXEL_FANTASY.LICENSE.txt`) in mind.

## ⏳ PENDING (next session) — World Area Bible (spec LOCKED, approved, NOT started)
Goal: a **complete, exhaustively-named** area catalog — every enterable building named + its owner
NPC ("Bob's House"), every dungeon with **floor count + each floor named** (theme/hazard/gimmick +
which floor the Alpha is on), everything named & cross-referenced. Builds ON `GAZETTEER.md` (keep all
existing names; only fill gaps). Names are **generated** in the existing tone (Dawnhearth/Hollow Vein).
- **Format = BOTH**: source of truth `data/world/<region>.json`; auto-generated readable view
  `docs/gazetteer/<region>.md` via `tools/build_gazetteer.py`; cross-ref validator `tools/validate_world.py`.
- **NPC depth = ALL**: id, name, role, faction, personality (1 line), hook (1 line), `home`+`workplace` building links.
- **Dungeon floors = ALL**: n, id, name, theme, hazard, gimmick; mark Alpha's floor.
- **IDs**: `vd_town_dawnhearth`, `vd_dawnhearth_smithy`, `npc_vd_bob_emberhand`,
  `vd_dungeon_hollow_vein_f3`, `alpha_veinmother`, `fac_vanguard_order`.
- **Sequencing**: REGION BY REGION — start **Verdara**, show the owner the format to approve before
  doing Halveth → Calderra → Vael → Open Sea.
- This is the STARTING population (per `LIVING_WORLD.md` NPCs can die/repopulate).
