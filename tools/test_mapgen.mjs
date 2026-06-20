// test_mapgen.mjs — verify the runtime dungeon generator (src/systems/mapgen.js):
// determinism (same seed → identical floor), full reachability (entrance reaches
// every event + the Alpha), and that the gameplay layer is placed (boss, relic
// cache, roamers, chests). Pure, headless.
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
globalThis.GameRNG = require(`${ROOT}/src/systems/rng.js`);
const GameMapGen = require(`${ROOT}/src/systems/mapgen.js`);
let creatures = {}; try { creatures = JSON.parse(readFileSync(`${ROOT}/data/systems/creatures.json`)); } catch {}

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => { console.log((cond ? '  ok  ' : '  XX  ') + name + (detail ? '  — ' + detail : '')); cond ? pass++ : fail++; };

// BFS from a start cell over the collision map; returns the set of reachable cells.
function reachable(layout, sx, sy) {
  const W = layout.width, H = layout.height, coll = layout.collision;
  const seen = new Set(), stack = [sy * W + sx]; seen.add(sy * W + sx);
  while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) { const j = ny * W + nx; if (!seen.has(j) && !coll[j]) { seen.add(j); stack.push(j); } }
    }
  }
  return seen;
}
// an event is reachable if it or an orthogonal neighbour is a reachable floor cell
function eventReachable(layout, set, e) {
  const W = layout.width;
  if (set.has(e.y * W + e.x)) return true;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (set.has((e.y + dy) * W + (e.x + dx))) return true;
  return false;
}

// determinism: same seed → byte-identical map+layout
const A = GameMapGen.generateFloor({ seed: 12345, tier: 2, creatures });
const B = GameMapGen.generateFloor({ seed: 12345, tier: 2, creatures });
check('determinism (same seed → identical)', JSON.stringify(A) === JSON.stringify(B));
const C = GameMapGen.generateFloor({ seed: 99999, tier: 2, creatures });
check('different seed → differs', JSON.stringify(A) !== JSON.stringify(C));

// structural sanity + reachability across many seeds and tiers
let allReach = true, hadStairs = true, hadBoss = true, hadRelic = true, hadRoamer = true, hadEntrance = true, collOk = true, descendOk = true;
for (let s = 0; s < 30; s++) {
  const tier = 1 + (s % 3);
  const boss = (s % 4) === 3;                         // mix in boss floors
  const { map, layout } = GameMapGen.generateFloor({ seed: 4000 + s * 7, tier, kind: boss ? 'boss' : 'floor', creatures });
  if (layout.collision.length !== layout.width * layout.height) collOk = false;
  if (layout.metatiles.length !== layout.width * layout.height) collOk = false;
  if (layout.overlay.length !== layout.width * layout.height) collOk = false;
  const start = map.start;
  if (layout.collision[start.y * layout.width + start.x]) collOk = false;  // spawn must be walkable
  const set = reachable(layout, start.x, start.y);
  const names = map.events.map(e => e.name);
  if (!names.includes('Entrance')) hadEntrance = false;
  if (boss) { if (!names.includes('Alpha')) hadBoss = false; }
  else { if (!names.includes('StairsDown')) hadStairs = false; }
  // the way deeper runs the fine-grained run loop: `run deeper` + a gendungeon/end
  // branch (boss: after the battle; floor: the stairs).
  const deep = map.events.find(e => e.name === (boss ? 'Alpha' : 'StairsDown'));
  const runsDeeper = deep && deep.commands.some(c => c.type === 'run' && c.op === 'deeper');
  const hasBranch = deep && deep.commands.some(c => c.type === 'gendungeon' ||
    (c.type === 'conditional' && JSON.stringify(c).includes('gendungeon')));
  if (!runsDeeper || !hasBranch) descendOk = false;
  if (!names.includes('Chest')) hadRelic = false;
  if (!names.some(n => n === 'Roamer')) hadRoamer = false;
  // every interactable event must be reachable (no walled-off boss/loot)
  for (const e of map.events) if (e.trigger !== 'touch' || e.name === 'Roamer') { if (!eventReachable(layout, set, e)) { allReach = false; } }
}
check('collision/metatiles/overlay sized + spawn walkable', collOk);
check('every floor has an Entrance', hadEntrance);
check('normal floors have StairsDown', hadStairs);
check('boss floors have an Alpha', hadBoss);
check('the way deeper runs the run-loop (run deeper + gendungeon/end)', descendOk);
check('every floor places loot chests', hadRelic);
check('floors spawn roaming encounters', hadRoamer);
check('all events reachable from spawn (no soft-lock)', allReach);

