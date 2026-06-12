# Economy — System Shop, Credits & Rarity

> Design for the credit economy, the System Shop (reputation-gated per Safe Zone), loot-selling,
> buyable class access, and the game-wide **rarity ladder**. Builds on the Drive doc's lean-credit
> decision and starter catalog (§7–8). Companion to `DESIGN.md`, `CLASSES.md`, `HIDDEN_LAYER.md`.
> **Status:** brainstorming / pre-implementation.
>
> *Reference note:* the rarity ladder is inspired in spirit by Tao Wong's *System Apocalypse* tiered
> classes (which uses tiered Basic/Advanced/Master class progression). The exact grade names there
> weren't confirmable; this ladder is our own, IP-clean.

---

## 1. The System Shop — earned, per Safe Zone

- **Access is per-town reputation.** Each Safe Zone has its own **local reputation** (raised via
  bounties, discoveries, helping locals). Unlocking the town's System Shop requires rep; **higher rep
  unlocks higher catalog tiers** at that town.
- **Towns specialize toward their guild.** Cinderhold's shop leans forging; the Pastoral Exchange
  town leans food/supply; espionage towns stock skill manuals, etc. → you **travel to shop**, which
  feeds the living world and gives each town a purpose.
- **The Shop sells what nothing else can:** rare recipes, relic-adjacent gear, System utilities
  (inventory/box/warp/breeding/respec), and **access to rare classes** (see §4).
- Roster rotates on the real-time clock (weekly in-world).

---

## 2. Credits — semi-hard (lean economy)

Credits feel like **events**, not a faucet (locked decision from the Drive doc §8). Sources are
mostly one-time and discovery-driven:
- First-clear Calamity / first-clear deep dungeon (one-time, scales with era)
- Discovery milestones, hidden caches, OWPS/hidden quest rewards
- **Selling valuable loot** (see §3) — the main repeatable trickle, but deliberately thin
- No daily quests, no grind loops, no meaningful income from common materials.

---

## 3. Loot Selling — value scales hard with rarity

The System values scarcity. Selling is tiered so vendor-trashing can't trivialize the economy:

| Drop rarity | Sell value | Effect on play |
|---|---|---|
| **Trash / Standard / Uncommon** | almost nothing | Don't bother hoarding to sell; these are *crafting* inputs, not income |
| **Rare** | a real payday | Hunting rare drops becomes the credit engine |
| **Mythic / extremely rare** | big credits | A single drop can fund a class slot or a Legendary recipe |

> The credit engine is **hunting valuable drops**, not grinding common kills. Trash loot's worth is
> in **crafting/survival** (`DESIGN.md §3`), not in selling.

Special sellables (per Drive doc §8): Legendary-tier cores / Phoenix Plumes / Origin Pulses fetch
500–5,000 Cr — the System pays for the things it wants back.

---

## 4. Buying Class Access

- The Shop sells **access to rare classes** — buy a higher-rarity class slot for serious credits
  (and often a rep gate + a quest). This is a major credit sink and a key reason credits matter.
- **Sanctioned = buyable; off-book = earned.** Standard→Legendary classes can be bought/unlocked
  through the Shop. The **Anomalous** glitch-classes (Null, Systemtouched, Revenant — `CLASSES.md §3`)
  are **never sold**; they're *found* via the hidden layer. Clean split: money buys the System's
  sanctioned power; the loopholes must be discovered.

---

## 5. The Rarity Ladder (game-wide)

One consistent rarity language tags **items, drops, recipes, AND classes** — so a color tells the
player at a glance what something is worth and how hard it is to get.

| Tier | Color | Obtain | Class example |
|---|---|---|---|
| **Standard** | grey | default, abundant | most starter classes |
| **Uncommon** | green | common drops / low rep | specialized starters |
| **Rare** | blue | high town rep + big credits | Systemancer, Soulbinder |
| **Elite** | purple | rare drops + deep rep | advanced subclasses |
| **Legendary** | gold | huge credit sink or epic quest | apex builds |
| **Mythic** | red | quest/relic only — not normally obtainable | resistance-aligned classes |
| **Anomalous** | black / glitch | **found via hidden layer, never sold** | Null, Systemtouched, Revenant |

---

## 6. Interlock Summary
- **Living World:** per-town rep + specialized shops make you travel; the roaming population is your
  customer base / bounty source.
- **Classes:** rarity gates buyable class access; Anomalous classes route through the hidden layer.
- **Survival:** trash loot's value is crafting/survival inputs, not credits — keeps the expedition
  loop meaningful.
- **Surveillance:** Shop use raises Surveillance (`DESIGN.md`/`HIDDEN_LAYER.md`) — the credit economy
  is itself part of the convenience-trap.
- **Hidden Layer:** Off-Grid relics let you bypass the Shop (and its Surveillance) entirely.

---

## 7. Scope Honesty
- **Cheap / early:** the rarity ladder as a data tag on items/drops; per-town rep counter; a basic
  Shop UI with a tiered catalog; rarity-scaled sell values.
- **Medium:** rep-gated catalog tiers, town specialization, buyable class slots, weekly rotation.
- **Defer:** Anomalous class discovery pipeline, Off-Grid Shop-bypass economy, deep quest-gated
  Legendary/Mythic unlocks.

---

## 8. Open Calls
1. **Rep sources per town** — bounties only, or also discoveries/donations/story?
2. **Catalog tier thresholds** — what rep unlocks Rare vs. Elite vs. Legendary stock.
3. **Class-slot cost curve** — Cr (+ rep + quest) for Rare/Elite/Legendary class access.
4. **Cross-town rep** — does helping one town bleed reputation to neighbors, or fully independent?
