// sim_run.mjs — full-run difficulty bot.
// Simulates a roguelite DESCENT: a class fights a sequence of encounters of
// rising depth, vitals carrying between fights (with a partial rest every few
// floors, like a camp), until death or clearing the final boss. Reports per
// class how deep the bot gets and how often it completes — the difficulty-tuning
// engine. Tells you if the curve is fair BEFORE a human plays.
//
//   node tools/sim_run.mjs [--runs 50] [--depth 10] [--classes warrior,rogue,scout]
import { loadCore, buildPlayerDef, buildEnemyDef, runFight, classIds } from './sim_core.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const RUNS = parseInt(opt('--runs', '50'), 10);
const DEPTH = parseInt(opt('--depth', '10'), 10);
// --rest = HP fraction recovered after EACH cleared fight (models the run's
// recovery economy: potions / lifesteal relics / shrines). Tune this to find the
// recovery rate that makes the descent fair.
const REST = parseFloat(opt('--rest', '0'));

const { db, GameCombat } = loadCore();
const creatures = Object.keys(db.creatures).filter((k) => k !== '_meta' && k !== 'dummy' && db.creatures[k].stats);
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

// a tiny seeded rng for run-level choices (not combat — combat is seeded inside)
function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function simRun(classId, runSeed) {
  const rng = mulberry(runSeed);
  let vit = { hp: 1, mp: 1, sp: 1 };
  for (let floor = 1; floor <= DEPTH; floor++) {
    // partial rest every 3rd floor (a camp): recover some vitals
    if (floor > 1 && floor % 3 === 1) { vit = { hp: Math.min(1, vit.hp + 0.35), mp: Math.min(1, vit.mp + 0.5), sp: Math.min(1, vit.sp + 0.5) }; }
    const isBoss = floor === DEPTH;
    const lvl = isBoss ? floor + 2 : floor;
    const enemies = [];
    enemies.push(buildEnemyDef(db, pick(rng, creatures), lvl, 'e1'));
    if (isBoss || (floor >= 5 && rng() < 0.5)) enemies.push(buildEnemyDef(db, pick(rng, creatures), Math.max(1, lvl - 2), 'e2'));
    const r = runFight(db, GameCombat, buildPlayerDef(db, classId, Math.max(1, Math.ceil(floor * 0.8))), enemies, runSeed * 31 + floor, { startVit: vit });
    if (r.winner !== 'player') return { depth: floor - 1, died: true };
    vit = { hp: Math.min(1, r.endVit.hp + REST), mp: Math.min(1, r.endVit.mp + REST), sp: Math.min(1, r.endVit.sp + REST) };
  }
  return { depth: DEPTH, died: false };
}

let roster = classIds(db);
const sel = opt('--classes', null);
if (sel) roster = sel.split(',');

const results = [];
for (const cid of roster) {
  let cleared = 0, sumDepth = 0; const depths = [];
  for (let s = 0; s < RUNS; s++) {
    const r = simRun(cid, 7000 + s * 13);
    if (!r.died) cleared++;
    sumDepth += r.depth; depths.push(r.depth);
  }
  depths.sort((a, b) => a - b);
  results.push({ cid, tier: db.classes[cid].tier, clear: cleared / RUNS, avg: sumDepth / RUNS, med: depths[Math.floor(RUNS / 2)] });
}

// report (sorted by clear rate)
results.sort((a, b) => a.clear - b.clear);
console.log(`FULL-RUN BOT — ${roster.length} classes, ${RUNS} runs each, depth ${DEPTH} (boss on the last floor)\n`);
console.log('  class                tier         clear%  avgDepth  medDepth');
console.log('  ' + '-'.repeat(58));
for (const r of results) {
  console.log('  ' + r.cid.padEnd(20) + (r.tier || '?').padEnd(13)
    + (r.clear * 100).toFixed(0).padStart(5) + '%   ' + r.avg.toFixed(1).padStart(6) + '   ' + String(r.med).padStart(6));
}
const viable = results.filter((r) => r.clear > 0).length;
const fair = results.filter((r) => r.clear >= 0.2 && r.clear <= 0.85).length;
console.log('\nSUMMARY');
console.log(`  classes that EVER clear the descent: ${viable}/${roster.length}`);
console.log(`  classes in a FAIR band (20-85% clear — the tuning sweet spot): ${fair}`);
console.log('  too-easy (>85%) = overtuned; never-clear (0%) = unfit for a combat run.');
console.log('  Use this to pick the launch roster and to set the difficulty curve.');
