# UI Kit — Game (in-world play screen)

A faithful, interactive recreation of the GBA-style in-world UI. Everything is
rendered at the **240×208 logical** resolution and scaled up inside a device
bezel — exactly how the engine presents it.

**Files**
- `index.html` — orchestrates state (overworld / start-menu / battle), the
  System notification stack, dialogue, and the Surveillance meter.
- `GameWorld.jsx` — a clean, generated tile scene (grass/path/water/tree/tall-
  grass/sand/rock/corrupted-void) + a simple two-tone player sprite. No
  third-party art.
- `StartMenu.jsx` — the FireRed right-side menu, restyled to the survival set
  (Camp / Supplies / Affinities / System / Save). Composes `MenuRow`, `FrWindow`,
  `AffinityBadge`, `HazardChip`.
- `BattleScene.jsx` — the Tempo + Intervention battle: enemy/player info boxes,
  Tempo gauge, 2×2 action grid, and the cold **System Intervention** panel whose
  "Emergency Restore" raises Surveillance. Composes `FrWindow`, `MeterBar`,
  `FrButton`, `AffinityBadge`.

**Try it:** *Menu* opens the start overlay (click rows; Affinities/Supplies open
sub-panels). *Battle* enters the demo fight — *Emergency Restore* spikes
Surveillance and fires a warning toast. *System ping* / *Trigger Audit* push
info/danger notifications.

The warm FireRed chrome (what you own) and the cold System layer (what is done to
you) share one screen on purpose — that tension is the brand.
