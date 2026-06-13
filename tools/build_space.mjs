// Character-permutation estimator for a Smith-starter (Awakened Calamity).
// All in log10 space. Numbers tagged [DATA]=from our files, [PROJ]=full-game
// design projection (target counts, not all built yet), [MODEL]=upper-bound model.

// log10(n!) via summed logs
const N=4000; const lf=new Float64Array(N+1);
for(let i=2;i<=N;i++) lf[i]=lf[i-1]+Math.log10(i);
const logFact=n=>lf[n];
const logC=(n,k)=> logFact(n)-logFact(k)-logFact(n-k);   // log10 C(n,k)
const logPow=(b,e)=> e*Math.log10(b);

const factors=[];
const add=(name,log10,note)=>factors.push({name,log10,note});

// --- the axes ---------------------------------------------------------------
// 1. Class journey: an ordered sequence of up to 6 classes you HOLD over a run
//    (start + evolutions + lateral changes), drawn from the full ~450-class roster.
add('Class journey (ordered, ≤6 classes from ~450)', logPow(450,6),
    '[PROJ] 50 base + 250 tiered + ~150 evo/special; keep-skills changes make order matter');
// 2. Specialization chosen at each class you settle into (~3 options, ~6 classes)
add('Specializations across journey (3 options × 6 classes)', logPow(3,6),
    '[DATA] ~2-3 specializations per class in classes.json');
// 3. The learned skill set: which ~60 skills you end up knowing, from the full pool
add('Learned skill set: choose ~60 from ~1,500 pool', logC(1500,60),
    '[PROJ] pool now 110 for a slice; full game ~1,500. self-teach/buy/find/evolve');
// 4. Active loadout: pick ~10 actives from your ~30 known actives (set at Camp)
add('Active loadout: choose 10 of ~30 known actives', logC(30,10),
    '[DATA] loadout ~8-10 slots, SKILLS.md §1.5');
// 5. Skill evolution forks: each maxed skill (~30) takes a ~3-way Rank-10 fork
add('Skill-evolution forks (3-way × ~30 maxed skills)', logPow(3,30),
    '[DATA] breakthrough / evolve / Untethered, SKILLS.md §4.5');
// 6. Attribute distribution: ~1,500 points spread over 6 attributes
add('Attribute spread (~1,500 pts over 6 attrs)', logC(1505,5),
    '[MODEL] compositions of 1500 into 6 = C(1505,5)');
// 7. Affinity Art investment: 9 affinities, each ranked 0..10
add('Affinity Art investment (rank 0-10 × 9 affinities)', logPow(11,9),
    '[DATA] 9 affinities, SKILLS.md Affinity Arts');
// 8. Bonded creature party: 6 of ~200 species, each with its own build (~10^3)
add('Bonded party (6 of ~200 species, each ~10^3 builds)', logC(200,6)+logPow(10,3*6),
    '[PROJ] creature roster ~200; per-creature level/skill build ~10^3');

// --- total ------------------------------------------------------------------
let total=0; for(const f of factors) total+=f.log10;

const pad=(s,n)=> (s+' '.repeat(n)).slice(0,n);
console.log('\nPER-AXIS (log10 = number of zeros):\n');
for(const f of factors)
  console.log('  10^'+pad(f.log10.toFixed(1),6)+'  '+pad(f.name,52)+'  '+f.note);
console.log('\n  ----------------------------------------------------------');
console.log('  TOTAL  ≈  10^'+total.toFixed(0)+'   (product of all axes)\n');

const ref=[
  ['grains of sand on Earth', 19],
  ['stars in the observable universe', 24],
  ['atoms in a human body', 27],
  ['atoms in the Milky Way', 68],
  ['atoms in the observable universe', 80],
  ['chess game-trees (Shannon number)', 120],
  ['legal Go board positions', 170],
  ['Planck volumes in the observable universe', 185],
];
console.log('FOR SCALE  (our total ≈ 10^'+total.toFixed(0)+'):');
for(const [name,e] of ref){
  const diff=total-e;
  console.log('  vs '+pad(name,42)+' 10^'+pad(String(e),4)+'  —  ours is 10^'+diff.toFixed(0)+' times bigger');
}
