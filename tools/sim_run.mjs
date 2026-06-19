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
// Tether model. Tethered (default) = the System catches you, but Collection ends
// the run once cumulative Surveillance crosses the budget (the dilemma's real
// cost). Untethered = no saves, death is immediate (the HONEST skill read — see
// CLAUDE.md). --collect sets the lifetime Surveillance budget before Collection.
const UNTETHERED = args.includes('--untethered');
const COLLECT = parseInt(opt('--collect', '240'), 10);

const { db, GameCombat } = loadCore();
const creatures = Object.keys(db.creatures).filter((k) => k !== '_meta' && k !== 'dummy' && db.creatures[k].stats);
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

// a tiny seeded rng for run-level choices (not combat — combat is seeded inside)
function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Classify WHY the bot died, from the losing fight + the vitals it walked in on.
// A bot-side stand-in for a human death-heatmap: tells spike vs. grind vs. economy.
//   collected   — leaned on the System until Collection took you (the dilemma's cost)
//   starved     — walked into the fight already low (recovery economy too thin)
//   burst       — died in a handful of turns (a difficulty SPIKE / near one-shot)
//   outleveled  — lost a long attrition fight (floor scaling outran your growth)
function deathCause(r, entryHp) {
  if (r.collected) return 'collected';
  if (entryHp < 0.4) return 'starved';
  if (r.turns <= 5) return 'burst';
  return 'outleveled';
}

function simRun(classId, runSeed) {
  const rng = mulberry(runSeed);
  let vit = { hp: 1, mp: 1, sp: 1 };
  let choices = 0;                                  // genuine trade-off moments this run
  let cumSurv = 0;                                  // cumulative Surveillance across the run
  for (let floor = 1; floor <= DEPTH; floor++) {
    // partial rest every 3rd floor (a camp): recover some vitals
    if (floor > 1 && floor % 3 === 1) { vit = { hp: Math.min(1, vit.hp + 0.35), mp: Math.min(1, vit.mp + 0.5), sp: Math.min(1, vit.sp + 0.5) }; }
    const isBoss = floor === DEPTH;
    const lvl = isBoss ? floor + 2 : floor;
    const enemies = [];
    enemies.push(buildEnemyDef(db, pick(rng, creatures), lvl, 'e1'));
    if (isBoss || (floor >= 5 && rng() < 0.5)) enemies.push(buildEnemyDef(db, pick(rng, creatures), Math.max(1, lvl - 2), 'e2'));
    const entryHp = vit.hp;
    const fightOpts = { startVit: vit };
    if (UNTETHERED) fightOpts.tethered = false;
    // Collection is cumulative across the run: the budget left over this fight is
    // the lifetime budget minus what we've already accrued.
    else fightOpts.collectBudget = Math.max(0, COLLECT - cumSurv);
    const r = runFight(db, GameCombat, buildPlayerDef(db, classId, Math.max(1, Math.ceil(floor * 0.8))), enemies, runSeed * 31 + floor, fightOpts);
    // Each lethal-save OFFER is a real accept/refuse dilemma the player would face.
    choices += r.saves | 0;
    cumSurv += r.surveillance | 0;
    if (r.winner !== 'player' || r.collected) return { depth: floor - 1, died: true, cause: deathCause(r, entryHp), deathFloor: floor, choices };
    vit = { hp: Math.min(1, r.endVit.hp + REST), mp: Math.min(1, r.endVit.mp + REST), sp: Math.min(1, r.endVit.sp + REST) };
  }
  return { depth: DEPTH, died: false, choices };
}

let roster = classIds(db);
const sel = opt('--classes', null);
if (sel) roster = sel.split(',');

const results = [];
const causeTotals = { collected: 0, starved: 0, burst: 0, outleveled: 0 };
const deathByFloor = {};                              // floor -> death count (all classes)
let totalChoices = 0, totalRuns = 0;
for (const cid of roster) {
  let cleared = 0, sumDepth = 0, sumChoices = 0; const depths = [];
  for (let s = 0; s < RUNS; s++) {
    const r = simRun(cid, 7000 + s * 13);
    if (!r.died) cleared++;
    else { causeTotals[r.cause] = (causeTotals[r.cause] | 0) + 1; deathByFloor[r.deathFloor] = (deathByFloor[r.deathFloor] | 0) + 1; }
    sumDepth += r.depth; depths.push(r.depth);
    sumChoices += r.choices; totalChoices += r.choices; totalRuns++;
  }
  depths.sort((a, b) => a - b);
  results.push({ cid, tier: db.classes[cid].tier, clear: cleared / RUNS, avg: sumDepth / RUNS, med: depths[Math.floor(RUNS / 2)], choices: sumChoices / RUNS });
}

