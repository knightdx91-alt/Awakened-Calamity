import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const GameMeta = require(`${process.cwd()}/src/systems/meta.js`);
const db = JSON.parse(readFileSync('data/systems/meta.json','utf8'));
let ok=true; const A=(c,m)=>{ if(!c){console.log('  FAIL: '+m);ok=false;} else console.log('  ok: '+m); };

let meta={ fragments:20, unlocks:[] };
const avail0 = GameMeta.available(db, meta).map(n=>n.id);
A(avail0.includes('resilience') && !avail0.includes('resilience2'), 'gated node hidden until prereq (resilience2 locked)');
A(GameMeta.purchase(db,meta,'resilience').ok, 'buy resilience (cost 6)');
A(meta.fragments===14, 'fragments spent -> 14');
A(GameMeta.available(db,meta).map(n=>n.id).includes('resilience2'), 'prereq met -> resilience2 now available');
A(!GameMeta.purchase(db,meta,'resilience').ok, 'cannot re-buy owned');
GameMeta.purchase(db,meta,'fieldkit'); GameMeta.purchase(db,meta,'attune');
const e=GameMeta.effects(db,meta);
A(e.hpMult===0.15 && e.fragmentBonus===2 && e.startItems.length===1, 'effects aggregate: hpMult .15, +2 frags, 1 start item');
A(!GameMeta.purchase(db,{fragments:1,unlocks:[]},'leash').ok, 'cannot afford -> blocked');
console.log(ok?'\nALL META TESTS PASS ✅':'\nFAIL ❌'); process.exit(ok?0:1);
