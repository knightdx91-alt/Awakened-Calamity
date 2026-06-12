# Gazetteer — The Drowned Reach & the Four Reaches (master place list)

> The complete place-list the world map is built from: **every** safe zone, holdfast, route, dungeon,
> underwater zone, Calamity arena, hidden pocket, camp, and micro-POI a player can reach.
> Tuned so the world feels **HUGE** *and* **dangerous** — safe harbors are scarce, the wild is vast.
> Expands `WORLD.md §3` + `WORLD_MAP.md` and adds the **sea/underwater layer** (the Drowned Reach).
> (Note: "Overflow" now names the dungeon-break system — see `OVERFLOW.md`; the ocean is the Drowned Reach.)
> **Status:** brainstorming / pre-implementation — this is the reference the map mockup draws from.

---

## 0. Conventions

- **Dual-naming (buried-truth texture):** the System catalogs every wild route with a **number**
  ("Wildway 07"); **locals keep the old name.** The old names are pre-Awakening — free lore. Format:
  *Wildway NN "Old Name."*
- **Place types:** ① Safe Zone ②H Wild Holdfast ② Route/Wildway ③ Dungeon/Interior ④ Calamity/Landmark
  ⑤ Hidden/Secret ⑥ Camp/Forward-base ⑦ Water/Sea ⑧ Underwater ⑨ Micro-POI ⑩ Gateway.
- **Tier:** T1 1–125 · T2 126–250 · T3 251–375 · T4 376–500+ (`PROGRESSION.md`). Sea scales by **distance
  from any coast** + **dive depth** — danger-by-depth, made vertical.
- **Hazard:** Heat · Cold · Toxic · Gloom · Tempest (+ — none). Deep water stacks **Tide+Cold+Gloom**.
- **Canon nodes** from `WORLD_MAP.md` are kept; everything else is new density to fill the world out.

### 0.0 SCARCITY = SURVIVAL (the balance rule)
Safe harbors are **deliberately rare** so the expedition loop has teeth. Three rest tiers, decreasing safety:

| Tier | Protection | Heal | Save | Catch |
|---|---|---|---|---|
| **① Safe Zone** (rare) | full System protection; **zero Stamina drain** | full | yes | the only true refuge — only a handful per region |
| **②H Wild Holdfast** (a few) | **contested** fortified outpost; partial protection | **partial** (some Stamina, no full heal) | yes | higher prices · can be **Audit-raided** at high Surveillance · some must be *held/cleared* first |
| **⑥ Camp** (player-made) | temporary Camp-Kit bubble | rest +60 / partial Exposure purge | deep checkpoint | consumes a Kit + time · raidable deep |

> The long, dungeon-dense gaps **between** the few Safe Zones are the game. If towns were everywhere,
> survival would be trivial — so settlements are scarce and the wild is the default state.

---

## 0.1 The Drowned Reach — the world-ocean (and why ruins are underwater)

When the System overwrote the world it **raised the seas**, drowning the old coastal civilization.
**Underwater = the pre-Awakening world, preserved.** The deepest/oldest/truest System interfaces lie
in flooded cities below the waves — so the ocean is the game's strongest **buried-truth** delivery.

- **Diving (soft model):** Ford/Swim reaches shallows; a **tiered dive rig** (Tide creature / Beast-Kin
  also work) gates deeper layers. Depth = stacked **Tide+Cold+Gloom** Exposure + a "submerged" soft-effect
  (slower Tempo, muffled detection). **No drown/oxygen meter** — consistent with soft survival.
- **The open sea is the "fifth space"** between the four land Reaches: its own pelagic tier scaling, its
  own roaming life, and a **drifting Off-Grid raft-town** (§5).
- **One drowned city per region** = the regional buried-truth core (tutorial tease → full reveal in Vael).
- **Hydrothermal vents** put **Ember Essence underwater** (counters Cold) — clean divergence + great loops.

---

# 1. VERDARA — the Onramp (Hrs 0–12)

Temperate forests, grassland, low mountains, a fishing coast, a volcanic isle. Teaches every system.
**4 true Safe Zones, far apart** — the rest is long wildland, a tutorial sea, and the first underwater OWPS tease.

### ① Safe Zones (4 — scarce)
| Town | Role | Note |
|---|---|---|
| **Dawnhearth** | **START** — origin town, System tutorial | Professor / System intro; player home; the only refuge for the whole opening trek |
| **Mirevale** | central crossroads hub | the one mid-map safe town; roads radiate 5 ways |
| **Saltmere** | fishing port | water/dive hub; ferries to the isles |
| **Volthaven** | industrial port | **Voltcorps** (engineering, X-items) |

