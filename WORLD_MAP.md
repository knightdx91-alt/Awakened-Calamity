# World Map Mockup — The Four Reaches (full layout)

> Complete world layout: every town, route, dungeon, landmark, and Calamity site across all four
> regions, with the **connection graph** (node ↔ node, by direction) so it forms a real traversable
> map for seamless streaming (`MAP_STREAMING.md`). All names original. Expands `WORLD.md §3`.
> **Status:** mockup to refine — geography/connections are the first draft; tune in region deep-dives.
>
> Legend — Type: **Town**(safe zone) · **Route**(open wildland) · **Dungeon** · **Landmark/Calamity**.
> Tier T1–T4(+). Hazard: Heat/Cold/Toxic/Gloom/Tempest/—. Dir = border direction from the first node.

---

## 0. World Overview — region adjacency

```
                 [ VAEL ]  (cold north, endgame)
                    |  sea + Spine pass
                 [ CALDERRA ]  (tropics/volcano/sea, mastery)
                    |  sea (Tidecrown <-> Loomspire)
   [ VERDARA ] --- [ HALVETH ]   (north land bridge: Silvercrown Summit)
   (onramp)  sea   (specialization)
```
- **Verdara ↔ Halveth:** land bridge over **Silvercrown Summit** (north) + sea (Saltmere ↔ Loomspire).
- **Halveth ↔ Calderra:** sea (Loomspire/Tidecrown ferry).
- **Calderra ↔ Vael:** sea (Galehold ↔ Auronpoint) + the **Spine Pass** mountain corridor.
- Any **visited port** is reachable by ship (Warp Stone / boat). Physical adjacency above is what
  streams seamlessly; long crossings use a boat transition (`MAP_STREAMING.md §2.1`).

---

## 1. VERDARA — Onramp (Hrs 0–12)

```
                 [Frostfoam Caverns]*Rime Warden       --> (Silvercrown Summit / HALVETH, far N)
                        |  (Cold)
   [Greywall]--Mistwood--[Mirevale]--Bloomway--[Verdance]--Coast Trail--[Saltmere]~~boat~~[Emberreach Isle]*Pyre Warden
       |                   |   \Null Hollow*ANOMALY        |                 |
   Greenmile Trail     Marshroad(Toxic)                Sparkworks        The Underpass(Gloom)
       |                   |                            (Tempest)*Storm Warden   |
   [Dawnhearth]        [Thornreach]--The Ashlab(Toxic,OWPS)   [Volthaven]----The Trial Road(T3)
   (START)                                                       |
                                                          ~~boat~~[Cinderhold]*(isle, Cinder Forge)
```

| Node | Type | Tier | Hazard | Connects (dir) | Notable |
|---|---|---|---|---|---|
| **Dawnhearth** | Town | — | — | Greenmile(N) | START, System tutorial |
| **Greenmile Trail** | Route | T1 | — | Dawnhearth(S), Greywall(N) | tutorial wilds |
| **Greywall** | Town | — | — | Greenmile(S), Mistwood(E) | Vanguard Order |
| **Mistwood** | Route/Dungeon | T1 | Verdant | Greywall(W), Mirevale(E) | silk/herb scavenge |
| **Mirevale** | Town | — | — | Mistwood(W), Bloomway(E), Marshroad(S), Hollow Vein(N), Null Hollow(adj) | central crossroads hub |
| **Hollow Vein** | Dungeon | T1–2 | Stone/Gloom | Mirevale(S), Frostfoam(N) | first mine |
| **Null Hollow** | Landmark | T4 | Gloom | Mirevale(adj, hidden) | **ANOMALY "Subject Two"** world boss |
| **Bloomway** | Route | T1 | — | Mirevale(W), Verdance(E) | gentle climb |
| **Verdance** | Town | — | — | Bloomway(W), Coast Trail(N), Sparkworks(S) | Verdant Circle |
| **Coast Trail** | Route | T1–2 | — | Verdance(S), Saltmere(N) | coastal |
| **Saltmere** | Town | — | — | Coast Trail(S), The Underpass(E), boat→Emberreach/Cinderhold | fishing port |
| **The Underpass** | Dungeon | T2 | Gloom | Saltmere(W), Volthaven(S) | mining tier 2 |
| **Sparkworks** | Dungeon | T2 | Tempest | Verdance(N), Volthaven(E) | **Storm Warden "the Engineer"** |
| **Volthaven** | Town | — | — | Sparkworks(W), Underpass(N), Trial Road(E), boat→Cinderhold | Voltcorps |
| **The Trial Road** | Route | T3 | — | Volthaven(W), Silvercrown(N→Halveth) | high-level corridor |
| **Marshroad** | Route | T2 | Toxic | Mirevale(N), Thornreach(S) | marsh |
| **Thornreach** | Town | — | — | Marshroad(N), The Ashlab(adj) | marsh town |
| **The Ashlab** | Dungeon | T3 | Toxic | Thornreach(adj) | **OWPS first contact + first ruin artifact** |
| **Frostfoam Caverns** | Landmark/Calamity | T3 | Cold | Hollow Vein(S) | **Rime Warden "Marie"** |
| **Emberreach Isle** | Landmark/Calamity | T3 | Heat | boat (Saltmere) | **Pyre Warden "the Record-Burner"** |
| **Cinderhold** | Town | — | Heat(pocket) | boat (Saltmere/Volthaven) | Cinder Forge (volcanic isle) |

