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

  // ── CRAFTING PROFICIENCY (a skill per discipline) ──────────────────────────
  // Your level in a recipe's discipline sets its SUCCESS chance and CRIT chance.
  // A crit yields a higher-tier item (recipe.critUpgrade) or a MASTERWORK (bonus
  // ilvl). Crafting grants proficiency XP. State: player.crafting[discipline]={level,xp}.
  function _pcfg(cfg) { return (cfg && cfg.proficiency) || {}; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  // The base proficiency a CLASS grants in a discipline (a Smith starts skilled at
  // smithing). cfg.classBonus[classId] = { discipline, level }. Acts as a FLOOR.
  function classBase(player, discipline, cfg) {
    var cid = player && player.class && player.class.id;
    var cb = cid && cfg && cfg.classBonus && cfg.classBonus[cid];
    return (cb && cb.discipline === discipline) ? (cb.level | 0) : 0;
  }
  // Effective proficiency = max(trained level, class floor). cfg optional (for the
  // class bonus); without it, just the trained level.
  function profOf(player, discipline, cfg) {
    var c = (player && player.crafting && player.crafting[discipline]) || null;
    var trained = c ? (c.level | 0) : 0;
    return Math.max(1, trained, classBase(player, discipline, cfg));
  }
  function successChance(level, tier, cfg) {
    var p = _pcfg(cfg);
    return clamp((p.baseSuccess != null ? p.baseSuccess : 0.55) + ((level | 0) - 1) * (p.successPerLevel || 0.035)
      - ((tier | 0) - 1) * (p.tierPenalty || 0.16), p.minSuccess != null ? p.minSuccess : 0.05, p.maxSuccess != null ? p.maxSuccess : 0.99);
  }
  function critChance(level, tier, cfg) {
    var p = _pcfg(cfg);
    return clamp((p.critBase || 0.04) + ((level | 0) - 1) * (p.critPerLevel || 0.016)
      - ((tier | 0) - 1) * (p.critTierPenalty || 0.02), 0, p.maxCrit != null ? p.maxCrit : 0.6);
  }
  // Resolve a craft attempt (pure). rng() in [0,1). Returns the outcome; the caller
  // pays materials, applies refunds, grants the item, and awards proficiency XP.
  //   { success, crit, resultId, resultIlvl, discipline, tier, sChance, cChance }
  function attemptCraft(player, recipe, cfg, rng) {
    rng = rng || Math.random;
    var disc = recipe.discipline || 'smithing', tier = recipe.tier || 1, lvl = profOf(player, disc, cfg);
    var sC = successChance(lvl, tier, cfg), cC = critChance(lvl, tier, cfg);
    // proficiency raises the BASE item-level of everything you forge.
    var baseIlvl = 1 + Math.floor((lvl - 1) * ((_pcfg(cfg).ilvlPerLevel != null ? _pcfg(cfg).ilvlPerLevel : 0.34)));
    var out = { discipline: disc, tier: tier, level: lvl, sChance: sC, cChance: cC, success: false, crit: false, resultId: recipe.id, resultIlvl: baseIlvl };
    if (rng() >= sC) return out;                       // failed craft
    out.success = true;
    if (rng() < cC) {                                  // CRITICAL — a higher-tier item / masterwork
      out.crit = true;
      if (recipe.critUpgrade) out.resultId = recipe.critUpgrade;          // higher-tier item, at base ilvl
      else out.resultIlvl = baseIlvl + ((_pcfg(cfg).masterworkIlvl | 0) || 3); // masterwork: +ilvl
    }
    return out;
  }
  // Award proficiency XP for an attempt; returns { leveled, level } after any level-ups.
  function gainProficiency(player, discipline, success, cfg) {
    var p = _pcfg(cfg); player.crafting = player.crafting || {};
    var c = player.crafting[discipline] || (player.crafting[discipline] = { level: 1, xp: 0 });
    c.xp += success ? (p.xpPerCraft || 12) : (p.xpPerFail || 4);
    var leveled = false, guard = 100, maxL = p.maxLevel || 20;
    while (guard-- > 0 && c.level < maxL) {
      var need = (p.xpBase || 100) + (p.xpPerLevel || 60) * (c.level - 1);
      if (c.xp < need) break;
      c.xp -= need; c.level += 1; leveled = true;
    }
    return { leveled: leveled, level: c.level };
  }
  // Refund a fraction of a cost's materials back to inventory (failed craft).
  function refundMaterials(inv, cost, frac) {
    if (!cost || !cost.materials) return;
    inv.materials = inv.materials || {};
    for (var k in cost.materials) {
      var back = Math.floor((cost.materials[k] | 0) * (frac || 0));
      if (back > 0) inv.materials[k] = (inv.materials[k] | 0) + back;
    }
  }

  var GameCrafting = { upgradeCost: upgradeCost, recipeById: recipeById, recipeCost: recipeCost,
    canPay: canPay, pay: pay, costLine: costLine, matCount: matCount,
    profOf: profOf, successChance: successChance, critChance: critChance,
    attemptCraft: attemptCraft, gainProficiency: gainProficiency, refundMaterials: refundMaterials };
  root.GameCrafting = GameCrafting;
  if (typeof module !== 'undefined' && module.exports) module.exports = GameCrafting;
})(typeof window !== 'undefined' ? window : globalThis);
