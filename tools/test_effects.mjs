import fs from 'fs';
const J = p => JSON.parse(fs.readFileSync(new URL('../data/systems/'+p, import.meta.url)));
const db = { combat:J('combat.json'), skills:J('skills.json'), affinities:J('affinities.json') };
const GameRNG = (await import('../src/systems/rng.js')).default;
globalThis.GameRNG = GameRNG;
const GameCombat = (await import('../src/systems/combat.js')).default;

function fresh(extraPlayerLoadout=[]) {
  return GameCombat.createBattle(db, [
    { id:'p1', side:'player', name:'Smith', affinity:'stone',
      stats:{hp:120,atk:30,def:18,speed:60}, loadout:['jab','cleave','taunt','pin_shot','coat_blade','unmake','deploy_turret','riposte', ...extraPlayerLoadout] },
    { id:'p2', side:'player', name:'Ally', affinity:'lumen', stats:{hp:90,atk:20,def:14,speed:55}, loadout:['jab','battle_hymn'] },
    { id:'e1', side:'enemy', name:'WolfA', affinity:'verdant', stats:{hp:70,atk:24,def:16,speed:50}, loadout:['jab','heavy_strike'] },
    { id:'e2', side:'enemy', name:'WolfB', affinity:'verdant', stats:{hp:70,atk:24,def:16,speed:50}, loadout:['jab'] },
  ], 4242);
}
const last = (s,type) => [...s.log].reverse().find(e=>e.type===type);
function check(name, cond, detail='') { console.log((cond?'  ok  ':'  XX  ')+name+(detail?'  — '+detail:'')); }

// AoE (cleave) hits both enemies
let s = fresh();
GameCombat.act(s, db, {actorId:'p1', skillId:'cleave', targetId:'e1'});
const hits = s.log.filter(e=>e.type==='hit' && e.skill==='cleave');
check('AoE cleave hits 2 targets', hits.length===2, hits.map(h=>h.target+':'+h.dmg).join(','));

// Slow (pin_shot) lowers target speedMod
s = fresh(); GameCombat.act(s, db, {actorId:'p1', skillId:'pin_shot', targetId:'e1'});
check('slow sets speedMod<0', s.actors.e1.speedMod<0, 'speedMod='+s.actors.e1.speedMod);

// Toxin DoT applies a stack, then ticks on target's turn
s = fresh(); GameCombat.act(s, db, {actorId:'p1', skillId:'coat_blade', targetId:'e1'});
check('toxin adds DoT stack', s.actors.e1.dot.length>0, 'stacks='+s.actors.e1.dot.length);
const hpBefore = s.actors.e1.hp; GameCombat.act(s, db, {actorId:'e1', skillId:'jab', targetId:'p1'});
check('toxin ticks on target turn', s.actors.e1.hp < hpBefore || !!last(s,'dot'));

// Sunder (unmake) reduces target def
s = fresh(); GameCombat.act(s, db, {actorId:'p1', skillId:'unmake', targetId:'e1'});
check('sunder sets sundered>0', s.actors.e1.sundered>0, 'sundered='+s.actors.e1.sundered);

// Taunt forces enemy targeting onto the taunter
s = fresh(); GameCombat.act(s, db, {actorId:'p1', skillId:'taunt', targetId:null});
const ea = GameCombat.enemyAction(s, db, 'e1');
check('taunt forces enemy onto taunter', ea.targetId==='p1', 'target='+ea.targetId);

// Summon (deploy_turret) adds an ally actor
s = fresh(); GameCombat.act(s, db, {actorId:'p1', skillId:'deploy_turret', targetId:null});
const sums = Object.values(s.actors).filter(a=>a.summon);
check('summon adds an ally', sums.length===1 && sums[0].side==='player', sums[0]&&sums[0].name);

// Counter (riposte reactive) — p1 has counterChance>0
s = fresh();
check('reactive counter folded into trait', s.actors.p1.counterChance>0, 'chance='+s.actors.p1.counterChance);

// Party-buff (battle_hymn) raises allies' atkBuff
s = fresh(); GameCombat.act(s, db, {actorId:'p2', skillId:'battle_hymn', targetId:null});
check('partyBuff raises ally atkBuff', s.actors.p1.atkBuff>0 && s.actors.p2.atkBuff>0, 'p1='+s.actors.p1.atkBuff);

// selfCost (overcharge) costs the caster HP
s = fresh(['overcharge']); const ohp=s.actors.p1.hp;
GameCombat.act(s, db, {actorId:'p1', skillId:'overcharge', targetId:'e1'});
check('selfCost drains caster HP', s.actors.p1.hp < ohp, ohp+'->'+s.actors.p1.hp);

// determinism with effects
const run = seed => { let b=GameCombat.createBattle(db,[
  {id:'p1',side:'player',name:'S',affinity:'stone',stats:{hp:120,atk:30,def:18,speed:60},loadout:['jab','cleave','coat_blade','pin_shot']},
  {id:'e1',side:'enemy',name:'W',affinity:'verdant',stats:{hp:70,atk:24,def:16,speed:50},loadout:['jab','heavy_strike']}],seed);
  let g=200; while(!b.over&&g-->0){ const id=GameCombat.advanceToReady(b); if(b.over||!id)break; const a=b.actors[id];
    if(a.side==='player') GameCombat.act(b,db,{actorId:id,skillId:'cleave',targetId:'e1'}); else GameCombat.act(b,db,GameCombat.enemyAction(b,db,id)); }
  return JSON.stringify({w:b.winner,surv:b.surveillance,e:b.actors.e1.hp}); };
check('determinism holds with effects', run(777)===run(777), run(777));
