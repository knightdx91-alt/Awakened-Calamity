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

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
