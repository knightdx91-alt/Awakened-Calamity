The FireRed health/stat bar. Auto-colors green→yellow→red by fill for HP, or pass a fixed `color` for typed meters (Stamina, Exposure).

```jsx
<MeterBar label="HP" value={64} max={100} />
<MeterBar label="EXPOSURE · Heat" value={72} color="var(--hz-heat)" />
```

`color="auto"` is HP-style. Use a `--hz-*` var for hazard exposure bars.
