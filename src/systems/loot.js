// GameLoot — the LOOT roller (pure, deterministic, portable).
// Rolls a drop from a named table (data/systems/loot.json) into concrete grants:
// crafting MATERIALS, GEAR (weapons/armor by rarity), and rarely a RELIC (the rare
// gear tier). Seeded → a given (seed) reproduces the drop (replay-safe). No DOM.
//
//   dbs = { loot, gear, relics }
//   GameLoot.roll(table, dbs, seed) -> [ { pocket, id, qty }, ... ]
//
(function (root) {
  'use strict';
  var RNG = root.GameRNG || (typeof require !== 'undefined' && require('./rng.js'));

  function mk(seed) { var st = RNG.create(((seed | 0) || 1) >>> 0); return function () { return RNG.next(st); }; }
  function pick(rng, arr) { return arr.length ? arr[Math.floor(rng() * arr.length) % arr.length] : null; }
  function randint(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }

  // weighted gear pick by rarity (excludes 'relic' — that's a separate roll)
  function rollGear(gearDb, rng) {
    var list = (gearDb && gearDb.gear) || []; if (!list.length) return null;
    var weights = (gearDb._meta && gearDb._meta.rarityWeight) || { common: 100, uncommon: 45, rare: 16 };
    var bag = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].rarity === 'relic') continue;
      var w = weights[list[i].rarity] || 10;
      for (var k = 0; k < w; k++) bag.push(list[i].id);
    }
    return pick(rng, bag);
  }
  function rollRelic(relicsDb, rng) {
    var list = (relicsDb && relicsDb.relics) || []; if (!list.length) return null;
    // bias toward lower tiers using the relic weights if present
    var weights = (relicsDb.weights) || {};
    var bag = [];
    for (var i = 0; i < list.length; i++) { var w = weights[list[i].tier] || 10; for (var k = 0; k < w; k++) bag.push(list[i].id); }
    return bag.length ? pick(rng, bag) : pick(rng, list.map(function (r) { return r.id; }));
  }

  // Roll a table into a flat list of grants the engine applies to the inventory.
  function roll(table, dbs, seed) {
    var loot = (dbs && dbs.loot) || {}, t = (loot.tables || {})[table];
    if (!t) return [];
    var rng = mk(seed), out = [];
    // materials (always some, a small count band)
    var mats = loot.materials || [];
    if (mats.length && t.materials) {
      var n = randint(rng, t.materials[0] | 0, t.materials[1] | 0);
      if (n > 0) { var m = pick(rng, mats); out.push({ pocket: 'materials', id: m.id, qty: n }); }
    }
    // a consumable (chests)
    if (t.consumable && rng() < t.consumable) { var c = pick(rng, loot.consumables || []); if (c) out.push({ pocket: 'items', id: c, qty: 1 }); }
    // gear / relic (relic is checked first; it's the rare upgrade)
    if (t.relicChance && rng() < t.relicChance) { var rid = rollRelic(dbs.relics, rng); if (rid) out.push({ pocket: 'gear', id: rid, qty: 1, relic: true }); }
    else if (t.gearChance && rng() < t.gearChance) { var gid = rollGear(dbs.gear, rng); if (gid) out.push({ pocket: 'gear', id: gid, qty: 1 }); }
    return out;
  }

  var GameLoot = { roll: roll, rollGear: rollGear, rollRelic: rollRelic };
  root.GameLoot = GameLoot;
  if (typeof module !== 'undefined' && module.exports) module.exports = GameLoot;
})(typeof window !== 'undefined' ? window : globalThis);
