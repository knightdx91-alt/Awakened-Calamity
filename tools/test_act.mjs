// test_act.mjs — verify the run/act composer (src/systems/act.js, roadmap #4):
// determinism, pacing rules (boss last, monster first, rest before boss, min
// spacing), node modifiers wired, and the glyph map. Pure, headless.
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
globalThis.GameRNG = require(`${ROOT}/src/systems/rng.js`);
const GameAct = require(`${ROOT}/src/systems/act.js`);
let cfg = GameAct.DEFAULT_CFG; try { cfg = JSON.parse(readFileSync(`${ROOT}/data/systems/acts.json`)); } catch {}

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => { console.log((cond ? '  ok  ' : '  XX  ') + name + (detail ? '  — ' + detail : '')); cond ? pass++ : fail++; };

// determinism
const a1 = GameAct.compose(777, 6, cfg), a2 = GameAct.compose(777, 6, cfg);
check('determinism (same seed → identical act)', JSON.stringify(a1) === JSON.stringify(a2));
check('different seed → differs', JSON.stringify(GameAct.compose(778, 6, cfg)) !== JSON.stringify(a1));

// structural / pacing rules across many seeds and lengths
let bossLast = true, monsterFirst = true, restBeforeBoss = true, lenOk = true, spacingOk = true, validTypes = true;
const types = new Set(['monster', 'elite', 'treasure', 'rest', 'boss']);
const minSp = cfg.pacing.minSpacing || {};
for (let s = 0; s < 60; s++) {
  const len = 4 + (s % 5);                         // 4..8 floors
  const act = GameAct.compose(1000 + s, len, cfg);
  if (act.length !== len) lenOk = false;
  if (act[len - 1].type !== 'boss') bossLast = false;
  if (act[0].type !== 'monster') monsterFirst = false;
  if (len >= 3 && act[len - 2].type !== 'rest') restBeforeBoss = false;
  for (const n of act) if (!types.has(n.type)) validTypes = false;
  // min spacing: no two of a spaced type within `sp` of each other (ignoring the
  // forced rest-before-boss, which is intentional)
  for (let i = 0; i < act.length; i++) {
    const t = act[i].type, sp = minSp[t] || 0;
    if (!sp || t === 'boss') continue;
    if (i === len - 2 && t === 'rest') continue;   // the forced pre-boss rest
    for (let b = 1; b <= sp; b++) {
      const j = i - b;
      if (j >= 0 && act[j].type === t && !(t === 'rest' && i === len - 2)) spacingOk = false;
    }
  }
}
check('boss is always the last node', bossLast);
check('first node is monster', monsterFirst);
check('a rest precedes the boss', restBeforeBoss);
check('act length = requested', lenOk);
check('min spacing respected (no back-to-back spaced types)', spacingOk);
check('all node types valid', validTypes);

// node modifiers carried from cfg
const act = GameAct.compose(42, 7, cfg);
const elite = act.find(n => n.type === 'elite');
check('elite node carries gen modifiers', !elite || (elite.gen && elite.gen.elite === true && elite.gen.guaranteedRelic === true));
const rest = act.find(n => n.type === 'rest');
check('rest node disables encounters + flags rest', rest && rest.gen.encounterMult === 0 && rest.gen.rest === true);

// helpers
check('nodeFor clamps + returns the floor node', GameAct.nodeFor(act, 1).floor === 1 && GameAct.nodeFor(act, 999).floor === act.length);
const gm = GameAct.glyphMap(act, 2);
check('glyphMap marks the current floor with ▸', gm.includes('▸') && gm.split(' ').length === act.length);

// degenerate length
check('length 1 → single boss node', GameAct.compose(5, 1, cfg).length === 1 && GameAct.compose(5, 1, cfg)[0].type === 'boss');

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
