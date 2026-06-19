# Mapping Principles — reference notes

Distilled from the RPG Maker forum thread *"How to learn how to create good maps"*
(https://forums.rpgmakerweb.com/threads/how-to-learn-how-to-create-good-maps.144294/),
stripped of forum chatter. Kept as a checklist for our map generator + hand-authored maps.

## Study & imitate
- Study maps you admire. Pick one you *like*, then ask **why** — ignore the tileset/art
  style and recreate it with default tiles. If you still like the copy, you liked the
  **design**; if not, you only liked the art assets.
- The "copying technique": faithfully recreate good maps as practice (like art students
  copying paintings) — for learning, not shipping.
- When studying, look specifically at: **edging** (how map borders are handled),
  **building/structure spacing**, and **ground-clutter variety**.

## Do's and don'ts (what players dislike)
- ❌ **Huge square maps with nothing inside.** Dead empty space.
- ❌ **Indoor/outdoor size mismatch** — a small house that's cavernous inside.
- ❌ **Over-clutter.** The old **"Three-Tile Rule"** (place something every ~3 tiles to
  break monotony) is a *guideline, not gospel* — applied blindly it makes maps messy.
  **Respect negative space** — empty areas are part of good composition.
- ✅ **Add verticality** — vary heights in both towns and dungeons. Cited as the single
  biggest "good map" lever.
- ✅ Learn the **basics first** (the "Avery" guides are praised).
- ✅ **Classify/curate tiles per area** — e.g. for a desert, gather the relevant tiles
  into a dedicated palette/"carpet" before mapping.

## Process
- Post maps for **critique** — best way to improve when a map feels off but you can't
  say why.

## Linked resources
- Official RPG Maker Blog interior-mapping tutorial.
- Avery's mapping guides.
- Feedback communities: RMN (rpgmaker.net), RPG Refugees, RM Planet.

## How this maps to OUR generator (see docs/GENERATOR_ROADMAP.md)
- **Anti-clutter / negative space:** our generator currently scatters props roughly by
  the 3-tile rule — bias toward intentional clusters + deliberate empty space instead.
  (Roadmap #2 biome system, #6 smarter encounter/prop placement.)
- **Verticality:** we bake north wall-faces already; add height/elevation variation in
  floor layout, not just walls. (Roadmap #5 room-shape variety.)
- **No empty square rooms:** every room should earn its space — content or a reason to
  cross it. (Roadmap #5.)
- **Indoor/outdoor consistency:** keep interior footprints believable vs. their exterior.
