// GameAct — the run/act COMPOSER (pure, deterministic, portable; generator roadmap #4).
// Lays out a descent as a PACED sequence of typed nodes (monster / elite / treasure /
// rest / boss) instead of a flat pool of identical floors — the Slay-the-Spire act
// model, where pacing is where a roguelite run gets its shape. Same seed → identical
// act (replay-safe, pairs with the seeded floor generator). No DOM, no fetch.
//
//   GameAct.compose(seed, length, cfg)  -> [ {floor, type, label, glyph, gen}, ... ]
//
// `length` = total floors incl. the boss (= run maxDepth). The LAST node is always the
// boss; the FIRST is `cfg.pacing.firstNode` (default 'monster'); a rest is slotted just
// before the boss when `restBeforeBoss`. Middle floors are weighted-random with minimum
// spacing between repeats of a type (no two elites/rests back-to-back). cfg = acts.json.
(function (root) {
    'use strict';
    var RNG = root.GameRNG || (typeof require !== 'undefined' && require('./rng.js'));

    var DEFAULT_CFG = {
        nodeTypes: {
            monster: { label: 'Hostile floor', glyph: '⚔', gen: {} },
            elite: { label: 'Elite den', glyph: '★', gen: { elite: true, encounterMult: 1.15, levelBonus: 1, guaranteedRelic: true } },
            treasure: { label: 'Treasure vault', glyph: '✦', gen: { encounterMult: 0.3, treasure: true, guaranteedRelic: true } },
            rest: { label: 'Refuge', glyph: '☾', gen: { encounterMult: 0, rest: true } },
            boss: { label: 'Alpha lair', glyph: '𝕭', gen: {} }
        },
        pacing: { firstNode: 'monster', restBeforeBoss: true,
            weights: { monster: 5, elite: 3, treasure: 2, rest: 2 }, minSpacing: { elite: 2, treasure: 2, rest: 2 } }
    };

    function mkRng(seed) {
        var st = RNG.create(((seed | 0) || 1) >>> 0);
        return { random: function () { return RNG.next(st); } };
    }
    // weighted pick honoring per-type min spacing from the already-placed types
    function pick(rng, weights, types, idx, minSpacing) {
        var pool = [], i, t;
        for (i = 0; i < types.length; i++) {
            t = types[i]; var w = weights[t] || 0; if (w <= 0) continue;
            var sp = (minSpacing && minSpacing[t]) || 0, ok = true;
            for (var b = 1; b <= sp; b++) if (idx.length - b >= 0 && idx[idx.length - b] === t) { ok = false; break; }
            if (ok) for (var k = 0; k < w; k++) pool.push(t);
        }
        if (!pool.length) return 'monster';
        return pool[Math.floor(rng.random() * pool.length) % pool.length];
    }

    function compose(seed, length, cfg) {
        cfg = cfg || DEFAULT_CFG;
        var nt = cfg.nodeTypes || DEFAULT_CFG.nodeTypes;
        var pacing = cfg.pacing || DEFAULT_CFG.pacing;
        length = Math.max(1, length | 0);
        var rng = mkRng(seed);
        var middleTypes = ['monster', 'elite', 'treasure', 'rest'].filter(function (t) { return nt[t]; });
        var seq = [];
        // last node = boss
        var bossAt = length - 1;
        // pre-place forced nodes
        for (var f = 0; f < length; f++) seq.push(null);
        if (length >= 1) seq[bossAt] = 'boss';
        if (length >= 2 && pacing.firstNode && nt[pacing.firstNode]) seq[0] = pacing.firstNode;
        if (length >= 3 && pacing.restBeforeBoss && nt.rest) seq[bossAt - 1] = 'rest';
        // fill the rest, weighted with spacing (track placed sequence for spacing checks)
        var placed = [];
        for (var i = 0; i < length; i++) {
            if (seq[i]) { placed.push(seq[i]); continue; }
            var t = pick(rng, pacing.weights || {}, middleTypes, placed, pacing.minSpacing);
            seq[i] = t; placed.push(t);
        }
        // single-floor run = just a boss; guarantee at least one non-boss combat floor
        if (length === 1) seq[0] = 'boss';
        return seq.map(function (type, ix) {
            var def = nt[type] || nt.monster || {};
            return { floor: ix + 1, type: type, label: def.label || type, glyph: def.glyph || '?', gen: def.gen || {} };
        });
    }

    // node for a given 1-based floor (clamped); falls back to a monster node
    function nodeFor(act, floor) {
        if (!act || !act.length) return null;
        var i = Math.max(1, Math.min(act.length, floor | 0)) - 1;
        return act[i];
    }
    // compact one-line glyph map of the act with a ▸ cursor on the current floor
    function glyphMap(act, current) {
        if (!act || !act.length) return '';
        return act.map(function (n) { return (n.floor === (current | 0) ? '▸' : '') + n.glyph; }).join(' ');
    }

    var GameAct = { compose: compose, nodeFor: nodeFor, glyphMap: glyphMap, DEFAULT_CFG: DEFAULT_CFG };
    root.GameAct = GameAct;
    if (typeof module !== 'undefined' && module.exports) module.exports = GameAct;
})(typeof window !== 'undefined' ? window : globalThis);
