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

const ID = (x) => GameEquip.idOf(x);
const freedIds = (r) => (r.freed || []).map(ID);
const p = {};
GameEquip.equip(p, 'iron_sword', dbs);
GameEquip.equip(p, 'leather_cuirass', dbs);
check('weapon + body occupy their slots', ID(p.equipment.weapon) === 'iron_sword' && ID(p.equipment.body) === 'leather_cuirass');
let ag = GameEquip.aggregate(p, dbs);
check('flat stats sum from equipped gear', ag.flat.atk === 7 && ag.flat.def === 5 && ag.flat.hp === 18);

// relic = rare tier: mults + the crit/lifesteal/etc. bundle
const r = GameEquip.equip(p, 'executioner', dbs);
check('relic equips into its slot, old weapon freed', ID(p.equipment.weapon) === 'executioner' && freedIds(r).includes('iron_sword'));
ag = GameEquip.aggregate(p, dbs);
check('relic contributes mult + crit', ag.mult.atk > 0 && ag.bonuses.crit > 0);

// the single-relic rule: equipping a 2nd relic forces the 1st off
const r2 = GameEquip.equip(p, 'keen_lens', dbs);
check('second relic forces the first off', freedIds(r2).includes('executioner') && p.equipment.weapon === null);
check('only ONE relic equipped at a time', GameEquip.equippedRelicSlot(p, dbs) === 'accessory');

// unequip frees the slot and returns the instance
const freed = GameEquip.unequip(p, 'body');
check('unequip frees the slot', ID(freed) === 'leather_cuirass' && p.equipment.body === null);

// resolve works across both pools; non-relic gear is unrestricted
check('resolve finds gear and relics', !!GameEquip.resolve('iron_sword', dbs) && !!GameEquip.resolve('executioner', dbs));
check('isRelic distinguishes the tiers', GameEquip.isRelic('executioner', dbs) && !GameEquip.isRelic('iron_sword', dbs));

// no equipment → zero aggregate (clean default)
const z = GameEquip.aggregate({}, dbs);
check('empty player → zero bonuses', z.flat.atk === 0 && z.mult.atk === 0 && z.bonuses.crit === 0);

// ── ITEM-LEVEL (ilvl) scaling ──────────────────────────────────────────────
// flat stats scale with ilvl; a higher-ilvl piece beats the same base.
const base = GameEquip.effectiveStats('iron_sword', dbs);          // ilvl 1 (bare id)
const hi = GameEquip.effectiveStats({ id: 'iron_sword', ilvl: 10 }, dbs);
check('ilvl scales flat stats up', hi.atk > base.atk, `i1=${base.atk} i10=${hi.atk}`);
check('ilvl 1 == base stats', base.atk === 7);
// equipping an instance keeps its ilvl; aggregate reflects the scaled stat
const q = {};
GameEquip.equip(q, { id: 'iron_sword', ilvl: 10 }, dbs);
check('equipped instance keeps ilvl', GameEquip.ilvlOf(q.equipment.weapon) === 10);
check('aggregate uses the scaled flat stat', GameEquip.aggregate(q, dbs).flat.atk === hi.atk);
// relic mults do NOT scale with ilvl (rare-tier character preserved)
const rl = GameEquip.effectiveStats({ id: 'executioner', ilvl: 20 }, dbs);
const rl1 = GameEquip.effectiveStats({ id: 'executioner', ilvl: 1 }, dbs);
check('relic mults are ilvl-invariant', rl.atkMult === rl1.atkMult);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
