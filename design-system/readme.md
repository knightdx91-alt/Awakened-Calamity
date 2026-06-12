# Awakened Calamity — Design System

> *"The System helps you, and that's the horror."*

A design system for **Awakened Calamity**, a browser-based, **GBA-style (240×160 logical) 2D top-down LitRPG survival sandbox using 16x16 tilesets**. The player Awakens into a world run by **The System** — a benevolent-seeming interface that heals you, fast-travels you, and revives you in battle. Every convenience is real. Every convenience tightens its grip (the **Surveillance** meter). The comfortable path is the trap.

This system exists so designers and agents can produce on-brand interfaces, marketing, decks, and prototypes for the game without re-deriving its visual language each time.

---

## The dual identity (read this first)

Awakened Calamity is built on a deliberate **clash of two visual languages**. Getting this tension right is the whole brand:

|  | **FireRed game chrome** (warm) | **The System** (cold) |
| --- | --- | --- |
| Role | The comfortable in-world UI you trust | The antagonist's voice, watching you |
| Color | Tan windows, slate borders, red accent | Near-black glass, neon cyan, danger red |
| Font | `Press Start 2P`, dark text | `Press Start 2P`, cyan glow text |
| Shadow | Stamped drop-shadow + inner white highlight | Neon glow, pulsing on danger |
| Feeling | Cozy, rounded, retro, lived-in | Clinical, surgical, surveilling |

A third surface — the **dark cyber hub/launcher** and the **bright cartographic world map (the Four Reaches)** — bridges the two: dark cyber panels with cyan double-strokes, plus a bright, friendly Pokémon-town-map palette for geography.

Use **warm** for anything *the player owns* (menus, dialogue, party, bag). Use **cold** for anything *the System does to the player* (notifications, audits, lockouts, surveillance).

---

## Sources

This system was reverse-engineered from the game's own source. If you have access, read these to do deeper, more faithful work:

- **GitHub:** https://github.com/knightdx91-alt/Awakened-Calamity — the prototype repo. Key files: `styles.css` (the FireRed theme + System overlay CSS), `index.html` (hub), `worldmap.html` (the Four Reaches map), `src/ui/system.js` (System notification voice), `DESIGN.md` (combat, Surveillance, survival), `WORLD.md` (the regions, towns, Calamities), and the companion design docs (`PROGRESSION.md`, `CRAFTING.md`, `ECONOMY.md`, `GAZETTEER.md`, …).
- Live build (prototype): https://knightdx91-alt.github.io/Awakened-Calamity/

> **IP note:** the source repo carries placeholder UI art derived from copyrighted material (flagged in its `ASSETS_NOTICE.md`). **None of that art was copied into this system.** All visuals here are rebuilt clean from the engine's CSS, geometry, and original design docs.

---

## Content Fundamentals — how Awakened Calamity writes

**Two distinct voices, never mixed.**

**1. The System** — *menacing corporate cheer*. It is unfailingly polite, helpful, and bureaucratic, which is exactly what makes it frightening. It addresses you as a subject, not a person. It frames coercion as a service.

- Casing: `[ THE SYSTEM ]` label is **UPPERCASE, letter-spaced**. Body is sentence case.
- Person: it speaks *to* you as **"you"** / **"Trainer"** / by subject ID. It refers to itself as **"the System"** in the third person — clinical distance.
- Tone examples (originals in this spirit):
  - *"Welcome, \[SUBJECT 4471\]."* (a one-frame glitch — your real designation)
  - *"Unauthorized Safe Zone detected. Register for protection? (Cr + Surveillance)"*
  - *"This action violates Affinity Code 7."* (greys out your move)
  - *"Emergency Restore available. One tap. We've got you."* (the bait)
  - *"Stamina increased to 64."* (flat, factual stat notices)
- Punctuation: short declaratives. Periods, not exclamation. Brackets for system tokens `[ … ]`. Parenthetical costs `(Cr + Surveillance)`.

