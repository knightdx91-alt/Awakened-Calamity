// validate_design.mjs — design-validation harness ("would the idea work?").
// Aggregates the sims into ONE mechanical-airworthiness verdict. It does NOT
// (cannot) validate fun — that needs a human demo + telemetry. It validates the
// NECESSARY conditions: a real difficulty curve, build diversity, no degenerate
// dominant build, and — the centerpiece — that the System Intervention DILEMMA
// has teeth (accepting the System's help is genuinely tempting AND genuinely costly).
//
//   node tools/validate_design.mjs [--n 24]
import { loadCore, buildPlayerDef, buildEnemyDef, runFight, classIds, combatLoadout, pickFloorEnemy, pickBoss } from './sim_core.mjs';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const GameCorruption = require(`${process.cwd()}/src/systems/corruption.js`);
const corruptDb = JSON.parse(readFileSync(`${process.cwd()}/data/systems/corruption.json`, 'utf8'));

const args = process.argv.slice(2);
const N = parseInt((args[args.indexOf('--n') + 1]) || '24', 10);
const { db, GameCombat } = loadCore();
// Fair-fight pool EXCLUDES bosses (they're meant to be hard; tested via the descent).
const creatures = Object.keys(db.creatures).filter((k) => k !== '_meta' && k !== 'dummy' && db.creatures[k].stats && db.creatures[k].role !== 'boss');

