import { readFileSync } from 'fs';
import { createRequire } from 'module';
const ROOT = process.cwd();
const load = p => JSON.parse(readFileSync(`${ROOT}/${p}`, 'utf8'));
const db = {
  combat: load('data/systems/combat.json'),
  skills: load('data/systems/skills.json'),
  affinities: load('data/systems/affinities.json'),
  creatures: load('data/systems/creatures.json'),
  classes: load('data/systems/classes.json'),
};
const require = createRequire(import.meta.url);
globalThis.GameRNG = require(`${ROOT}/src/systems/rng.js`);
const GameCombat = require(`${ROOT}/src/systems/combat.js`);

function runBattle(seed) {
  const w = db.classes.warrior, wolf = db.creatures.thornwolf;
  const state = GameCombat.createBattle(db, [
    { id:'p1', side:'player', name:'Warrior', affinity:w.affinityLean, stats:w.statProfile, loadout:w.grantsSkills },
    { id:'e1', side:'enemy',  name:wolf.name, affinity:wolf.affinity,  stats:wolf.stats,    loadout:wolf.loadout },
  ], seed);
  let turns = 0;
  while (!state.over && turns < 500) {
    const ready = GameCombat.advanceToReady(state);
    if (ready === null) break;
    const me = state.actors[ready];
    const foes = Object.values(state.actors).filter(a => a.side !== me.side && a.hp > 0);
    const atks = me.loadout.map(id => db.skills[id]).filter(s => s.power > 0).sort((a,b)=>b.power-a.power);
    const sk = atks[0] || db.skills[me.loadout[0]];
    const skillId = me.loadout.find(id => db.skills[id] === sk) || me.loadout[0];
    GameCombat.act(state, db, { actorId: ready, skillId, targetId: foes[0] && foes[0].id });
    turns++;
  }
  return { winner: state.winner, turns, surv: state.surveillance,
           p1: state.actors.p1.hp, e1: state.actors.e1.hp,
           digest: state.log.map(l=>`${l.type}:${l.dmg||l.heal||''}`).join('|') };
}
const a = runBattle(12345), b = runBattle(12345), c = runBattle(99999);
console.log('battle(12345):', JSON.stringify({winner:a.winner, turns:a.turns, surv:a.surv, p1hp:a.p1, e1hp:a.e1}));
console.log('determinism (same seed → identical):', a.digest === b.digest);
console.log('different seed → differs:', a.digest !== c.digest);
console.log('battle(99999):', JSON.stringify({winner:c.winner, turns:c.turns, surv:c.surv}));
