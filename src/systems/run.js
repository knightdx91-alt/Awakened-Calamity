// GameRun — the roguelite run loop (pure, portable, serializable).
// A run is a DESCENT through generated floors to a boss; it ends in death,
// COLLECTION (Surveillance maxed — the System reclaims you), or a clear. Death is
// not a game-over: it resets you to the hub (Dawnhearth) with carry-over (memory
// fragments + records). No DOM, no engine — the controller drives the warps.
//
// State:  run  -> GameSave.state.run   (the CURRENT run; cleared between runs)
//         meta -> GameSave.state.meta  (persists across runs: the loop's memory)
(function (root) {
  'use strict';

  function active(run) { return !!(run && run.active); }
  // Boss cadence: ENDLESS runs spawn an Alpha every `bossEvery` floors and NEVER
  // auto-clear — the descent is infinite, ending only on death, Collection, or a
  // voluntary extract. Fixed runs end at `maxDepth` (legacy / pool fallback).
  function isBossFloor(run, db) {
    db = db || {};
    if (db.endless) { var be = db.bossEvery || 5; return (run.floor | 0) > 0 && ((run.floor | 0) % be === 0); }
    return (run.floor | 0) >= (db.maxDepth || 4);
  }

  // map for the current floor, chosen from the pool by run seed (so runs differ)
  function floorMap(run, db) {
    db = db || {};
    if (isBossFloor(run, db) && (db.bossPool || []).length)
      return db.bossPool[(run.seed >>> 0) % db.bossPool.length];
    var pool = db.floorPool || [];
    return pool.length ? pool[((run.seed >>> 0) + (run.floor | 0)) % pool.length] : null;
  }

  function start(run, db, seed, opts) {
    db = db || {}; opts = opts || {};
    run.active = true;
    run.seed = (seed >>> 0) || ((Math.random() * 0xffffffff) >>> 0);
    run.floor = 1;
    run.surveillance = 0;
    run.biome = db.biome || 'verdara';
    run.cleared = false;
    run.endedReason = null;
    run.relics = [];                                // per-run relic rewards (wiped each run)
    run.tethered = opts.tethered !== false;        // refuse the System's help = untethered
    return { floor: 1, map: floorMap(run, db), boss: isBossFloor(run, db), tethered: run.tethered };
  }

  // Go one floor deeper. ENDLESS: always advances (never clears) — you go as deep
  // as you can. FIXED: returns {cleared:true} past the boss.
  function descend(run, db) {
    db = db || {};
    if (!db.endless && isBossFloor(run, db)) { run.cleared = true; return { cleared: true }; }
    run.floor = (run.floor | 0) + 1;
    return { floor: run.floor, map: floorMap(run, db), boss: isBossFloor(run, db) };
  }

  // Accrue Surveillance during a run; report whether it triggers COLLECTION.
  function addSurveillance(run, n, collectAt) {
    run.surveillance = (run.surveillance | 0) + (n | 0);
    return { surveillance: run.surveillance, collected: run.surveillance >= (collectAt || 240) };
  }

  // End the run. reason: 'died' | 'collected' | 'cleared' | 'extracted'. Applies
  // carry-over to meta and returns a summary for the reset screen. 'extracted' = a
  // voluntary return to the surface in an endless run (you banked your gains alive).
  function end(run, meta, reason) {
    meta = meta || {};
    meta.runs = (meta.runs | 0) + 1;
    meta.deepest = Math.max(meta.deepest | 0, run.floor | 0);
    if (reason === 'cleared') meta.clears = (meta.clears | 0) + 1;
    if (reason === 'extracted') meta.extractions = (meta.extractions | 0) + 1;
    if (reason === 'collected') meta.collections = (meta.collections | 0) + 1;
    if (run.tethered === false) meta.untetheredRuns = (meta.untetheredRuns | 0) + 1;
    // lifetime Surveillance gates the good/true endings (untethered runs stay clean)
    meta.lifetimeSurveillance = (meta.lifetimeSurveillance | 0) + (run.surveillance | 0);
    // memory fragments: deeper runs + a survival bonus for clearing/extracting alive
    // + clean runs (low Surveillance) + untethered remember more
    var survived = (reason === 'cleared' || reason === 'extracted');
    var frag = (run.floor | 0) + (survived ? 3 : 0) + ((run.surveillance | 0) < 60 ? 2 : 0)
      + (run.tethered === false ? 2 : 0);
    meta.fragments = (meta.fragments | 0) + frag;
    var summary = { reason: reason, floor: run.floor | 0, surveillance: run.surveillance | 0,
      tethered: run.tethered !== false, fragments: frag, totalFragments: meta.fragments,
      lifetimeSurveillance: meta.lifetimeSurveillance };
    run.active = false;
    run.endedReason = reason;
    run.lastSummary = summary;
    return { meta: meta, summary: summary };
  }

  function carry(meta) {
    meta = meta || {};
    return { runs: meta.runs | 0, deepest: meta.deepest | 0, clears: meta.clears | 0,
             collections: meta.collections | 0, fragments: meta.fragments | 0 };
  }

  var GameRun = { active: active, isBossFloor: isBossFloor, floorMap: floorMap,
                  start: start, descend: descend, addSurveillance: addSurveillance, end: end, carry: carry };
  root.GameRun = GameRun;
  if (typeof module !== 'undefined' && module.exports) module.exports = GameRun;
})(typeof window !== 'undefined' ? window : globalThis);
