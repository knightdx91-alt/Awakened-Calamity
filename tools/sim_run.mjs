// sim_run.mjs — full-run difficulty bot.
// Simulates a roguelite DESCENT: a class fights a sequence of encounters of
// rising depth, vitals carrying between fights (with a partial rest every few
// floors, like a camp), until death or clearing the final boss. Reports per
// class how deep the bot gets and how often it completes — the difficulty-tuning
// engine. Tells you if the curve is fair BEFORE a human plays.
//
// FAITHFUL to the live game in --endless mode: shared scaling (run.json), tier-
// banded biome rosters, real XP leveling (GameProgression), and the EQUIPMENT +
// LOOT economy (GameLoot/GameEquip) — relics are RARE equippable gear (one worn,
// no stacking), so the bot's power = best-in-slot drops, not stacked relic buffs.
//
//   node tools/sim_run.mjs [--runs 50] [--depth 10] [--classes warrior,rogue,scout]
//   node tools/sim_run.mjs --endless [--max 60] [--boss-every 5] [--untethered]
import { loadCore, buildPlayerDef, buildEnemyDef, runFight, classIds } from './sim_core.mjs';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const _req = createRequire(import.meta.url);
globalThis.GameRNG = globalThis.GameRNG || _req(`${process.cwd()}/src/systems/rng.js`);
const GameProgression = _req(`${process.cwd()}/src/systems/progression.js`);
const GameLoot = _req(`${process.cwd()}/src/systems/loot.js`);
const GameEquip = _req(`${process.cwd()}/src/systems/equip.js`);
const GameAct = _req(`${process.cwd()}/src/systems/act.js`);
let RUNCFG = {}; try { RUNCFG = JSON.parse(readFileSync(`${process.cwd()}/data/systems/run.json`, 'utf8')); } catch {}
const SCALING = RUNCFG.scaling || {};
let BIOMES = {}; try { BIOMES = JSON.parse(readFileSync(`${process.cwd()}/data/systems/biomes.json`, 'utf8')); } catch {}
const GEAR = (() => { try { return JSON.parse(readFileSync(`${process.cwd()}/data/systems/gear.json`, 'utf8')); } catch { return { gear: [] }; } })();
const RELICDB = (() => { try { return JSON.parse(readFileSync(`${process.cwd()}/data/systems/relics.json`, 'utf8')); } catch { return { relics: [] }; } })();
const LOOTDB = (() => { try { return JSON.parse(readFileSync(`${process.cwd()}/data/systems/loot.json`, 'utf8')); } catch { return { tables: {} }; } })();
let ACTCFG = GameAct.DEFAULT_CFG; try { ACTCFG = JSON.parse(readFileSync(`${process.cwd()}/data/systems/acts.json`, 'utf8')); } catch {}
const EQUIP_DBS = { gear: GEAR, relics: RELICDB };

