// GameItems — item database access. Loads data/systems/items.json (engine-
// agnostic DATA) and serves lookups to the inventory UI, System Shop, and
// (later) crafting/equipment. Presentation/UI calls these; the data ports as-is.
(function (root) {
    'use strict';

    var _db = null, _promise = null;

    function load() {
        if (_db) return Promise.resolve(_db);
        if (_promise) return _promise;
        _promise = fetch('data/systems/items.json?b=' + (root.__BUILD__ || '0'), { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : {}; })
            .then(function (j) {
                _db = {};
                for (var k in j) { if (k !== '_meta' && j[k]) _db[k] = j[k]; }
                return _db;
            })
            .catch(function () { return (_db = {}); });
        return _promise;
    }

    function ready() { return !!_db; }
    function get(id) { return (_db && _db[id]) || null; }
    function all() { return _db || {}; }
    function name(id) { var it = get(id); return it ? it.name : _pretty(id); }
    function byPocket(pocket) {
        var out = []; var d = _db || {};
        for (var k in d) if (d[k].pocket === pocket) out.push(Object.assign({ id: k }, d[k]));
        return out;
    }
    function shopItems() {
        var out = []; var d = _db || {};
        for (var k in d) if (d[k].shop) out.push(Object.assign({ id: k }, d[k]));
        return out;
    }
    // Is this item consumable from the field (SUPPLIES) menu?
    function fieldUsable(id) {
        var it = get(id); if (!it || !it.use) return false;
        return it.use.type === 'stamina' || it.use.type === 'exposure' || it.use.type === 'cure';
    }
    // Is this item usable in battle, and what does it restore? Returns
    // { hp, mp, sp } (0s if none) or null if not battle-usable.
    function battleRestore(id) {
        var it = get(id); if (!it || !it.use) return null;
        var u = it.use, r = { hp: 0, mp: 0, sp: 0 };
        if (u.type === 'heal') r.hp = u.amount || 0;
        else if (u.type === 'mp') r.mp = u.amount || 0;
        else if (u.type === 'sp' || u.type === 'stamina') r.sp = u.amount || 0;
        else if (u.type === 'restoreAll') { r.hp = u.hp || 9999; r.mp = u.mp || 9999; r.sp = u.sp || 9999; }
        else return null;
        return r;
    }
    function battleUsable(id) { return !!battleRestore(id); }
    function _pretty(id) { return String(id || '').replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); }); }

    root.GameItems = {
        load: load, ready: ready, get: get, all: all, name: name,
        byPocket: byPocket, shopItems: shopItems, fieldUsable: fieldUsable,
        battleUsable: battleUsable, battleRestore: battleRestore
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = root.GameItems;
})(typeof window !== 'undefined' ? window : globalThis);
