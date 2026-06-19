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

// --- newly-wired class skills (priority #1: 0 inert combat skills) ----------
// retagged actives now resolve to engine-honored effects
s = fresh(['soul_tether']); GameCombat.act(s, db, {actorId:'p1', skillId:'soul_tether', targetId:'e1'});
check('soul_tether marks the target', s.actors.e1.markMult>0, 'mark='+s.actors.e1.markMult);

s = fresh(['rouse']); GameCombat.act(s, db, {actorId:'p1', skillId:'rouse', targetId:null});
check('rouse rallies party atk', s.actors.p1.atkBuff>0 && s.actors.p2.atkBuff>0, 'p1='+s.actors.p1.atkBuff);

s = fresh(['ward']); GameCombat.act(s, db, {actorId:'p1', skillId:'ward', targetId:null});
check('ward shields party def', s.actors.p1.defBuff>0 && s.actors.p2.defBuff>0, 'p1='+s.actors.p1.defBuff);

s = fresh(['beast_call']); GameCombat.act(s, db, {actorId:'p1', skillId:'beast_call', targetId:null});
check('beast_call summons an ally', Object.values(s.actors).some(a=>a.summon), '');

// passive auras / trait folds
{ const b=GameCombat.createBattle(db,[
   {id:'p1',side:'player',name:'A',affinity:'lumen',stats:{hp:100,atk:20,def:14,speed:55},loadout:['jab','rally_aura']},
   {id:'p2',side:'player',name:'B',affinity:'lumen',stats:{hp:100,atk:20,def:14,speed:55},loadout:['jab']},
   {id:'e1',side:'enemy',name:'W',affinity:'verdant',stats:{hp:80,atk:20,def:14,speed:50},loadout:['jab']}],11);
  check('rally_aura folds a side-wide atk aura', b.actors.p1.sideAuraAtk>0 && b.actors.p2.sideAuraAtk>0, 'aura='+b.actors.p2.sideAuraAtk); }

{ const b=GameCombat.createBattle(db,[
   {id:'p1',side:'player',name:'A',affinity:'cinder',stats:{hp:100,atk:20,def:14,speed:55},loadout:['jab','affinity_focus']},
   {id:'e1',side:'enemy',name:'W',affinity:'verdant',stats:{hp:80,atk:20,def:14,speed:50},loadout:['jab']}],11);
  check('affinity_focus folds the affinity-power trait', b.actors.p1.affinityPowerBonus>0, 'bonus='+b.actors.p1.affinityPowerBonus); }

{ const base=GameCombat.createBattle(db,[{id:'p1',side:'player',name:'A',stats:{hp:100,atk:20,def:14,speed:55,mp:30},loadout:['jab']}],1);
  const boon=GameCombat.createBattle(db,[{id:'p1',side:'player',name:'A',stats:{hp:100,atk:20,def:14,speed:55,mp:30},loadout:['jab','mana_well']}],1);
  check('mana_well enlarges the MP pool', boon.actors.p1.maxMp>base.actors.p1.maxMp, base.actors.p1.maxMp+'->'+boon.actors.p1.maxMp); }

{ const b=GameCombat.createBattle(db,[
   {id:'p1',side:'player',name:'A',stats:{hp:100,atk:30,def:14,speed:55},loadout:['jab','deploy_turret','pack_sense']},
   {id:'e1',side:'enemy',name:'W',stats:{hp:80,atk:20,def:14,speed:50},loadout:['jab']}],3);
  GameCombat.act(b, db, {actorId:'p1', skillId:'deploy_turret', targetId:null});
  const sum=Object.values(b.actors).find(a=>a.summon);
  check('pack_sense buffs the summon', sum && sum.maxHp>25, 'hp='+(sum&&sum.maxHp)); }

// triage boosts healing done
{ const b=GameCombat.createBattle(db,[
   {id:'p1',side:'player',name:'A',stats:{hp:200,atk:20,def:14,speed:55},loadout:['jab','mend','triage']},
   {id:'e1',side:'enemy',name:'W',stats:{hp:80,atk:20,def:14,speed:50},loadout:['jab']}],3);
  const bare=GameCombat.createBattle(db,[
   {id:'p1',side:'player',name:'A',stats:{hp:200,atk:20,def:14,speed:55},loadout:['jab','mend']},
   {id:'e1',side:'enemy',name:'W',stats:{hp:80,atk:20,def:14,speed:50},loadout:['jab']}],3);
  b.actors.p1.hp=50; bare.actors.p1.hp=50;
  GameCombat.act(b, db, {actorId:'p1', skillId:'mend', targetId:'p1'});
  GameCombat.act(bare, db, {actorId:'p1', skillId:'mend', targetId:'p1'});
  check('triage boosts healing done', b.actors.p1.hp>bare.actors.p1.hp, bare.actors.p1.hp+' vs '+b.actors.p1.hp); }

// intercept (guardAlly) redirects a single-target hit onto the guardian
{ let redirected=false;
  for (let seed=0; seed<40 && !redirected; seed++){
    const b=GameCombat.createBattle(db,[
     {id:'p1',side:'player',name:'Guard',stats:{hp:200,atk:20,def:30,speed:55},loadout:['jab','intercept']},
     {id:'p2',side:'player',name:'Ward',stats:{hp:120,atk:20,def:14,speed:55},loadout:['jab']},
     {id:'e1',side:'enemy',name:'W',stats:{hp:80,atk:30,def:14,speed:50},loadout:['jab']}],seed);
    GameCombat.act(b, db, {actorId:'e1', skillId:'jab', targetId:'p2'});
    if (b.log.some(e=>e.type==='guard' && e.protect==='p2' && e.actor==='p1')) redirected=true;
  }
  check('intercept redirects a hit to the guardian', redirected, 'guardChance='+db.skills.intercept.effect.amount); }

// determinism with effects
const run = seed => { let b=GameCombat.createBattle(db,[
  {id:'p1',side:'player',name:'S',affinity:'stone',stats:{hp:120,atk:30,def:18,speed:60},loadout:['jab','cleave','coat_blade','pin_shot']},
  {id:'e1',side:'enemy',name:'W',affinity:'verdant',stats:{hp:70,atk:24,def:16,speed:50},loadout:['jab','heavy_strike']}],seed);
  let g=200; while(!b.over&&g-->0){ const id=GameCombat.advanceToReady(b); if(b.over||!id)break; const a=b.actors[id];
    if(a.side==='player') GameCombat.act(b,db,{actorId:id,skillId:'cleave',targetId:'e1'}); else GameCombat.act(b,db,GameCombat.enemyAction(b,db,id)); }
  return JSON.stringify({w:b.winner,surv:b.surveillance,e:b.actors.e1.hp}); };
check('determinism holds with effects', run(777)===run(777), run(777));
