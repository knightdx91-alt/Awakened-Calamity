// test_crafting.mjs — verify the forge rules (src/systems/crafting.js): upgrade
// cost scaling, recipe costs, affordability + payment (materials + credits).
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const GC = require(`${ROOT}/src/systems/crafting.js`);
const cfg = JSON.parse(readFileSync(`${ROOT}/data/systems/crafting.json`));
let pass = 0, fail = 0;
const check = (n, c, d = '') => { console.log((c ? '  ok  ' : '  XX  ') + n + (d ? '  — ' + d : '')); c ? pass++ : fail++; };

// upgrade cost scales with ilvl and uses the slot's material
const c1 = GC.upgradeCost('weapon', 1, cfg);
const c5 = GC.upgradeCost('weapon', 5, cfg);
check('weapon upgrade uses scrap_metal', !!c1.materials.scrap_metal);
check('upgrade cost rises with ilvl', c5.materials.scrap_metal > c1.materials.scrap_metal && c5.credits > c1.credits,
  `i1=${c1.materials.scrap_metal}/${c1.credits} i5=${c5.materials.scrap_metal}/${c5.credits}`);
check('body uses beast_hide, accessory crystal_shard, hazard sigil_dust',
  GC.upgradeCost('body', 1, cfg).materials.beast_hide && GC.upgradeCost('accessory', 1, cfg).materials.crystal_shard && GC.upgradeCost('hazard', 1, cfg).materials.sigil_dust);

// affordability + payment
const inv = { materials: { scrap_metal: 3 } };
const player = { money: 100 };
check('cannot pay without enough materials', !GC.canPay(inv, player.money, GC.upgradeCost('weapon', 5, cfg)));
const cost = GC.upgradeCost('weapon', 1, cfg);
check('can pay with enough', GC.canPay(inv, player.money, cost));
const before = inv.materials.scrap_metal, beforeCr = player.money;
check('pay deducts materials + credits', GC.pay(inv, player, cost) &&
  (inv.materials.scrap_metal || 0) === before - cost.materials.scrap_metal && player.money === beforeCr - cost.credits);
check('cannot pay twice when broke of materials', !GC.pay({ materials: {} }, { money: 999 }, cost));

// recipes resolve + cost
const rec = GC.recipeById(cfg, 'iron_sword');
check('recipe resolves by id', rec && rec.id === 'iron_sword');
const rc = GC.recipeCost(rec);
check('recipe cost = its materials + credits', rc.materials.scrap_metal === 5 && rc.credits === 60);
check('costLine renders', GC.costLine(rc, (id) => id).includes('scrap_metal') && GC.costLine(rc).includes('Cr'));

// ── PROFICIENCY: success + crit scale with level; crit yields a higher tier ──
// default level (no state) = 1
check('profOf defaults to 1', GC.profOf({}, 'smithing') === 1);
// success chance rises with level, falls with tier
const s_l1t1 = GC.successChance(1, 1, cfg), s_l10t1 = GC.successChance(10, 1, cfg), s_l1t2 = GC.successChance(1, 2, cfg);
check('success rises with level', s_l10t1 > s_l1t1, `L1=${s_l1t1.toFixed(2)} L10=${s_l10t1.toFixed(2)}`);
check('success falls with recipe tier', s_l1t2 < s_l1t1);
// crit chance rises with level
check('crit rises with level', GC.critChance(10, 1, cfg) > GC.critChance(1, 1, cfg));

// attemptCraft outcomes are gated by the rolls (deterministic via injected rng)
const ironRec = GC.recipeById(cfg, 'iron_sword');
const failOut = GC.attemptCraft({}, ironRec, cfg, () => 0.999);   // first roll fails success
check('high roll → failed craft', failOut.success === false);
const plain = GC.attemptCraft({}, ironRec, cfg, () => 0.0);     // success + crit (0 < both)
check('low rolls → success + crit', plain.success && plain.crit);
check('crit upgrades to the higher-tier item', plain.resultId === ironRec.critUpgrade, plain.resultId);
// a recipe WITHOUT critUpgrade → crit = masterwork (bonus ilvl)
const axeRec = GC.recipeById(cfg, 'steel_axe');
const mw = GC.attemptCraft({}, axeRec, cfg, () => 0.0);
check('crit w/o upgrade → masterwork ilvl', mw.success && mw.crit && mw.resultId === 'steel_axe' && mw.resultIlvl > 1, 'i' + mw.resultIlvl);

// proficiency XP accrues + levels up; higher level => higher success
const player2 = {};
let leveled = false;
for (let i = 0; i < 50; i++) { const e = GC.gainProficiency(player2, 'smithing', true, cfg); if (e.leveled) leveled = true; }
check('crafting grants proficiency + levels up', leveled && player2.crafting.smithing.level > 1, 'L' + player2.crafting.smithing.level);
check('leveled smith has better odds', GC.successChance(player2.crafting.smithing.level, 1, cfg) > s_l1t1);

// refund returns a fraction of materials on failure
const inv2 = { materials: {} };
GC.refundMaterials(inv2, { materials: { scrap_metal: 6 } }, 0.5);
check('failed craft refunds half the materials', inv2.materials.scrap_metal === 3);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
