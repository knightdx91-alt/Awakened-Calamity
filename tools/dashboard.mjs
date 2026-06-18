// dashboard.mjs — one-screen project health readout.
// Aggregates the validators + a fast combat-viability sample into a single
// "what's actually real" card, so you always know content counts, broken refs,
// how much is wired vs inert, and how many classes can actually fight.
//
//   node tools/dashboard.mjs
import { execSync } from 'child_process';
import { loadCore, buildPlayerDef, buildEnemyDef, runFight, classIds } from './sim_core.mjs';

function sh(cmd) { try { return execSync(cmd, { cwd: process.cwd() }).toString(); } catch (e) { return (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : ''); } }

// ── content lint (machine-readable) ──
let lint = { fails: [], warns: [], stats: {} };
try { lint = JSON.parse(sh('node tools/content_lint.mjs --json')); } catch { /* keep default */ }
const S = lint.stats;

// ── fast combat-viability sample: each class vs the starter creature at L1 ──
const { db, GameCombat } = loadCore();
const classes = classIds(db);
let viable = 0; const dead = [];
for (const cid of classes) {
  let w = 0;
  for (let s = 0; s < 12; s++) {
    const r = runFight(db, GameCombat, buildPlayerDef(db, cid, 1), [buildEnemyDef(db, 'emberling', 1)], 500 + s * 9);
    if (r.winner === 'player') w++;
  }
  if (w / 12 >= 0.15) viable++; else dead.push(cid);
}

// ── classes with no combat skill of their own (from lint warns) ──
const noCombat = lint.warns.filter((m) => /grants NO combat-usable skill/.test(m)).length;
const stringEvo = lint.warns.filter((m) => /STRING form/.test(m)).length;

const bar = (n, d) => { const w = 24, f = Math.round((n / d) * w); return '[' + '#'.repeat(f) + '-'.repeat(w - f) + ']'; };
console.log('\n══════════ AWAKENED CALAMITY — PROJECT HEALTH ══════════\n');
console.log('  CONTENT');
console.log(`    classes ${S.classes}   skills ${S.skills}   creatures ${S.creatures}   items ${S.items}   quests ${S.quests}   maps ${S.maps}`);
console.log('');
console.log('  INTEGRITY');
console.log(`    broken references : ${lint.fails.length === 0 ? '0  ✅' : lint.fails.length + '  ❌'}`);
console.log(`    warnings          : ${lint.warns.length}`);
console.log('');
console.log('  WIRED vs DESIGNED-BUT-INERT (the real depth gap)');
console.log(`    skills with a real effect : ${S.skills - S.inertSkills}/${S.skills}  ${bar(S.skills - S.inertSkills, S.skills)}`);
console.log(`    skills inert (data hooks) : ${S.inertSkills}/${S.skills}`);
console.log(`    classes combat-viable@L1  : ${viable}/${classes.length}  ${bar(viable, classes.length)}`);
console.log(`    classes that can't fight  : ${dead.length}  (craft/lifestyle — need an ally or a non-combat role)`);
console.log(`    classes w/ no own combat skill : ${noCombat}`);
console.log('');
console.log('  NOTES');
console.log(`    ${stringEvo} classes use the legacy string-form evolvesInto (skips 'requires' gating)`);
console.log('    run `node tools/sim_run.mjs` for the descent difficulty curve,');
console.log('    and `python3 tools/mapcheck.py batch` for map-generation health.');
console.log('\n════════════════════════════════════════════════════════\n');
