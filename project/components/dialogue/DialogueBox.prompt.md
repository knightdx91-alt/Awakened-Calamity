The in-world message window, in the System OS skin (dark glass + cyan). Use for NPC dialogue and any in-world narration.

```jsx
<DialogueBox speaker="MARIE" text={"I... was Marie...\nWasn't I?"} />
```

Omit `speaker` for narration. Set `showArrow={false}` for a static final line. Supports `\n` line breaks. For the System's own voice (offers, audits, stat notices) use `SystemNotify` instead — it carries the `[ THE SYSTEM ]` label and severity accents.
