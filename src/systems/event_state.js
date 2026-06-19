/* GameEventState — global state for RPG-Maker-style event scripting.
 *
 * Switches (on/off flags), Variables (numbers), and Self-Switches (per-event
 * A/B/C/D flags keyed by map+eventId+letter). Persisted to localStorage so
 * chests stay open, doors stay unlocked, quest stages persist across reloads.
 *
 * Pure-ish data layer (no DOM); the interpreter in main.js reads/writes it.
 */
window.GameEventState = (function () {
    'use strict';
    var KEY = 'ac_event_state';
    var state = { switches: {}, variables: {}, selfSwitches: {} };

    function load() {
        try {
            var d = JSON.parse(localStorage.getItem(KEY) || 'null');
            if (d) { state.switches = d.switches || {}; state.variables = d.variables || {}; state.selfSwitches = d.selfSwitches || {}; }
        } catch (e) { /* fresh */ }
    }
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage off */ }
    }
    function selfKey(map, evId, letter) { return (map || '') + '#' + (evId != null ? evId : '?') + '#' + letter; }

    load();
    return {
        getSwitch:  function (id) { return !!state.switches[id]; },
        setSwitch:  function (id, v) { state.switches[id] = !!v; save(); },
        getVar:     function (id) { return state.variables[id] | 0; },
        setVar:     function (id, v) { state.variables[id] = v | 0; save(); },
        getSelf:    function (map, evId, letter) { return !!state.selfSwitches[selfKey(map, evId, letter)]; },
        setSelf:    function (map, evId, letter, v) { state.selfSwitches[selfKey(map, evId, letter)] = !!v; save(); },
        all:        function () { return state; },
        // Wipe every self-switch belonging to a map (keys are "map#evId#letter").
        // Used to make ephemeral run floors fresh each descent — opened chests
        // refill, and the persisted state never accumulates across runs.
        clearMap:   function (map) {
            var pre = (map || '') + '#', removed = 0;
            for (var k in state.selfSwitches) { if (k.indexOf(pre) === 0) { delete state.selfSwitches[k]; removed++; } }
            if (removed) save();
            return removed;
        },
        clearMaps:  function (maps) {
            var total = 0; (maps || []).forEach(function (m) { total += this.clearMap(m); }, this); return total;
        },
        // Wipe global switches whose id starts with `prefix` (e.g. per-run 'gate_'
        // puzzle switches that must reset each descent).
        clearSwitchPrefix: function (prefix) {
            var n = 0; for (var k in state.switches) { if (k.indexOf(prefix) === 0) { delete state.switches[k]; n++; } }
            if (n) save(); return n;
        },
        reset:      function () { state = { switches: {}, variables: {}, selfSwitches: {} }; save(); }
    };
})();