### ②H Wild Holdfasts (3 — contested, partial rest)
- **Greywall** — mountain-foot fort, **Vanguard Order** — must repel periodic wild sieges; partial rest.
- **Verdant Reach** — **Verdant Circle** alchemists' walled grove outpost; deep-marsh prices, Toxic edge.
- **Cinderhold** — **Cinder Forge** on the volcanic isle; remote, Heat-pocket, raidable; the only forge for miles.

*Interiors (Safe Zones full; Holdfasts limited):* System Shop, rest house, guild hall, benches, homes,
bounty board. **Specials:** Dawnhearth — Professor's lab + the **Vanished House** (§hidden); Saltmere —
Dive Outfitters + Harbormaster; Cinderhold — the Great Forge.

### ② Routes / Wildways (20 — the world is mostly road)
- **01 "Greenmile Trail"** — T1 — Dawnhearth N; first wilds + camp tutorial.
- **02 "the Long Furrow"** — T1 — farm-belt loop; dense low grass.
- **03 "Mistwood Path"** — T1, Verdant — toward Greywall; silk/herb (route+dungeon).
- **04 "Greywall Ascent"** — T1–2 — switchbacks up to the holdfast.
- **05 "the Quarry Track"** — T1–2 — to Hollow Vein; cart ruts.
- **06 "Bloomway"** — T1 — Mirevale↔Verdant Reach; flowered climb.
- **07 "the Bramble Cut"** — T1 — **Break-gated shortcut** + visible-temptation cache.
- **08 "Old Orchard Lane"** — T1 — dead-end spur; abandoned orchard, relic cache.
- **09 "Marshroad"** — T2, Toxic — into the marsh.
- **10 "Thornreach Boardwalk"** — T2, Toxic — deeper marsh (Thornreach is a ruined hamlet here).
- **11 "the Reedwater"** — T2, Toxic — marsh spur to The Ashlab.
- **12 "Coast Trail"** — T1–2 — coastal toward Saltmere.
- **13 "the Saltlick Flats"** — T2 — tide-flats; fishing/dive spurs.
- **14 "Pylon Row"** — T2, Tempest — to Sparkworks; humming pylons.
- **15 "the Underpass Approach"** — T2, Gloom — to The Underpass.
- **16 "Voltway"** — T2 — to Volthaven; industrial outskirts.
- **17 "the Switchbacks"** — T2–3, Cold — alpine climb to Frostfoam.
- **18 "the Trial Road"** — T3 — Volthaven↔**Silvercrown Summit** (N→Halveth).
- **19 "Ashlab Access Road"** — T3, Toxic — restricted/derelict signage.
- **20 "the Cinder Approach"** — T2–3, Heat — dock road to the Cinderhold ferry.

### ③ Dungeons & Interiors (16)
- **Hollow Vein** — T1–2, Stone/Gloom — first mine.
- **The Underpass** — T2, Gloom — mining tier 2.
- **Sparkworks** — T2, Tempest — engineering ruin → **Storm Warden "the Engineer."**
- **The Ashlab** — T3, Toxic — forbidden lab; **OWPS first contact + first interface artifact.**
- **Greywall Catacombs** — T1–2, Gloom — under the ramparts; sealed door.
- **the Weeping Cave** — T1 — behind a Mistwood waterfall; Appraisal secret.
- **Mistwood Warren** — T1, Verdant — burrow; fiber/herb farm.
- **the Flooded Quarry** — T2 — half-drowned pit (Swim-gated lower level).
- **the Old Signal Tower** — T2 — derelict System relay; lore terminal.
- **Dawnhearth Cellars** — T1 — tutorial false-wall secret.
- **Thornreach Sump** — T2, Toxic — drowned hamlet undercroft.
- **the Verdant Grove** — T1–2, Verdant — the Circle's wild herb-deep.
- **the Marrow Pits** — T2, Stone — secondary mine, denser ore.
- **the Brine Caves** — T2, Tide — sea-cave under Coast Trail.
- **the Pylon Substation** — T2, Tempest — under Sparkworks; live-current puzzle.
- **the Hermit's Burrow** — T1 — tiny secret den, a relic + a note.

### Overflow & Alphas (Verdara) — see `OVERFLOW.md`
Every dungeon ends in an Alpha; neglect fills its Overflow until it Breaks and raids the **threatened** town.
Verdara fills **slowly** (tutorial pacing). *(Calamity-dungeons use their Construct as the Alpha.)*