// the assembled objects match the on-disk schema shape the engine consumes
const { map, layout } = GameMapGen.generateFloor({ seed: 1, tier: 1, creatures });
check('layout has tileset + overlay_tileset', layout.tileset === 'rtp_dungeon_ground' && layout.overlay_tileset === 'dun_props');
check('map references its layout + has a start', map.layout === layout.id && !!map.start);

// ── BIOME system (generator roadmap #3) ────────────────────────────────────
let biomes = {}; try { biomes = JSON.parse(readFileSync(`${ROOT}/data/systems/biomes.json`)); } catch {}
const calderra = biomes.calderra, vael = biomes.vael;
// biome floorTile drives the base floor metatile (palette)
const camp = GameMapGen.generateFloor({ seed: 7, tier: 2, creatures, biome: calderra });
const vmap = GameMapGen.generateFloor({ seed: 7, tier: 2, creatures, biome: vael });
check('biome sets the base floor tile (palette)',
  camp.layout.metatiles[0] === calderra.floorTile && vmap.layout.metatiles[0] === vael.floorTile &&
  calderra.floorTile !== vael.floorTile);
// biome bosses come from the biome pool
const cb = GameMapGen.generateFloor({ seed: 3, tier: 3, kind: 'boss', creatures, biome: calderra });
const alpha = cb.map.events.find(e => e.name === 'Alpha');
const bossKey = alpha.commands.find(c => c.type === 'battle').enemies[0].key;
check('boss drawn from the biome pool', calderra.bosses.includes(bossKey), bossKey);
// biome enemy roster — roamers come from the biome's tier list
const camp2 = GameMapGen.generateFloor({ seed: 5, tier: 1, creatures, biome: calderra });
const roamerKeys = camp2.map.events.filter(e => e.name === 'Roamer')
  .map(e => e.commands.find(c => c.type === 'battle').enemies[0].key);
const allInRoster = roamerKeys.every(k => calderra.enemyTiers['1'].includes(k));
check('roamers drawn from the biome roster', roamerKeys.length > 0 && allInRoster);
// biome hazard text is wired into traps
const trap = camp.map.events.find(e => e.name === 'Trap');
const trapStr = JSON.stringify(trap);
check('biome hazard text wired into traps',
  trapStr.includes(calderra.hazard.spikeText) || trapStr.includes(calderra.hazard.sensorText));
// no biome → default behavior unchanged (still generates a valid floor)
const dflt = GameMapGen.generateFloor({ seed: 9, tier: 1, creatures });
check('no biome → default floor still valid', dflt.layout.metatiles[0] === 0 && !!dflt.map.start);
// biome floors still fully reachable
let bioReach = true;
for (const bio of [calderra, vael, biomes.halveth, biomes.verdara]) {
  const { map: m, layout: l } = GameMapGen.generateFloor({ seed: 21, tier: 2, creatures, biome: bio });
  const set = reachable(l, m.start.x, m.start.y);
  for (const e of m.events) if (e.trigger !== 'touch' || e.name === 'Roamer') if (!eventReachable(l, set, e)) bioReach = false;
}
check('all biome floors stay fully reachable', bioReach);

