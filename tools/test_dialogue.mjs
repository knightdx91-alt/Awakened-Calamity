import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const GameVoice = require(`${process.cwd()}/src/systems/dialogue_gen.js`);
const mira = JSON.parse(readFileSync('data/dialogue/mira.json','utf8'));
const tessa = JSON.parse(readFileSync('data/dialogue/tessa.json','utf8'));

const cases = [
  ['fresh awaken',           mira,  { quests:{}, surveillance:0, meet:0 }],
  ['after talk (stage1)',    mira,  { quests:{awakening:{status:'active',stage:1}}, surveillance:10, meet:1 }],
  ['hunt stage (stage2)',    mira,  { quests:{awakening:{status:'active',stage:2}}, surveillance:20, meet:2 }],
  ['done, clean',            mira,  { quests:{awakening:{status:'done',stage:3}}, surveillance:30, meet:5 }],
  ['done, high surveil',     mira,  { quests:{awakening:{status:'done',stage:3}}, surveillance:72, meet:6 }],
  ['tessa low',              tessa, { quests:{}, surveillance:10, meet:0 }],
  ['tessa rising',           tessa, { quests:{}, surveillance:55, meet:3 }],
  ['tessa high',             tessa, { quests:{}, surveillance:88, meet:4 }],
];
let ok=true;
for (const [label, sp, ctx] of cases) {
  const p = GameVoice.pick(sp, ctx);
  console.log(`  [${label}] -> ${p ? p.id : 'NONE'}: "${p ? p.text[0].slice(0,58) : ''}..."`);
  if (!p) ok=false;
}
// determinism + once-gating
const a = GameVoice.pick(mira, {quests:{},surveillance:0,meet:0});
const b = GameVoice.pick(mira, {quests:{},surveillance:0,meet:0});
console.log('\n  determinism (same state -> same line):', a.id===b.id);
const once = GameVoice.pick(mira, {quests:{},surveillance:0,meet:0, said:{greet_awaken:true}});
console.log('  once-gating (greet not repeated):', once.id!=='greet_awaken', '->', once.id);
console.log(ok?'\nALL CASES RESOLVED ✅':'\nSOME CASES FAILED ❌');
process.exit(ok?0:1);
