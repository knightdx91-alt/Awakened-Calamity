// test_endless.mjs — verify the ENDLESS run loop (run.js + mapgen endless wiring):
// bosses every bossEvery floors, descent never auto-clears, voluntary extract,
// and depth-scaled levels. Pure, headless.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
globalThis.GameRNG = require(`${ROOT}/src/systems/rng.js`);
const GameRun = require(`${ROOT}/src/systems/run.js`);
const GameMapGen = require(`${ROOT}/src/systems/mapgen.js`);

let pass = 0, fail = 0;
const check = (n, c, d = '') => { console.log((c ? '  ok  ' : '  XX  ') + n + (d ? '  — ' + d : '')); c ? pass++ : fail++; };

const db = { endless: true, bossEvery: 5, maxDepth: 4 };

// boss cadence: every 5th floor, nothing in between
const run = {};
GameRun.start(run, db, 12345, { tethered: true });
let bosses = [];
for (let f = 1; f <= 20; f++) { run.floor = f; if (GameRun.isBossFloor(run, db)) bosses.push(f); }
check('boss every `bossEvery` floors', JSON.stringify(bosses) === JSON.stringify([5, 10, 15, 20]), bosses.join(','));

// descend NEVER auto-clears in endless — you go as deep as you can
run.floor = 5; run.cleared = false;
const d = GameRun.descend(run, db);
check('descend past a boss does NOT clear (endless)', !d.cleared && run.floor === 6 && !run.cleared);
let deep = {}; GameRun.start(deep, db, 7, { tethered: true });
for (let i = 0; i < 30; i++) GameRun.descend(deep, db);
check('descent advances indefinitely (reached floor 31)', deep.floor === 31 && !deep.cleared);

// extract banks gains: meta.extractions + fragments, marks survived
let meta = {};
let r1 = {}; GameRun.start(r1, db, 1, { tethered: true }); r1.floor = 12;
const res = GameRun.end(r1, meta, 'extracted');
check('extracted increments meta.extractions', meta.extractions === 1);
check('extracted updates deepest floor', meta.deepest === 12);
check('extracted awards survival fragment bonus', res.summary.fragments >= 12 + 3);

// fixed (non-endless) still clears at maxDepth
const fdb = { endless: false, maxDepth: 4 };
let fr = {}; GameRun.start(fr, fdb, 1, {}); fr.floor = 4;
check('fixed run still clears at maxDepth', GameRun.descend(fr, fdb).cleared === true);

// mapgen: endless boss floor carries the EXTRACT choice; depthBonus raises levels
const bossFloor = GameMapGen.generateFloor({ seed: 3, tier: 3, kind: 'boss', endless: true, depthBonus: 10 });
const alpha = bossFloor.map.events.find(e => e.name === 'Alpha');
const hasExtract = JSON.stringify(alpha.commands).includes("reason\":\"extracted") || alpha.commands.some(c => c.type === 'choice' && JSON.stringify(c).includes('extracted'));
check('endless Alpha offers descend/extract choice', hasExtract);
const bossLvl = alpha.commands.find(c => c.type === 'battle').enemies[0].level;
check('depthBonus scales the boss level', bossLvl >= 10, 'lvl=' + bossLvl);
// depthBonus raises roamer levels too
const lowF = GameMapGen.generateFloor({ seed: 4, tier: 2, kind: 'floor', depthBonus: 0 });
const hiF = GameMapGen.generateFloor({ seed: 4, tier: 2, kind: 'floor', depthBonus: 15 });
const maxLvl = (m) => Math.max(0, ...m.map.events.filter(e => e.name === 'Roamer').map(e => e.commands.find(c => c.type === 'battle').enemies[0].level));
check('depthBonus scales roamer levels', maxLvl(hiF) > maxLvl(lowF), `low=${maxLvl(lowF)} hi=${maxLvl(hiF)}`);
// fixed boss (non-endless) keeps the clear branch, not the extract choice
const fixedBoss = GameMapGen.generateFloor({ seed: 3, tier: 2, kind: 'boss', endless: false });
const fAlpha = fixedBoss.map.events.find(e => e.name === 'Alpha');
check('fixed Alpha keeps the clear branch', JSON.stringify(fAlpha.commands).includes('cleared'));

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
