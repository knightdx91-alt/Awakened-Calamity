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
  if (!names.includes('RelicCache')) hadRelic = false;
  if (!names.some(n => n === 'Roamer')) hadRoamer = false;
  // every interactable event must be reachable (no walled-off boss/loot)
  for (const e of map.events) if (e.trigger !== 'touch' || e.name === 'Roamer') { if (!eventReachable(layout, set, e)) { allReach = false; } }
}
check('collision/metatiles/overlay sized + spawn walkable', collOk);
check('every floor has an Entrance', hadEntrance);
check('normal floors have StairsDown', hadStairs);
check('boss floors have an Alpha', hadBoss);
check('the way deeper runs the run-loop (run deeper + gendungeon/end)', descendOk);
check('every floor has a RelicCache', hadRelic);
check('floors spawn roaming encounters', hadRoamer);
check('all events reachable from spawn (no soft-lock)', allReach);

// the assembled objects match the on-disk schema shape the engine consumes
const { map, layout } = GameMapGen.generateFloor({ seed: 1, tier: 1, creatures });
check('layout has tileset + overlay_tileset', layout.tileset === 'rtp_dungeon_ground' && layout.overlay_tileset === 'dun_props');
check('map references its layout + has a start', map.layout === layout.id && !!map.start);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
