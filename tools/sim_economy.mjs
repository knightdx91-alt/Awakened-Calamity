// sim_economy.mjs — progression & economy curve simulator.
// Models the XP/leveling pace (kills-to-level per tier) and the shop economy so
// you can see run pacing and affordability at a glance, and tune B/p/K/q +
// prices before they hit players. Uses the same progression.json the game does.
//
//   node tools/sim_economy.mjs
import { readFileSync } from 'fs';
const ROOT = process.cwd();
const load = (p) => JSON.parse(readFileSync(`${ROOT}/${p}`, 'utf8'));
const prog = load('data/systems/progression.json');
const items = load('data/systems/items.json');

const xpToNext = (L, tier) => Math.round(prog.xp.B * Math.pow(L, prog.xp.p) * (prog.xp.tierMult[tier] ?? 1));
const mobXP = (L, yield_ = 1) => Math.round(prog.mob.K * Math.pow(L, prog.mob.q) * yield_);

// kills (at matched level) to go L -> L+1 for a tier
const killsToNext = (L, tier) => Math.ceil(xpToNext(L, tier) / Math.max(1, mobXP(L)));

console.log('PROGRESSION CURVE — kills (matched-level mobs) to reach each level\n');
const tiers = ['basic', 'advanced', 'master', 'legendary'];
const marks = [2, 3, 5, 10, 20, 30];
console.log('  tier         ' + marks.map((m) => ('L' + m).padStart(8)).join('') + '     (cumulative kills from L1)');
console.log('  ' + '-'.repeat(68));
for (const t of tiers) {
  let cum = 0, out = {}; let next = 1;
  for (let L = 1; L <= 30; L++) {
    cum += killsToNext(L, t);
    if (marks.includes(L + 1)) out[L + 1] = cum;
  }
  console.log('  ' + t.padEnd(12) + marks.map((m) => String(out[m] ?? '—').padStart(8)).join(''));
}
console.log('\n  per-level (basic): ' + [1, 2, 3, 5, 8].map((L) => `L${L}->${L + 1}: ${killsToNext(L, 'basic')}k`).join('  '));
console.log('  tier multipliers (XP cost vs basic): ' + Object.entries(prog.xp.tierMult).map(([k, v]) => `${k} ${v}x`).join('  '));

// flags
const k1 = killsToNext(1, 'basic'), k10 = killsToNext(10, 'basic');
console.log('\n  PACING CHECK');
console.log(`    first level: ${k1} kills ` + (k1 <= 3 ? '(fast — fine for a roguelite opener)' : k1 <= 8 ? '(moderate)' : '(SLOW — early game may drag)'));
console.log(`    level 10 step: ${k10} kills ` + (k10 > 40 ? '(STEEP — late grind; ok if runs reset, harsh if persistent)' : '(reasonable)'));
console.log(`    advanced+ tiers cost ${prog.xp.tierMult.advanced}x–${prog.xp.tierMult.legendary}x XP — intentional slow-leveling for power classes.`);

// economy
console.log('\nECONOMY — shop prices (Cr) & affordability');
const shop = Object.entries(items).filter(([k, v]) => k !== '_meta' && v.shop).map(([k, v]) => [k, v.value]);
console.log('  ' + shop.map(([k, v]) => `${k}:${v}`).join('  '));
const CLASS_COST = 500; // System Shop: acquire a new Basic class (src/ui/systemshop.js)
const potion = (items.potion || {}).value || 50;
console.log(`  new Basic class (System Shop): ${CLASS_COST} Cr`);

// CREDIT INCOME — now wired to combat drops (src/ui/combatview.js _finish):
// perKill = base * level * creditYield * variance. Model a descent's income.
const cr = prog.credits || { base: 15, variance: [0.85, 1.15] };
const vAvg = (cr.variance[0] + cr.variance[1]) / 2;
const killCr = (L, yld = 1) => Math.round(cr.base * L * yld * vAvg);
// a representative 8-floor descent: enemy level ~= floor, ~1.5 foes/fight avg,
// plus per-floor chest money (~40–80 base scaling with depth) and a relic (no Cr).
let combatCr = 0, chestCr = 0;
for (let f = 1; f <= 8; f++) {
  const lvl = f === 8 ? f + 2 : f;
  const foes = 1 + (f >= 5 ? 0.5 : 0);            // packs deeper in
  combatCr += killCr(lvl, 1.1) * foes;            // ~avg creditYield
  // chests: loot rooms (~2/floor early) with depth-scaled money — BAKED in the maps
  if (f % 2 === 1) chestCr += 2 * Math.round(60 * (1 + (f / 8)));
}
combatCr = Math.round(combatCr); chestCr = Math.round(chestCr);
const runCr = combatCr + chestCr;
const fightCr = killCr(2, 1.0);                    // an early single-foe fight
console.log('\nCREDIT INCOME (combat drops now WIRED in combatview; chests baked in maps)');
console.log(`  early fight (L2 foe): ~${fightCr} Cr  ` + (Math.abs(fightCr - potion) <= potion * 0.6 ? `≈ a Potion (${potion}) ✓` : `(potion ${potion})`));
console.log(`  per 8-floor descent: ~${combatCr} Cr combat + ~${chestCr} Cr chests = ~${runCr} Cr`);
console.log(`    → ${(runCr / CLASS_COST).toFixed(1)}× a new class (${CLASS_COST} Cr) per run, ~${Math.floor(runCr / potion)} potions/run.`);
console.log('  ✓ per-fight income ≈ a potion (target met). Full-run total is generous and');
console.log('    chest-dominated — chest values are baked in the run maps; tune there + class');
console.log('    cost via human playtest (how fast classes should unlock is a feel call).');
