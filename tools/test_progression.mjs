import fs from 'fs';
const db = JSON.parse(fs.readFileSync(new URL('../data/systems/progression.json', import.meta.url)));
const P = (await import('../src/systems/progression.js')).default;
function ok(n,c,d='') { console.log((c?'  ok  ':'  XX  ')+n+(d?'  — '+d:'')); }

// Lv1 Basic costs 100; ~6 standard L1 kills for level 1
ok('xpToNext(1,basic)=100', P.xpToNext(1,'basic',db)===100, ''+P.xpToNext(1,'basic',db));
const k1 = P.mobXP(1,1.0,db);
ok('mobXP(L1,std)=17', k1===17, ''+k1);
ok('~6 kills for level 1', Math.ceil(100/k1)===6, Math.ceil(100/k1)+' kills');

// Tier multipliers
ok('Advanced Lv1 costs 350', P.xpToNext(1,'advanced',db)===350, ''+P.xpToNext(1,'advanced',db));
ok('Legendary Lv1 costs 27000', P.xpToNext(1,'legendary',db)===27000, ''+P.xpToNext(1,'legendary',db));

// Points per level by tier
ok('Basic grants 3 pts/level', P.pointsForLevel('basic',db)===3);
ok('Legendary grants 8 pts/level', P.pointsForLevel('legendary',db)===8);

// Award multi-level: dump 1000 XP into a fresh Basic L1
let pr = P.createProgress('basic',1);
const evs = P.awardXP(pr, 1000, db);
ok('1000 XP levels several times', evs.length>=2, 'reached L'+pr.level+', '+evs.length+' levels, '+pr.attrPoints+' pts, '+pr.xp+' xp left');

// Kill-driven: standard L1 mob repeatedly until first level
pr = P.createProgress('basic',1); let kills=0;
while(pr.level===1 && kills<20){ P.gainFromKill(pr,{level:1,xpYield:1.0},db); kills++; }
ok('standard kills to reach L2 ≈ 6', kills===6, kills+' kills');

// level-diff: lethal gap → bonus, trivial → near-zero
ok('lethal-gap mult = 1.5', P.levelDiffMult(1,10,db)===1.5);
ok('trivial mult = 0.1', P.levelDiffMult(20,1,db)===0.1);

// kills-per-level rises (L50 ~62 per the doc)
function killsToLevel(L){ let p=P.createProgress('basic',L), n=0; const tgt=p.level+1;
  while(p.level<tgt && n<100000){ P.awardXP(p, P.mobXP(L,1.0,db), db); n++; } return n; }
ok('kills/level rises L1<L10<L50', killsToLevel(1)<killsToLevel(10) && killsToLevel(10)<killsToLevel(50),
   'L1='+killsToLevel(1)+' L10='+killsToLevel(10)+' L50='+killsToLevel(50));