// EQUIPMENT model — faithful to the game (src/systems/equip.js): relics are RARE
// equippable gear, only ONE worn, bonuses ONLY from the 4 equipped slots (no
// stacking). The bot greedily keeps best-in-slot. A rough power score ranks gear.
function gearScore(def) {
  const s = (def && (def.stats || def.effect)) || {};
  return (s.atk || 0) * 2.2 + (s.def || 0) * 1.2 + (s.hp || 0) * 0.25 + (s.speed || 0) * 0.15
    + (s.atkMult || 0) * 28 + (s.hpMult || 0) * 14 + (s.defMult || 0) * 10 + (s.spdMult || 0) * 8
    + (s.crit || 0) * 35 + (s.evade || 0) * 25 + (s.lifesteal || 0) * 30 + (s.thorns || 0) * 12 + (s.defBonus || 0) * 1.2;
}
// Try to equip a dropped item if it beats what's worn (respects the single-relic rule).
function considerEquip(player, id) {
  const def = GameEquip.resolve(id, EQUIP_DBS); if (!def) return;
  const slot = def.slot || 'accessory', eq = (player.equipment = player.equipment || {});
  const cur = eq[slot] ? GameEquip.resolve(eq[slot], EQUIP_DBS) : null;
  if (cur && gearScore(cur) >= gearScore(def)) return;              // keep the better worn piece
  // a relic must beat the currently worn relic too (only one allowed)
  if (def.rarity === 'relic') {
    const rs = GameEquip.equippedRelicSlot(player, EQUIP_DBS);
    if (rs && rs !== slot) { const wr = GameEquip.resolve(eq[rs], EQUIP_DBS); if (wr && gearScore(wr) >= gearScore(def)) return; }
  }
  GameEquip.equip(player, id, EQUIP_DBS);
}
// Apply equipped-gear bonuses to a player def (flat + mult + the trait bundle).
function applyEquip(def, player) {
  const ag = GameEquip.aggregate(player, EQUIP_DBS), s = def.stats;
  s.atk = Math.max(1, Math.round((s.atk + ag.flat.atk) * (1 + ag.mult.atk)));
  s.hp = Math.max(1, Math.round((s.hp + ag.flat.hp) * (1 + ag.mult.hp)));
  s.def = Math.max(0, Math.round((s.def + ag.flat.def) * (1 + ag.mult.def)));
  if (s.speed != null) s.speed = Math.max(1, Math.round((s.speed + ag.flat.speed) * (1 + ag.mult.spd)));
  def.bonuses = { crit: ag.bonuses.crit, evade: ag.bonuses.evade, lifesteal: ag.bonuses.lifesteal, thorns: ag.bonuses.thorns, defBonus: ag.bonuses.defBonus };
  return def;
}
// Roll a loot table and feed any gear/relic to the equip logic (materials ignored).
function rollLoot(player, table, seed) {
  for (const g of GameLoot.roll(table, { loot: LOOTDB, gear: GEAR, relics: RELICDB }, seed))
    if (g.pocket === 'gear') considerEquip(player, g.id);
}
// the sim must use the SAME tier-banded biome roster the generator does (mapgen
// pool = tier band + a splash of tier-1 for tier≥2), or it wrongly spawns endgame
// monsters on floor 1. Default to the configured biome (verdara).
const SIM_BIOME = BIOMES[RUNCFG.biome] || BIOMES[(BIOMES._meta || {}).default] || null;
function rosterFor(tier) {
  if (!SIM_BIOME) return null;
  const et = SIM_BIOME.enemyTiers || {};
  const band = (tier <= 1 ? et['1'] : tier === 2 ? et['2'] : et['3']) || et['1'] || [];
  return tier >= 2 ? band.concat(et['1'] || []) : band;
}

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const RUNS = parseInt(opt('--runs', '50'), 10);
const DEPTH = parseInt(opt('--depth', '10'), 10);
// --endless: no fixed bottom — descend until death (or --max safety cap), an Alpha
// every --boss-every floors, enemy level scaling with depth (the real endless config).
// Reports how DEEP the bot gets + where deaths cluster, not a clear%.
const ENDLESS = args.includes('--endless');
const MAXFLOOR = parseInt(opt('--max', '60'), 10);
const BOSS_EVERY = parseInt(opt('--boss-every', '5'), 10);
// --rest = HP fraction recovered after EACH cleared fight (models the run's
// recovery economy: potions / lifesteal relics / shrines). Tune this to find the
// recovery rate that makes the descent fair.
const REST = parseFloat(opt('--rest', '0'));
// Tether model. Tethered (default) = the System catches you, but Collection ends
// the run once cumulative Surveillance crosses the budget (the dilemma's real
// cost). Untethered = no saves, death is immediate (the HONEST skill read — see
// CLAUDE.md). --collect sets the lifetime Surveillance budget before Collection.
const UNTETHERED = args.includes('--untethered');
const COLLECT = parseInt(opt('--collect', '240'), 10);

const { db, GameCombat } = loadCore();
const creatures = Object.keys(db.creatures).filter((k) => k !== '_meta' && k !== 'dummy' && db.creatures[k].stats);
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

// a tiny seeded rng for run-level choices (not combat — combat is seeded inside)
function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Classify WHY the bot died, from the losing fight + the vitals it walked in on.
// A bot-side stand-in for a human death-heatmap: tells spike vs. grind vs. economy.
//   collected   — leaned on the System until Collection took you (the dilemma's cost)
//   starved     — walked into the fight already low (recovery economy too thin)
//   burst       — died in a handful of turns (a difficulty SPIKE / near one-shot)
//   outleveled  — lost a long attrition fight (floor scaling outran your growth)
function deathCause(r, entryHp) {
  if (r.collected) return 'collected';
  if (entryHp < 0.4) return 'starved';
  if (r.turns <= 5) return 'burst';
  return 'outleveled';
}