**2. The world / lore voice** — *quiet, elegiac, human*. Construct death lines and ruin text. This is where the horror lands.

- Lowercase, fragmentary, grieving: *"I… was Marie…"* · *"guarding the door is all I remember"* · *"the sky belonged to us, before"* · *"I crawled in to hide. I never crawled out."*
- Construct names follow a pattern: **\[Hazard/Domain\] \[Class\] "\[remembered human\]"** — e.g. *Rime Warden "Marie"*, *Pyre Sovereign "Phoenix"*.

**3. Product / marketing voice** (hub, README, store) — *terse, confident, a little ominous*. Lowercase section labels (`Play`, `Create`, `World`), em-dash subtitles, no hype words. *"GBA-style survival LitRPG · prototype"*. The middot `·` is the connective tissue of this voice.

- **Emoji:** avoided in product/game UI. The hub prototype used a few (🎮 ✎ 🗺️) as placeholders — treat these as **temporary**; prefer the geometric/pixel iconography below.
- **Vibe:** retro-game nostalgia weaponized. The warmth is the trap. Never cute for cute's sake.

---

## Visual Foundations

**Color.** Three coexisting palettes (see `tokens/colors.css`). Warm FireRed chrome (`--fr-body #d5d5bd`, `--fr-border #62737b`, `--fr-red #e60808`, `--fr-text #181818`). Cold System (`--sys-panel` near-black glass, `--sys-ink #80e8ff`, `--sys-cyan #00ccff`, danger `--sys-danger #ff3030`). Dark cyber hub (`--hub-bg-0 #0d1326` → `--hub-bg-1 #07070d`, `--hub-cyan #18b8c8`). Plus a **bright cartographic** set for the world map (biomes `--biome-verdara/halveth/calderra/vael`, node types, 5 hazards, 9 affinities + 2 meta-types). Imagery is **pixel art** — limited palettes, `image-rendering: pixelated`, no anti-aliasing.

**Type.** Exactly two faces. `Press Start 2P` (pixel) for ALL game chrome, the hub logo, headings, and labels — used tiny in-game (7–10px) and large for display. `Courier`-family monospace for hub body, the System overlay, world-map labels, and long-form. No third font.

**Spacing.** A tight **pixel grid** (`--sp-1: 2px` … `--sp-12: 40px`). In-game UI is dense; hub/marketing breathes more. Everything snaps to even pixels — this is a 240×160 product.

**Backgrounds.** Game world: tiled pixel terrain (`background-size` in 16/64px steps, repeat, pixelated). Hub: a **radial dark gradient** (`#0d1326` → `#07070d`). World map: a bright radial ocean gradient with hand-smoothed coastlines. **No** soft photographic gradients on chrome — gradients are reserved for sky/sea/atmosphere, never UI panels.

**Borders & corners.** Warm windows: **3px solid slate** border, **rounded 8–14px**, with an **inset 2px white highlight** (`--shadow-inset`) — the signature FireRed bevel. Small buttons: 2px border, 6–8px radius. Cyber hub cards: **double cyan stroke** (`--cyber-frame`) on near- square 14px corners. The System toasts: 6px radius, thin neon border.

**Shadows — two languages.**

- *Warm (stamped):* hard offset drop-shadows `2px 2px 0 rgba(0,0,0,.35)` + inner white highlight. No blur. Reads as a physical, screen-printed sticker.
- *Cold (glow):* blurred neon `0 0 6–14px` cyan/red. The System literally *glows*. Danger toasts **pulse** (`sys-pulse` keyframes, alternate).

**Motion.** Restrained and snappy. Hover/active on buttons is **instant color invert** (fill goes red, text white) — `~0.12s`. Dialogue arrow **blinks** (step-end). Battle uses short arcs/shakes. The System danger glow pulses. No easing-heavy, bouncy, or decorative motion on chrome. Honor `prefers-reduced-motion`.

**Hover / press states.**