---

## 2. HALVETH — Specialization (Hrs 10–24)

```
   (VERDARA, Silvercrown Summit, far S/W) --> [Silvercrown Summit]*Pyre Sovereign
                                                     |
   [Newdawn]--Tanglewood--[Goldfield]--Skyway--[Skyreach]--Drakepath--[Wyrmgate]--Drake Hollow
      |  (start side)        |   \Concord Cave(Stone)        |                       |
   Wending Trail          Drowned Well(Toxic)            Burned Spire(Heat/Gloom)  Mortar Deep
      |                      |                            *Three Reburned(roam)
   [Loomspire]~~boat~~(CALDERRA)                         [Whirl/Maelstrom Isles]*Tide Warden
```

| Node | Type | Tier | Hazard | Connects (dir) | Notable |
|---|---|---|---|---|---|
| **Newdawn** | Town | — | — | Tanglewood(E), Wending Trail(S) | secondary onramp |
| **Tanglewood** | Route/Dungeon | T2 | Verdant | Newdawn(W), Goldfield(E) | apricorn/herb nodes |
| **Goldfield** | Town | — | — | Tanglewood(W), Skyway(E), Concord Cave(N), Drowned Well(S) | Pastoral Exchange (market hub) |
| **Concord Cave** | Dungeon | T2 | Stone/Gloom | Goldfield(S) | mining tier 3 |
| **Drowned Well** | Dungeon | T2 | Toxic | Goldfield(N) | psychic-dust super-node |
| **Skyway** | Route | T2 | — | Goldfield(W), Skyreach(E) | windy uplands |
| **Skyreach** | Town | — | — | Skyway(W), Drakepath(E), Burned Spire(S) | Skyguard (fast travel) |
| **Burned Spire** | Dungeon | T3 | Heat/Gloom | Skyreach(N) | phoenix echo; **Three Reburned** origin |
| **Three Reburned** | Calamity (roaming) | T3 | — | roams Halveth routes | Gale/Spark/Cinder Wardens |
| **Drakepath** | Route | T3 | — | Skyreach(W), Wyrmgate(E) | highland approach |
| **Wyrmgate** | Town | — | — | Drakepath(W), Drake Hollow(E), Mortar Deep(S) | Wyrmwarden |
| **Drake Hollow** | Dungeon | T3 | — | Wyrmgate(W) | dragon-marrow farming |
| **Mortar Deep** | Dungeon | T3 | Stone | Wyrmgate(N) | combat trial |
| **Wending Trail** | Route | T1–2 | — | Newdawn(N), Loomspire(S) | secondary onramp path |
| **Loomspire** | Town | — | — | Wending Trail(N), boat→Calderra | Loomwright (forge port) |
| **Silvercrown Summit** | Landmark/Calamity | T4 | Heat | Trial Road(S→Verdara), Skyreach approach(N) | **Pyre Sovereign "Phoenix"** — bridges to Verdara |
| **Maelstrom Isles** | Landmark/Calamity | T4 | Tide/Tempest | boat (Loomspire) | **Tide Warden "Aether"** |

---

## 3. CALDERRA — Mastery (Hrs 22–40)

```
   (HALVETH ferry) ~~boat~~ [Tidecrown]--Reefway--[Bastion]--Granite Deep--[Galehold]~~boat~~(VAEL)
                                |               |                  |   \Stormworks(Tempest)
                          Origin Hollow      Sunken Vault*Abyss   Mount Cinder(Heat)
                                |             Sealed Chambers*Wardens     |
                          [Emberfall]--Cinder Trail--Caldera Maw*Magma  Orbital Spire
                                                                          |
                          Heaven's Spine*Sky Sovereign      Mirror Pair*(open sea)
```