// shared depth→enemy-level scaling — MUST mirror main.js _genFloor so the sim
// predicts the real curve. tier ramps with depth (capped 3); depthBonus = rounded
// floors * rate, with an earlyGrace discount; bosses add tier*2 + bossLevelBonus.
function enemyLevels(floor, isBoss, rng) {
  const rate = SCALING.enemyLevelPerFloor != null ? SCALING.enemyLevelPerFloor : 0.5;
  const tier = Math.max(1, Math.min(3, 1 + Math.floor((floor - 1) / BOSS_EVERY)));
  let depthBonus = Math.round((floor - 1) * rate);
  if (floor <= (SCALING.earlyGrace | 0)) depthBonus -= (SCALING.graceLevels | 0);
  if (isBoss) return { main: Math.max(1, tier + depthBonus + 2 + (SCALING.bossLevelBonus | 0)), add: Math.max(1, tier + depthBonus) };
  // roamer ≈ tier + depthBonus + intra(0..2)
  return { main: Math.max(1, tier + depthBonus + Math.floor(rng() * 3)), add: Math.max(1, tier + depthBonus) };
}

function simRun(classId, runSeed) {
  const rng = mulberry(runSeed);
  let vit = { hp: 1, mp: 1, sp: 1 };
  let choices = 0;                                  // genuine trade-off moments this run
  let cumSurv = 0;                                  // cumulative Surveillance across the run
  const bottom = ENDLESS ? MAXFLOOR : DEPTH;
  // ENDLESS models REAL leveling: the player gains XP from kills (GameProgression)
  // and levels up, so whether they keep pace with the ramp emerges from the curve.
  const tierOf = (db.classes[classId] || {}).tier || 'basic';
  const prog = GameProgression.createProgress(tierOf, 1, db.progression);
  const player = { equipment: {} };                 // equipped gear/relic (best-in-slot)
  // act node per floor (so caches drop only on elite/treasure floors, like the game)
  const nodeType = (floor) => {
    if (!ENDLESS) return 'monster';
    const actIdx = Math.floor((floor - 1) / BOSS_EVERY);
    const act = GameAct.compose((((runSeed >>> 0) + actIdx * 0x9E3779B1) >>> 0) || 1, BOSS_EVERY, ACTCFG);
    const n = GameAct.nodeFor(act, ((floor - 1) % BOSS_EVERY) + 1);
    return n ? n.type : 'monster';
  };
  for (let floor = 1; floor <= bottom; floor++) {
    // partial rest every 3rd floor (a camp): recover some vitals
    if (floor > 1 && floor % 3 === 1) { vit = { hp: Math.min(1, vit.hp + 0.35), mp: Math.min(1, vit.mp + 0.5), sp: Math.min(1, vit.sp + 0.5) }; }
    const isBoss = ENDLESS ? (floor % BOSS_EVERY === 0) : (floor === DEPTH);
    const enemies = [];
    let elv;
    if (ENDLESS) {
      const el = enemyLevels(floor, isBoss, rng);
      const tier = Math.max(1, Math.min(3, 1 + Math.floor((floor - 1) / BOSS_EVERY)));
      const roster = rosterFor(tier) || creatures;
      const bossPool = (SIM_BIOME && SIM_BIOME.bosses) || creatures;
      enemies.push(buildEnemyDef(db, pick(rng, isBoss ? bossPool : roster), el.main, 'e1'));
      // the Alpha is a SOLO boss event in-game (roamers are separate fights); only
      // non-boss deep floors throw the occasional pack.
      if (!isBoss && floor >= 5 && rng() < 0.4) enemies.push(buildEnemyDef(db, pick(rng, roster), el.add, 'e2'));
      elv = el.main;
    } else {
      const lvl = isBoss ? floor + 2 : floor;
      enemies.push(buildEnemyDef(db, pick(rng, creatures), lvl, 'e1'));
      if (isBoss || (floor >= 5 && rng() < 0.5)) enemies.push(buildEnemyDef(db, pick(rng, creatures), Math.max(1, lvl - 2), 'e2'));
      elv = lvl;
    }
    const entryHp = vit.hp;
    const fightOpts = { startVit: vit };
    if (UNTETHERED) fightOpts.tethered = false;
    // Collection is cumulative across the run: the budget left over this fight is
    // the lifetime budget minus what we've already accrued.
    else fightOpts.collectBudget = Math.max(0, COLLECT - cumSurv);
    const plvl = ENDLESS ? Math.max(1, prog.level) : Math.max(1, Math.ceil(floor * 0.8));
    let pdef = buildPlayerDef(db, classId, plvl);
    if (ENDLESS) pdef = applyEquip(pdef, player);
    const r = runFight(db, GameCombat, pdef, enemies, runSeed * 31 + floor, fightOpts);
    // Each lethal-save OFFER is a real accept/refuse dilemma the player would face.
    choices += r.saves | 0;
    cumSurv += r.surveillance | 0;
    if (r.winner !== 'player' || r.collected) return { depth: floor - 1, died: true, cause: deathCause(r, entryHp), deathFloor: floor, choices };
    // won: gain XP from kills + collect this floor's loot, faithful to the game —
    // roamers drop materials (+rare gear); chests drop gear; caches appear ONLY on
    // elite/treasure floors; bosses drop gear and (rarely) a relic. Best-in-slot kept.
    if (ENDLESS) {
      for (const e of enemies) GameProgression.gainFromKill(prog, { level: e.level || elv, xpYield: 1 }, db.progression);
      const node = nodeType(floor);
      rollLoot(player, 'roamer', runSeed * 131 + floor * 17);                  // the floor's encounters
      const chestN = 1 + Math.max(1, Math.min(3, 1 + Math.floor((floor - 1) / BOSS_EVERY))) + (node === 'treasure' ? 1 : 0);
      for (let ci = 0; ci < chestN; ci++) rollLoot(player, 'chest', runSeed * 911 + floor * 53 + ci);
      if (node === 'elite') rollLoot(player, 'elite', runSeed * 733 + floor * 23);
      else if (node === 'treasure') rollLoot(player, 'cache', runSeed * 733 + floor * 23);
      if (isBoss) rollLoot(player, 'boss', runSeed * 577 + floor * 13);
    }
    vit = { hp: Math.min(1, r.endVit.hp + REST), mp: Math.min(1, r.endVit.mp + REST), sp: Math.min(1, r.endVit.sp + REST) };
  }
  return { depth: bottom, died: false, choices };   // survived to the (sim) bottom
}

