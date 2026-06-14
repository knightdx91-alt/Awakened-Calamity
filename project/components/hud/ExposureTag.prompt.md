Conditional hazard exposure readout — only shows while the player is actively taking a biome hazard, pulsing in the hazard color. Mount it unconditionally in the HUD and drive it with `hazard`.

```jsx
<ExposureTag hazard={activeHazard} value={exposure} />
{/* hazard = 'heat'|'cold'|'toxic'|'gloom'|'tempest' | null */}
```

Renders nothing when `hazard` is falsy. Sits just below the vital cluster.
