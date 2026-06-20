// GameEquip — the EQUIPMENT system (pure, portable, serializable).
// Weapons / armor / accessories found as loot equip into slots on
// state.player.equipment. RELICS are the rare, powerful TIER of the same gear
// (data/systems/relics.json, rarity 'relic') — and only ONE relic may be equipped
// at a time. Bonuses come ONLY from equipped pieces (no passive stacking).
//
//   dbs = { gear: <gear.json>, relics: <relics.json> }
//   GameEquip.aggregate(player, dbs) -> { flat, mult, bonuses, run }
//   GameEquip.equip(player, id, dbs) -> { slot, freed:[ids returned to bag] }
//
(function (root) {
  'use strict';

  var SLOTS = ['weapon', 'body', 'accessory', 'hazard'];

  function gearList(dbs) { return (dbs && dbs.gear && dbs.gear.gear) || []; }
  function relicList(dbs) { return (dbs && dbs.relics && dbs.relics.relics) || []; }
  // resolve an item id from the gear pool OR the relic pool (relics are gear too)
  function resolve(id, dbs) {
    if (!id) return null;
    var g = gearList(dbs); for (var i = 0; i < g.length; i++) if (g[i].id === id) return g[i];
    var r = relicList(dbs); for (var j = 0; j < r.length; j++) if (r[j].id === id) return r[j];
    return null;
  }
  function slotOf(id, dbs) { var it = resolve(id, dbs); return it ? (it.slot || 'accessory') : null; }
  function isRelic(id, dbs) { var it = resolve(id, dbs); return !!(it && it.rarity === 'relic'); }

  function ensure(player) {
    if (!player.equipment) player.equipment = {};
    for (var i = 0; i < SLOTS.length; i++) if (!(SLOTS[i] in player.equipment)) player.equipment[SLOTS[i]] = null;
    return player.equipment;
  }
  // which slot (if any) currently holds a relic
  function equippedRelicSlot(player, dbs) {
    var eq = ensure(player);
    for (var i = 0; i < SLOTS.length; i++) { var id = eq[SLOTS[i]]; if (id && isRelic(id, dbs)) return SLOTS[i]; }
    return null;
  }

  // Equip an item. Returns { slot, freed:[ids] } — `freed` is whatever came OFF
  // (the previous item in that slot, plus any other relic if this is a relic, since
  // only one relic may be worn). The caller returns freed ids to the inventory bag.
  function equip(player, id, dbs) {
    var it = resolve(id, dbs); if (!it) return { slot: null, freed: [] };
    var eq = ensure(player), slot = it.slot || 'accessory', freed = [];
    if (eq[slot]) { freed.push(eq[slot]); eq[slot] = null; }
    if (it.rarity === 'relic') {
      var rs = equippedRelicSlot(player, dbs);
      if (rs && rs !== slot) { freed.push(eq[rs]); eq[rs] = null; }   // only one relic at a time
    }
    eq[slot] = id;
    return { slot: slot, freed: freed };
  }
  function unequip(player, slot) {
    var eq = ensure(player), id = eq[slot] || null; eq[slot] = null; return id;
  }

  // Aggregate every equipped piece into combat-ready bundles.
  function aggregate(player, dbs) {
    var out = {
      flat: { atk: 0, def: 0, hp: 0, speed: 0 },
      mult: { atk: 0, hp: 0, def: 0, spd: 0 },
      bonuses: { crit: 0, evade: 0, lifesteal: 0, thorns: 0, defBonus: 0 },
      run: { survPerSaveMult: 0, collectionBonus: 0 }
    };
    if (!player || !player.equipment) return out;
    for (var i = 0; i < SLOTS.length; i++) {
      var it = resolve(player.equipment[SLOTS[i]], dbs); if (!it) continue;
      var s = it.stats || it.effect || {};
      if (s.atk) out.flat.atk += s.atk; if (s.def) out.flat.def += s.def;
      if (s.hp) out.flat.hp += s.hp; if (s.speed) out.flat.speed += s.speed;
      if (s.atkMult) out.mult.atk += s.atkMult; if (s.hpMult) out.mult.hp += s.hpMult;
      if (s.defMult) out.mult.def += s.defMult; if (s.spdMult) out.mult.spd += s.spdMult;
      if (s.crit) out.bonuses.crit += s.crit; if (s.evade) out.bonuses.evade += s.evade;
      if (s.lifesteal) out.bonuses.lifesteal += s.lifesteal; if (s.thorns) out.bonuses.thorns += s.thorns;
      if (s.defBonus) out.bonuses.defBonus += s.defBonus;
      if (s.survPerSaveMult) out.run.survPerSaveMult += s.survPerSaveMult;
      if (s.collectionBonus) out.run.collectionBonus += s.collectionBonus;
    }
    return out;
  }

  var GameEquip = { SLOTS: SLOTS, resolve: resolve, slotOf: slotOf, isRelic: isRelic,
    equip: equip, unequip: unequip, aggregate: aggregate, equippedRelicSlot: equippedRelicSlot };
  root.GameEquip = GameEquip;
  if (typeof module !== 'undefined' && module.exports) module.exports = GameEquip;
})(typeof window !== 'undefined' ? window : globalThis);
