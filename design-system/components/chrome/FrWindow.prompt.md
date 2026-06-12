FireRed game-chrome panel — the base warm surface for in-world UI. Use whenever you need a bordered window (menus, info boxes, settings, battle boxes).

```jsx
<FrWindow title="SYSTEM" variant="light" shadow="lg">
  <p style={{ fontSize: 'var(--text-xs)' }}>Save complete.</p>
</FrWindow>
```

Variants: `variant="body"|"light"`, `shadow="sm"|"lg"|"none"`. Omit `title` for a plain bordered panel. The red title bar is for named windows.