let roster = classIds(db);
const sel = opt('--classes', null);
if (sel) roster = sel.split(',');

const results = [];
const causeTotals = { collected: 0, starved: 0, burst: 0, outleveled: 0 };
const deathByFloor = {};                              // floor -> death count (all classes)
let totalChoices = 0, totalRuns = 0;
for (const cid of roster) {
  let cleared = 0, sumDepth = 0, sumChoices = 0; const depths = [];
  for (let s = 0; s < RUNS; s++) {
    const r = simRun(cid, 7000 + s * 13);
    if (!r.died) cleared++;
    else { causeTotals[r.cause] = (causeTotals[r.cause] | 0) + 1; deathByFloor[r.deathFloor] = (deathByFloor[r.deathFloor] | 0) + 1; }
    sumDepth += r.depth; depths.push(r.depth);
    sumChoices += r.choices; totalChoices += r.choices; totalRuns++;
  }
  depths.sort((a, b) => a - b);
  results.push({ cid, tier: db.classes[cid].tier, clear: cleared / RUNS, avg: sumDepth / RUNS, med: depths[Math.floor(RUNS / 2)], choices: sumChoices / RUNS });
}

// report (sorted by depth reached)
results.sort((a, b) => (ENDLESS ? a.avg - b.avg : a.clear - b.clear));
if (ENDLESS)
  console.log(`ENDLESS BOT — ${roster.length} classes, ${RUNS} runs each, Alpha every ${BOSS_EVERY} floors, cap ${MAXFLOOR} (how DEEP you get is the score)`);
else
  console.log(`FULL-RUN BOT — ${roster.length} classes, ${RUNS} runs each, depth ${DEPTH} (boss on the last floor)`);
