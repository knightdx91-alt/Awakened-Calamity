# ONBOARDING & HUB DESIGN — senior-designer pass

Premise: *"A System-horror roguelite where the System helps you escape its loop — and
its help is what keeps erasing the self that's trying to leave."* The hook is strong.
The problem is **onboarding teaches the STORY but not the SYSTEMS**, and the **hub is a
facade**. This doc fixes both.

## 1. What the hot comps actually do (and what we steal)

| Game | Onboarding lesson | What we take |
|---|---|---|
| **Hades** | The hub (House of Hades) IS the tutorial. Death is the loop; NPCs/upgrades teach themselves between runs. Story is delivered *through* repeated runs. | Dawnhearth = the House. Each NPC = one system, introduced on the run you first need it. |
| **Slay the Spire** | Teaches by *doing* one fight at a time; the map screen shows the run's shape (elite/rest/treasure/boss) up front so risk is legible. | Show the run's shape before descending; teach relics as a *choice with a tradeoff*, not "you got an item". |
| **Inscryption** | The system/UI is a character. The horror is the interface. Mechanics revealed slowly, diegetically. | Surveillance must be a *felt* meter the System narrates, not a silent bar. |
| **Loop Hero** | A single screen teaches the whole loop in 2 minutes by gating one mechanic at a time. | Gate our systems: don't show relics/meta/attributes all at once. |
| **Dead Cells / Risk of Rain 2** | First death is *expected and explained*; the game tells you "this is how you get stronger across runs." | Our first death must explicitly teach: death = progress, not failure. |
| **Cult of the Lamb / Hades** | Meta-currency + a hub vendor you visit every loop; the first spend is hand-held. | The Remembrance (fragments) first-spend must be a guided beat. |

**The throughline:** great roguelite onboarding teaches **the loop, the risk-meter, and the
reward-economy** in the first 10 minutes — by *doing*, with the first death as the teacher.
We currently teach none of the three explicitly.

## 2. What's wrong with OUR tutorial right now (audited from the data)

The opening is event-authored and well-written, but it **never explains a single mechanic**:
- **Surveillance** — the central mechanic — is *mentioned* ("it watches") but never defined.
  The player never learns: what fills it, what the meter is, that it persists across the run,
  or **what happens at max (Collection)**. The first time the System saves you should be a
  taught beat; right now it's a combat prompt with no framing.
- **The loop** (descend → die/reset → carry-over) is implied, not taught. A new player doesn't
  know death is *supposed* to happen.
- **Relics** — the first cache just says "choose one to carry." No explanation of what relics
  are, that they're per-run, or how to think about the choice.
- **Leveling / attributes / XP** — never mentioned. The first level-up is silent.
- **Memory Fragments / Remembrance / meta** — Mira says "remember a little more," but the
  player is never shown the fragment economy or walked through their first permanent unlock.
- **The HUD meters** (HP/MP/SP, Surveillance) — never explained.
- **Endings** — the three tiers exist and gate on lifetime Surveillance, but the player has no
  idea they're being scored, or toward what.

**Net:** a new player reaches the DescentGate not understanding what tethered/untethered
*costs them long-term*, why they'd ever refuse help, or what they're building toward.

## 3. What's wrong with the HUB (Dawnhearth)

