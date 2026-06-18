import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const GameRun = require(`${process.cwd()}/src/systems/run.js`);
const db = JSON.parse(readFileSync('data/systems/run.json','utf8'));
let ok=true; const assert=(c,m)=>{ if(!c){console.log('  FAIL: '+m); ok=false;} else console.log('  ok: '+m); };

// a full clean descent
let run={}, meta={};
let s=GameRun.start(run, db, 42);
assert(run.active && run.floor===1, 'start -> floor 1 active, map='+s.map);
let maps=[s.map];
for(let i=0;i<3;i++){ const d=GameRun.descend(run,db); if(d.cleared){maps.push('CLEARED');break;} maps.push(d.map+(d.boss?'(BOSS)':'')); }
assert(GameRun.isBossFloor(run,db), 'reaches boss floor at depth '+run.floor);
const d4=GameRun.descend(run,db);
assert(d4.cleared, 'descending past boss -> cleared');
console.log('    floor maps:', maps.join(' -> '));
const r=GameRun.end(run, meta, 'cleared');
assert(!run.active && meta.runs===1 && meta.clears===1, 'end(cleared): run inactive, meta.runs=1, clears=1, frags='+meta.fragments);

// a death mid-run
let run2={}, meta2={runs:1,fragments:5};
GameRun.start(run2, db, 7); GameRun.descend(run2,db);
const col=GameRun.addSurveillance(run2, 250, 240);
assert(col.collected, 'surveillance 250 >= 240 -> collected');
const r2=GameRun.end(run2, meta2, 'collected');
assert(meta2.runs===2 && meta2.collections===1, 'end(collected): runs=2, collections=1');
assert(meta2.fragments>5, 'fragments carried over and grew: '+meta2.fragments);

// determinism: same seed -> same floor sequence
let A={},B={}; GameRun.start(A,db,99); GameRun.start(B,db,99);
assert(GameRun.floorMap(A,db)===GameRun.floorMap(B,db), 'same seed -> same floor map');
console.log(ok?'\nALL RUN-LOOP TESTS PASS ✅':'\nFAILURES ❌'); process.exit(ok?0:1);
