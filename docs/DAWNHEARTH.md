# Dawnhearth — area notes (origin town, Verdara)

Companion to `STORY.md`. Tracks the opening town's content: who's on the streets (built), and the
**interiors that still need building** (marked ⬜). Door events `Door1…Door12` currently all say
"locked"; this maps which become real buildings. Coordinates are overworld tiles on `Dawnhearth.json`.

## Street content — BUILT (overworld events)
| Who/what | Tile | Face | Role |
|---|---|---|---|
| **Mira of the Hearth** | 12,18 | People1·0 | Guide; drives the `awakening` quest; info choice (System/Dawnhearth/Self); completes + grants First Aid + heals. |
| **Old Bram** | 16,18 | People4·0 | Cycle foreshadow — "I see so few of you a second time." |
| **Tessa** | 22,22 | People1·2 | Surveillance/Audit foreshadow — her son Edran over-used the System. |
| **Pip** (child) | 19,24 | People2·4 | Light flavor + nudge to Mira / the field fight. |
| **Lys** | 23,30 | People3·1 | The hook — her brother **Joran** taken for going off-grid. |
| **Sentry Corwin** (Vanguard) | 23,27 | Actor4·0 | Enforcer; warns against aiding the Untethered. |
| **System crystal** (hub) | 28,28 | (Crystal) | Opens the System Shop; advances the tutorial. |
| **Notice Board** | 24,28 | — | Vanguard decree + scratched plea about Joran. |
| **Well** | 26,24 | — | Flavor — names carved over the rim, recut many times (cycle). |
| **System Poster** | 6,18 | — | Propaganda; "the only thing that never weathers." |
| **Memorial** | 16,30 | — | Re-carved names, no dates (cycle). |
| **Tutorial Fiend** | 34,24 | (Monster1) | First fight (touch → battle). |

## ✅ Activity pass — BUILT 2026-06-20 (wire-up: "more to do")
Added/wired so Dawnhearth is a real hub between descents (all browser-verified, 0 errors):
- **Garrick's Stall** (off-grid market, @37,20) — new **`shop` event command** opens the **BLACK
  MARKET**: buy supplies for credits with **NO Surveillance** (a ~1.3× scarcity markup instead). The
  thematic counter to the System crystal. (`GameSystemShop.open(cb,{offgrid:true})`; registered in the
  engine `runCmd` **and** the map-editor palette.)
- **Vanguard Bounties** board (@33,24) — a **milestone reward ladder** claimable once each: reach
  floor 2/5/10, clear a descent, 5 clears → credits + items. Pure DATA, powered by a new
  **`meta` conditional kind** (lifetime `deepest`/`clears`/`runs`/`fragments` ≥ N) + per-bounty
  self-switches. Registered in the editor's conditional form too.
- **The Ashlab** (Door13 → `DawnhearthLab`) — now ENTERABLE. New **Archivist** NPC delivers the
  buried-truth / OWPS / cycle lore (4-branch choice) + a **DataShelf** examine; the Lab's broken
  text-stub Exit is now a real transfer back. (The OWPS "bring the cache up" thread is seeded.)
- **The Inn** RestBed — now **heals + saves** (`opensave`), making it a true in-town Safe Zone.
- **Plaza Directory** updated to list the Forge, Garrick's Stall, the Bounties, and the Ashlab.
- **Still orphaned (deliberately):** `DawnhearthCellars.json` is a 48×48 dungeon-shaped maze; wiring
  it now would ship a hollow space — left for a proper off-grid-dungeon design pass.

## Interiors to BUILD ⬜ (and what goes inside)
> Door → building links are proposed; wire the door event to a `transfer` once the interior map exists.

- ⬜ **Mira's Hearth** — `vd_dawnhearth_hearth` · door **Door2 (15,16)** · owner **Mira**.
  Where new Awakened wake. Small, warm. A **bed = early rest/heal** point (no Surveillance). Mira's
  shelf of keepsakes from Awakened who didn't come back (cycle weight, optional examines).
- ⬜ **Dawnhearth Infirmary** — `vd_dawnhearth_infirmary` · door **Door3 (42,17)** · NPC **Sister Wenna**.
  Off-System healing: a healer NPC using the `heal` command (cheap/free early, the human alternative to
  paying the crystal). Beds. (Sister Wenna already stands in the plaza @22,20 as the healer.)
- ☑ **The Roadside Inn** — door **Door12** · map **DawnhearthInn.json** — WIRED (rest = heal + save).
- ⬜ **Dawnhearth Market** — `vd_dawnhearth_market` · door **Door4 (49,19)** · owner **Garrick**.
  The **off-grid supplier** — buy food/gear/materials for credits **without** Surveillance (thematic
  contrast to the crystal shop). Could be a street stall instead of an interior if simpler.
- 🔒 **Joran's House** — `vd_dawnhearth_joran` · door **Door5 (8,31)** · **stays LOCKED** (the hook).
  A nailed note; openable later in an Untethered-thread quest. (Consider routing to **DawnhearthCellars.json**
  as his hidden off-grid cellar for that quest.)
- ⬜/later **The Ashlab annex** — door **Door11 (41,32)** · map **DawnhearthLab.json EXISTS**.
  Scholar/lab; **start of the OWPS buried-truth thread** (Act I). Wire when the OWPS beat is built.
- Remaining doors (Door1, 6–10) = generic townhouses — give each an **owner NPC + 1–2 lines** when the
  World Area Bible pass reaches Dawnhearth (per the pending bible task). Low priority vs. the named ones.

## Notes
- The System speaks with **no portrait** (cyan voice) by design; signs/props are faceless. Every named
  person gets a face (assigned above; art is cosmetic — adjust sheet/index in the editor freely).
- Healing model (per design): in-battle = items/skills/allies only; out-of-battle = **Infirmary / Mira's
  bed / Inn / System crystal (Full Restore, +Surveillance)**. The Infirmary + beds above are the
  no-Surveillance options.