- **It's a facade.** 14 doors, all `text`-only ("the door is locked"). No interiors wired
  (DawnhearthInn/Lab/Cellars maps exist but aren't connected and several FAIL mapcheck).
- **Everything is dumped in one plaza cluster** (SystemHub, Gate, Remembrance, NoticeBoard,
  Mira, 4 NPCs all within ~6 tiles of 28,28). No spatial logic, no sense of place.
- **No functional legibility.** A hub should read like a control room: *this* is where you
  start a run, *this* is where you spend fragments, *this* is where you heal, *this* is where
  you see goals. Right now they're indistinguishable interactables in a blob.
- **56×56 of mostly empty space** around the cluster — big, hand-built, and unused.

## 4. The redesign — teach the loop through the FIRST RUN (Hades model)

Keep the cast/tone. Re-scaffold so each beat teaches one system, the first time it's relevant.
All of this is authorable with our event commands (it's data).

**A. Cold-open (keep, +1 line):** the System defines itself and *names Surveillance as the
price of its help* — plant the seed in one sentence.

**B. Dawnhearth, pre-first-run (guided, short):** Mira walks you to exactly three stations,
each introducing itself in one box:
1. **The System Hub crystal** → "It helps you. Watch the cold bar — that's **Surveillance**.
   Every time you lean on the System, it climbs." (Teaches the meter + what fills it.)
2. **The DescentGate** → the tethered/untethered choice, now with the stakes spelled out:
   tethered = it won't let you die *but Surveillance climbs toward Collection*; untethered =
   death is real but you stay yourself.
3. (Defer Remembrance until after the first run — you have nothing to spend yet.)

**C. The first descent (teach by doing):**
- **First fight** → a one-box "this is combat: the gauge fills, you act, it empties" (now true
  with the MMBN tempo reset).
- **First level-up** → a one-box "you grew stronger — spend attribute points on the STATUS
  screen." (Teaches leveling.)
- **First relic cache** → reframe as a taught choice: "**Relics** are power for *this descent
  only* — lost when the run ends. Choose how you want to fight." (Teaches per-run relics.)
- **First lethal moment → the keystone beat.** The System offers to save you. The game *pauses
  and explains*: "Accept and you live — but **Surveillance jumps**, and if it ever maxes out
  the System **Collects** you: the run ends, you're reclaimed, and that's the bad ending.
  Refuse and you die *now* — but you wake clean, remembering more." THIS is where Surveillance,
  Collection, and the ending stakes all land, at the exact moment they matter.

**D. The first death/reset (teach the loop):** the existing first-descent beat, +1 line that
makes the loop explicit: "Death is not the end here. You wake in Dawnhearth, carrying **Memory
Fragments** — and a little more of yourself. *This is how you get out: one cycle at a time.*"

**E. Back in Dawnhearth, post-first-run (teach meta):** Mira points you to the **Remembrance**;
a guided first spend of fragments on a permanent unlock, explaining meta-progression. Then the
loop is open and the player understands all of it.

**F. Surveillance / Collection / Endings — say it plainly, once, at the keystone beat (C) and
reinforce on the HUD:** Surveillance is the corruption/leash meter; it rises from System help
(saves, shop use, fast-travel); at max → **Collection** (run ends, you're reclaimed → the
"submit" bad ending). Lifetime Surveillance silently scores your **ending**: stay clean (mostly
untethered) → the *true* ending stays open; lean a little → *good*; lean hard → *submit*.

## 5. The hub redesign (make Dawnhearth a real House)

- **Zone the plaza by function** so it reads like a control room, each with a sign/banner:
  **THE FRACTURE** (DescentGate) · **THE CRYSTAL** (System shop) · **THE STILL PLACE**
  (Remembrance/meta) · **THE BOARD** (goals/bounties = the run's objectives) · **THE INFIRMARY**
  (a heal NPC). Spread them, don't cluster.
- **Wire 2–3 real interiors** (Inn, Mira's Hearth, Infirmary) and cut/blank the rest of the
  facade doors honestly (a locked door should say *why* it's locked — diegetic, not "TODO").
- **Make NPCs reactive to the loop** (GameVoice, Surveillance-aware): Old Bram's déjà vu deepens
  as your lifetime Surveillance rises; Lys reacts to whether you go off-grid; Corwin (Vanguard)
  warms or hardens based on your tether choices. This is the cheap, high-impact "Hades NPCs
  remember your runs" feel — and we already have GameVoice.
- **The Board = the run's shape.** Before descending, show the act's pacing (floors → elite →
  treasure → boss) like Slay the Spire, so risk is legible. (Pairs with the run/act composer on
  the generator roadmap.)

## 6. My take — priority order

1. **Rewrite the tutorial to teach the three pillars** (loop / Surveillance+Collection / reward
   economy) through the first run, with the lethal-save as the keystone teaching beat. Pure
   event/data work — fast, huge clarity win. **Do first.**
2. **Surveillance legibility everywhere:** label the HUD bar, make the System narrate it, show
   the Collection threshold. Players must always know how close they are to being reclaimed.
3. **Zone + sign the hub** and wire 2–3 interiors; blank the facade doors honestly.
4. **Reactive NPCs via GameVoice** (Surveillance-aware) — the Hades "they remember" hook.
5. **The Board shows the run's shape** (needs the run/act composer — generator roadmap #3).

Items 1–2 are the difference between "players bounce in 10 minutes, confused" and "players
get the dilemma and want one more run." They're also the cheapest. Start there.
