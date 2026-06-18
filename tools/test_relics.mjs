// test_relics.mjs — relic roll/grant/effects + combat bonus integration.
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
globalThis.GameRNG = require(`${ROOT}/src/systems/rng.js`);
const GameRelics = require(`${ROOT}/src/systems/relics.js`);
const GameCombat = require(`${ROOT}/src/systems/combat.js`);
const db = JSON.parse(readFileSync(`${ROOT}/data/systems/relics.json`, 'utf8'));
const combatDb = {
  combat: JSON.parse(readFileSync(`${ROOT}/data/systems/combat.json`, 'utf8')),
  skills: JSON.parse(readFileSync(`${ROOT}/data/systems/skills.json`, 'utf8')),
  affinities: JSON.parse(readFileSync(`${ROOT}/data/systems/affinities.json`, 'utf8')),
};
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  XX  ' + m); } };
const seeded = (s) => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// roll: N distinct, deterministic for same seed
const r1 = GameRelics.roll(db, seeded(42), 3, []);
const r2 = GameRelics.roll(db, seeded(42), 3, []);
ok(r1.length === 3, 'roll returns 3 relics');
ok(new Set(r1.map(r => r.id)).size === 3, 'roll relics are distinct');
ok(JSON.stringify(r1.map(r => r.id)) === JSON.stringify(r2.map(r => r.id)), 'same seed -> same roll (reproducible)');
ok(GameRelics.roll(db, seeded(42), 3, [r1[0].id]).every(r => r.id !== r1[0].id), 'owned relics excluded from roll');

// grant + effects aggregate
const run = { relics: [] };
GameRelics.grant(run, db, 'whetstone');     // +15% atk
GameRelics.grant(run, db, 'leech_fang');    // 14% lifesteal
GameRelics.grant(run, db, 'whetstone');     // dup ignored
ok(run.relics.length === 2, 'duplicate grant ignored (uniques)');
const eff = GameRelics.effects(db, run);
ok(Math.abs(eff.atkMult - 0.15) < 1e-9, 'effects aggregate atkMult 0.15');
ok(Math.abs(eff.lifesteal - 0.14) < 1e-9, 'effects aggregate lifesteal 0.14');

// combat: bonuses bundle drives crit/lifesteal/thorns on the actor
const pdef = { id: 'p1', side: 'player', name: 'Hero', stats: { hp: 100, atk: 30, def: 10, speed: 50 },
  loadout: ['strike'], bonuses: { crit: 0.5, evade: 0.1, lifesteal: 0.5, thorns: 0.3, defBonus: 0.2 } };
const edef = { id: 'e1', side: 'enemy', name: 'Dummy', ai: true, stats: { hp: 200, atk: 20, def: 8, speed: 40 }, loadout: ['strike'] };
const st = GameCombat.createBattle(combatDb, [pdef, edef], 7);
const p = st.actors.p1;
ok(Math.abs(p.critChance - 0.5) < 1e-9, 'bonuses.crit folded into actor critChance');
ok(Math.abs(p.lifesteal - 0.5) < 1e-9 && Math.abs(p.thorns - 0.3) < 1e-9, 'lifesteal + thorns on actor');
// hurt the player, then have it attack -> lifesteal heals it back some
p.hp = 50;
GameCombat.act(st, combatDb, { actorId: 'p1', skillId: 'strike', targetId: 'e1' });
ok(p.hp > 50, `lifesteal healed the attacker (hp ${p.hp} > 50)`);

console.log(`\n${fail ? '❌' : '✅'} relics: ${pass} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
