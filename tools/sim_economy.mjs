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
console.log('  NOTE: credit INCOME is currently thin (chests + bounties) — the economy needs a');
console.log('        defined per-run income so prices have meaning. Recommend wiring a credit');
console.log(`        drop to encounters, then re-run to balance (e.g. target: a potion ≈ 1 fight, a class ≈ a full run).`);