console.log(`tether: ${UNTETHERED ? 'UNTETHERED (no saves, death is real — the honest skill read)' : `TETHERED (System catches you; Collection budget ${COLLECT})`}\n`);
console.log('  class                tier      ' + (ENDLESS ? 'capped%  avgDeep  medDeep  choices/run' : ' clear%  avgDepth  medDepth  choices/run'));
console.log('  ' + '-'.repeat(71));
for (const r of results) {
  console.log('  ' + r.cid.padEnd(20) + (r.tier || '?').padEnd(13)
    + (r.clear * 100).toFixed(0).padStart(5) + '%   ' + r.avg.toFixed(1).padStart(6) + '   ' + String(r.med).padStart(6)
    + '   ' + r.choices.toFixed(2).padStart(8));
}
console.log('\nSUMMARY');
if (ENDLESS) {
  const avgDeep = results.reduce((a, r) => a + r.avg, 0) / Math.max(1, results.length);
  const medians = results.map((r) => r.med).sort((a, b) => a - b);
  const cappedAny = results.filter((r) => r.clear > 0).length;
  console.log(`  overall avg deepest floor: ${avgDeep.toFixed(1)} (median of class medians ${medians[Math.floor(medians.length / 2)]})`);
  console.log(`  classes that ever reached the cap (${MAXFLOOR}): ${cappedAny}/${roster.length} ${cappedAny ? '— raise --max if many hit it' : ''}`);
  console.log('  An endless curve is HEALTHY when deaths spread across depth (see histogram');
  console.log('  below) rather than clustering on the early floors (a too-steep early ramp).');
} else {
  const viable = results.filter((r) => r.clear > 0).length;
  const fair = results.filter((r) => r.clear >= 0.2 && r.clear <= 0.85).length;
  console.log(`  classes that EVER clear the descent: ${viable}/${roster.length}`);
  console.log(`  classes in a FAIR band (20-85% clear — the tuning sweet spot): ${fair}`);
  console.log('  too-easy (>85%) = overtuned; never-clear (0%) = unfit for a combat run.');
}

// ── critical choices per run ──────────────────────────────────────────────
// How often a run forced a genuine accept/refuse System-save trade-off (the
// dilemma). Near 0 = the run is on rails (no meaningful decisions); a healthy
// roguelite wants several real choices per run.
console.log('\nCRITICAL CHOICES / RUN (System-save dilemmas forced)');
console.log(`  average across all ${totalRuns} runs: ${(totalChoices / Math.max(1, totalRuns)).toFixed(2)}`);
console.log('  (0 = on-rails, no forced trade-offs; higher = the dilemma actually bites)');

// ── death-cause histogram (bot-side death heatmap) ────────────────────────
const totDeaths = Object.values(causeTotals).reduce((a, b) => a + b, 0);
console.log('\nDEATH-CAUSE HISTOGRAM (why runs end — spike vs. grind vs. economy)');
if (!totDeaths) console.log('  (no deaths — every run cleared; lower --rest or raise --depth)');
else {
  const label = { collected: 'collected  (leaned on System → Collection)', starved: 'starved    (walked in too hurt — recovery economy)',
    burst: 'burst      (died in ≤5 turns — difficulty SPIKE)', outleveled: 'outleveled (long attrition — scaling outran growth)' };
  for (const k of ['outleveled', 'burst', 'starved', 'collected']) {
    const n = causeTotals[k] | 0, pct = (n / totDeaths) * 100;
    console.log('  ' + label[k].padEnd(52) + String(n).padStart(5) + '  ' + '█'.repeat(Math.round(pct / 4)) + ' ' + pct.toFixed(0) + '%');
  }
}

// ── death-by-floor histogram (where the curve spikes) ─────────────────────
console.log('\nDEATHS BY FLOOR (where the difficulty curve bites)');
const floorBottom = ENDLESS ? MAXFLOOR : DEPTH;
const maxFloorDeaths = Math.max(1, ...Object.values(deathByFloor));
for (let f = 1; f <= floorBottom; f++) {
  const n = deathByFloor[f] | 0;
  const isBossF = ENDLESS ? (f % BOSS_EVERY === 0) : (f === DEPTH);
  const tag = isBossF ? ' (boss)' : '';
  console.log('  floor ' + String(f).padStart(2) + tag.padEnd(7) + String(n).padStart(5) + '  ' + '█'.repeat(Math.round((n / maxFloorDeaths) * 30)));
}
console.log('\n  Use this to pick the launch roster, set the difficulty curve, and');
console.log('  spot whether deaths are SPIKES (burst, clustered floors) or GRIND');
console.log('  (outleveled, spread out) or ECONOMY (starved) — each wants a different fix.');