// ── ACT-node generation modifiers (generator roadmap #4) ───────────────────
// REST node: no hazards + a campfire refuge, no roamers.
let restOk = true;
for (let s = 0; s < 12; s++) {
  const { map: m } = GameMapGen.generateFloor({ seed: 600 + s, tier: 2, creatures, node: { encounterMult: 0, rest: true } });
  const names = m.events.map(e => e.name);
  if (names.includes('Trap')) restOk = false;
  if (names.includes('Roamer')) restOk = false;
  if (!names.includes('Campfire')) restOk = false;
}
check('rest node: campfire refuge, no traps, no roamers', restOk);
// ELITE node: a guaranteed extra roamer + a second relic cache.
let eliteOk = true;
for (let s = 0; s < 12; s++) {
  const { map: m } = GameMapGen.generateFloor({ seed: 700 + s, tier: 2, creatures, node: { elite: true, encounterMult: 1.15, levelBonus: 1, guaranteedRelic: true } });
  const roamers = m.events.filter(e => e.name === 'Roamer').length;
  const caches = m.events.filter(e => e.name === 'GearCache').length;
  if (roamers < 1 || caches < 1) eliteOk = false;
}
check('elite node: guaranteed roamer + a gear cache', eliteOk);
// TREASURE node: a guaranteed relic cache + extra chest, sparse enemies.
let treaOk = true;
for (let s = 0; s < 12; s++) {
  const { map: m } = GameMapGen.generateFloor({ seed: 800 + s, tier: 2, creatures, node: { encounterMult: 0.3, treasure: true, guaranteedRelic: true } });
  if (m.events.filter(e => e.name === 'GearCache').length < 1) treaOk = false;
}
check('treasure node: a gear cache', treaOk);
// no node → unchanged default floor (traps present, single relic cache)
const { map: dm } = GameMapGen.generateFloor({ seed: 900, tier: 2, creatures });
check('no node → default floor (has traps, NO gear cache — relics are rare)',
  dm.events.some(e => e.name === 'Trap') && dm.events.filter(e => e.name === 'GearCache').length === 0);

// ── ROOM-SHAPE VARIETY: CA cave rooms (generator roadmap #5) ───────────────
// Forcing all-cave rooms must STILL stay fully reachable (ensureConnected +
// repairPropConnectivity guarantee it) and must produce organic (non-rect) shape.
let caveReach = true, caveOrganic = false;
for (let s = 0; s < 20; s++) {
  const bio = { caveChance: 1 };
  const { map: m, layout: l } = GameMapGen.generateFloor({ seed: 1500 + s, tier: 2, creatures, biome: bio });
  const set = reachable(l, m.start.x, m.start.y);
  for (const e of m.events) if (e.trigger !== 'touch' || e.name === 'Roamer') if (!eventReachable(l, set, e)) caveReach = false;
  // organic = some interior walkable cell has a diagonal-only opening pattern not
  // possible in a pure rectangle; cheap proxy: walkable count varies vs a rect run
}
// compare walkable counts: all-cave vs all-rect from the same seed should differ
const rectRun = GameMapGen.generateFloor({ seed: 2024, tier: 2, creatures, biome: { caveChance: 0 } });
const caveRun = GameMapGen.generateFloor({ seed: 2024, tier: 2, creatures, biome: { caveChance: 1 } });
const wc = (lay) => lay.collision.reduce((n, c) => n + (c ? 0 : 1), 0);
caveOrganic = wc(rectRun.layout) !== wc(caveRun.layout);
check('all-cave floors stay fully reachable', caveReach);
check('cave rooms change the floor shape (organic vs rect)', caveOrganic);

