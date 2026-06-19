// sim_core.mjs — shared headless harness over the pure combat core.
// Loads the deterministic GameCombat + game data and exposes helpers to build
// player/enemy actors (with level scaling) and run a single fight under a sane
// auto-play policy. Used by sim_balance.mjs (matchup matrix) and sim_run.mjs
// (full-run difficulty bot). No DOM, no engine — just the rules layer.
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const load = (p) => JSON.parse(readFileSync(`${ROOT}/${p}`, 'utf8'));

export function loadCore() {
  const db = {
    combat: load('data/systems/combat.json'),
    skills: load('data/systems/skills.json'),
    affinities: load('data/systems/affinities.json'),
    creatures: load('data/systems/creatures.json'),
    classes: load('data/systems/classes.json'),
    progression: load('data/systems/progression.json'),
  };
  globalThis.GameRNG = require(`${ROOT}/src/systems/rng.js`);
  const GameCombat = require(`${ROOT}/src/systems/combat.js`);
  return { db, GameCombat };
}

// ── level scaling (a simple, transparent growth model for sweeping levels) ──
const PGROW = { hp: 0.11, atk: 0.07, def: 0.06, spd: 0.03 };
const EGROW = { hp: 0.13, atk: 0.08, def: 0.06, spd: 0.04 };
function scale(base, level, g) {
  const f = (k, r) => Math.round((base[k] || 0) * (1 + r * (level - 1)));
  return {
    hp: f('hp', g.hp), atk: f('atk', g.atk), def: f('def', g.def),
    speed: base.speed != null ? Math.round(base.speed * (1 + g.spd * (level - 1))) : 40,
    mp: base.mp, sp: base.sp,
  };
}

const COMBAT_EFFECTS = ['heal', 'defUp', 'slow', 'markTarget', 'sunder', 'applyToxin', 'taunt', 'partyBuff', 'summon'];
export function combatLoadout(db, cls) {
  const filt = (cls.grantsSkills || []).filter((id) => {
    const s = db.skills[id]; if (!s) return false;
    return s.kind === 'passive' || s.kind === 'reactive' || (s.power || 0) > 0
      || COMBAT_EFFECTS.includes((s.effect || {}).type);
  });
  // mirror the in-game FIGHT menu: Strike first, then class skills, then basics
  return ['strike', ...filt, 'jab', 'guard'].filter((v, i, a) => db.skills[v] && a.indexOf(v) === i);
}

export function buildPlayerDef(db, classId, level) {
  const c = db.classes[classId];
  return {
    id: 'p1', side: 'player', name: c.name || classId, affinity: c.affinityLean || null,
    stats: scale(c.statProfile, level, PGROW), loadout: combatLoadout(db, c),
  };
}
export function buildEnemyDef(db, key, level, id = 'e1') {
  const cr = db.creatures[key];
  return {
    id, side: 'enemy', name: cr.name, affinity: cr.affinity || null, ai: true,
    stats: scale(cr.stats, level, EGROW), loadout: cr.loadout || ['strike'],
  };
}

// ── auto-play policy: heal when low, else strongest affordable attack ──
function playerPolicy(db, GC, state, me) {
  const foes = state.order.map((id) => state.actors[id]).filter((a) => a.side !== 'player' && a.hp > 0);
  if (me.hp < me.maxHp * 0.35) {
    const heal = me.loadout.find((id) => {
      const s = db.skills[id]; return s && (s.effect || {}).type === 'heal' && GC.canAfford(me, s);
    });
    if (heal) return { actorId: me.id, skillId: heal, targetId: me.id };
  }
  const atks = me.loadout.map((id) => ({ id, s: db.skills[id] }))
    .filter((o) => o.s && (o.s.power || 0) > 0 && GC.canAfford(me, o.s))
    .sort((a, b) => b.s.power - a.s.power);
  const skillId = atks.length ? atks[0].id : (db.skills.strike ? 'strike' : me.loadout[0]);
  return { actorId: me.id, skillId, targetId: foes[0] && foes[0].id };
}

// Run one fight. opts.startVit = {hp,mp,sp} fractions to carry vitals between fights.
export function runFight(db, GC, playerDef, enemyDefs, seed, opts = {}) {
  const state = GC.createBattle(db, [playerDef, ...enemyDefs], seed);
  if (opts.tethered === false) state.tethered = false;          // untethered: no System help
  if (opts.collectBudget != null) state.collectBudget = opts.collectBudget; // mid-fight collection
  const p = state.actors.p1;
  if (opts.startVit) {
    p.hp = Math.max(1, Math.round(p.maxHp * (opts.startVit.hp ?? 1)));
    p.mp = Math.round(p.maxMp * (opts.startVit.mp ?? 1));
    p.sp = Math.round(p.maxSp * (opts.startVit.sp ?? 1));
  }
  let turns = 0;
  while (!state.over && turns < 1000) {
    const ready = GC.advanceToReady(state);
    if (ready === null) break;
    const me = state.actors[ready];
    const action = me.side === 'enemy' ? GC.enemyAction(state, db, ready) : playerPolicy(db, GC, state, me);
    GC.act(state, db, action);
    turns++;
  }
  const pe = state.actors.p1;
  return {
    winner: state.winner, turns, surveillance: state.surveillance,
    collected: !!state.collected, saves: state._saves || 0,
    endVit: { hp: Math.max(0, pe.hp) / pe.maxHp, mp: pe.mp / pe.maxMp, sp: pe.sp / pe.maxSp },
  };
}

export function classIds(db) {
  return Object.keys(db.classes).filter((k) => k !== '_meta' && db.classes[k] && db.classes[k].statProfile);
}

// ── tier-aware encounter selection (the roster has `tier` + role:'boss') ──
// Regular (non-boss) creatures, and the boss roster.
export function regularCreatures(db) {
  return Object.keys(db.creatures).filter((k) => k !== '_meta' && k !== 'dummy'
    && db.creatures[k].stats && (db.creatures[k].role !== 'boss'));
}
export function bossCreatures(db) {
  return Object.keys(db.creatures).filter((k) => k !== '_meta' && db.creatures[k].stats && db.creatures[k].role === 'boss');
}
// Pick a creature appropriate for a floor: tier ramps with depth (1 early → 3 deep),
// occasionally one tier below for variety. Falls back to any regular creature.
export function pickFloorEnemy(db, rng, floor, maxDepth) {
  const frac = maxDepth > 1 ? (floor - 1) / (maxDepth - 1) : 0;
  let tier = frac < 0.34 ? 1 : frac < 0.7 ? 2 : 3;
  if (tier > 1 && rng() < 0.3) tier -= 1;               // some easier mixed in
  const reg = regularCreatures(db);
  let pool = reg.filter((k) => (db.creatures[k].tier || 1) === tier);
  if (!pool.length) pool = reg;
  return pool[Math.floor(rng() * pool.length) % pool.length];
}
export function pickBoss(db, rng) {
  const b = bossCreatures(db);
  return b.length ? b[Math.floor(rng() * b.length) % b.length] : 'thornwolf';
}
