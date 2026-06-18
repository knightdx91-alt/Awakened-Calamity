// gen_dialogue.mjs — authoring drafter for reactive dialogue, FROM the docs.
// Assembles a generation brief from the design documents + world data + the
// speaker's persona + the runtime schema, so a writer (or Claude) drafts
// context-tagged dialogue that drops straight into data/dialogue/<id>.json and
// is served by src/systems/dialogue_gen.js (GameVoice). It also VALIDATES a
// draft against the schema and runs it through the selector to prove it resolves.
//
//   node tools/gen_dialogue.mjs brief <id> "<one-line brief>"   # -> /tmp/<id>.prompt.md (+ API draft if ANTHROPIC_API_KEY)
//   node tools/gen_dialogue.mjs validate <id>                   # check data/dialogue/<id>.json
//
// The generation step is done by an LLM (Claude). In this harness auth is managed
// (no raw API key), so `brief` writes the assembled prompt for Claude to fill;
// if ANTHROPIC_API_KEY is ever set, it calls the API directly.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const read = (p) => (existsSync(`${ROOT}/${p}`) ? readFileSync(`${ROOT}/${p}`, 'utf8') : '');

// pull a few hundred lines of the most relevant lore so the draft is on-canon
const DOCS = ['STORY.md', 'DESIGN.md', 'WORLD.md', 'docs/DAWNHEARTH.md', 'GAZETTEER.md', 'docs/PRODUCTION_PLAN.md'];
function loreContext(maxChars = 9000) {
  let out = '';
  for (const d of DOCS) {
    const t = read(d); if (!t) continue;
    out += `\n\n===== ${d} =====\n` + t.slice(0, 3500);
    if (out.length > maxChars) break;
  }
  return out.slice(0, maxChars);
}

const SCHEMA = `Speaker file (data/dialogue/<id>.json):
{ "id","name","face":{ "sheet":"People1","index":0 },"persona":"...",
  "lines":[ { "id":"snake_case", "priority":0-30, "once":false,
              "when":{ "quest":{"awakening":"<1"|1|"done"|">=2"}, "surveillance":">=60", "meet":">=3", "flag":{"k":true} },
              "text":["box 1","box 2"] }, ... ] }
Rules: higher priority wins; same-priority lines rotate by visit count; "once" lines fire once.
Always include a fallback line with "when":{} (priority 0). Keep text to GBA dialogue-box length.
Cover the game-state axes the System-horror roguelite cares about: quest stage, Surveillance level
(low / rising>=40 / high>=75), and repeat visits.`;

function buildPrompt(id, brief) {
  const existing = read(`data/dialogue/${id}.json`);
  return `You are writing reactive dialogue for "Awakened Calamity", a System-horror LitRPG roguelite.
Premise: "The System helps you, and that's the horror." Tone: dread under the mundane; the System is
helpful AND menacing; NPCs fear Surveillance and the cycle. Keep it terse, characterful, on-canon.

TASK: draft the reactive-dialogue JSON for speaker '${id}'.
BRIEF: ${brief}

OUTPUT: a single JSON object matching this schema exactly (no prose, no markdown fences):
${SCHEMA}
${existing ? `\nEXISTING (extend/revise, keep ids stable where sensible):\n${existing}` : ''}
\nLORE CONTEXT (stay consistent with this):${loreContext()}
`;
}

async function callAPI(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
  const r = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) { console.error('API ' + r.status); return null; }
  const j = await r.json();
  return j.content && j.content[0] && j.content[0].text;
}

function validate(id) {
  const p = `data/dialogue/${id}.json`;
  if (!existsSync(`${ROOT}/${p}`)) { console.error('missing ' + p); process.exit(1); }
  let sp; try { sp = JSON.parse(read(p)); } catch (e) { console.error('invalid JSON: ' + e.message); process.exit(1); }
  const errs = [];
  if (!sp.id || !sp.name) errs.push('missing id/name');
  if (!Array.isArray(sp.lines) || !sp.lines.length) errs.push('no lines');
  const ids = new Set();
  for (const l of sp.lines || []) {
    if (!l.id) errs.push('a line has no id');
    if (ids.has(l.id)) errs.push(`duplicate line id '${l.id}'`); ids.add(l.id);
    if (!l.text || (Array.isArray(l.text) && !l.text.length)) errs.push(`line '${l.id}' has no text`);
  }
  if (!sp.lines.some((l) => !l.when || Object.keys(l.when).length === 0)) errs.push('no fallback line (when:{})');
  // prove it resolves through the selector for a few states
  const GameVoice = require(`${ROOT}/src/systems/dialogue_gen.js`);
  const states = [
    { quests: {}, surveillance: 0, meet: 0 },
    { quests: { awakening: { status: 'active', stage: 1 } }, surveillance: 50, meet: 2 },
    { quests: { awakening: { status: 'done', stage: 3 } }, surveillance: 80, meet: 5 },
  ];
  for (const st of states) if (!GameVoice.pick(sp, st)) errs.push('selector returned NONE for ' + JSON.stringify(st));
  if (errs.length) { console.log(`${id}: ${errs.length} problems`); errs.forEach((e) => console.log('  - ' + e)); process.exit(1); }
  console.log(`${id}: OK — ${sp.lines.length} lines, resolves across states ✅`);
}

const [cmd, id, brief] = process.argv.slice(2);
if (cmd === 'brief' && id) {
  const prompt = buildPrompt(id, brief || `Draft Dawnhearth NPC '${id}' with quest-stage + Surveillance reactive lines.`);
  const out = `/tmp/${id}.prompt.md`; writeFileSync(out, prompt);
  console.log('assembled generation brief -> ' + out + ` (${prompt.length} chars)`);
  callAPI(prompt).then((draft) => {
    if (draft) {
      try { JSON.parse(draft); writeFileSync(`${ROOT}/data/dialogue/${id}.json`, draft); console.log('API draft written -> data/dialogue/' + id + '.json (review before commit)'); }
      catch { writeFileSync(`/tmp/${id}.draft.txt`, draft); console.log('API returned non-JSON -> /tmp/' + id + '.draft.txt'); }
    } else {
      console.log('no ANTHROPIC_API_KEY (or gateway auth managed) — run the brief through Claude, save the JSON to');
      console.log('  data/dialogue/' + id + '.json, then: node tools/gen_dialogue.mjs validate ' + id);
    }
  });
} else if (cmd === 'validate' && id) {
  validate(id);
} else {
  console.log('usage: gen_dialogue.mjs brief <id> "<brief>"   |   gen_dialogue.mjs validate <id>');
  process.exit(1);
}
