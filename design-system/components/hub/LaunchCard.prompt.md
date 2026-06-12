The dark-cyber hub card — used on the launcher/landing to enter the game, editor, world map, or docs. Lifts and brightens its cyan stroke on hover.

```jsx
<LaunchCard
  title="Awakened Calamity"
  subtitle="GBA-style survival LitRPG · prototype"
  icon={<MapMarker type="safe" size={22} />}
  href="game.html"
/>
```

Prefer a MapMarker or pixel glyph for `icon` over emoji. Stack several in a column with `gap`.