// ── LAYOUT STYLE: BSP structured layout (generator roadmap #5) ─────────────
// Every style must stay fully reachable and place the full gameplay layer.
let styleReach = true, styleLayer = true, bspDiffers = false;
for (const style of ['rooms', 'bsp']) {
  for (let s = 0; s < 16; s++) {
    const { map: m, layout: l } = GameMapGen.generateFloor({ seed: 3300 + s, tier: 2, creatures, style });
    const set = reachable(l, m.start.x, m.start.y);
    for (const e of m.events) if (e.trigger !== 'touch' || e.name === 'Roamer') if (!eventReachable(l, set, e)) styleReach = false;
    const names = m.events.map(e => e.name);
    if (!names.includes('Entrance') || !names.includes('Chest')) styleLayer = false;
  }
}
check('every layout style stays fully reachable', styleReach);
check('every layout style places the gameplay layer', styleLayer);
// bsp vs rooms from the same seed should differ (distinct layout algorithms)
const rms = GameMapGen.generateFloor({ seed: 4242, tier: 2, creatures, style: 'rooms' });
const bsp = GameMapGen.generateFloor({ seed: 4242, tier: 2, creatures, style: 'bsp' });
bspDiffers = JSON.stringify(rms.layout.collision) !== JSON.stringify(bsp.layout.collision);
check('bsp layout differs from random rooms', bspDiffers);
// bsp determinism
const bsp2 = GameMapGen.generateFloor({ seed: 4242, tier: 2, creatures, style: 'bsp' });
check('bsp is deterministic (same seed → identical)', JSON.stringify(bsp) === JSON.stringify(bsp2));

// ── DRUNKARD'S-WALK corridors (#5): max windiness + caves must stay reachable ──
let windyReach = true;
for (let s = 0; s < 24; s++) {
  for (const style of ['rooms', 'bsp']) {
    const { map: m, layout: l } = GameMapGen.generateFloor({ seed: 5200 + s, tier: 3, style, biome: { caveChance: 1, windiness: 1 } });
    const set = reachable(l, m.start.x, m.start.y);
    for (const e of m.events) if (e.trigger !== 'touch' || e.name === 'Roamer') if (!eventReachable(l, set, e)) windyReach = false;
  }
}
check('max-windiness all-cave floors stay fully reachable (all styles)', windyReach);

// ── PREFABS / SET-PIECES (generator roadmap #5) ────────────────────────────
// Use a custom prefab list with a UNIQUE marker the normal generator never
// places on a plain floor: a body prefab carrying a RelicCache ('R') + interior
// walls ('#'). On a no-node floor a RelicCache only appears via a prefab, so its
// presence proves stamping; reachability must still hold despite the stamped walls.
const markPrefabs = [
  { id: 'test_vault', tags: ['body'], rows: [
    '.......',
    '.#####.',
    '.#.R.#.',
    '.##.##.',
    '.......'] },
  { id: 'test_arena', tags: ['arena'], rows: [
    'P.....P',
    '...A...',
    'P.....P'] }
];
let prefabPlaced = false, prefabReach = true;
for (let s = 0; s < 30; s++) {
  const { map: m, layout: l } = GameMapGen.generateFloor({ seed: 9100 + s, tier: 2, creatures, prefabs: markPrefabs });
  if (m.events.some(e => e.name === 'RelicCache')) prefabPlaced = true;
  const set = reachable(l, m.start.x, m.start.y);
  for (const e of m.events) if (e.trigger !== 'touch' || e.name === 'Roamer') if (!eventReachable(l, set, e)) prefabReach = false;
}
check('prefab set-pieces get stamped into floors (unique RelicCache marker)', prefabPlaced);
check('prefab walls never soft-lock a floor (all events reachable)', prefabReach);

// REST floors stay a refuge even with prefabs available (no guards/hazards stamped).
let prefabRestOk = true;
for (let s = 0; s < 12; s++) {
  const { map: m } = GameMapGen.generateFloor({ seed: 9200 + s, tier: 2, creatures, prefabs: markPrefabs, node: { encounterMult: 0, rest: true } });
  if (m.events.some(e => e.name === 'RelicCache' || e.name === 'Roamer' || e.name === 'Trap')) prefabRestOk = false;
}
check('rest floors stay calm — no prefabs stamped', prefabRestOk);