// clone db with the System Intervention toggled (the player's "policy")
function withIntervention(on) {
  const c = JSON.parse(JSON.stringify(db.combat));
  c.intervention.enabled = on;
  return { ...db, combat: c };
}
const pick = (rng, a) => a[Math.floor(rng() * a.length) % a.length];
function mulberry(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// a descent under a given db (policy). returns {depth, surveillance, collected}.
// CORRUPTION: cumulative Surveillance applies a tiered atk penalty (the System
// "deciding for you") and, past the collection threshold, ENDS the run — the
// System reclaims you. This is what gives the System's help a real cost.
function descent(database, classId, seed, { depth = 8, rest = 0.5 } = {}) {
  const rng = mulberry(seed); let vit = { hp: 1, mp: 1, sp: 1 }, surv = 0;
  for (let f = 1; f <= depth; f++) {
    if (GameCorruption.collected(corruptDb, surv)) return { depth: f - 1, surv, collected: true };
    const boss = f === depth, lvl = boss ? f + 2 : f;
    const en = [buildEnemyDef(database, boss ? pickBoss(database, rng) : pickFloorEnemy(database, rng, f, depth), lvl, 'e1')];
    if (!boss && f >= 5 && rng() < 0.5) en.push(buildEnemyDef(database, pickFloorEnemy(database, rng, f, depth), Math.max(1, lvl - 2), 'e2'));
    const pdef = buildPlayerDef(database, classId, Math.max(1, Math.ceil(f * 0.8)));
    const mod = GameCorruption.atkMod(corruptDb, surv);          // corruption saps your edge
    if (mod) pdef.stats = { ...pdef.stats, atk: Math.round(pdef.stats.atk * (1 + mod)) };
    const r = runFight(database, GameCombat, pdef, en, seed * 31 + f, { startVit: vit });
    surv += r.surveillance || 0;
    if (r.winner !== 'player') return { depth: f - 1, surv, collected: false };
    vit = { hp: Math.min(1, r.endVit.hp + rest), mp: Math.min(1, r.endVit.mp + rest), sp: Math.min(1, r.endVit.sp + rest) };
  }
  return { depth, surv, collected: false };
}

// ── roster = combat-viable classes (so crafters don't skew the design read) ──
const all = classIds(db);
const roster = all.filter((cid) => {
  let w = 0; for (let s = 0; s < 8; s++) if (runFight(db, GameCombat, buildPlayerDef(db, cid, 1), [buildEnemyDef(db, 'emberling', 1)], 90 + s).winner === 'player') w++;
  return w / 8 >= 0.4 && combatLoadout(db, db.classes[cid]).some((id) => !['strike', 'jab', 'guard'].includes(id));
});

console.log(`DESIGN VALIDATION — ${roster.length} combat-viable classes (of ${all.length}), ${N} samples\n`);
const checks = [];

// 1) BUILD DIVERSITY — fair win-band spread on SKILL (System help OFF, so the
// lethal-save doesn't flatten everyone to 100%). Measures genuine build variety.
{
  const dbOff = withIntervention(false);
  let fair = 0, dom = 0;
  for (const cid of roster) {
    let w = 0, t = 0;
    for (const cr of creatures) for (let s = 0; s < N; s++) { t++; if (runFight(dbOff, GameCombat, buildPlayerDef(dbOff, cid, 4), [buildEnemyDef(dbOff, cr, 4)], 200 + s).winner === 'player') w++; }
    const wr = w / t; if (wr >= 0.3 && wr <= 0.9) fair++; if (wr > 0.97) dom++;
  }
  const ratio = fair / roster.length;
  checks.push({ name: 'Build diversity', verdict: ratio >= 0.4 ? 'PASS' : ratio >= 0.25 ? 'WARN' : 'FAIL',
    note: `${fair}/${roster.length} classes in a fair band, ${dom} all-dominant (want many fair, few dominant)` });
}

// 2) DIFFICULTY CURVE — is the descent a curve (some progress, not 0% and not 100%)?
{
  let cleared = 0, depths = [];
  for (const cid of roster) for (let s = 0; s < N; s++) { const r = descent(db, cid, 1000 + s, { rest: 0.5 }); depths.push(r.depth); if (r.depth >= 8) cleared++; }
  const avg = depths.reduce((a, b) => a + b, 0) / depths.length, clr = cleared / depths.length;
  checks.push({ name: 'Difficulty curve', verdict: (avg >= 2 && clr <= 0.85) ? (clr >= 0.05 ? 'PASS' : 'WARN') : 'FAIL',
    note: `avg depth ${avg.toFixed(1)}/8, clear ${(clr * 100).toFixed(0)}% (want progress but not a cakewalk; 0% clear = curve too steep)` });
}

// 3) NO DEGENERATE DOMINANT BUILD
{
  let unkill = 0, oneshot = 0;
  for (const cid of roster) {
    let w = 0, endhp = 0, fast = 0, t = 0;
    for (const cr of creatures) for (let s = 0; s < N; s++) { t++; const r = runFight(db, GameCombat, buildPlayerDef(db, cid, 4), [buildEnemyDef(db, cr, 4)], 300 + s); if (r.winner === 'player') { w++; if (r.turns <= 2) fast++; } endhp += r.endVit.hp; }
    if (w / t > 0.95 && endhp / t > 0.85) unkill++;
    if (fast / t > 0.5 && w / t > 0.8) oneshot++;
  }
  checks.push({ name: 'No degenerate build', verdict: (unkill + oneshot) === 0 ? 'PASS' : (unkill + oneshot) <= 3 ? 'WARN' : 'FAIL',
    note: `${unkill} unkillable + ${oneshot} one-shot among viable classes (want 0 — they trivialise runs)` });
}

// 4) ★ THE INTERVENTION DILEMMA HAS TEETH ★
// Compare REFUSE (no System help) vs ACCEPT (lean on it) across descents.
// Tempting = accept reaches deeper. Costly = accept accrues real Surveillance.
{
  const dbOn = withIntervention(true), dbOff = withIntervention(false);
  let depthAccept = 0, depthRefuse = 0, survAccept = 0, n = 0;
  for (const cid of roster) for (let s = 0; s < N; s++) {
    const a = descent(dbOn, cid, 1000 + s), r = descent(dbOff, cid, 1000 + s);
    depthAccept += a.depth; depthRefuse += r.depth; survAccept += a.surv; n++;
  }
  const tempt = (depthAccept - depthRefuse) / n;       // extra depth from leaning on help
  const cost = survAccept / n;                          // Surveillance accrued per run by leaning
  const tempting = tempt >= 0.4, costly = cost >= 8;
  checks.push({ name: '★ Intervention dilemma', verdict: (tempting && costly) ? 'PASS' : (tempting || costly) ? 'WARN' : 'FAIL',
    note: `tempting: +${tempt.toFixed(2)} depth when accepting (${tempting ? 'yes' : 'NO — no reason to take help'}); `
        + `costly: +${cost.toFixed(1)} Surveillance/run (${costly ? 'yes' : 'low'}) -> corruption collects you at ${corruptDb.collectionThreshold}.` });
}

// ── verdict ──
console.log('  CHECK                     VERDICT  DETAIL');
console.log('  ' + '-'.repeat(78));
for (const c of checks) console.log('  ' + c.name.padEnd(24) + ' ' + c.verdict.padEnd(7) + '  ' + c.note);
const fails = checks.filter((c) => c.verdict === 'FAIL').length, warns = checks.filter((c) => c.verdict === 'WARN').length;
console.log('\n  AIRWORTHINESS: ' + (fails ? `❌ NOT YET — ${fails} FAIL, ${warns} WARN` : warns ? `🟡 CONDITIONAL — ${warns} WARN` : '✅ MECHANICALLY SOUND'));
console.log('  (This validates the NECESSARY conditions for the idea to work — not fun.');
console.log('   Fun still needs a playable demo + real players. See docs/PRODUCTION_PLAN.md.)');
process.exit(fails ? 1 : 0);