// report (sorted by clear rate)
results.sort((a, b) => a.clear - b.clear);
console.log(`FULL-RUN BOT — ${roster.length} classes, ${RUNS} runs each, depth ${DEPTH} (boss on the last floor)`);
console.log(`tether: ${UNTETHERED ? 'UNTETHERED (no saves, death is real — the honest skill read)' : `TETHERED (System catches you; Collection budget ${COLLECT})`}\n`);
console.log('  class                tier         clear%  avgDepth  medDepth  choices/run');
console.log('  ' + '-'.repeat(71));
for (const r of results) {
  console.log('  ' + r.cid.padEnd(20) + (r.tier || '?').padEnd(13)
    + (r.clear * 100).toFixed(0).padStart(5) + '%   ' + r.avg.toFixed(1).padStart(6) + '   ' + String(r.med).padStart(6)
    + '   ' + r.choices.toFixed(2).padStart(8));
}
const viable = results.filter((r) => r.clear > 0).length;
const fair = results.filter((r) => r.clear >= 0.2 && r.clear <= 0.85).length;
console.log('\nSUMMARY');
console.log(`  classes that EVER clear the descent: ${viable}/${roster.length}`);
console.log(`  classes in a FAIR band (20-85% clear — the tuning sweet spot): ${fair}`);
console.log('  too-easy (>85%) = overtuned; never-clear (0%) = unfit for a combat run.');

// ── critical choices per run ──────────────────────────────────────────────
// How often a run forced a genuine accept/refuse System-save trade-off (the
// dilemma). Near 0 = the run is on rails (no meaningful decisions); a healthy
// roguelite wants several real choices per run.
console.log('\nCRITICAL CHOICES / RUN (System-save dilemmas forced)');
console.log(`  average across all ${totalRuns} runs: ${(totalChoices / Math.max(1, totalRuns)).toFixed(2)}`);
console.log('  (0 = on-rails, no forced trade-offs; higher = the dilemma actually bites)');

// ── death-cause histogram (bot-side death heatmap) ────────────────────────
const totDeaths = Object.values(causeTotals).reduce((a, b) => a + b, 0);
console.log('\nDEATH-CAUSE HISTOGRAM (why runs end — spike vs. grind vs. economy)');
if (!totDeaths) console.log('  (no deaths — every run cleared; lower --rest or raise --depth)');
else {
  const label = { collected: 'collected  (leaned on System → Collection)', starved: 'starved    (walked in too hurt — recovery economy)',
    burst: 'burst      (died in ≤5 turns — difficulty SPIKE)', outleveled: 'outleveled (long attrition — scaling outran growth)' };
  for (const k of ['outleveled', 'burst', 'starved', 'collected']) {
    const n = causeTotals[k] | 0, pct = (n / totDeaths) * 100;
    console.log('  ' + label[k].padEnd(52) + String(n).padStart(5) + '  ' + '█'.repeat(Math.round(pct / 4)) + ' ' + pct.toFixed(0) + '%');
  }
}

// ── death-by-floor histogram (where the curve spikes) ─────────────────────
console.log('\nDEATHS BY FLOOR (where the difficulty curve bites)');
const maxFloorDeaths = Math.max(1, ...Object.values(deathByFloor));
for (let f = 1; f <= DEPTH; f++) {
  const n = deathByFloor[f] | 0; if (!n && f > 1 && f < DEPTH && !deathByFloor[f]) { /* still print for shape */ }
  const tag = f === DEPTH ? ' (boss)' : '';
  console.log('  floor ' + String(f).padStart(2) + tag.padEnd(7) + String(n).padStart(5) + '  ' + '█'.repeat(Math.round((n / maxFloorDeaths) * 30)));
}
console.log('\n  Use this to pick the launch roster, set the difficulty curve, and');
console.log('  spot whether deaths are SPIKES (burst, clustered floors) or GRIND');
console.log('  (outleveled, spread out) or ECONOMY (starved) — each wants a different fix.');
