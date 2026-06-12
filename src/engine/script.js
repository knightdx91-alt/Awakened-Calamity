// GameScript — Fire Red script command interpreter
// Executes scripts from data/scripts/scripts.json
// Supports: msgbox, setflag, clearflag, checkflag, setvar, addvar, goto,
//           call, return, end, giveitem, givecreature, special, encounter,
//           goto_if_set/unset/eq/ne, call_if_set/eq, faceplayer, lock/release
window.GameScript = (function () {
    'use strict';

    let _scriptDb  = null;   // { mapFolder: { label: [instr] } }
    let _dialogueDb = null;  // from dialogue.json — text labels
    let _loading   = false;
    let _loadQueue = [];

    // Runtime state
    const _flags = new Map();   // flagName -> boolean
    const _vars  = new Map();   // varName  -> number

    // Execution stack: each frame = { instructions, pc, returnStack }
    let _callStack = [];
    let _running   = false;
    let _waitingForA = false;   // blocked on msgbox/dialogue
    let _currentMap = null;     // map folder name for lookups

    // --- DB loading ---
    function _loadDbs(cb) {
        if (_scriptDb && _dialogueDb) { cb(); return; }
        let pending = 2;
        function done() { if (--pending === 0) cb(); }

        if (!_scriptDb) {
            _loading = true;
            fetch('data/scripts/scripts.json')
                .then(r => r.ok ? r.json() : {})
                .then(d => { _scriptDb = d; done(); })
                .catch(() => { _scriptDb = {}; done(); });
        } else done();

        if (!_dialogueDb) {
            fetch('data/scripts/dialogue.json')
                .then(r => r.ok ? r.json() : {})
                .then(d => { _dialogueDb = d; done(); })
                .catch(() => { _dialogueDb = {}; done(); });
        } else done();
    }

    // --- Lookup helpers ---
    function _findScript(label) {
        if (!_scriptDb) return null;
        // Try current map folder first
        if (_currentMap && _scriptDb[_currentMap] && _scriptDb[_currentMap][label]) {
            return _scriptDb[_currentMap][label];
        }
        // Search all folders
        for (const folder of Object.keys(_scriptDb)) {
            if (_scriptDb[folder][label]) return _scriptDb[folder][label];
        }
        return null;
    }

    function _findText(label) {
        if (!_dialogueDb) return null;
        if (_currentMap && _dialogueDb[_currentMap] && _dialogueDb[_currentMap][label]) {
            return _dialogueDb[_currentMap][label];
        }
        for (const folder of Object.keys(_dialogueDb)) {
            if (_dialogueDb[folder][label]) return _dialogueDb[folder][label];
        }
        return null;
    }

    // --- Flag / var helpers ---
    function setFlag(name, val) { _flags.set(name, !!val); }
    function getFlag(name)      { return !!_flags.get(name); }
    function setVar(name, val)  { _vars.set(name, Number(val) || 0); }
    function getVar(name)       { return _vars.get(name) || 0; }

    function _resolveVal(token) {
        // Numeric literal
        if (/^[0-9]/.test(token)) return Number(token);
        if (token.startsWith('0x')) return parseInt(token, 16);
        return getVar(token);
    }

    // --- Execution ---
    function _step() {
        if (!_running || _waitingForA || _callStack.length === 0) return;

        const frame = _callStack[_callStack.length - 1];
        if (frame.pc >= frame.instructions.length) {
            _callStack.pop();
            if (_callStack.length === 0) { _running = false; }
            return;
        }

        const instr = frame.instructions[frame.pc++];
        const op    = instr.op;
        const args  = instr.args || [];

        switch (op) {
            case 'end':
                _callStack = [];
                _running = false;
                break;

            case 'return':
                _callStack.pop();
                if (_callStack.length === 0) _running = false;
                break;

            case 'goto': {
                const label = args[0];
                const target = _findScript(label);
                if (target) {
                    _callStack[_callStack.length - 1] = { instructions: target, pc: 0 };
                } else {
                    _callStack.pop();
                    if (!_callStack.length) _running = false;
                }
                break;
            }

            case 'call': {
                const target = _findScript(args[0]);
                if (target) _callStack.push({ instructions: target, pc: 0 });
                break;
            }

            case 'goto_if_set':
                if (getFlag(args[0])) {
                    const t = _findScript(args[1]);
                    if (t) _callStack[_callStack.length-1] = { instructions: t, pc: 0 };
                    else { _callStack.pop(); if (!_callStack.length) _running=false; }
                }
                break;

            case 'goto_if_unset':
                if (!getFlag(args[0])) {
                    const t = _findScript(args[1]);
                    if (t) _callStack[_callStack.length-1] = { instructions: t, pc: 0 };
                    else { _callStack.pop(); if (!_callStack.length) _running=false; }
                }
                break;

            case 'call_if_set':
                if (getFlag(args[0])) {
                    const t = _findScript(args[1]);
                    if (t) _callStack.push({ instructions: t, pc: 0 });
                }
                break;

            case 'call_if_unset':
                if (!getFlag(args[0])) {
                    const t = _findScript(args[1]);
                    if (t) _callStack.push({ instructions: t, pc: 0 });
                }
                break;

            case 'goto_if_eq':
            case 'call_if_eq': {
                const val = _resolveVal(args[0]);
                const cmp = _resolveVal(args[1]);
                const label = args[2];
                if (val === cmp) {
                    const t = _findScript(label);
                    if (t) {
                        if (op === 'call_if_eq') _callStack.push({ instructions: t, pc: 0 });
                        else _callStack[_callStack.length-1] = { instructions: t, pc: 0 };
                    }
                }
                break;
            }

            case 'goto_if_ne': {
                const val = _resolveVal(args[0]);
                const cmp = _resolveVal(args[1]);
                if (val !== cmp) {
                    const t = _findScript(args[2]);
                    if (t) _callStack[_callStack.length-1] = { instructions: t, pc: 0 };
                }
                break;
            }

            case 'goto_if_lt': {
                if (_resolveVal(args[0]) < _resolveVal(args[1])) {
                    const t = _findScript(args[2]);
                    if (t) _callStack[_callStack.length-1] = { instructions: t, pc: 0 };
                }
                break;
            }

            case 'goto_if_ge': {
                if (_resolveVal(args[0]) >= _resolveVal(args[1])) {
                    const t = _findScript(args[2]);
                    if (t) _callStack[_callStack.length-1] = { instructions: t, pc: 0 };
                }
                break;
            }

            case 'setflag':
                setFlag(args[0], true);
                break;

            case 'clearflag':
                setFlag(args[0], false);
                break;

            case 'setvar':
                setVar(args[0], _resolveVal(args[1]));
                break;

            case 'addvar':
                setVar(args[0], getVar(args[0]) + _resolveVal(args[1]));
                break;

            case 'copyvar':
                setVar(args[0], getVar(args[1]));
                break;

            case 'msgbox': {
                const textLabel = args[0];
                const lines = _findText(textLabel);
                if (lines && lines.length && window.GameDialogue) {
                    _waitingForA = true;
                    GameDialogue.show(lines, function onClose() {
                        _waitingForA = false;
                        _pump();
                    });
                }
                break;
            }

            case 'closemessage':
                if (window.GameDialogue) GameDialogue.close();
                break;

            case 'giveitem': {
                const itemId = args[0];
                const qty    = parseInt(args[1]) || 1;
                if (window.GameSave && GameSave.state) {
                    const inv = GameSave.state.inventory;
                    if (inv) {
                        inv.items = inv.items || [];
                        const existing = inv.items.find(i => i.itemId === itemId);
                        if (existing) existing.quantity = (existing.quantity||1) + qty;
                        else inv.items.push({ itemId, quantity: qty });
                        GameSave.markDirty();
                    }
                }
                // Show notification
                if (window.GameDialogue) {
                    _waitingForA = true;
                    GameDialogue.show([`Received ${itemId.replace(/_/g,' ').toLowerCase()}!`], function() {
                        _waitingForA = false; _pump();
                    });
                }
                break;
            }

            case 'givemon': {
                // args: species, level, item (optional)
                const species = args[0];
                const level   = parseInt(args[1]) || 5;
                if (window.GameSave && GameSave.state && GameSave.state.party) {
                    const slot = GameSave.state.party.findIndex(s => !s);
                    if (slot !== -1) {
                        GameSave.state.party[slot] = {
                            speciesId: species,
                            nickname: '',
                            level: level,
                            moves: [null, null, null, null],
                            currentHp: level * 5,
                            maxHp: level * 5,
                            evs: {hp:0,atk:0,def:0,spa:0,spd:0,spe:0},
                            ivs: {hp:15,atk:15,def:15,spa:15,spd:15,spe:15},
                            nature: 'hardy', ability: 0, heldItem: args[2]||null,
                            statusCondition: null, friendship: 70, isShiny: false,
                            exp: 0
                        };
                        GameSave.markDirty();
                    }
                }
                if (window.GameDialogue) {
                    _waitingForA = true;
                    GameDialogue.show([`${species.replace(/_/g,' ')} joined your party!`], function() {
                        _waitingForA = false; _pump();
                    });
                }
                break;
            }

            case 'faceplayer':
            case 'lock': case 'lockall':
            case 'release': case 'releaseall':
            case 'applymovement': case 'waitmovement':
            case 'textcolor': case 'special': case 'specialvar':
            case 'setworldmapflag':
            case 'playse': case 'waitse': case 'playbgm':
            case 'map_script': case 'map_script_2':
                // No-op for now — these need deeper systems
                break;

            default:
                // Unknown op — skip silently
                break;
        }

        // Continue executing unless waiting
        if (_running && !_waitingForA) {
            // Use setTimeout(0) to avoid stack overflow on long scripts
            setTimeout(_pump, 0);
        }
    }

    function _pump() {
        if (_running && !_waitingForA) _step();
    }

    // --- Public API ---

    // Run a named script label in context of the given map name
    function run(mapName, scriptLabel) {
        if (!scriptLabel || scriptLabel === '0x0') return;
        _currentMap = mapName;

        _loadDbs(function () {
            const instructions = _findScript(scriptLabel);
            if (!instructions) {
                // Fall back to dialogue-only
                if (window.GameDialogue) GameDialogue.showScript(mapName, scriptLabel);
                return;
            }
            _callStack = [{ instructions, pc: 0 }];
            _running = true;
            _waitingForA = false;
            _pump();
        });
    }

    // Called by game loop when A is pressed and we're waiting
    function advanceDialogue() {
        if (window.GameDialogue && GameDialogue.isOpen()) {
            return GameDialogue.advance();
        }
        return false;
    }

    function isRunning() { return _running || (window.GameDialogue && GameDialogue.isOpen()); }

    return { run, advanceDialogue, isRunning, setFlag, getFlag, setVar, getVar };
})();
