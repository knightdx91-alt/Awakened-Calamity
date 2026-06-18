// content_lint.mjs — cross-reference validator for ALL game content.
// The "validate" pillar for non-map data: every class/skill/quest/item/creature/
// map reference must resolve, so the boulder-sprite / blank-window / unreachable-
// door class of bug is caught for narrative + systems content too. Run on commit.
//
//   node tools/content_lint.mjs            # human report, exit 1 on FAIL
//   node tools/content_lint.mjs --json     # machine-readable (for the dashboard)
import { readFileSync, existsSync, readdirSync } from 'fs';
const ROOT = process.cwd();
const load = (p) => JSON.parse(readFileSync(`${ROOT}/${p}`, 'utf8'));
const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== '_meta'));

const skills = strip(load('data/systems/skills.json'));
const classes = strip(load('data/systems/classes.json'));
const creatures = strip(load('data/systems/creatures.json'));
const items = strip(load('data/systems/items.json'));
const quests = strip(load('data/systems/quests.json'));
const POCKETS = ['items', 'food', 'tonics', 'gear', 'key', 'materials', 'tools'];

const fails = [], warns = [];
const FAIL = (m) => fails.push(m);
const WARN = (m) => warns.push(m);
const has = (obj, id) => Object.prototype.hasOwnProperty.call(obj, id) && id !== '_meta';

// ── classes ──
for (const [cid, c] of Object.entries(classes)) {
  if (typeof c !== 'object' || !c.statProfile) { WARN(`class '${cid}' has no statProfile (stub?)`); continue; }
  for (const s of c.grantsSkills || []) if (!has(skills, s)) FAIL(`class '${cid}' grants missing skill '${s}'`);
  for (const ev of c.evolvesInto || []) {
    const tgt = typeof ev === 'string' ? ev : ev.class;   // both forms exist in the data
    if (!has(classes, tgt)) FAIL(`class '${cid}' evolvesInto missing class '${tgt}'`);
    if (typeof ev === 'string') WARN(`class '${cid}' evolvesInto '${tgt}' uses the STRING form (skips 'requires' gating — inconsistent with the {class,requires} form)`);
  }
  for (const sp of c.specializations || []) {
    if (sp.grantsSkill && !has(skills, sp.grantsSkill)) FAIL(`class '${cid}' spec '${sp.id}' grants missing skill '${sp.grantsSkill}'`);
  }
  // every combat class should have at least one usable battle skill of its own
  const combatable = (c.grantsSkills || []).some((s) => skills[s] && ((skills[s].power || 0) > 0
    || ['heal', 'defUp', 'slow', 'markTarget', 'sunder', 'applyToxin', 'taunt', 'partyBuff', 'summon'].includes((skills[s].effect || {}).type)));
  if (!combatable) WARN(`class '${cid}' grants NO combat-usable skill (relies on basic kit only)`);
}

// ── skills: tags/effects sanity ──
let inert = 0;
for (const [sid, s] of Object.entries(skills)) {
  const e = s.effect || {};
  const usable = (s.power || 0) > 0 || s.kind === 'passive' || s.kind === 'reactive'
    || ['heal', 'defUp', 'slow', 'markTarget', 'sunder', 'applyToxin', 'taunt', 'partyBuff', 'summon'].includes(e.type);
  if (!usable) inert++;
}

// ── creatures ──
for (const [cr, c] of Object.entries(creatures)) {
  for (const s of c.loadout || []) if (!has(skills, s)) FAIL(`creature '${cr}' loadout missing skill '${s}'`);
  if (c.battler && !existsSync(`${ROOT}/data/battlers/${c.battler.replace('rtp/', 'rtp/')}`) && !existsSync(`${ROOT}/data/battlers/${c.battler}`))
    WARN(`creature '${cr}' battler '${c.battler}' not found`);
}

// ── quests ──
for (const [qid, q] of Object.entries(quests)) {
  if (!Array.isArray(q.stages) || !q.stages.length) FAIL(`quest '${qid}' has no stages`);
  const r = q.reward || {};
  if (r.item && !has(items, r.item)) FAIL(`quest '${qid}' rewards missing item '${r.item}'`);
}

