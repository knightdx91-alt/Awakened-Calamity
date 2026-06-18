// sweep_tether.mjs — pick the Collection numbers from data, not vibes.
// Simulates TETHERED descents across a range of collectionThreshold (and
// surveillancePerSave) values, reporting how runs end (collected / cleared /
// died) + avg saves and depth. We want a threshold where careful play can clear
// but leaning gets you collected — a meaningful mix, not 0% or 100%.
//
//   node tools/sweep_tether.mjs [--runs 40] [--depth 8]
import { loadCore, buildPlayerDef, buildEnemyDef, runFight, classIds, combatLoadout } from './sim_core.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const RUNS = parseInt(opt('--runs', '40'), 10);
const DEPTH = parseInt(opt('--depth', '8'), 10);

const { db, GameCombat } = loadCore();
const creatures = Object.keys(db.creatures).filter((k) => k !== '_meta' && k !== 'dummy' && db.creatures[k].stats);
const mul = (s) => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (rng, a) => a[Math.floor(rng() * a.length) % a.length];

// roster = combat-viable classes (so crafters don't skew it)
const roster = classIds(db).filter((cid) => {
  let w = 0; for (let s = 0; s < 8; s++) if (runFight(db, GameCombat, buildPlayerDef(db, cid, 1), [buildEnemyDef(db, 'emberling', 1)], 90 + s).winner === 'player') w++;
  return w / 8 >= 0.4 && combatLoadout(db, db.classes[cid]).some((id) => !['strike', 'jab', 'guard'].includes(id));
});

function dbWithPerSave(v) { const c = JSON.parse(JSON.stringify(db.combat)); c.intervention.surveillancePerSave = v; return { ...db, combat: c }; }

// one tethered descent: cumulative Surveillance; each fight's collectBudget is
// what's left before the threshold; mid-fight collection ends the run.
function descend(database, threshold, classId, seed) {
  const rng = mul(seed); let vit = { hp: 1, mp: 1, sp: 1 }, surv = 0, saves = 0;
  for (let f = 1; f <= DEPTH; f++) {
    const boss = f === DEPTH, lvl = boss ? f + 2 : f;
    const en = [buildEnemyDef(database, pick(rng, creatures), lvl, 'e1')];
    if (boss || (f >= 5 && rng() < 0.5)) en.push(buildEnemyDef(database, pick(rng, creatures), Math.max(1, lvl - 2), 'e2'));
    const budget = Math.max(15, threshold - surv);
    const r = runFight(database, GameCombat, buildPlayerDef(database, classId, Math.max(1, Math.ceil(f * 0.8))), en, seed * 31 + f, { startVit: vit, collectBudget: budget });
    saves += r.saves; surv += r.surveillance;
    if (r.collected) return { end: 'collected', depth: f, saves };
    // tethered never loses a fight (saved), so winner is player or collected
    vit = { hp: Math.min(1, r.endVit.hp + 0.4), mp: Math.min(1, r.endVit.mp + 0.4), sp: Math.min(1, r.endVit.sp + 0.4) };
  }
  return { end: 'cleared', depth: DEPTH, saves };
}

console.log(`TETHER SWEEP — ${roster.length} viable classes, ${RUNS} runs each, depth ${DEPTH}\n`);
console.log('  perSave  threshold   collected%  cleared%   avgSaves  avgDepth');
console.log('  ' + '-'.repeat(62));
for (const perSave of [10, 15, 20]) {
  const database = dbWithPerSave(perSave);
  for (const thr of [120, 180, 240, 300, 360]) {
    let col = 0, clr = 0, saves = 0, depth = 0, n = 0;
    for (const cid of roster) for (let s = 0; s < RUNS; s++) {
      const r = descend(database, thr, cid, 5000 + s * 7); n++;
      if (r.end === 'collected') col++; else clr++;
      saves += r.saves; depth += r.depth;
    }
    console.log('  ' + String(perSave).padStart(5) + '   ' + String(thr).padStart(8)
      + '   ' + (col / n * 100).toFixed(0).padStart(8) + '%' + (clr / n * 100).toFixed(0).padStart(9) + '%'
      + (saves / n).toFixed(1).padStart(10) + (depth / n).toFixed(1).padStart(9));
  }
  console.log('');
}
console.log('  Aim: a threshold where collected% and cleared% are BOTH meaningful — careful');
console.log('  play (few saves) can clear, but leaning (many saves) gets you collected.');
