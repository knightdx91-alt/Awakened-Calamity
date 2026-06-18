// GameRelics — the roguelite per-run reward layer (pure, portable, serializable).
// Relics are found on descents and grant passive bonuses for the CURRENT run
// only; they live on run.relics and are wiped when the run ends. Effects
// aggregate into combat (stat multipliers + a `bonuses` trait bundle) and into
// the System dilemma (surveillance-per-save / collection threshold). No DOM.
(function (root) {
  'use strict';

  function pool(db) { return (db && db.relics) || []; }
  function get(db, id) { return pool(db).find(function (r) { return r.id === id; }) || null; }

  // Roll N distinct relics, weighted by rarity, excluding ids already owned.
  // rng() -> [0,1). Deterministic when fed a seeded rng (run-seed reproducible).
  function roll(db, rng, n, owned) {
    owned = owned || [];
    var weights = (db && db.weights) || { common: 60, rare: 28, epic: 12 };
    var bag = pool(db).filter(function (r) { return owned.indexOf(r.id) < 0; });
    var out = [];
    n = Math.min(n | 0, bag.length);
    for (var k = 0; k < n; k++) {
      var total = bag.reduce(function (s, r) { return s + (weights[r.tier] || 10); }, 0);
      var roll = (rng ? rng() : Math.random()) * total, acc = 0, pick = 0;
      for (var i = 0; i < bag.length; i++) { acc += (weights[bag[i].tier] || 10); if (roll < acc) { pick = i; break; } }
      out.push(bag[pick]);
      bag.splice(pick, 1);
    }
    return out;
  }

  // Add a relic to the run (idempotent on unique ids). Returns the relic or null.
  function grant(run, db, id) {
    if (!run) return null;
    run.relics = run.relics || [];
    if (run.relics.indexOf(id) >= 0) return null;     // already held (uniques)
    if (!get(db, id)) return null;
    run.relics.push(id);
    return get(db, id);
  }

  // Aggregate the run's held relics into the effect bundle combat/run read.
  function effects(db, run) {
    var e = { atkMult: 0, hpMult: 0, defMult: 0, spdMult: 0,
              crit: 0, evade: 0, lifesteal: 0, thorns: 0, defBonus: 0,
              survPerSaveMult: 0, collectionBonus: 0 };
    var held = (run && run.relics) || [];
    for (var i = 0; i < held.length; i++) {
      var r = get(db, held[i]); if (!r) continue;
      var ef = r.effect || {};
      for (var key in e) if (ef[key] != null) e[key] += ef[key];
    }
    return e;
  }

  var GameRelics = { pool: pool, get: get, roll: roll, grant: grant, effects: effects };
  root.GameRelics = GameRelics;
  if (typeof module !== 'undefined' && module.exports) module.exports = GameRelics;
})(typeof window !== 'undefined' ? window : globalThis);
