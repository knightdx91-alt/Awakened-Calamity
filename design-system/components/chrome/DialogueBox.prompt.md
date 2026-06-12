The FireRed message window — tan panel, pixel text, blinking advance arrow. Use for NPC dialogue and any in-world narration.

```jsx
<DialogueBox speaker="MARIE" text={"I... was Marie...\nWasn't I?"} />
```

Omit `speaker` for narration. Set `showArrow={false}` for a static final line. Supports `\n` line breaks.
