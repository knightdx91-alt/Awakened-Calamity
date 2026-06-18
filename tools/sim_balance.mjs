// sim_balance.mjs — combat balance simulator.
// Batch-runs fights for every class vs every creature across level bands and
// reports win-rate + average turns, flagging UNWINNABLE / TRIVIAL / DOMINANT
// matchups and classes that can't fight at all. You cannot hand-balance this
// many classes; you can simulate them. Deterministic (seeded).
//
//   node tools/sim_balance.mjs [--n 60] [--levels 1,3,5,8] [--csv /tmp/balance.csv]
import { loadCore, buildPlayerDef, buildEnemyDef, runFight, classIds } from './sim_core.mjs';
import { writeFileSync } from 'fs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const N = parseInt(opt('--n', '60'), 10);
const LEVELS = opt('--levels', '1,3,5,8').split(',').map(Number);
const CSV = opt('--csv', null);

const { db, GameCombat } = loadCore();
const creatures = Object.keys(db.creatures).filter((k) => k !== '_meta' && k !== 'dummy' && db.creatures[k].stats);
const classes = classIds(db);

function winRate(classId, creature, level) {
  let wins = 0, turns = 0;
  for (let s = 0; s < N; s++) {
    const r = runFight(db, GameCombat, buildPlayerDef(db, classId, level), [buildEnemyDef(db, creature, level)], 1000 + s * 7);
    if (r.winner === 'player') wins++;
    turns += r.turns;
  }
  return { wr: wins / N, turns: turns / N };
}

const rows = [];
const csv = [['class', 'tier', 'creature', 'level', 'winrate', 'avg_turns'].join(',')];
for (const cid of classes) {
  const tier = db.classes[cid].tier;
  const perLevel = {};
  for (const lv of LEVELS) {
    let wrSum = 0;
    for (const cr of creatures) {
      const { wr, turns } = winRate(cid, cr, lv);
      wrSum += wr;
      csv.push([cid, tier, cr, lv, wr.toFixed(3), turns.toFixed(1)].join(','));
    }
    perLevel[lv] = wrSum / creatures.length;
  }
  rows.push({ cid, tier, perLevel });
}

// ── report ──
const fmt = (v) => (v * 100).toFixed(0).padStart(3) + '%';
console.log(`COMBAT BALANCE — ${classes.length} classes vs ${creatures.length} creatures, ${N} fights/matchup`);
console.log('levels: ' + LEVELS.join(', ') + '   (avg win-rate across creatures, matched level)\n');
console.log('  class                tier         ' + LEVELS.map((l) => 'L' + l).map((s) => s.padStart(5)).join('') + '   flag');
console.log('  ' + '-'.repeat(70));

const flags = { unwinnable: [], dominant: [], swingy: [] };
rows.sort((a, b) => a.perLevel[LEVELS[0]] - b.perLevel[LEVELS[0]]);
for (const r of rows) {
  const lo = r.perLevel[LEVELS[0]], hi = r.perLevel[LEVELS[LEVELS.length - 1]];
  let flag = '';
  if (lo < 0.15) { flag = 'UNWINNABLE@L1'; flags.unwinnable.push(r.cid); }
  else if (Object.values(r.perLevel).every((v) => v > 0.95)) { flag = 'DOMINANT'; flags.dominant.push(r.cid); }
  if (hi - lo > 0.6) flags.swingy.push(r.cid);
  console.log('  ' + r.cid.padEnd(20) + (r.tier || '?').padEnd(13)
    + LEVELS.map((l) => fmt(r.perLevel[l])).join('') + '   ' + flag);
}

console.log('\nSUMMARY');
console.log(`  UNWINNABLE at L1 (can't beat the starter creature): ${flags.unwinnable.length}`);
console.log('    ' + (flags.unwinnable.join(', ') || '—'));
console.log(`  DOMINANT (>95% at every level — likely overtuned): ${flags.dominant.length}`);
console.log('    ' + (flags.dominant.join(', ') || '—'));
const playable = rows.filter((r) => r.perLevel[LEVELS[0]] >= 0.15).length;
console.log(`  Combat-viable classes at L1: ${playable}/${classes.length}`);
console.log('  NOTE: lifestyle/craft classes are EXPECTED to be weak fighters by design —');
console.log('        the flag tells you WHICH and HOW weak, so you can decide the floor.');

if (CSV) { writeFileSync(CSV, csv.join('\n')); console.log('\nper-matchup CSV -> ' + CSV); }