| Dungeon | Alpha (archetype/affinity) | Threatens |
|---|---|---|
| Hollow Vein | **the Veinmother** (brute · Stone) | Mirevale |
| The Underpass | **the Underking** (brute · Gloom) | Volthaven |
| Sparkworks | *Calamity* — Storm Warden "the Engineer" | Volthaven |
| The Ashlab | **the Ashen Matriarch** (caster · Toxin) | Verdant Reach (H) |
| Greywall Catacombs | **the Bonewarden** (ambusher · Gloom) | Greywall (H) |
| the Weeping Cave | **the Weeping Maw** (ambusher) | Greywall (H) |
| Mistwood Warren | **the Thornback Patriarch** (swarm · Verdant) | Mirevale |
| the Flooded Quarry | **the Sluicebeast** (brute · Tide) | Mirevale |
| the Old Signal Tower | **the Static Choir** (caster · Storm) | Volthaven |
| Dawnhearth Cellars | **the Cellar Brood** (swarm) | **Dawnhearth** (gentlest tutorial Break) |
| Thornreach Sump | **the Sumpfather** (brute · Toxin) | Verdant Reach (H) |
| the Verdant Grove | **the Bloomtyrant** (caster · Verdant) | Verdant Reach (H) |
| the Marrow Pits | **the Marrow Tyrant** (brute · Stone) | Mirevale |
| the Brine Caves | **the Brine Serpent** (skirmisher · Tide) | Saltmere |
| the Pylon Substation | **the Arcbeast** (skirmisher · Storm) | Volthaven |
| the Hermit's Burrow | **the Hermit's Pet** (ambusher) | Dawnhearth |

### ④ Calamity / Landmark (4)
- **Frostfoam Caverns** — T3, Cold — **Rime Warden "Marie"** (lighthouse builder; *"I… was Marie…"*).
- **Sparkworks** — T2→3, Tempest — **Storm Warden "the Engineer."**
- **Emberreach Isle** — T3, Heat — **Pyre Warden "the Record-Burner."**
- **Null Hollow** — **T4**, Gloom — **ANOMALY "Subject Two"** — silent recurring world boss; hidden adj. Mirevale.

### ⑦⑧ Water & Underwater (7 — the tutorial sea)
- **Saltmere Harbor** — ⑦ port — ferries, dive outfitters, fish market.
- **the Saltmere Shallows** — ⑦ T1 — fishing grounds; surface skimmers.
- **the Teaching Reef / "the Nursery"** — ⑦/⑧ T1, Tide — **swim+dive tutorial**; Tide Essence, coral fiber.
- **Kelpcradle** — ⑦ T1–2 — shallow kelp maze; ambush + fiber.
- **the Tilted Wreck** — ⑧ T2 — half-sunk ship; **first dive**, salvage + relic shard.
- **the Drowned Chapel** — ⑧ T2, Gloom — **first underwater OWPS tease**; a dead name in a flooded altar-UI.
- **Emberreach Isle & Cinderhold** — ⑩ sea-isles via Saltmere/Volthaven ferry.

### ⑤ Hidden / Secret layer
- **The Ashlab** · **Null Hollow** · **the Drowned Chapel** · **the Vanished House** (first vanishing-NPC home)
  · **the First-Glitch Site** (*"Welcome, [SUBJECT 4471]"*) · **the Surveyor's Cache** · **the Low Door**
  (Greywall Catacombs — opens only at **low** Surveillance).

### ⑥⑨ Camps & Micro-POIs
- **Greenmile Camp** · **Mirevale Crossroads Shrine** · **the Lonely Lighthouse** (Marie tie) · **Greywall
  Ramparts** (overlook) · **the Toppled Statue** (defaced pre-Awakening monument) · Coast Trail fishing spots.

---

# 2. HALVETH — Specialization (Hrs 10–24)

Old-growth forest, rolling country, shrine ruins, sea cliffs, dragon highlands. **3 Safe Zones**, a
shrine sea of whirlpool isles, and a drowned bell-town below it.

### ① Safe Zones (3)
- **Goldfield** — market metropolis, **Pastoral Exchange** (food/supply hub) — the region's lifeline town.
- **Loomspire** — forge port, **Loomwright** (steel-grandmaster); ferries to Calderra.
- **Skyreach** — tower town, **Skyguard** (aerial fast-travel, weather forecast).

