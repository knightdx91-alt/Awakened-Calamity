Compact System HUD bar for a player vital (HP / Mana / Stamina). Self-backed dark glass + glow so it reads over any terrain. The ONLY stat type that belongs on the play screen — everything else goes in the Status menu.

```jsx
<VitalBar kind="hp" value={72} max={100} />
<VitalBar kind="mana" value={40} max={60} />
<VitalBar kind="stamina" value={88} />
```

HP auto-flashes orange under 25%. Stack three in a corner cluster.
