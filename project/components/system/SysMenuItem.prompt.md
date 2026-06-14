A System OS menu row. Dim cyan until selected/hovered, then lights up with a cyan left-bar, wash, and glow. Stack inside a SysPanel for the pause menu and every sub-list.

```jsx
<SysMenuItem glyph="◆" label="STATUS" selected />
<SysMenuItem glyph="▣" label="SUPPLIES" right="12" />
<SysMenuItem glyph="✦" label="REACHES" right="watched" accent="var(--sys-warn)" />
```

Set `selected` on the focused row. Use `right` for counts/locks.
