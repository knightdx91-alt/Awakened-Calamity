# The Hidden Layer — Secret Areas, Relics & Hidden System Access

> Design for the game's secret/exploration layer: hidden areas, old-cycle relics, and access to
> the System's hidden admin layer. Interlocks with espionage skills, the Surveillance meter, the
> survival layer, and the four endings. Companion to `DESIGN.md` and `WORLD.md`.
> **Status:** brainstorming / pre-implementation.

---

## 0. Premise

The System overwrote the world — but **overwrite isn't erase.** Fragments of previous cycles and
the original world persist beneath every region: sealed vaults, buried interfaces, dead-cycle
infrastructure. Finding them is the curious player's reward; the deepest grant access to the
System's own **hidden admin layer** — the most powerful and most dangerous thing in the game.

This layer turns the espionage skills into keys, makes Surveillance a *key* (not just a penalty),
and gives the four endings a **silent, mechanical morality system** based on *which kind of hidden
power you use*.

---

## 1. Hidden Areas — concealment maps to a skill/capability

Each way an area is hidden corresponds to an espionage skill or survival capability, so the Hidden
Layer *is* the espionage payoff. Secret zones live **inside existing maps** (concealed exits,
false-wall tiles) — cheap to build on layouts we already have.

| Concealment | Key to find it |
|---|---|
| False / corrupted tiles (illusory walls, decoy items) | **Appraisal** — reveals what's fake |
| Sealed pre-Awakening vaults | **Lockpicking** |
| Encrypted ruin puzzles | **Encryption** |
| Patrolled deep-zone caches | **Stealth** (slip detection cones) |
| Hazard-buried relics (volcano core, under ice) | High-tier **Exposure gear** — survival gates lore |
| **Surveillance-gated (both directions)** | Some doors open only when Surveillance is **low** (System isn't looking); some only when **high** (you've been "promoted" enough to be trusted with admin doors) |

> Surveillance as a key cutting both ways is the signature mechanic of this layer.

---

## 2. Old System Relics — types & function

| Relic | Function |
|---|---|
| **Cycle Fragments** | Free, found lore laying out previous loops (deeper version of the Shop's paid fragment) |
| **Interface Shards** | Broken old-cycle UIs with dead victims' names burned in. Each grants a small **permanent perk** *or* a **glitch-power** (a System exploit) |
| **Echo Recordings** | Replay a memory — foreshadowing delivery |
| **Untethered Cores** | Crafting mats for **anti-System gear** (Free-Bond tools, off-grid items) |
| **Relic Tech (pre-Awakening)** | Original-world devices that **don't obey System rules** — heal without a Shop, travel without a trace |
| **Root Keys** | Rare top-tier relics that unlock **Hidden System Access** (§3) |

---

## 3. Hidden System Access — the admin layer

Root Keys tap a hidden developer/admin layer of the System. It splits into two philosophies, and
**which you lean on silently tilts your ending.**

### A) Console Powers — leans toward **Inherit**
Minor reality edits using the System's own tools:
- Disable a zone hazard · suppress detection in an area · force-open a System door · reroll an
  encounter · downgrade an enemy.
- Hugely powerful, but each use spikes a hidden **Root Trace**. Use the master's tools and you
  start becoming the master. (Foreshadows the *Inherit* ending — you become the new System.)

### B) Off-Grid Relics — leans toward **Destroy / Escape**
The resistance exploit — act **without Surveillance at all**:
- **Ghost Tether** (Free-Bond, no trace) · **Null Beacon** (a camp that can't be Audited) ·
  **Severed Warp** (fast travel the System can't see).
- Less raw power, total freedom from the watcher. (Foreshadows *Destroy / Escape*.)

> The Hidden Layer is therefore a **mechanical morality system** for the finale — expressed through
> *which kind of hidden power you use*, never a dialogue wheel.

---

## 4. Risks — keeping it from being a free win

- **Root Trace** — overusing Console Powers summons **elite Audits** and can temporarily lock the
  admin layer.
- **Decoy relics** — the System plants fakes; without **Appraisal** you can grab a trap that spikes
  Surveillance.
- **The Index Below** — a hidden completion tracker of every relic found. Hitting key thresholds is
  a **requirement for the true (Destroy) ending** — you can't dismantle the System without
  understanding it. Bakes in 60h+ completionist content.

---

## 5. Interlock Summary

- **World:** secret zones hide inside existing maps — cheap (concealed exits, false-wall tiles).
- **Mechanics:** espionage skills are the keys; Surveillance gates both directions; survival gear
  gates buried relics.
- **Story:** relics *are* the buried-truth delivery — earned by exploration, not cutscene.
- **Endings:** Console-vs-Off-Grid usage shapes the finale silently.

---

## 6. Scope Honesty

- **Cheap / early:** lore relics (Cycle Fragments, Echoes), hidden tile exits / false walls,
  Appraisal reveal, the Index Below tracker.
- **Medium:** espionage-gated vaults, Interface Shard perks, Untethered Cores → anti-System gear,
  Surveillance-as-key doors.
- **Defer (design hooks now, build later):** full Console Power command set, Root Trace + elite
  Audits, the ending-tilt bookkeeping, decoy-relic detection economy.

---

## 7. Per-Zone Authoring Hook
When drilling each region (per `WORLD.md §6`), add to each zone's spec:
```
Hidden: <secret area? concealment type + key skill>
Relics: <what's hidden here + how gated (skill / hazard / Surveillance level)>
Admin: <Root Key present? console/off-grid relic? ending-tilt note>
```
Seed early regions with cheap lore relics; reserve Root Keys and admin access for late Vael /
the Sunken Ruins / the Distortion.
