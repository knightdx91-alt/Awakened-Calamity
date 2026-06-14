A generic labeled stat bar in the System OS skin. Auto-colors green→yellow→red by fill, or pass a fixed `color`. For the on-screen vitals HUD use `VitalBar`; reach for `MeterBar` for menu/readout bars (XP, durability, generic stats).

```jsx
<MeterBar label="HP" value={64} max={100} />
<MeterBar label="EXPOSURE · Heat" value={72} color="var(--hz-heat)" />
```

`color="auto"` is HP-style. Use a `--hz-*` var for hazard exposure bars.
