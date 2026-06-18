// sim_buildspace.mjs — degenerate-build analyzer.
// Roguelites die when a broken build goes viral. This batch-simulates each class
// and flags the dangerous outliers: ONE-SHOT (burst too high), UNKILLABLE
// (near-zero net damage taken), STALL (fights that never resolve — a loop or
// stalemate), and GLASS (wins but on a knife's edge). Also reports each class's
// real combat KIT SIZE (granted skills that actually work in battle).
//
//   node tools/sim_buildspace.mjs [--n 50] [--level 4]
import { loadCore, buildPlayerDef, buildEnemyDef, runFight, classIds, combatLoadout } from './sim_core.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const N = parseInt(opt('--n', '50'), 10);
const LEVEL = parseInt(opt('--level', '4'), 10);

const { db, GameCombat } = loadCore();
const creatures = Object.keys(db.creatures).filter((k) => k !== '_meta' && k !== 'dummy' && db.creatures[k].stats);
const classes = classIds(db);

function profile(cid) {
  let wins = 0, turnsSum = 0, endHpSum = 0, stalls = 0, oneShots = 0, n = 0;
  for (const cr of creatures) {
    for (let s = 0; s < N; s++) {
      const r = runFight(db, GameCombat, buildPlayerDef(db, cid, LEVEL), [buildEnemyDef(db, cr, LEVEL)], 3000 + s * 11);
      n++;
      if (r.winner === 'player') { wins++; if (r.turns <= 2) oneShots++; }
      if (r.winner === null) stalls++;
      turnsSum += r.turns; endHpSum += r.endVit.hp;
    }
  }
  // kit size = combat-usable granted skills (excludes the universal basic kit)
  const kit = combatLoadout(db, db.classes[cid]).filter((id) => !['strike', 'jab', 'guard'].includes(id)).length;
  return { wr: wins / n, turns: turnsSum / n, endHp: endHpSum / n, stallRate: stalls / n, oneShotRate: oneShots / n, kit };
}

const rows = classes.map((cid) => ({ cid, tier: db.classes[cid].tier, ...profile(cid) }));

function flagOf(r) {
  const f = [];
  if (r.oneShotRate > 0.5 && r.wr > 0.8) f.push('ONE-SHOT');
  if (r.wr > 0.95 && r.endHp > 0.85) f.push('UNKILLABLE');
  if (r.stallRate > 0.1) f.push('STALL');
  if (r.wr >= 0.4 && r.wr <= 0.9 && r.endHp < 0.2) f.push('GLASS');
  if (r.kit === 0) f.push('NO-KIT');
  return f;
}

const flagged = rows.map((r) => ({ ...r, flags: flagOf(r) })).filter((r) => r.flags.length);
console.log(`BUILD-SPACE ANALYZER — ${classes.length} classes vs ${creatures.length} creatures @L${LEVEL}, ${N} fights each\n`);
console.log('  DEGENERATE / OUTLIER BUILDS');
console.log('  class                tier         wr   turns  endHP  stall  kit  flags');
console.log('  ' + '-'.repeat(76));
flagged.sort((a, b) => b.flags.length - a.flags.length || b.wr - a.wr);
for (const r of flagged) {
  console.log('  ' + r.cid.padEnd(20) + (r.tier || '?').padEnd(11)
    + (r.wr * 100).toFixed(0).padStart(4) + '%' + r.turns.toFixed(1).padStart(6)
    + (r.endHp * 100).toFixed(0).padStart(6) + '%' + (r.stallRate * 100).toFixed(0).padStart(6) + '%'
    + String(r.kit).padStart(5) + '  ' + r.flags.join(','));
}
const tally = {};
for (const r of flagged) for (const f of r.flags) tally[f] = (tally[f] || 0) + 1;
console.log('\nSUMMARY');
console.log('  ' + (Object.entries(tally).map(([k, v]) => `${k}: ${v}`).join('   ') || 'no outliers'));
console.log(`  ${rows.filter((r) => r.kit === 0).length} classes have ZERO combat kit of their own (basic kit only).`);
console.log(`  ${flagged.filter((r) => r.flags.includes('UNKILLABLE')).length} UNKILLABLE + ${flagged.filter((r) => r.flags.includes('ONE-SHOT')).length} ONE-SHOT builds need a balance look before they reach players.`);
