# Architecture & Portability — 2D prototype → 3D rebuild

> **This is a COMPLETE, shippable game in its own right** — not a throwaway tech demo. It *also*
> serves as a **proving ground** for the story, design, and LitRPG systems.
> The intended successor is a **3D rebuild (Unity, PC + consoles, full multiplayer).** Therefore
> **all game systems live as engine-agnostic DATA + RULES, cleanly separated from presentation,** so
> the *design and logic* port to Unity even though the *rendering* gets rebuilt. **Read this before
> writing any systems code.** Companion to `CLAUDE.md`, `DESIGN.md`.

---

## The three layers — keep them separate

1. **Data** — `data/systems/*.json` (and the existing `data/` map/tileset files).
   Portable, engine-neutral. Skills, classes, creatures, affinities, combat tuning, XP constants.
   The **same files (or a 1:1 export)** feed the Unity build. **No code, no DOM, no JS-isms.**
   Canonical truth alongside the design docs.

2. **Rules / systems** — `src/systems/*.js`.
   **Pure logic — no DOM, no rendering, no `window`/`document`.** Combat resolution, XP/leveling,
   skill effects, Bind, survival meters, the world-brain. **State in → new state out.**
   **Deterministic** (seeded RNG) and **server-authoritative-friendly**. This is the **reference
   implementation a Unity/C# port mirrors function-for-function.**

3. **Presentation** — `src/engine`, `src/ui`, canvas/DOM.
   The **throwaway** layer. Renders the state the rules layer produces and forwards input. **This is
   what gets rebuilt in Unity; it never owns game logic.**

```
data/systems/*.json   →   src/systems/*.js (pure rules)   →   src/ui · src/engine (view)
   (ports as-is)              (ports to C#)                     (rebuilt in Unity)
```

## Rules of the road

- **No game logic in the renderer/UI.** If combat math lives in a draw loop, it doesn't port. Logic
  goes in `src/systems`; the view only *reads results and forwards input*.
- **All tuning in data, never hardcoded.** XP constants, skill effects, combat numbers → JSON.
- **Determinism:** seeded RNG, pure functions, no wall-clock inside resolution (the real-time *world
  clock* is the one explicit, serializable exception, per `LIVING_WORLD.md`). Enables multiplayer,
  replays, and netcode reconciliation.
- **Serializable state:** the full game/combat state is plain data that round-trips to JSON (saves,
  netcode, and the Unity port all read the same shape).
- **Design docs are canonical.** `DESIGN/PROGRESSION/SKILLS/CLASSES/…` define the rules; `src/systems`
  is their faithful implementation, not a separate source of truth.

## Why

The expensive, risky part is the **design** — *does the LitRPG loop + the System story actually
work?* Validate it cheaply in 2D with portable data + rules. When it's proven, the Unity rebuild
ports the **data + rules** and re-skins the **presentation** — it does **not** start from scratch.
