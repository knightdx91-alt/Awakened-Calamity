// GameCrafting — the FORGE rules (pure, portable, serializable).
// UPGRADE raises a gear instance's item-level (ilvl) by 1; cost scales with the
// current ilvl and uses the slot's signature material + Credits. RECIPES forge a
// fresh base gear piece from materials. No DOM. Costs are data (crafting.json).
//
//   cost = { materials: { matId: qty }, credits: n }
//   GameCrafting.upgradeCost(slot, ilvl, cfg) -> cost
//   GameCrafting.canPay(inv, money, cost) -> bool
//   GameCrafting.pay(inv, player, cost)   -> deducts materials + credits
//
(function (root) {
  'use strict';

  // cost in materials + Credits to take a `slot` piece from ilvl L to L+1
  function upgradeCost(slot, ilvl, cfg) {
    var u = (cfg && cfg.upgrade) || {}, L = Math.max(1, ilvl | 0);
    var mat = (u.slotMaterial && u.slotMaterial[slot]) || 'scrap_metal';
    var qty = Math.max(1, Math.round((u.baseQty || 2) + (u.qtyPerLevel || 0.6) * (L - 1)));
    var credits = Math.round((u.creditBase || 20) + (u.creditPerLevel || 10) * (L - 1));
    var materials = {}; materials[mat] = qty;
    return { materials: materials, credits: credits };
  }
  function recipeById(cfg, id) { return ((cfg && cfg.recipes) || []).filter(function (r) { return r.id === id; })[0] || null; }
  function recipeCost(recipe) { return { materials: (recipe && recipe.cost) || {}, credits: (recipe && recipe.credits) || 0 }; }

  function matCount(inv, id) { return (inv && inv.materials && (inv.materials[id] | 0)) || 0; }
  function canPay(inv, money, cost) {
    if (!cost) return false;
    if ((cost.credits | 0) > (money | 0)) return false;
    var m = cost.materials || {};
    for (var k in m) if (matCount(inv, k) < (m[k] | 0)) return false;
    return true;
  }
  // Deduct a cost from inventory materials + player credits. Returns true if paid.
  function pay(inv, player, cost) {
    if (!canPay(inv, (player && player.money) || 0, cost)) return false;
    var m = cost.materials || {};
    inv.materials = inv.materials || {};
    for (var k in m) { inv.materials[k] -= (m[k] | 0); if (inv.materials[k] <= 0) delete inv.materials[k]; }
    if (player) player.money = Math.max(0, (player.money || 0) - (cost.credits | 0));
    return true;
  }
  // human-readable cost line, e.g. "5 Scrap Metal · 60 Cr"
  function costLine(cost, nameOf) {
    nameOf = nameOf || function (id) { return id; };
    var parts = [], m = (cost && cost.materials) || {};
    for (var k in m) parts.push(m[k] + ' ' + nameOf(k));
    if (cost && cost.credits) parts.push(cost.credits + ' Cr');
    return parts.join(' · ');
  }

  var GameCrafting = { upgradeCost: upgradeCost, recipeById: recipeById, recipeCost: recipeCost,
    canPay: canPay, pay: pay, costLine: costLine, matCount: matCount };
  root.GameCrafting = GameCrafting;
  if (typeof module !== 'undefined' && module.exports) module.exports = GameCrafting;
})(typeof window !== 'undefined' ? window : globalThis);