// boss ARENA: boss floors with an arena prefab still reach the Alpha + stay valid.
let arenaReach = true, arenaBoss = true;
for (let s = 0; s < 12; s++) {
  const { map: m, layout: l } = GameMapGen.generateFloor({ seed: 9300 + s, tier: 3, kind: 'boss', creatures, prefabs: markPrefabs });
  if (!m.events.some(e => e.name === 'Alpha')) arenaBoss = false;
  const set = reachable(l, m.start.x, m.start.y);
  for (const e of m.events) if (e.trigger !== 'touch' || e.name === 'Roamer') if (!eventReachable(l, set, e)) arenaReach = false;
}
check('boss arena: Alpha present + reachable', arenaBoss && arenaReach);

// prefabs are deterministic (same seed + same prefab list → identical floor)
const pA = GameMapGen.generateFloor({ seed: 9400, tier: 2, creatures, prefabs: markPrefabs });
const pB = GameMapGen.generateFloor({ seed: 9400, tier: 2, creatures, prefabs: markPrefabs });
check('prefab stamping is deterministic (same seed → identical)', JSON.stringify(pA) === JSON.stringify(pB));

// the shipped data file is valid + the built-in defaults stamp without breaking reachability
let shippedPrefabs = null; try { shippedPrefabs = JSON.parse(readFileSync(`${ROOT}/data/systems/prefabs.json`)); } catch {}
check('prefabs.json parses with a prefabs[] array', !!(shippedPrefabs && Array.isArray(shippedPrefabs.prefabs) && shippedPrefabs.prefabs.length));
let defReach = true;
for (let s = 0; s < 20; s++) {
  const boss = (s % 4) === 3;
  const { map: m, layout: l } = GameMapGen.generateFloor({ seed: 9500 + s, tier: 2, kind: boss ? 'boss' : 'floor', creatures, prefabs: shippedPrefabs ? shippedPrefabs.prefabs : null });
  const set = reachable(l, m.start.x, m.start.y);
  for (const e of m.events) if (e.trigger !== 'touch' || e.name === 'Roamer') if (!eventReachable(l, set, e)) defReach = false;
}
check('shipped prefab set keeps all floors reachable', defReach);

// ── ENCOUNTER DIRECTOR (generator roadmap #6) ──────────────────────────────
// Packs cluster (2+ roamers within 2 tiles of each other) and the encounter mix
// gets denser/peakier with depth — not uniform scatter. All roamers stay reachable.
function roamerCells(map) { return map.events.filter(e => e.name === 'Roamer').map(e => [e.x, e.y]); }
let sawPack = false, dirReach = true, totalRoamers = 0;
for (let s = 0; s < 40; s++) {
  const { map: m, layout: l } = GameMapGen.generateFloor({ seed: 11000 + s, tier: 3, creatures, biome: { packChance: 1, maxPack: 3 } });
  const rc = roamerCells(m); totalRoamers += rc.length;
  // a pack = some roamer with >=1 other roamer within Chebyshev distance 2
  for (let a = 0; a < rc.length; a++) for (let b2 = 0; b2 < rc.length; b2++) {
    if (a === b2) continue;
    if (Math.max(Math.abs(rc[a][0] - rc[b2][0]), Math.abs(rc[a][1] - rc[b2][1])) <= 2) sawPack = true;
  }
  const set = reachable(l, m.start.x, m.start.y);
  for (const e of m.events) if (e.trigger !== 'touch' || e.name === 'Roamer') if (!eventReachable(l, set, e)) dirReach = false;
}
check('encounter director forms clustered packs (packChance=1)', sawPack);
check('director: all encounters stay reachable', dirReach);
// packChance=0 → no clusters (lone roamers only): compared to packChance=1, fewer roamers
let loneRoamers = 0;
for (let s = 0; s < 40; s++) {
  const { map: m } = GameMapGen.generateFloor({ seed: 11000 + s, tier: 3, creatures, biome: { packChance: 0 } });
  loneRoamers += roamerCells(m).length;
}
check('packs raise the roamer count vs lone-only (depth-scaled density)', totalRoamers > loneRoamers, `${totalRoamers} vs ${loneRoamers}`);
// AMBUSH: with ambushChance=1, loot rooms get a guard adjacent to a chest.
let sawAmbush = false;
for (let s = 0; s < 30 && !sawAmbush; s++) {
  const { map: m } = GameMapGen.generateFloor({ seed: 12000 + s, tier: 3, creatures, biome: { ambushChance: 1, packChance: 0, encounterRate: 0 } });
  const chests = m.events.filter(e => e.name === 'Chest'), roam = roamerCells(m);
  // encounterRate 0 → the only roamers are ambush guards, each beside a chest
  for (const c of chests) for (const r of roam)
    if (Math.max(Math.abs(c.x - r[0]), Math.abs(c.y - r[1])) <= 1) sawAmbush = true;
}
check('ambush guards seat beside loot chests', sawAmbush);

