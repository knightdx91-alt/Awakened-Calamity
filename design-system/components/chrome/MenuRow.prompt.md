FireRed start-menu / list row with positional cursor and selected wash. Stack inside an FrWindow to build menus.

```jsx
<FrWindow>
  <MenuRow label="Camp" selected />
  <MenuRow label="Supplies" right="12" />
  <MenuRow label="Affinities" />
  <MenuRow label="System" />
</FrWindow>
```

Set `selected` on the focused row. `right` shows a count/shortcut. `cursor` overrides the ▸ glyph.