### ②H Wild Holdfasts (3)
- **Newdawn** — small onramp fort (arrival from Verdara's Silvercrown); partial rest, exposed.
- **Wyrmgate** — highland keep, **Wyrmwarden**; dragon country, siege-prone.
- **Bellhaven** — shrine-port; pilgrim holdfast, boats to the Bell Islets.

### ② Routes / Wildways (15)
- **01 "Wending Trail"** — T1–2 — Newdawn↔Loomspire.
- **02 "the Reed Road"** — T2, Toxic — Goldfield↔Drowned Well.
- **03 "Tanglewood"** — T2, Verdant — Newdawn↔Goldfield; apricorn/herb super-nodes.
- **04 "Tanglewood Deep"** — T2, Verdant — interior fork; denser, darker.
- **05 "the Long Meadow"** — T2 — Goldfield pastoral belt.
- **06 "Skyway"** — T2 — Goldfield↔Skyreach; glide spurs.
- **07 "the Bellchime Walk"** — T2 — Cherryfall ruins↔Bellhaven; a remember-before NPC.
- **08 "Drakepath"** — T3 — Skyreach↔Wyrmgate.
- **09 "Wyrm Causeway"** — T3 — Wyrmgate↔Drake Hollow; bone ridge.
- **10 "Mortar Track"** — T3, Stone — to Mortar Deep.
- **11 "the Burned Approach"** — T3, Heat/Gloom — to Burned Spire.
- **12 "the Cliffroad"** — T3 — sea-cliff corridor; falls + caches.
- **13 "the Pilgrim Way"** — T2 — to the shrine-isle dock.
- **14 "the Highland Stair"** — T3–4, Heat — to **Silvercrown Summit** (bridges Verdara).
- **15 "the Mistveil Track"** — T2, Gloom — fog-bound shortcut.

### ③ Dungeons & Interiors (13)
- **Concord Cave** — T2, Stone/Gloom — mining tier 3.
- **Drowned Well** — T2, Toxic — psychic-dust super-node.
- **Burned Spire** — T3, Heat/Gloom — phoenix echo; **Three Reburned** origin.
- **Drake Hollow** — T3 — dragon-marrow farming.
- **Mortar Deep** — T3, Stone — combat trial.
- **the Bellchime Shrine** — T2 — **first encrypted System archive** (needs Encryption).
- **Tanglewood Hollow** — T2, Verdant — rare apricorn cache.
- **the Forge-Deeps** — T3, Heat — under Loomspire; grandmaster ore.
- **Goldfield Granary Cellars** — T2 — sealed vault (Lockpicking).
- **the Wyrmgrave** — T3 — dragon-bone dungeon.
- **the Cliffside Catacombs** — T3, Gloom — sea-cliff crypts.
- **the Mistveil Cavern** — T2, Gloom — fog cave; illusory walls.
- **the Sunken Belfry** — T2, Tide — flooded tower; entry to the underwater bell-town.

### Overflow & Alphas (Halveth) — see `OVERFLOW.md`
Fills **faster** than Verdara. Threatened settlement is the nearest Safe Zone/Holdfast.

| Dungeon | Alpha (archetype/affinity) | Threatens |
|---|---|---|
| Concord Cave | **the Stonejaw Elder** (brute · Stone) | Goldfield |
| Drowned Well | **the Welldrowned** (caster · Toxin) | Goldfield |
| Burned Spire | *Calamity-linked* — the Three Reburned (roam) | Skyreach |
| Drake Hollow | **the Marrow Wyrm** (apex · —) | Wyrmgate (H) |
| Mortar Deep | **the Trialbreaker** (brute · Stone) | Wyrmgate (H) |
| the Bellchime Shrine | **the Chime-Keeper** (caster · Lumen) | Bellhaven (H) |
| Tanglewood Hollow | **the Briar Matron** (swarm · Verdant) | Goldfield |
| the Forge-Deeps | **the Slagfather** (brute · Ember) | Loomspire |
| Goldfield Granary Cellars | **the Granary Glut** (swarm) | Goldfield |
| the Wyrmgrave | **the Bonecoil Wyrm** (apex · Umbral) | Wyrmgate (H) |
| the Cliffside Catacombs | **the Cliffshade** (ambusher · Gloom) | Bellhaven (H) |
| the Mistveil Cavern | **the Mistlurker** (ambusher · Gloom) | Skyreach |
| the Sunken Belfry | **the Drowned Ringer** (skirmisher · Tide) | Bellhaven (H) |

### ④ Calamity / Landmark (3)
- **Silvercrown Summit** — **T4**, Heat — **Pyre Sovereign "Phoenix"** (*rebirth = trap*); bridges Verdara.
- **Maelstrom Isles** — **T4**, Tide/Tempest — **Tide Warden "Aether."**
- **the Three Reburned** (roaming) — T3 — **Gale / Spark / Cinder Wardens.**

### ⑦⑧ Water & Underwater (6 — the shrine sea)
- **Loomspire Docks & Bellhaven Pier** — ⑦ ports.
- **the Tangleweed Reach** — ⑦/⑧ T2–3, Tide — kelp mazes; Tide Essence, ambush packs.
- **the Bell Islets** — ⑦ T2 — shrine-islet chain; a sea-shrine puzzle.
- **the Whirl Gyres** — ⑦ T3–4, Tempest — whirlpool field guarding the Isles.
- **the Drowned Shrine** — ⑧ T4, Tide/Gloom — **Tide Warden's** sunken temple.
- **the Sunken Bell-town** — ⑧ T3, Gloom — **Halveth's drowned city**; an OWPS archive, bells ringing underwater.

### ⑤ Hidden / Camps
- **the Bellchime Shrine** (encryption) · **the Sunken Bell-town** (underwater OWPS) · **the Phoenix Echo**
  (memory relic) · more **remember-before NPCs** (alien refugees recall a *different world's* Awakening).
- Camps/POIs: **Skyreach Aerie** (overlook+forecast) · **Drake Hollow bone-fields** · **the Burned Memorial.**

---

# 3. CALDERRA — Mastery (Hrs 22–40)

Tropical coast, rainforest, active volcano, **the great ocean**, sky towers, desert. **3 Safe Zones** in a
huge naval region — coral metropolis, hydrothermal vents, a drowned R&D capital.

### ① Safe Zones (3)
- **Tidecrown** — caldera-lake capital, **Tideclaw** (naval supremacy, aquatic crafting).
- **Galehold** — junction city, **Stormcaller** (electric/aerial); ferries to Vael.
- **Emberfall** — volcano-foot town, **Emberforge** (fire mastery, T3+ forging).

### ②H Wild Holdfasts (3)
- **Bastion** — island fortress, **Stoneheart**; storm-battered, partial rest.
- **Stormwatch Platform** — offshore rig-town; weather-institute annex, permanent squalls.
- **Sablecoast** — black-sand desert port; salvage market, sandstorm shelter.

### ② Routes / Wildways (16)
- **01 "Reefway"** — T3, Tide — Tidecrown↔Bastion.
- **02 "the Tidewalk"** — T3, Tide — Tidecrown shallows loop; pearl/essence spurs.
- **03 "the Reefwalk"** — T3, Tide — to the coral metropolis.
- **04 "Bastion Causeway"** — T3, Stone — Bastion↔Granite Deep.
- **05 "Stormbridge"** — T3, Tempest — Granite Deep↔Galehold↔Stormworks.
- **06 "Mount Cinder Switchback"** — T3, Heat — Galehold↔Mount Cinder.
- **07 "the Ashen Climb"** — T3, Heat — Mount Cinder↔Orbital Spire.
- **08 "Cinder Trail"** — T3, Heat — Emberfall↔Caldera Maw.
- **09 "Origin Walk"** — T3 — Tidecrown↔Origin Hollow↔Emberfall.
- **10 "the Saltflats"** — T3, (Sand) — Sablecoast approaches.
- **11 "the Dune Sea"** — T3, Sand/Heat — deep desert; a buried tomb.
- **12 "the Sky Stair"** — T3 — to Orbital Spire / Heaven's Spine.
- **13 "the Jungle Cut"** — T3, Verdant — rainforest interior; Break-gated.
- **14 "the Magma Road"** — T3, Heat — lava-flats to the Caldera Maw.
- **15 "the Coral Causeway"** — T3, Tide — low-tide land bridge to reef towns.
- **16 "the Stormwatch Run"** — T3, Tempest — exposed rig approach.

### ③ Dungeons & Interiors (14)
- **Granite Deep** — T3, Stone/Gloom — first Cosmic Dust.
- **Stormworks** — T3, Tempest — engineering guild HQ.
- **Mount Cinder** — T3, Heat — active volcano; Magma super-node.
- **the Magma Tubes** — T3–4, Heat — Mount Cinder sublevel; lava-wade gated.
- **Orbital Spire** — T3 — cosmic-dust factory; sky-tower climb.
- **Origin Hollow** — T3 — pre-Calamity trial.
- **the Coral Vaults** — T3, Tide — flooded limestone halls (dive-gated).
- **Bastion Undercroft** — T3, Stone — pre-Awakening doors (Lockpicking).
- **the Desert Tomb** — T3, (Sand/Heat) — **the Disguise uniform artifact** found here.
- **the Weather Institute** — T3 — interior; forecasting service + a sealed archive.
- **the Reef Catacombs** — T3, Tide — drowned ossuary off the coral city.
- **the Cinderworks** — T3, Heat — forge-dungeon under Emberfall.
- **the Sunken Locks** — T3, Tide — flooded canal works; puzzle dive.
- **the Jungle Ziggurat** — T3, Verdant — overgrown step-temple.

### Overflow & Alphas (Calderra) — see `OVERFLOW.md`
Fills **fast**; weather (storm/heatwave) can accelerate a Break. Naval region — some warbands march by sea-route.

| Dungeon | Alpha (archetype/affinity) | Threatens |
|---|---|---|
| Granite Deep | **the Dustcrusher** (brute · Stone) | Bastion (H) |
| Stormworks | **the Tempest Engine** (caster · Storm) | Galehold |
| Mount Cinder | **the Cinder Colossus** (brute · Ember) | Emberfall |
| the Magma Tubes | **the Magmaworm** (apex · Ember) | Emberfall |
| Orbital Spire | **the Dust Choir** (caster · —) | Galehold |
| Origin Hollow | **the Trial Apex** (apex · —) | Tidecrown |
| the Coral Vaults | **the Reef Tyrant** (brute · Tide) | Tidecrown |
| Bastion Undercroft | **the Vault Warden** (ambusher · Stone) | Bastion (H) |
| the Desert Tomb | **the Sand Pharaoh** (caster · Toxin) | Sablecoast (H) |
| the Weather Institute | **the Squall** (skirmisher · Storm) | Stormwatch (H) |
| the Reef Catacombs | **the Drowned Chorus** (swarm · Tide) | Tidecrown |
| the Cinderworks | **the Forgefiend** (brute · Ember) | Emberfall |
| the Sunken Locks | **the Lockbreaker Eel** (skirmisher · Tide) | Tidecrown |
| the Jungle Ziggurat | **the Vine Sovereign** (caster · Verdant) | Galehold |

### ④ Calamity / Landmark (5)
- **Sealed Chambers** — **T4**, varies — **the Three Wardens of the Door.**
- **Sunken Vault** — **T4**, Tide — **Abyss Warden** (drowned pre-Awakening archive).
- **Caldera Maw** — **T4**, Heat — **Magma Warden** (the two made to keep fighting).
- **Heaven's Spine** — **T4**, Tempest — **Sky Sovereign** (*"the sky belonged to us"*).
- **the Mirror Pair** (open sea) — **T4**, Tide/Tempest — twins who speak only to each other in death.

### ⑦⑧ Water & Underwater (6 — the great ocean)
- **the Calderan Reach** — ⑦ T3–4 — vast open ocean; pelagic Surges, storm-seas.
- **Coralspire / "the Living City"** — ⑦/⑧ T3 — coral metropolis; reef towns, a sea-market.
- **the Emberdeeps** — ⑧ T3–4, Heat — **hydrothermal-vent field**; **Ember Essence underwater.**
- **the Maw Trench** — ⑧ T4, Tide/Gloom — abyssal trench toward the Sunken Vault.
- **the Sunken Capital / "Old Tidecrown"** — ⑧ T4, Gloom — **Calderra's drowned city**; the corporate R&D archive.
- **Stormwatch Waters** — ⑦ T3, Tempest — permanent squalls.

### ⑤ Hidden / Camps
- **the Sunken Capital** (R&D OWPS) · **the Disguise uniform** (Desert Tomb) · **Bastion Undercroft** vaults
  · **the Emberdeeps** vent-relic (Heat-gated). Camps/POIs: **Mount Cinder Rim** · **the Dueling Shore**
  (Magma/Abyss myth) · reef dive-camps · the **Orbital observation deck.**

---

# 4. VAEL — Ascension / Endgame (Hrs 38–60+)

Snow highlands, the great Spine, ancient ruins, a haunted estate, a frozen temple, the Distortion.
**3 Safe Zones** in the harshest region — a frozen sea, an under-ice temple, the oldest drowned city.

### ① Safe Zones (3)
- **Hollowmere** — mining town, **Coalstrike** (mining mastery, Spine operations).
- **Veilharrow** — cathedral city, **Veilspun** (ghost alchemy, herbal fusion).
- **Cestmark** — ancient village, **Mythcrafters** — *the OWPS-aligned guild; unlocks the buried-truth chain.*

### ②H Wild Holdfasts (3)
- **Auronpoint** — coastal snow port (arrival from Calderra), **Skyfracture**; blizzard-exposed.
- **Rimecross** — high Spine outpost; the coldest beds, Spine-Pass gate to Calderra.
- **Graveholt** — shrouded estate village; gravekeepers, gate to Greypall.

### ② Routes / Wildways (15)
- **01 "Frostway"** — T2–3, Cold — Auronpoint↔Hollowmere.
- **02 "the Whiteout Pass"** — T4, Cold — Auronpoint↔Frozen Vault; blizzard-locked.
- **03 "the Lakeway"** — T2, Verdant/Gloom — Hollowmere↔Eldwood; the lake trio scatter off here.
- **04 "the Spine Stair"** — T3, Cold/Stone — Hollowmere↔Veilharrow.
- **05 "the Spine Pass"** — T3–4 — mountain corridor **to Calderra.**
- **06 "the Cathedral Walk"** — T3, Gloom — Veilharrow approaches.
- **07 "Greypall Lane"** — T4, Gloom — Graveholt↔Greypall Estate.
- **08 "Hollow Road"** — T4, Gloom — Veilharrow↔Cestmark.
- **09 "the Iron Causeway"** — T4, Stone — Eldwood↔Irongrave Isle.
- **10 "Distortion Approach"** — T4+, all — Cestmark↔the Distortion (reality frays).
- **11 "the Frozen March"** — T4, Cold — high snowfield crossing.
- **12 "the Ossuary Road"** — T4, Gloom — bone-lined corridor to the catacombs.
- **13 "the Lake Circuit"** — T4 — loop linking the three lake-trio sites.
- **14 "the Glacier Walk"** — T4, Cold — ice-shelf path to the sea.
- **15 "the Veilcrook"** — T3, Gloom — fog shortcut behind the cathedral.

### ③ Dungeons & Interiors (14)
- **Eldwood** — T2, Verdant/Gloom — mid herbs & bugs (route+dungeon).
- **The Spine (lower)** — T3, Cold/Stone — tier-4 mining.
- **the Spine Deep** — T4, Stone — the mountain's true depths; richest veins.
- **Greypall Estate** — T4, Gloom — shadow-residue super-node; haunted manor (rooms = sub-maps).
- **Sunken Ruins** — T4, Gloom — **MAJOR OWPS site — oldest interfaces, full buried truth.**
- **Irongrave Isle** — T4, Stone — steel-grandmaster crafting.
- **Veilharrow Ossuary** — T4, Gloom — catacombs beneath the cathedral.
- **the Cathedral Crypts** — T4, Gloom — deeper, sealed.
- **the Frozen Catacombs** — T4, Cold — under Graveholt; cold-vaults.
- **the Mythcrafter Undercroft** — T4 — Cestmark; the OWPS war-room.
- **the Glacier Tubes** — T4, Cold — meltwater ice-caves; dive-holes.
- **the Buried Observatory** — T4 — pre-Awakening interior; star-charts of the cycle.
- **the Shadewell** — T4, Gloom — Greypall sublevel; Gravekeeper relics.
- **the Iron Deeps** — T4, Stone — Irongrave's grandmaster forge-mine.

### Overflow & Alphas (Vael) — see `OVERFLOW.md`
Fills **fastest + hardest** (endgame). Blizzards accelerate Breaks; Safe Zones here are few and besieged often.

| Dungeon | Alpha (archetype/affinity) | Threatens |
|---|---|---|
| Eldwood | **the Eldmother** (swarm · Verdant) | Hollowmere |
| The Spine (lower) | **the Spinecrawler** (brute · Stone) | Hollowmere |
| the Spine Deep | **the Deep Tyrant** (apex · Stone) | Rimecross (H) |
| Greypall Estate | **the Manor Shade** (apex · Gloom) | Graveholt (H) |
| Sunken Ruins | *OWPS site* — guardian apex (Untethered) | Cestmark |
| Irongrave Isle | **the Iron Revenant** (brute · Stone) | Veilharrow |
| Veilharrow Ossuary | **the Ossuary King** (caster · Gloom) | Veilharrow |
| the Cathedral Crypts | **the Crypt Choir** (swarm · Gloom) | Veilharrow |
| the Frozen Catacombs | **the Rimewraith** (ambusher · Cold) | Graveholt (H) |
| the Mythcrafter Undercroft | **the Warden of Truths** (caster · Lumen) | Cestmark |
| the Glacier Tubes | **the Glacial Maw** (apex · Cold) | Auronpoint (H) |
| the Buried Observatory | **the Star-Eaten** (caster · Umbral) | Cestmark |
| the Shadewell | **the Wellshade** (ambusher · Gloom) | Graveholt (H) |
| the Iron Deeps | **the Grandforge Golem** (brute · Stone) | Veilharrow |

### ④ Calamity / Landmark (6)
- **Frozen Vault** — **T4**, Cold — **Origin Warden** (first Awakened of cycle −1 — *previous loop's tutorial boss*).
- **Ledgerpoint** — **T4**, Tempest — **the Bookkeepers** (run the System's time-and-space ledgers).
- **Pyrecore** — **T4**, Heat — **Forge Warden** (*"I crawled in to hide. I never crawled out."*).
- **the Three Who Saw** (lakes) — **T4** — children who saw too much.
- **the Severed Lovers** (lakes) — **T4**, Gloom — lovers split by a cycle reset.
- **The Distortion** — **T4+**, all — **the Exile / Sidewise One** — knows everything; **persistent raid, true-endgame entry.**

### ⑦⑧ Water & Underwater (5 — the frozen sea)
- **the White Reach** — ⑦ T4, Cold — ice-sea; floes, cracking shelves, blizzard sailing.
- **the Ice Floes** — ⑦ T4, Cold — hopping-platform traversal; cold-gated dive holes.
- **the Frostmaw Trench** — ⑧ T4, Tide/Cold — black under-ice abyss.
- **the Glass Temple** — ⑧ T4, Cold/Gloom — **under-ice temple**; a frozen Untethered/mythical site.
- **the Drowned First City** — ⑧ T4+, Gloom — **the oldest drowned city**, feeding the Sunken Ruins; the cycle laid bare.

### ⑤ Hidden / Camps
- **Sunken Ruins** + **the Drowned First City** (full buried truth) · **the Glass Temple** (under-ice mythical)
  · **Root Keys** → **Hidden System Access** (admin layer) reserved here / the Distortion · **Off-Grid relic
  sites** (Ghost Tether / Null Beacon / Severed Warp). Camps/POIs: **the Spine Overlook** (whole world visible)
  · **the Three Lakes** · **Cestmark Standing Stones** · hot-spring camps at Auronpoint/Rimecross.

---

# 5. THE OPEN SEA — the inter-region Drowned Reach (the "fifth space")

The ocean between the Reaches: its own pelagic danger-by-depth, roaming life, and unique set-pieces.

### ⑩ Region gateways (crossings)
- **Saltmere ↔ Loomspire** — Verdara↔Halveth sea ferry (+ the **Silvercrown** land bridge, north).
- **Loomspire / Tidecrown ferry** — Halveth↔Calderra.
- **Galehold ↔ Auronpoint** — Calderra↔Vael sea crossing.
- **the Spine Pass** — Calderra↔Vael mountain corridor (land alternative to the northern sea).

### The drifting refuge
- **"the Flotsam Court"** — a **roaming Off-Grid raft-town** that drifts the sea-routes (Living-World roaming).
  **No Surveillance**, black-market stalls, neutral ground, off-grid crafters, rumor broker. It actually
  travels — find it where the world-brain says it is *today*. A rare moving harbor the System can't see.

### ⑦⑧ Open-ocean places
- **the Bonereach** — ⑦ T3–4 — a **shipwreck graveyard**; salvage, lost-crew ghosts, relic caches.
- **the Deep Gyre / the Abyss** — ⑦/⑧ **T4+** — farthest-from-coast pelagic; apex sea-creatures, the Mirror Pair waters.
- **the Underroad** — ⑧ T4 — a **deep-sea trench "road"** connecting regions underwater (hidden diver traversal).
- **Derelict System Buoys** — ⑨/⑤ — drifting relays; lore terminals + relic shards (Surveillance hums nearby).
- Scattered **uncharted islets** — tiny optional landfalls (a hermit, a cache, a single shrine).

---

# 6. Counts (rebalanced — scarce safety, vast wild)

| Region | Safe zones | Holdfasts | Routes | Dungeons | Calamity | Water/Underwater | Hidden/POI |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Verdara** | 4 | 3 | 20 | 16 | 4 | 7 | 11 |
| **Halveth** | 3 | 3 | 15 | 13 | 3 | 6 | 9 |
| **Calderra** | 3 | 3 | 16 | 14 | 5 | 6 | 8 |
| **Vael** | 3 | 3 | 15 | 14 | 6 | 5 | 9 |
| **Open Overflow** | (Flotsam, drifting) | — | 4 gateways | — | (Mirror Pair) | 5 | derelicts/islets |
| **Totals** | **13** | **12** | **~66 +4** | **~57** | **~18** | **~29** | **~46+** |

**Only 13 true Safe Zones across the entire world** — but **~66 routes + ~57 dungeons** between them.
The map reads as long, dangerous wilderness punctuated by rare refuges and contested holdfasts: you
**survive** between towns, you don't stroll. **≈ 240+ distinct places** before per-zone nodes/caches.

---

# 7. How this feeds the map mockup
- Land nodes draw with the **WORLD_MAP.md connection graph**; the new routes thread long chains between
  the few hubs (so the eye sees big wild gaps, not a dense town cluster).
- Marker types map 1:1 to the legend: Safe Zone · **Holdfast** · Route · Dungeon · Calamity · Hidden ·
  Camp/POI · Sea · Underwater · Gateway — Safe Zones visually rare and bright; the wild dominates.
- The **Drowned Reach** renders as the page's ocean: regions are landmasses, **sea-routes** dashed lanes,
  **underwater zones** deep markers (dive-gated), **the Flotsam Court** a moving marker.
- Tier + hazard color-code every node; click → details panel (name, old name, type, tier, hazard, hook).

> Next: build the interactive world-map mockup from this gazetteer (the first iteration of what a player sees).