// ── FLOOR TEMPLATES / RECIPES (generator roadmap #5, data half) ─────────────
// A template forces a prefab at a room ROLE and drops an authored HOOK event.
const shrineTpl = { id: 'shrine_floor', anchors: [
  { role: 'deepest', prefab: 'shrine' },
  { role: 'random', event: { name: 'Lorestone', trigger: 'action', commands: [{ type: 'text', text: 'A worn stone.' }] } }
] };
let tplPrefab = false, tplHook = false, tplReach = true;
for (let s = 0; s < 24; s++) {
  const { map: m, layout: l } = GameMapGen.generateFloor({ seed: 13000 + s, tier: 2, creatures, template: shrineTpl });
  if (m.events.some(e => e.name === 'RelicCache')) tplPrefab = true;   // shrine prefab carries 'R'
  if (m.events.some(e => e.name === 'Lorestone')) tplHook = true;       // authored hook event
  const set = reachable(l, m.start.x, m.start.y);
  for (const e of m.events) if (e.trigger !== 'touch' || e.name === 'Roamer') if (!eventReachable(l, set, e)) tplReach = false;
}
check('template anchors force a prefab (shrine RelicCache)', tplPrefab);
check('template drops an authored hook event', tplHook);
check('template floors stay fully reachable', tplReach);
// template style/size/hazard overrides apply
const big = GameMapGen.generateFloor({ seed: 14000, tier: 2, creatures, template: { style: 'bsp', size: { w: 60, h: 40 }, hazard: { spikeText: 'CUSTOM SPIKE' } } });
check('template overrides size', big.layout.width === 60 && big.layout.height === 40);
const trapEv = big.map.events.find(e => e.name === 'Trap');
check('template overrides hazard text', trapEv && JSON.stringify(trapEv).includes('CUSTOM SPIKE'));
// template enemyTiers override — roamers come from the override roster
const ovr = GameMapGen.generateFloor({ seed: 14100, tier: 1, creatures, template: { enemyTiers: { 1: ['husk_rat'] }, encounterRate: 1 } });
const ovrKeys = ovr.map.events.filter(e => e.name === 'Roamer').map(e => e.commands.find(c => c.type === 'battle').enemies[0].key);
check('template overrides the enemy roster', ovrKeys.length > 0 && ovrKeys.every(k => k === 'husk_rat'));
// template determinism
const t1 = GameMapGen.generateFloor({ seed: 15000, tier: 2, creatures, template: shrineTpl });
const t2 = GameMapGen.generateFloor({ seed: 15000, tier: 2, creatures, template: shrineTpl });
check('template floors are deterministic (same seed → identical)', JSON.stringify(t1) === JSON.stringify(t2));
// shipped floor_templates.json is valid + its referenced prefabs exist
let tplFile = null; try { tplFile = JSON.parse(readFileSync(`${ROOT}/data/systems/floor_templates.json`)); } catch {}
check('floor_templates.json parses with a templates map', !!(tplFile && tplFile.templates && Object.keys(tplFile.templates).length));
let prefabIds = new Set((shippedPrefabs && shippedPrefabs.prefabs || []).map(p => p.id));
let refsOk = true;
if (tplFile && tplFile.templates) for (const t of Object.values(tplFile.templates))
  for (const a of (t.anchors || [])) if (a.prefab && !prefabIds.has(a.prefab)) refsOk = false;
check('every template prefab anchor references a real prefab', refsOk);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
