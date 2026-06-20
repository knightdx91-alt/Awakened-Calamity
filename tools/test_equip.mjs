// test_equip.mjs — verify the equipment system (src/systems/equip.js):
// slot equipping, flat+mult+bonus aggregation, and the single-relic rule.
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const GameEquip = require(`${ROOT}/src/systems/equip.js`);
const dbs = {
  gear: JSON.parse(readFileSync(`${ROOT}/data/systems/gear.json`)),
  relics: JSON.parse(readFileSync(`${ROOT}/data/systems/relics.json`)),
};
let pass = 0, fail = 0;
const check = (n, c, d = '') => { console.log((c ? '  ok  ' : '  XX  ') + n + (d ? '  — ' + d : '')); c ? pass++ : fail++; };

const p = {};
GameEquip.equip(p, 'iron_sword', dbs);
GameEquip.equip(p, 'leather_cuirass', dbs);
check('weapon + body occupy their slots', p.equipment.weapon === 'iron_sword' && p.equipment.body === 'leather_cuirass');
let ag = GameEquip.aggregate(p, dbs);
check('flat stats sum from equipped gear', ag.flat.atk === 7 && ag.flat.def === 5 && ag.flat.hp === 18);

// relic = rare tier: mults + the crit/lifesteal/etc. bundle
const r = GameEquip.equip(p, 'executioner', dbs);
check('relic equips into its slot, old weapon freed', p.equipment.weapon === 'executioner' && r.freed.includes('iron_sword'));
ag = GameEquip.aggregate(p, dbs);
check('relic contributes mult + crit', ag.mult.atk > 0 && ag.bonuses.crit > 0);

// the single-relic rule: equipping a 2nd relic forces the 1st off
const r2 = GameEquip.equip(p, 'keen_lens', dbs);
check('second relic forces the first off', r2.freed.includes('executioner') && p.equipment.weapon === null);
check('only ONE relic equipped at a time', GameEquip.equippedRelicSlot(p, dbs) === 'accessory');

// unequip frees the slot and returns the id
const freed = GameEquip.unequip(p, 'body');
check('unequip frees the slot', freed === 'leather_cuirass' && p.equipment.body === null);

// resolve works across both pools; non-relic gear is unrestricted
check('resolve finds gear and relics', !!GameEquip.resolve('iron_sword', dbs) && !!GameEquip.resolve('executioner', dbs));
check('isRelic distinguishes the tiers', GameEquip.isRelic('executioner', dbs) && !GameEquip.isRelic('iron_sword', dbs));

// no equipment → zero aggregate (clean default)
const z = GameEquip.aggregate({}, dbs);
check('empty player → zero bonuses', z.flat.atk === 0 && z.mult.atk === 0 && z.bonuses.crit === 0);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
