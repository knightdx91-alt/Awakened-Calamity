The System OS surface — the base container for every in-game menu and dialog now that the UI *is* The System. Dark holographic glass, cyan edge + glow, corner brackets, scanlines.

```jsx
<SysPanel title="[ THE SYSTEM ]" width={320}>
  <SysMenuItem label="STATUS" selected />
  <SysMenuItem label="SUPPLIES" right="12" />
</SysPanel>
```

Pass `accent="var(--sys-warn)"` or `"var(--sys-danger)"` to recolor the edge for alerts. Set `brackets={false}`/`scanlines={false}` to simplify.
