// GameRNG — deterministic seeded RNG (mulberry32). PURE, no DOM.
// Portability: trivially re-implementable in C#; state is a single uint we
// serialize with the battle/save, so replays + netcode reconcile bit-for-bit.
(function (root) {
    'use strict';

    // Create a generator. `state` is a 32-bit uint; pass a prior state to resume.
    function create(seed) {
        return { s: (seed >>> 0) || 1 };
    }

    // Advance and return a float in [0, 1). Mutates rng.s (the serialized state).
    function next(rng) {
        let t = (rng.s = (rng.s + 0x6D2B79F5) >>> 0);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    // Float in [min, max).
    function range(rng, min, max) { return min + (max - min) * next(rng); }
    // Integer in [min, max] inclusive.
    function int(rng, min, max) { return Math.floor(range(rng, min, max + 1)); }
    // Pick an element from an array deterministically.
    function pick(rng, arr) { return arr[int(rng, 0, arr.length - 1)]; }

    const GameRNG = { create, next, range, int, pick };
    root.GameRNG = GameRNG;
    if (typeof module !== 'undefined' && module.exports) module.exports = GameRNG;
})(typeof window !== 'undefined' ? window : globalThis);
