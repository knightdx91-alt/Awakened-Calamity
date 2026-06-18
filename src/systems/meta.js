// GameMeta — meta-progression (pure, portable). Spend Memory Fragments on
// permanent unlocks that carry across runs. State: meta.fragments (currency) +
// meta.unlocks (owned node ids). Effects aggregate into run-start boons.
(function (root) {
  'use strict';
  function _nodes(metaDb) { return (metaDb && metaDb.nodes) || []; }
  function owned(meta, id) { return !!(meta && meta.unlocks && meta.unlocks.indexOf(id) >= 0); }
  function node(metaDb, id) { return _nodes(metaDb).find(function (n) { return n.id === id; }); }
  function prereqMet(metaDb, meta, n) { return !n.requires || owned(meta, n.requires); }
  function canAfford(meta, n) { return ((meta && meta.fragments) | 0) >= (n.cost | 0); }

  // purchasable now: not owned, prereq met
  function available(metaDb, meta) {
    return _nodes(metaDb).filter(function (n) { return !owned(meta, n.id) && prereqMet(metaDb, meta, n); });
  }
  function purchase(metaDb, meta, id) {
    var n = node(metaDb, id); if (!n) return { ok: false, reason: 'unknown' };
    if (owned(meta, id)) return { ok: false, reason: 'owned' };
    if (!prereqMet(metaDb, meta, n)) return { ok: false, reason: 'locked' };
    if (!canAfford(meta, n)) return { ok: false, reason: 'cost' };
    meta.fragments = (meta.fragments | 0) - n.cost;
    meta.unlocks = meta.unlocks || []; meta.unlocks.push(id);
    return { ok: true, node: n };
  }
  // aggregate owned effects into the boons a run reads
  function effects(metaDb, meta) {
    var e = { hpMult: 0, fragmentBonus: 0, collectionBonus: 0, untetheredBonus: 0, startItems: [], lore: [] };
    for (var i = 0; i < _nodes(metaDb).length; i++) {
      var n = _nodes(metaDb)[i]; if (!owned(meta, n.id)) continue;
      var ef = n.effect || {};
      if (ef.hpMult) e.hpMult += ef.hpMult;
      if (ef.fragmentBonus) e.fragmentBonus += ef.fragmentBonus;
      if (ef.collectionBonus) e.collectionBonus += ef.collectionBonus;
      if (ef.untetheredBonus) e.untetheredBonus += ef.untetheredBonus;
      if (ef.startItem) e.startItems.push(ef.startItem);
      if (ef.lore) e.lore.push(ef.lore);
    }
    return e;
  }
  var GameMeta = { available: available, owned: owned, node: node, canAfford: canAfford, purchase: purchase, effects: effects };
  root.GameMeta = GameMeta;
  if (typeof module !== 'undefined' && module.exports) module.exports = GameMeta;
})(typeof window !== 'undefined' ? window : globalThis);
