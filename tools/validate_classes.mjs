// Validates that every class's grantsSkills + specialization.grantsSkill resolve
// to a real skill, and reports the per-tier class counts. evolvesInto is
// forward-looking (later tiers) so unresolved evolve targets are only warned.
import fs from 'fs';
const J = p => JSON.parse(fs.readFileSync(p,'utf8'));
const classes = J('data/systems/classes.json');
const skills  = J('data/systems/skills.json');
const skillIds = new Set(Object.keys(skills).filter(k=>k!=='_meta'));
const classIds = new Set(Object.keys(classes).filter(k=>k!=='_meta'));
let errs=0, warns=0; const tiers={};
for (const [id,c] of Object.entries(classes)) {
  if (id==='_meta'||!c||!c.tier) continue;
  tiers[c.tier]=(tiers[c.tier]||0)+1;
  for (const s of (c.grantsSkills||[])) if(!skillIds.has(s)){ console.error('MISSING skill',s,'in class',id); errs++; }
  for (const sp of (c.specializations||[])) if(sp.grantsSkill && !skillIds.has(sp.grantsSkill)){ console.error('MISSING spec skill',sp.grantsSkill,'in',id); errs++; }
  for (const ev of (c.evolvesInto||[])) { const t = typeof ev==='string'?ev:ev.class; if(t && !classIds.has(t)){ console.warn('  (evolve target not yet authored:',t,'from',id+')'); warns++; } }
}
console.log('tiers:',JSON.stringify(tiers));
console.log('classes:',classIds.size,' skills:',skillIds.size,' errors:',errs,' evolve-warns:',warns);
process.exit(errs?1:0);