// ── items ──
for (const [iid, it] of Object.entries(items)) {
  if (it.pocket && !POCKETS.includes(it.pocket)) WARN(`item '${iid}' has unknown pocket '${it.pocket}'`);
}

// ── maps: layouts exist, warps resolve, event refs resolve, sprites exist ──
const mapDir = 'data/maps/awakened', layDir = 'data/layouts/awakened';
const mapNames = new Set();
const mapFiles = readdirSync(`${ROOT}/${mapDir}`).filter((f) => f.endsWith('.json') && !f.startsWith('_') && f !== 'awakened_index.json');
for (const f of mapFiles) { try { mapNames.add(load(`${mapDir}/${f}`).name); } catch { /* skip */ } }
for (const f of mapFiles) {
  let m; try { m = load(`${mapDir}/${f}`); } catch { FAIL(`map '${f}' is not valid JSON`); continue; }
  if (m.layout && !existsSync(`${ROOT}/${layDir}/${m.layout}.json`)) FAIL(`map '${m.name}' references missing layout '${m.layout}'`);
  for (const w of m.warps || []) if (w.destMap && !mapNames.has(w.destMap)) WARN(`map '${m.name}' warp -> unknown map '${w.destMap}'`);
  for (const e of m.events || []) {
    const g = e.graphic;
    if (g && g.file && !existsSync(`${ROOT}/data/sprites/${g.file}`)) FAIL(`map '${m.name}' event '${e.name}' sprite '${g.file}' missing`);
    for (const c of e.commands || []) walkCmd(m.name, e.name, c);
  }
}
function walkCmd(map, ev, c) {
  if (!c || typeof c !== 'object') return;
  if (c.type === 'battle') for (const en of c.enemies || []) if (!has(creatures, en.key)) FAIL(`${map}/${ev}: battle vs unknown creature '${en.key}'`);
  if (c.type === 'grantskill' && c.skill && !has(skills, c.skill)) FAIL(`${map}/${ev}: grantskill unknown '${c.skill}'`);
  if (c.type === 'grantclass' && c.class && !has(classes, c.class)) FAIL(`${map}/${ev}: grantclass unknown '${c.class}'`);
  if (c.type === 'item' && c.id && !has(items, c.id)) WARN(`${map}/${ev}: item cmd unknown '${c.id}'`);
  if ((c.type === 'quest' || (c.cond && c.cond.kind === 'quest')) && (c.id || (c.cond && c.cond.id))) {
    const qid = c.id || c.cond.id;
    if (!has(quests, qid)) FAIL(`${map}/${ev}: references unknown quest '${qid}'`);
  }
  for (const k of ['then', 'else']) if (Array.isArray(c[k])) c[k].forEach((x) => walkCmd(map, ev, x));
}

const result = {
  fails, warns,
  stats: { classes: Object.keys(classes).length, skills: Object.keys(skills).length, inertSkills: inert,
    creatures: Object.keys(creatures).length, items: Object.keys(items).length, quests: Object.keys(quests).length, maps: mapFiles.length },
};
if (process.argv.includes('--json')) { console.log(JSON.stringify(result)); process.exit(fails.length ? 1 : 0); }

console.log('CONTENT LINT');
console.log('  ' + JSON.stringify(result.stats));
console.log(`  inert skills (no combat/passive effect — pure data hooks): ${inert}/${result.stats.skills}`);
console.log(`\n  ${fails.length} FAIL, ${warns.length} WARN\n`);
for (const m of fails) console.log('  FAIL: ' + m);
if (warns.length && process.argv.includes('-v')) for (const m of warns) console.log('  warn: ' + m);
else if (warns.length) console.log(`  (${warns.length} warnings — run with -v to see them)`);
if (!fails.length) console.log('\n  No broken references. ✅');
process.exit(fails.length ? 1 : 0);
