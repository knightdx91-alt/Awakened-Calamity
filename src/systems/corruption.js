// GameCorruption — Surveillance -> Corruption rules (pure, portable).
// Cumulative Surveillance corrupts the Subject: tiered combat penalties, and a
// collection threshold past which the System reclaims you (run lost / bad ending).
// The temptation (System Intervention saves you) is paid for here, in aggregate.
(function (root) {
  'use strict';
  function tierOf(db, surveillance) {
    var ts = (db && db.tiers) || [];
    var cur = ts[0] || { id: 'clear', atkMod: 0 };
    for (var i = 0; i < ts.length; i++) if ((surveillance | 0) >= ts[i].min) cur = ts[i];
    return cur;
  }
  function atkMod(db, surveillance) { return tierOf(db, surveillance).atkMod || 0; }
  function collected(db, surveillance) { return (surveillance | 0) >= ((db && db.collectionThreshold) || 240); }
  // which endings are still reachable given lifetime Surveillance
  function endingsOpen(db, surveillance) {
    var g = (db && db.endingGate) || {};
    return {
      collected: collected(db, surveillance),
      good: (surveillance | 0) <= (g.goodEndingMaxSurveillance != null ? g.goodEndingMaxSurveillance : 120),
      true: (surveillance | 0) <= (g.trueEndingMaxSurveillance != null ? g.trueEndingMaxSurveillance : 40),
    };
  }
  var GameCorruption = { tierOf: tierOf, atkMod: atkMod, collected: collected, endingsOpen: endingsOpen };
  root.GameCorruption = GameCorruption;
  if (typeof module !== 'undefined' && module.exports) module.exports = GameCorruption;
})(typeof window !== 'undefined' ? window : globalThis);