| Node | Type | Tier | Hazard | Connects (dir) | Notable |
|---|---|---|---|---|---|
| **Tidecrown** | Town | — | — | boat→Halveth, Reefway(E), Origin Hollow(S) | Tideclaw (naval), caldera-lake capital |
| **Reefway** | Route | T3 | Tide | Tidecrown(W), Bastion(E) | coastal/sea-edge |
| **Bastion** | Town | — | — | Reefway(W), Granite Deep(E), Sunken Vault(S) | Stoneheart (island coast) |
| **Granite Deep** | Dungeon | T3 | Stone/Gloom | Bastion(W), Galehold(E) | first Cosmic Dust |
| **Galehold** | Town | — | — | Granite Deep(W), Stormworks(S), Mount Cinder(E), boat→Vael | Stormcaller (junction) |
| **Stormworks** | Dungeon | T3 | Tempest | Galehold(N) | engineering guild HQ |
| **Mount Cinder** | Dungeon | T3 | Heat | Galehold(W), Orbital Spire(E) | active volcano, magma super-node |
| **Orbital Spire** | Dungeon | T3 | — | Mount Cinder(W) | cosmic-dust factory |
| **Origin Hollow** | Dungeon | T3 | — | Tidecrown(N), Emberfall(S) | pre-Calamity trial |
| **Emberfall** | Town | — | Heat(pocket) | Origin Hollow(N), Cinder Trail(E) | Emberforge (volcano-foot) |
| **Cinder Trail** | Route | T3 | Heat | Emberfall(W), Caldera Maw(E) | volcanic flats |
| **Sealed Chambers** | Landmark/Calamity | T4 | varies | Bastion approach(S) | **Three Wardens of the Door** |
| **Sunken Vault** | Landmark/Calamity | T4 | Tide | Bastion(S) | **Abyss Warden** |
| **Caldera Maw** | Landmark/Calamity | T4 | Heat | Cinder Trail(E) | **Magma Warden** |
| **Heaven's Spine** | Landmark/Calamity | T4 | Tempest | (sky tower, S reach) | **Sky Sovereign** |
| **Mirror Pair** | Calamity (open sea) | T4 | Tide/Tempest | boat (open ocean) | the twins who speak in death |

---

## 4. VAEL — Ascension / Endgame (Hrs 38–60+)

```
   (CALDERRA) ~~boat~~ [Auronpoint]--Frostway--[Hollowmere]--The Spine--[Veilharrow]--Hollow Road--[Cestmark]
                           |                        |   \Greypall Estate(Gloom)    |                   |(Mythcrafters/OWPS)
                       Frozen Vault*Origin       Eldwood(Verdant)             Sunken Ruins(OWPS!)   The Distortion*EXILE
                       Warden                    Irongrave Isle               Pyrecore*Forge Warden
                       Snowpoint... Ledgerpoint*Bookkeepers    Lake Trio*Three Who Saw / Severed Lovers
```

| Node | Type | Tier | Hazard | Connects (dir) | Notable |
|---|---|---|---|---|---|
| **Auronpoint** | Town | — | Cold(pocket) | boat→Calderra, Frostway(E), Frozen Vault(N) | Skyfracture (coastal snow) |
| **Frostway** | Route | T2–3 | Cold | Auronpoint(W), Hollowmere(E) | snow approach |
| **Hollowmere** | Town | — | — | Frostway(W), The Spine(E), Eldwood(S), Greypall(N) | Coalstrike (mining) |
| **Eldwood** | Route/Dungeon | T2 | Verdant/Gloom | Hollowmere(N), Irongrave approach(S) | mid herbs/bugs |
| **Greypall Estate** | Dungeon | T4 | Gloom | Hollowmere(N) | shadow-residue super-node (haunted manor) |
| **The Spine** | Dungeon | T3 | Cold/Stone | Hollowmere(W), Veilharrow(E) | tier-4 mining (mountain pass; Spine Pass→Calderra) |
| **Veilharrow** | Town | — | — | The Spine(W), Hollow Road(E), Pyrecore(S), Ledgerpoint(N) | Veilspun (cathedral city) |
| **Hollow Road** | Route | T4 | Gloom | Veilharrow(W), Cestmark(E) | high corridor |
| **Cestmark** | Town | — | — | Hollow Road(W), Sunken Ruins(adj), Distortion(E) | **Mythcrafters (OWPS — unlocks buried truth)** |
| **Sunken Ruins** | Dungeon | T4 | Gloom | Cestmark(adj) | **MAJOR OWPS site — full buried truth** |
| **Irongrave Isle** | Dungeon | T4 | Stone | Eldwood(S) / boat | steel grandmaster crafting |
| **Frozen Vault** | Landmark/Calamity | T4 | Cold | Auronpoint(N) | **Origin Warden** (prev-cycle tutorial boss) |
| **Ledgerpoint** | Landmark/Calamity | T4 | Tempest | Veilharrow(N) | **the Bookkeepers** |
| **Lake Trio sites** | Calamity (3) | T4 | — | scattered (lakes) | **the Three Who Saw**; **Severed Lovers** |
| **Pyrecore** | Landmark/Calamity | T4 | Heat | Veilharrow(S) | **Forge Warden** |
| **The Distortion** | Landmark/Calamity | T4+ | all | Cestmark(E) | **the Exile** — true-endgame entry, persistent raid |

---

## 5. Counts (mockup scope)
- **Towns:** Verdara 8 · Halveth 5 · Calderra 5 · Vael 5 = **23 safe zones**
- **Routes/Dungeons:** ~14 + ~12 + ~11 + ~12 = **~49 wildland zones**
- **Calamity sites:** 17 constructs (`WORLD.md §4`) placed across the four regions
- Plus interiors (shops, guild halls, houses) authored per town in the region deep-dives.

## 6. Next
- Refine geography/connections per region in the deep-dives, then fill each node to the
  `WORLD.md §6` zone template (encounters, nodes, hidden areas, weather, traversal, story beat).
- Optional: render this as a visual SVG/PNG map image.
