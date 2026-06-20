// GameEquip — the EQUIPMENT system (pure, portable, serializable).
// Weapons / armor / accessories found as loot equip into slots on
// state.player.equipment. RELICS are the rare, powerful TIER of the same gear
// (data/systems/relics.json, rarity 'relic') — only ONE relic may be equipped at a
// time. Bonuses come ONLY from equipped pieces (no passive stacking).
//
// ITEM INSTANCES: gear is an instance { id, ilvl } (item-level). A piece's FLAT
// stats (atk/def/hp/speed) scale with ilvl — drops scale to the floor they fall on,
// and crafting raises ilvl. Mults/effect bundles (relic atkMult/crit/…) do NOT
// scale (they're the rare-tier character). A bare id string = ilvl 1 (legacy).
//
//   dbs = { gear: <gear.json>, relics: <relics.json> }
//   GameEquip.aggregate(player, dbs) -> { flat, mult, bonuses, run }
//   GameEquip.equip(player, item, dbs) -> { slot, freed:[instances to bag] }
//
(function (root) {
  'use strict';

  var SLOTS = ['weapon', 'body', 'accessory', 'hazard'];
  var GEAR_SCALE = 0.07;                    // flat-stat growth per item-level

  function idOf(item) { return item && typeof item === 'object' ? item.id : item; }
  function ilvlOf(item) { var l = (item && typeof item === 'object') ? (item.ilvl | 0) : 1; return l > 0 ? l : 1; }
  function inst(id, ilvl) { return { id: id, ilvl: Math.max(1, ilvl | 0) }; }

  function gearList(dbs) { return (dbs && dbs.gear && dbs.gear.gear) || []; }
  function relicList(dbs) { return (dbs && dbs.relics && dbs.relics.relics) || []; }
  // resolve the BASE def (by id) from the gear pool OR the relic pool
  function resolve(item, dbs) {
    var id = idOf(item); if (!id) return null;
    var g = gearList(dbs); for (var i = 0; i < g.length; i++) if (g[i].id === id) return g[i];
    var r = relicList(dbs); for (var j = 0; j < r.length; j++) if (r[j].id === id) return r[j];
    return null;
  }
  function slotOf(item, dbs) { var it = resolve(item, dbs); return it ? (it.slot || 'accessory') : null; }
  function isRelic(item, dbs) { var it = resolve(item, dbs); return !!(it && it.rarity === 'relic'); }

  // ilvl-scaled effective stats for an instance: flat stats grow, mults/bonuses stay.
  function effectiveStats(item, dbs) {
    var def = resolve(item, dbs); if (!def) return {};
    var s = def.stats || def.effect || {}, lvl = ilvlOf(item), f = 1 + GEAR_SCALE * (lvl - 1), out = {};
    for (var k in s) {
      if (k === 'atk' || k === 'def' || k === 'hp' || k === 'speed') out[k] = Math.round(s[k] * f);
      else out[k] = s[k];
    }
    return out;
  }

  function ensure(player) {
    if (!player.equipment) player.equipment = {};
    for (var i = 0; i < SLOTS.length; i++) if (!(SLOTS[i] in player.equipment)) player.equipment[SLOTS[i]] = null;
    return player.equipment;
  }
  function equippedRelicSlot(player, dbs) {
    var eq = ensure(player);
    for (var i = 0; i < SLOTS.length; i++) { var it = eq[SLOTS[i]]; if (it && isRelic(it, dbs)) return SLOTS[i]; }
    return null;
  }

  // Equip an instance. Returns { slot, freed:[instances] } — `freed` is whatever
  // came OFF (the previous item in that slot, plus any other relic if this is one,
  // since only one relic may be worn). The caller returns freed to the inventory bag.
  function equip(player, item, dbs) {
    var it = resolve(item, dbs); if (!it) return { slot: null, freed: [] };
    var eq = ensure(player), slot = it.slot || 'accessory', freed = [];
    if (eq[slot]) { freed.push(eq[slot]); eq[slot] = null; }
    if (it.rarity === 'relic') {
      var rs = equippedRelicSlot(player, dbs);
      if (rs && rs !== slot) { freed.push(eq[rs]); eq[rs] = null; }   // only one relic at a time
    }
    eq[slot] = (typeof item === 'object') ? item : inst(item, 1);
    return { slot: slot, freed: freed };
  }
  function unequip(player, slot) {
    var eq = ensure(player), it = eq[slot] || null; eq[slot] = null; return it;
  }

  // Aggregate every equipped piece (ilvl-scaled) into combat-ready bundles.
  function aggregate(player, dbs) {
    var out = {
      flat: { atk: 0, def: 0, hp: 0, speed: 0 },
      mult: { atk: 0, hp: 0, def: 0, spd: 0 },
      bonuses: { crit: 0, evade: 0, lifesteal: 0, thorns: 0, defBonus: 0 },
      run: { survPerSaveMult: 0, collectionBonus: 0 }
    };
    if (!player || !player.equipment) return out;
    for (var i = 0; i < SLOTS.length; i++) {
      var item = player.equipment[SLOTS[i]]; if (!item) continue;
      var s = effectiveStats(item, dbs);
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

  var GameEquip = { SLOTS: SLOTS, GEAR_SCALE: GEAR_SCALE, idOf: idOf, ilvlOf: ilvlOf, inst: inst,
    resolve: resolve, slotOf: slotOf, isRelic: isRelic, effectiveStats: effectiveStats,
    equip: equip, unequip: unequip, aggregate: aggregate, equippedRelicSlot: equippedRelicSlot };
  root.GameEquip = GameEquip;
  if (typeof module !== 'undefined' && module.exports) module.exports = GameEquip;
})(typeof window !== 'undefined' ? window : globalThis);