- Warm buttons: hover/active → background `--fr-red`, text `#fff`, border `--fr-red-dark` (full invert). Selected rows: faint red wash `rgba(230,8,8,.10)` + red left-border.
- Press: `transform: scale(0.93)` + `filter: brightness(1.5)` on the on-screen gamepad.
- Cyber cards: hover lifts `translateY(-2px)` and brightens the cyan stroke to 2px + drop.

**Transparency & blur.** The start menu's left "void" is **transparent** so the game world shows through — the menu is an overlay, not a page. The System glass is `rgba(0,6,20,.93)`. Otherwise chrome is opaque; avoid gratuitous blur (it fights the pixel aesthetic).

**Imagery vibe.** Cool, slightly desaturated for the System/hub (cyan-leaning, nocturnal). Bright and saturated for the world map (friendly daytime cartography). Pixel grain everywhere; never photographic.

---

## Iconography

Awakened Calamity has **no installed icon font and no PNG icon set in the clean source** (the repo's pixel UI icons are IP-flagged placeholders and were intentionally not imported). The brand's real icon language is **geometric SVG markers + pixel glyphs + a few Unicode chars**:

- **World-map markers (primary system):** each place type is a distinct geometric shape, drawn inline as SVG — **diamond** = Safe Zone, **rotated square** = Holdfast, **circle** = route, **triangle** = dungeon, **5-point star** = Calamity/landmark, **dashed circle + "?"** = hidden, dashed rings = underwater. Color encodes type (`--node-*`); a colored halo encodes hazard. Reuse these shapes anywhere you need to denote a place or danger class.
- **Hazard & affinity chips:** small colored squares/badges keyed to `--hz-*` and `--aff-*`. Prefer a labeled chip over a pictographic icon — the palette *is* the icon.
- **Unicode used as UI glyphs:** `›` (card arrow), `▸ ▾` (menu cursor / dialogue arrow), `✕` (close), `◷` (overflow stage ring), `·` (the brand middot). Keep to this small set.
- **No emoji in shipped UI.** The hub's 🎮/✎/🗺️ were placeholders; replace with pixel tiles or geometric markers.

If a project genuinely needs line icons (e.g. a settings panel beyond what the geometric set covers), substitute a **pixel/blocky** open-source set rather than a smooth modern one, and flag the substitution — smooth icons break the 240×160 aesthetic.

> **Substitution flagged:** `Press Start 2P` is loaded from **Google Fonts** (the source game references it by family name only; no binary ships in the repo). If you want a self-hosted woff2 or a licensed alternative, drop it into `tokens/` and update `tokens/fonts.css`.

---

## Tilesets (16×16) — building maps

The world is built from **16×16 pixel terrain tiles** (`assets/tilesets/`). All art
is **original, procedurally generated** clean — nothing copied from the source repo.
Render with `image-rendering: pixelated`; ground tiles repeat seamlessly.

- **`ac-terrain-16.png`** — the master sheet, **128×64 px, 8 cols × 4 rows, 32 tiles**,
  indexed 0–31:
  - *0–7* grass · grass+flower · tall grass · bush · dirt · sand · rock · mossy rock
  - *8–15* water · deep water · ice water · snow · snow rock · meadow · tropic · lava
  - *16–23* tree · pine · palm · stump · red flower · white flower · mushroom · crystal
  - *24–31* cliff top · cliff face · stairs · fence─ · fence│ · sign · corrupted · corrupt rune
  - Covers all four biomes (Verdara grass · Halveth meadow · Calderra tropic/lava ·
    Vael snow/ice) plus the System's **corruption** tiles and structures.
- **`ac-road-autotile-16.png`** — a **3×3 (48×48)** blob: a dirt clearing bordered by
  grass. Stamp the 9 cells around any rectangular area to border it cleanly.
- **`ac-pond-autotile-16.png`** — a **3×3 (48×48)** blob: a water pond with a grassy
  shore. Same stamping logic for lakes/ponds.

### The wider tile library (fantasy LitRPG set)

All 128×N px, 8 columns, same pixel rules. Each has a specimen card under
`guidelines/` and (where useful) an assembled scene render in `assets/tilesets/`.

- **`ac-terrain2-16.png`** — **32 tiles**, extended ground: cobble, mossy cobble,
  brick path, red brick, wood/dark-wood floor, stone floor, gravel, tilled soil
  (dry/wet), sprouts, wheat, mud, mud puddle, dark/autumn/dead/swamp grass, swamp
  water, desert sand/dune/cracked earth, savanna, ash, river ─/│, waterfall, foam
  edge, lava rock, packed snow, ice floor. Pairs with the base biome sheet for
  towns, farms, wetlands and deserts.
- **`ac-buildings-16.png`** — **40 tiles**, an assemblable house kit. Three roof
  styles (red, blue, thatch) as *top* + *eave* rows with `◤◥◣◢` end pieces, plaster
  and **stone** walls, windows, doors, an arched stone door, chimney, dormer,
  shop **awning**, battlements (tower tops), banner and lantern. **Stack roof rows
  over wall rows; close the ends with the L/R pieces.** See `scene-village.png` for
  three cottages, a shop and a watchtower built from it.
- **`ac-props-16.png`** — **32 tiles**, freestanding objects on **transparent**
  backgrounds (with a soft ground shadow) for an object layer above terrain: chests
  (closed/open), barrel, crate, sack, clay pot, basket, lantern, well (top/base),
  signpost, lamppost, fences ─/│, gate, hay bale, campfire, tents, market stalls,
  statue, fountain (top/base), gravestones, flower pot, bridges ─/│, anvil, cart.
- **`ac-dungeon-16.png`** — **32 tiles**, interiors and caves: floor + cracked
  floor, wall + wall-top, cave floor/wall, mossy wall, pressure plate, stairs ↓/↑,
  pillar (top/base), wall torch, brazier, wood + barred doors, spikes, spike trap,
  rubble, bones, skull, cobweb, crystals, dungeon chest, lava, dark water, glowing
  mushroom, and the System's cyan **rune floor** + **portal** (corruption tie-ins).
  See `scene-dungeon.png` for an assembled torch-lit room.

**Placing a tile** (CSS): set a cell's background to the sheet and offset it —
`background-position: -(col · 16 · scale)px -(row · 16 · scale)px` with
`background-size` scaled to match. The `guidelines/tilesets*.card.html` specimens show
every index, the autotile patches (incl. a tiled proof), and assembled sample
maps/scenes. All sheets share one palette and pixel discipline (limited colors,
integer pixels, no anti-aliasing) — extend a sheet by adding tiles in that style.

---

## Index / manifest

**Foundations**

- `styles.css` — entry point (import-only)
- `tokens/colors.css` · `tokens/typography.css` · `tokens/effects.css` · `tokens/fonts.css`
- `guidelines/*.card.html` — foundation specimen cards (Design System tab)
- `assets/tilesets/*.png` — 16×16 terrain tileset + road/pond autotile patches
  (see the **Tilesets** section above)

**Components** (`components/`, namespace `window.AwakenedCalamityDesignSystem_475ed3`)

- `chrome/` — `FrWindow`, `FrButton`, `MenuRow`, `DialogueBox`
- `meters/` — `MeterBar`, `SurveillanceMeter`
- `system/` — `SystemNotify`
- `world/` — `HazardChip`, `AffinityBadge`, `MapMarker`
- `hub/` — `LaunchCard`

**UI Kits** (`ui_kits/`)

- `game/` — the in-world play screen (HUD, dialogue, start menu, battle, System overlay)
- `hub/` — the launcher / landing
- `worldmap/` — the Four Reaches, simplified

**Other**

- `SKILL.md` — Agent-Skills-compatible entry for downloading/using this system
- `readme.md` — you are here
