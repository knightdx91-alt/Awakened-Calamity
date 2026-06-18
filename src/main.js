// main.js — entry point, game loop
(function () {
    'use strict';

    // --- Player state ---
    const MOVE_COOLDOWN_MS  = 150;
    const WARP_COOLDOWN_MS  = 400;
    // Encounter roll: 1-in-N chance per step in grass/cave (matches Gen 3 ~10% grass feel)
    const ENCOUNTER_CHANCE  = 0.10;

    const player = {
        x: 7,
        y: 8,
        direction: 'down',
        walkFrame: 0,
        prevX: 7,
        prevY: 8,
        moveStartTime: 0,
        moveDuration: MOVE_COOLDOWN_MS
    };

    let currentRegion = 'awakened';
    let _transitioning   = false;
    let _warpCooldownUntil = 0;
    let lastMoveTime       = 0;
    var _timer = { running: false, remain: 0, endAt: 0 };   // VX Ace Control Timer

    setInterval(function () {
        if (window.GameSave) GameSave.autosave();
    }, 15000);

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    function _snapPlayer() {
        player.prevX = player.x;
        player.prevY = player.y;
        player.moveStartTime = 0;
    }

    /** Tile in the direction the player is facing */
    function _facingTile() {
        const d = player.direction;
        return {
            x: player.x + (d === 'left' ? -1 : d === 'right' ? 1 : 0),
            y: player.y + (d === 'up'   ? -1 : d === 'down'  ? 1 : 0),
        };
    }

    // ---------------------------------------------------------------
    // NPC / sign interaction
    // ---------------------------------------------------------------
    function _interact() {
        const { x, y } = _facingTile();

        // RPG-Maker event in front with an Action-button trigger?
        const ev = _eventAt(x, y);
        if (ev && (!ev.trigger || ev.trigger === 'action') && ev.commands && ev.commands.length) {
            runEvent(ev);
            return;
        }

        // NPC in front?
        const npc = GameMap.getNpcAt(x, y);
        if (npc && npc.script && npc.script !== '0x0') {
            const mapName = GameMap.current && GameMap.current.name;
            GameDialogue.showScript(mapName, npc.script);
            return;
        }

        // Sign in front?
        const sign = GameMap.getSign(x, y);
        if (sign && sign.script && sign.script !== '0x0') {
            const mapName = GameMap.current && GameMap.current.name;
            GameDialogue.showScript(mapName, sign.script);
            return;
        }
    }

    // ---------------------------------------------------------------
    // Wild encounters
    // ---------------------------------------------------------------
    async function _checkEncounter() {
        window._encDbg = 'A';
        if (!window.GameBattle || GameBattle.isActive()) { window._encDbg='B'; return; }
        const mapType = GameMap.current && GameMap.current.map_type;
        const isWild = mapType === 'MAP_TYPE_ROUTE' || mapType === 'MAP_TYPE_UNDERGROUND';
        if (!isWild) { window._encDbg='C:'+mapType; return; }
        window._encDbg = 'D';
        if (Math.random() > ENCOUNTER_CHANCE) return;

        await GameMap.loadEncounterData(currentRegion);
        const entry = GameBattle.rollEncounter(currentRegion);
        window._encDbg = 'E:' + (entry ? entry.species : 'null');
        if (!entry) return;

        _transitioning = true;   // block movement during battle
        GameBattle.start(entry, function (result) {
            _transitioning = false;
            if (result === 'lost') {
                // Soft-reset to Pallet Town / last Pokémon Center (simplified: reload map)
                console.log('[Main] Blacked out!');
            }
        });
    }

    // ---------------------------------------------------------------
    // Transitions
    // ---------------------------------------------------------------
    async function transitionToWarp(warp) {
        if (_transitioning) return;
        _transitioning = true;
        try {
            const resolved = GameMap.resolveWarp(warp);
            if (!resolved) {
                console.warn('[Main] Could not resolve warp:', warp);
                return;
            }
            const { mapName, warpIndex } = resolved;
            console.log(`[Warp] -> ${mapName} (warp ${warpIndex})`);

            await GameMap.load(mapName, currentRegion);
            window._mapName = mapName; window._mapLoaded = true; window._currentMapType = (GameMap.current && GameMap.current.map_type) || "";

            const destWarps = (GameMap.current && GameMap.current.warps) || [];
            let returnWarp  = destWarps[warpIndex] || null;
            if (!returnWarp && destWarps.length > 0) returnWarp = destWarps[0];

            if (returnWarp) {
                const rx = returnWarp.x, ry = returnWarp.y;
                const candidates = [];
                for (let dist = 1; dist <= 4; dist++) {
                    candidates.push([rx, ry - dist]);
                    candidates.push([rx, ry + dist]);
                    candidates.push([rx - dist, ry]);
                    candidates.push([rx + dist, ry]);
                }
                candidates.push([rx, ry]);
                let placed = false;
                for (const [cx, cy] of candidates) {
                    if (GameMap.isWalkable(cx, cy) && !GameMap.getWarp(cx, cy)) {
                        player.x = cx;
                        player.y = cy;
                        placed = true;
                        break;
                    }
                }
                if (!placed) { player.x = rx; player.y = ry; }
                player.direction = 'down';
                player.walkFrame = 0;
            } else {
                player.x = Math.floor(GameMap.width  / 2);
                player.y = Math.floor(GameMap.height / 2);
            }

            player.x = Math.max(0, Math.min(player.x, GameMap.width  - 1));
            player.y = Math.max(0, Math.min(player.y, GameMap.height - 1));
            _snapPlayer();

            GameCamera.update(player.x, player.y, GameMap.width, GameMap.height);
            if (window.GameSave) GameSave.markDirty();
            _warpCooldownUntil = performance.now() + WARP_COOLDOWN_MS;
            GameMap.loadEncounterData(currentRegion);
        } finally {
            _transitioning = false;
        }
    }

    // ── RPG-Maker-style event execution (Transfer Player, Show Text) ──
    function _eventAt(x, y) {
        const evs = (GameMap.current && GameMap.current.events) || [];
        for (const ev of evs) if (ev.x === x && ev.y === y) return ev;
        return null;
    }

    // ── Roaming encounters (Radiant-Mythology style: visible monsters that wander,
    // and CHASE once they spot you within sight range; contact = battle). Each
    // roamer event carries `behavior:{type:'roam', sight, speed}`. Moves are
    // grid-stepped on a per-event cooldown; rendering reads ev.x/ev.y/ev.dir.
    function _losClear(x0, y0, x1, y1) {
        // simple tile walk so monsters don't "see"/chase through walls
        let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, x = x0, y = y0;
        for (let g = 0; g < 64; g++) {
            if (x === x1 && y === y1) return true;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x += sx; }
            if (e2 < dx)  { err += dx; y += sy; }
            if ((x !== x1 || y !== y1) && !GameMap.isWalkable(x, y)) return false;
        }
        return true;
    }
    function _updateRoamers(timestamp) {
        if (_transitioning || _eventRunning) return;
        const evs = (GameMap.current && GameMap.current.events) || [];
        for (const ev of evs) {
            const b = ev.behavior;
            if (!b || b.type !== 'roam') continue;
            if (ev._nextStep && timestamp < ev._nextStep) continue;
            const speed = b.speed || 420, sight = b.sight || 5;
            const dxp = player.x - ev.x, dyp = player.y - ev.y;
            const cheb = Math.max(Math.abs(dxp), Math.abs(dyp));
            // already on the player's tile shouldn't happen; adjacency = contact
            let step = null, chasing = false;
            if (cheb <= sight && _losClear(ev.x, ev.y, player.x, player.y)) {
                chasing = true;
                // step along the dominant axis toward the player
                if (Math.abs(dxp) >= Math.abs(dyp) && dxp !== 0) step = [Math.sign(dxp), 0];
                else if (dyp !== 0) step = [0, Math.sign(dyp)];
                else if (dxp !== 0) step = [Math.sign(dxp), 0];
            } else if (Math.random() < 0.5) {
                const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                step = opts[(Math.random() * 4) | 0];
            }
            ev._nextStep = timestamp + (chasing ? Math.max(160, speed * 0.7) : speed);
            if (!step) continue;
            const nx = ev.x + step[0], ny = ev.y + step[1];
            ev.dir = step[0] < 0 ? 'left' : step[0] > 0 ? 'right' : step[1] < 0 ? 'up' : 'down';
            // walked into the player → contact → battle
            if (nx === player.x && ny === player.y) {
                if (performance.now() >= _warpCooldownUntil && ev.commands && ev.commands.length) runEvent(ev);
                continue;
            }
            if (nx < 0 || ny < 0 || nx >= GameMap.width || ny >= GameMap.height) continue;
            if (!GameMap.isWalkable(nx, ny)) continue;
            if (_eventAt(nx, ny)) continue;            // don't stack on another event
            if (GameMap.getWarp && GameMap.getWarp(nx, ny)) continue;
            ev.x = nx; ev.y = ny;
        }
    }
    async function transitionToEventTransfer(cmd) {
        if (_transitioning || !cmd || !cmd.map) return;
        _transitioning = true;
        try {
            await GameMap.load(cmd.map, currentRegion);
            window._mapName = cmd.map; window._mapLoaded = true;
            window._currentMapType = (GameMap.current && GameMap.current.map_type) || "";
            player.x = Math.max(0, Math.min(cmd.x | 0, GameMap.width - 1));
            player.y = Math.max(0, Math.min(cmd.y | 0, GameMap.height - 1));
            if (cmd.dir && cmd.dir !== 'retain') player.direction = cmd.dir;
            player.walkFrame = 0;
            _snapPlayer();
            GameCamera.update(player.x, player.y, GameMap.width, GameMap.height);
            if (window.GameSave) GameSave.markDirty();
            _warpCooldownUntil = performance.now() + WARP_COOLDOWN_MS;
            GameMap.loadEncounterData(currentRegion);
        } finally {
            _transitioning = false;
        }
    }
    // ── Title / New Game / Continue flow ──
    var DAWNHEARTH_SEED = { x: 8, y: 18 };   // street tile below a door
    function _firstSlotIndex() {
        if (!window.GameSave) return -1;
        var metas = GameSave.getAllSlotMeta();
        for (var i = 0; i < metas.length; i++) if (metas[i]) return i;
        return -1;
    }
    function _firstSlotMeta() {
        var i = _firstSlotIndex();
        return i >= 0 ? GameSave.getAllSlotMeta()[i] : null;
    }
    // Spiral out from (cx,cy) for the first walkable tile.
    function _findWalkable(cx, cy) {
        if (GameMap.isWalkable(cx, cy)) return { x: cx, y: cy };
        for (var r = 1; r < 24; r++) {
            for (var dy = -r; dy <= r; dy++) {
                for (var dx = -r; dx <= r; dx++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // ring only
                    var x = cx + dx, y = cy + dy;
                    if (x < 0 || y < 0 || x >= GameMap.width || y >= GameMap.height) continue;
                    if (GameMap.isWalkable(x, y)) return { x: x, y: y };
                }
            }
        }
        return { x: cx, y: cy };
    }
    // Where to drop the player when no explicit coords are given: the map's `start`
    // field, else an Entrance/StairsUp event, else the map centre. (Generated run
    // floors carry an Entrance event on walkable stairs.)
    function _mapStart() {
        var m = GameMap.current;
        if (m && m.start && m.start.x != null && m.start.y != null) return { x: m.start.x | 0, y: m.start.y | 0 };
        var evs = (m && m.events) || [];
        for (var i = 0; i < evs.length; i++) {
            if (evs[i].name === 'Entrance' || evs[i].name === 'StairsUp') return { x: evs[i].x | 0, y: evs[i].y | 0 };
        }
        return { x: Math.floor(GameMap.width / 2), y: Math.floor(GameMap.height / 2) };
    }
    async function _enterMap(map, region, x, y) {
        currentRegion = region || currentRegion;
        await GameMap.load(map, currentRegion);
        window._mapName = (GameMap.current && GameMap.current.name) || map;
        window._mapLoaded = true;
        window._currentMapType = (GameMap.current && GameMap.current.map_type) || '';
        var px, py;
        if (x != null && y != null) { px = x | 0; py = y | 0; }
        else { var s = _mapStart(); px = s.x; py = s.y; }
        px = Math.max(0, Math.min(px, GameMap.width - 1));
        py = Math.max(0, Math.min(py, GameMap.height - 1));
        // NEVER spawn in a wall: snap to the nearest walkable tile (fixes descents
        // that dropped the player into solid rock at the map centre).
        var w = _findWalkable(px, py);
        player.x = w.x; player.y = w.y; player.prevX = w.x; player.prevY = w.y;
        player.direction = 'down'; player.walkFrame = 0; player.moveStartTime = 0;
        _snapPlayer();
        GameRenderer.setScene(GameMap, GameCamera, player);
        GameCamera.update(player.x, player.y, GameMap.width, GameMap.height);
        GameMap.loadEncounterData(currentRegion);
    }
    async function _continueGame() {
        var slot = _firstSlotIndex();
        if (slot < 0) { _newGame(); return; }
        GameSave.load(slot);
        var loc = (GameSave.state && GameSave.state.currentLocation) || {};
        await _enterMap(loc.mapName || 'Dawnhearth', loc.region || 'awakened', loc.x, loc.y);
        console.log('[Main] Continued slot', slot, '→', window._mapName);
    }
    function _newGame() {
        if (window.GameSave) {
            GameSave.state = GameSave.DEFAULT_SLOT_DATA();
            GameSave.currentSlot = 0;
        }
        var finish = async function () {
            await _enterMap('Dawnhearth', 'awakened', null, null);
            var w = _findWalkable(DAWNHEARTH_SEED.x, DAWNHEARTH_SEED.y);
            player.x = w.x; player.y = w.y; player.prevX = w.x; player.prevY = w.y; _snapPlayer();
            GameCamera.update(player.x, player.y, GameMap.width, GameMap.height);
            if (window.GameSave && GameSave.state) {
                GameSave.state.currentLocation = { region: 'awakened', mapName: 'Dawnhearth', x: w.x, y: w.y };
                if (GameSave.state.meta) GameSave.state.meta.currentMapName = 'Dawnhearth';
                // Kick off the opening quest (scripted beats advance it).
                if (window.GameQuests) { GameSave.state.quests = GameSave.state.quests || {}; GameQuests.start(GameSave.state.quests, 'awakening'); }
                GameSave.save(0, GameSave.state);
            }
            // Cold open: a fresh game starts with clean event state, then flips the
            // `sys_intro` switch — the AUTORUN common event `awakening_intro` plays the
            // System's first words (fully editable in data/systems/common_events.json
            // or the editor, no longer hardcoded here).
            if (window.GameEventState) { GameEventState.reset(); GameEventState.setSwitch('sys_intro', true); }
            console.log('[Main] New game → Dawnhearth at', w.x, w.y);
        };
        if (window.GamePlayerCreation) GamePlayerCreation.start(finish);
        else finish();
    }

    // Compare the running build to the deployed version.txt; if a newer build is
    // live, the client copy is stale → nudge a reload. Saves stay compatible
    // regardless (see GameSave.migrate), so this is purely advisory.
    function _checkForUpdate() {
        var build = window.__BUILD__;
        if (!build || build === '__CACHE_BUST__') return;   // local/dev, not deployed
        fetch('version.txt?t=' + Date.now(), { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.text() : null; })
            .then(function (latest) {
                if (!latest) return;
                latest = latest.trim();
                if (latest && latest !== build && window.GameSystem && GameSystem.notify) {
                    GameSystem.notify('A new version is available. Reload to update.', 'warning');
                }
            })
            .catch(function () {});
    }

    // Lazy class/skill DB for reward commands (grantclass/grantspec/grantskill).
    var _classDbCache = null, _classDbPromise = null;
    function _loadClassDb() {
        if (_classDbCache) return Promise.resolve(_classDbCache);
        if (_classDbPromise) return _classDbPromise;
        var b = '?b=' + (window.__BUILD__ || '0');
        _classDbPromise = Promise.all([
            fetch('data/systems/classes.json' + b, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
            fetch('data/systems/skills.json' + b, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
        ]).then(function (res) { _classDbCache = { classes: res[0] || {}, skills: res[1] || {} }; return _classDbCache; });
        return _classDbPromise;
    }

    var _questDbCache = null, _questDbPromise = null;
    function _loadQuestDb() {
        if (_questDbCache) return Promise.resolve(_questDbCache);
        if (_questDbPromise) return _questDbPromise;
        _questDbPromise = fetch('data/systems/quests.json?b=' + (window.__BUILD__ || '0'), { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : {}; })
            .then(function (j) { _questDbCache = {}; for (var k in j) if (k !== '_meta') _questDbCache[k] = j[k]; return _questDbCache; })
            .catch(function () { return (_questDbCache = {}); });
        return _questDbPromise;
    }

    // ── Event command interpreter (RPG-Maker-style scripting) ──
    var _eventRunning = false;
    var ES = window.GameEventState;
    function _say(text, face) { return new Promise(function (res) { if (window.GameDialogue) GameDialogue.show(String(text || '').split('\n'), res, face ? { face: face } : null); else res(); }); }
    function _wait(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

    // ---- reactive dialogue (GameVoice) ----
    var _voiceCache = {};
    function _loadVoice(id) {
        if (_voiceCache[id] !== undefined) return Promise.resolve(_voiceCache[id]);
        return fetch('data/dialogue/' + id + '.json?b=' + (window.__BUILD__ || '0'), { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) { _voiceCache[id] = j; return j; })
            .catch(function () { _voiceCache[id] = null; return null; });
    }
    function _voiceState(id) {
        var s = window.GameSave && GameSave.state; if (!s) return { meet: 0, said: {} };
        s.voice = s.voice || {}; s.voice[id] = s.voice[id] || { meet: 0, said: {} }; return s.voice[id];
    }
    function _voiceCtx(id) {
        var s = (window.GameSave && GameSave.state) || {}; var vs = _voiceState(id);
        return { quests: s.quests || {}, surveillance: (s.survival && s.survival.surveillance) | 0,
                 meet: vs.meet | 0, said: vs.said || {}, flags: s.flags || {}, map: window._mapName };
    }
    function _voiceRecord(id, picked) {
        var vs = _voiceState(id); vs.meet = (vs.meet | 0) + 1;
        if (picked.once) { vs.said = vs.said || {}; vs.said[picked.id] = true; }
        if (window.GameSave && GameSave.markDirty) GameSave.markDirty();
    }
    function _choose(prompt, options) {
        return new Promise(function (res) {
            var box = document.createElement('div');
            box.style.cssText = 'position:fixed;inset:0;z-index:9998;display:flex;align-items:flex-end;justify-content:center;padding-bottom:9%;';
            var inner = document.createElement('div');
            inner.style.cssText = 'background:#0a0a18;border:2px solid #18b8c8;border-radius:10px;padding:14px 16px;min-width:230px;max-width:82%;color:#cfe;display:flex;flex-direction:column;gap:8px;font-family:monospace;font-size:13px;';
            if (prompt) { var pr = document.createElement('div'); pr.textContent = prompt; pr.style.marginBottom = '4px'; inner.appendChild(pr); }
            (options || []).forEach(function (label, i) {
                var b = document.createElement('button');
                b.textContent = label;
                b.style.cssText = 'background:#16263a;color:#cfe;border:1px solid #18b8c8;border-radius:6px;padding:9px;cursor:pointer;font-family:monospace;text-align:left;';
                b.addEventListener('click', function () { box.remove(); res(i); });
                inner.appendChild(b);
            });
            box.appendChild(inner); document.body.appendChild(box);
        });
    }
    function _evalCond(cond, ctx) {
        if (!cond) return true;
        if (cond.kind === 'quest') {
            var qs = (window.GameSave && GameSave.state && GameSave.state.quests) || {};
            return window.GameQuests ? GameQuests.check(qs, _questDbCache || {}, cond.id, cond.check || 'active', cond.stage) : false;
        }
        if (!ES) return true;
        if (cond.kind === 'switch') return ES.getSwitch(cond.id) === (cond.value !== false);
        if (cond.kind === 'selfswitch') return ES.getSelf(ctx.mapName, ctx.evId, cond.letter || 'A') === (cond.value !== false);
        if (cond.kind === 'variable') {
            var v = ES.getVar(cond.id), t = cond.value | 0;
            switch (cond.op) { case '>=': return v >= t; case '<=': return v <= t; case '>': return v > t; case '<': return v < t; case '!=': return v !== t; default: return v === t; }
        }
        if (cond.kind === 'timer') {
            var rem = _timer.running ? Math.max(0, Math.ceil((_timer.endAt - performance.now()) / 1000)) : 0;
            var tt = cond.value | 0;
            switch (cond.op) { case '>=': return rem >= tt; case '>': return rem > tt; case '<': return rem < tt; default: return rem <= tt; }
        }
        return true;
    }
    function _runScript(code, ctx) {
        var api = ES ? {
            getSwitch: ES.getSwitch, setSwitch: ES.setSwitch, getVar: ES.getVar, setVar: ES.setVar,
            getSelf: function (l) { return ES.getSelf(ctx.mapName, ctx.evId, l || 'A'); },
            setSelf: function (l, v) { ES.setSelf(ctx.mapName, ctx.evId, l || 'A', v); },
            say: _say, transfer: transitionToEventTransfer, player: player, map: GameMap, event: ctx.event
        } : {};
        try { (new Function('$', code)).call(null, api); } catch (e) { console.warn('[Event script]', e); }
    }
    // Resolve a command target: 'player' | 'this' (the running event) | event id.
    function _eventById(id) {
        var evs = (GameMap.current && GameMap.current.events) || [];
        for (var i = 0; i < evs.length; i++) if (evs[i].id === id) return evs[i];
        return null;
    }
    function _resolveTarget(c, ctx) {
        var t = c.target;
        if (t == null || t === 'this') return ctx.event;
        if (t === 'player') return player;
        return _eventById(t | 0);
    }
    var _DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    // Walk a target along a list of steps ('up'/'down'/'left'/'right'/'wait').
    async function _moveRoute(t, steps, isPlayer) {
        if (!t || !steps || !steps.length) return;
        for (var i = 0; i < steps.length; i++) {
            if (steps[i] === 'wait') { await _wait(MOVE_COOLDOWN_MS); continue; }
            var d = _DELTA[steps[i]];
            if (!d) continue;
            if (isPlayer) {
                player.direction = steps[i];
                var nx = player.x + d[0], ny = player.y + d[1];
                if (nx >= 0 && ny >= 0 && nx < GameMap.width && ny < GameMap.height && GameMap.isWalkable(nx, ny)) {
                    player.prevX = player.x; player.prevY = player.y;
                    player.x = nx; player.y = ny;
                    player.moveStartTime = performance.now(); player.moveDuration = MOVE_COOLDOWN_MS;
                    player.walkFrame = player.walkFrame === 1 ? 2 : 1;
                    if (window.GameSave) GameSave.markDirty();
                }
            } else {
                t.dir = steps[i];
                var ex = t.x + d[0], ey = t.y + d[1];
                if (ex >= 0 && ey >= 0 && ex < GameMap.width && ey < GameMap.height && GameMap.isWalkable(ex, ey)) { t.x = ex; t.y = ey; }
            }
            await _wait(MOVE_COOLDOWN_MS);
        }
        if (isPlayer) player.walkFrame = 0;
    }
    // Screen fade: mode 'out' (to color) or 'in' (back to clear).
    function _fade(c) {
        return new Promise(function (res) {
            var ms = (((c.frames | 0) || 30)) * 16, mode = c.mode || 'out';
            var d = document.getElementById('ac-fade');
            if (!d) { d = document.createElement('div'); d.id = 'ac-fade'; d.style.cssText = 'position:fixed;inset:0;z-index:8000;pointer-events:none;'; document.body.appendChild(d); }
            d.style.background = c.color || '#000';
            d.style.transition = 'none';
            d.style.opacity = (mode === 'out') ? '0' : '1';
            void d.offsetWidth; // force reflow so the transition runs
            d.style.transition = 'opacity ' + ms + 'ms linear';
            d.style.opacity = (mode === 'out') ? '1' : '0';
            setTimeout(res, ms);
        });
    }
    // Screen shake the game canvas.
    function _shake(c) {
        return new Promise(function (res) {
            var elx = document.getElementById('canvas-primary') || document.body;
            var power = (c.power | 0) || 5, ms = (((c.frames | 0) || 30)) * 16, start = performance.now();
            (function tick() {
                var t = performance.now() - start;
                if (t >= ms) { elx.style.transform = ''; res(); return; }
                elx.style.transform = 'translateX(' + ((Math.random() * 2 - 1) * power).toFixed(1) + 'px)';
                requestAnimationFrame(tick);
            })();
        });
    }
    // ── Input Number: a numeric prompt that stores into a variable. ──
    function _inputNumber(prompt, digits, initial) {
        return new Promise(function (res) {
            var box = document.createElement('div');
            box.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';
            var inner = document.createElement('div');
            inner.style.cssText = 'background:#0a0e1a;border:2px solid #00ccff;border-radius:8px;padding:16px;min-width:200px;text-align:center;color:#cfe;font:10px "Press Start 2P",monospace;';
            var lbl = document.createElement('div'); lbl.textContent = prompt; lbl.style.cssText = 'margin-bottom:12px;line-height:1.5;';
            var inp = document.createElement('input');
            inp.type = 'number'; inp.value = String(initial | 0);
            inp.max = String(Math.pow(10, digits) - 1); inp.min = '0';
            inp.style.cssText = 'width:100%;font:12px monospace;padding:6px;text-align:center;background:#04111c;color:#7fe0ff;border:1px solid #2a4656;border-radius:4px;';
            var ok = document.createElement('button'); ok.textContent = 'OK';
            ok.style.cssText = 'margin-top:12px;font:9px "Press Start 2P",monospace;padding:6px 14px;background:#00ccff;color:#001;border:0;border-radius:4px;cursor:pointer;';
            function done() { var v = Math.max(0, Math.min(Math.pow(10, digits) - 1, parseInt(inp.value, 10) || 0)); box.remove(); res(v); }
            ok.addEventListener('click', done);
            inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') done(); });
            inner.appendChild(lbl); inner.appendChild(inp); inner.appendChild(ok); box.appendChild(inner); document.body.appendChild(box);
            inp.focus(); inp.select();
        });
    }

    // ── Common Events: reusable command lists called by id (data/systems/common_events.json). ──
    var _commonDb = null;
    function _loadCommonDb() {
        if (_commonDb) return Promise.resolve(_commonDb);
        return fetch('data/systems/common_events.json?b=' + (window.__BUILD__ || '0'), { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { return (_commonDb = j || {}); })
            .catch(function () { return (_commonDb = {}); });
    }
    async function _callCommonEvent(id, ctx) {
        await _loadCommonDb();
        var ce = _commonDb[id] || (_commonDb.events && _commonDb.events[id]);
        if (!ce || !ce.commands) { console.warn('[CommonEvent] not found:', id); return; }
        // Run in the CALLER's context (shares its event/self-switch scope), but a
        // Break/Exit inside the common event must not leak out past the call.
        var sub = { mapName: ctx.mapName, evId: ctx.evId, event: ctx.event, exited: false, _break: false };
        await runCmdList(ce.commands, sub);
        if (sub.exited) ctx.exited = true;   // Exit Event propagates; Break does not
    }

    // ── Auto/parallel common-event triggers (VX Ace) ──────────────────────────
    // A common event with trigger:'autorun' runs BLOCKING (pauses the player, like a
    // cutscene) while its `switch` is ON — it usually turns the switch off to stop.
    // trigger:'parallel' runs CONCURRENTLY (non-blocking) while its switch is ON.
    // Switch omitted = always on. Pumped each free-roam frame from the game loop.
    var _parallelRunning = {};
    function _ceSwitchOn(ce) { return !ce.switch || (ES && ES.getSwitch(ce.switch)); }
    async function _runCommonAuto(id, ce) {
        _eventRunning = true;
        try { await runCmdList(ce.commands || [], { mapName: GameMap.current && GameMap.current.name, evId: 'ce:' + id, event: null, exited: false, _break: false }); }
        catch (e) { console.warn('[Autorun]', id, e); }
        finally { _eventRunning = false; }
    }
    async function _runCommonParallel(id, ce) {
        _parallelRunning[id] = true;
        try { await runCmdList(ce.commands || [], { mapName: GameMap.current && GameMap.current.name, evId: 'ce:' + id, event: null, exited: false, _break: false }); }
        catch (e) { console.warn('[Parallel]', id, e); }
        finally { _parallelRunning[id] = false; }
    }
    function _pumpCommonEvents() {
        if (!_commonDb) { _loadCommonDb(); return; }   // first frame kicks the load
        for (var id in _commonDb) {
            if (id === '_meta') continue;
            var ce = _commonDb[id]; if (!ce || !ce.trigger) continue;
            if (ce.trigger === 'autorun') {
                // one autorun at a time; only in free-roam (not mid-event/transition)
                if (!_eventRunning && !_transitioning && _ceSwitchOn(ce)) { _runCommonAuto(id, ce); return; }
            } else if (ce.trigger === 'parallel') {
                if (_ceSwitchOn(ce) && !_parallelRunning[id]) _runCommonParallel(id, ce);
            }
        }
    }

    // ── Screen tint: a persistent colored overlay (cleared by tinting to transparent). ──
    function _tint(color, frames) {
        var d = document.getElementById('ac-tint');
        if (!d) { d = document.createElement('div'); d.id = 'ac-tint'; d.style.cssText = 'position:fixed;inset:0;z-index:7500;pointer-events:none;opacity:1;transition:background ' + (frames * 16) + 'ms linear;'; document.body.appendChild(d); }
        d.style.transition = 'background ' + (frames * 16) + 'ms linear';
        d.style.background = color;
    }
    // ── Flash: a quick full-screen color pulse that fades out. ──
    function _flash(color, frames) {
        return new Promise(function (res) {
            var d = document.createElement('div');
            d.style.cssText = 'position:fixed;inset:0;z-index:7600;pointer-events:none;background:' + color + ';opacity:0.85;transition:opacity ' + (frames * 16) + 'ms ease-out;';
            document.body.appendChild(d);
            void d.offsetWidth; d.style.opacity = '0';
            setTimeout(function () { d.remove(); res(); }, frames * 16);
        });
    }
    // ── Scroll Map: pan the camera by N tiles, then restore player-follow. ──
    function _scrollMap(dir, distance, frames) {
        return new Promise(function (res) {
            if (!window.GameCamera) { res(); return; }
            var dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
            var dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
            var steps = Math.max(1, distance), i = 0;
            var baseX = player.x, baseY = player.y;
            _camScroll = { x: 0, y: 0 };
            (function tick() {
                i++;
                _camScroll.x = dx * distance * (i / (frames || 30));
                _camScroll.y = dy * distance * (i / (frames || 30));
                GameCamera.update(baseX + _camScroll.x, baseY + _camScroll.y, GameMap.width, GameMap.height);
                if (i >= (frames || 30)) { _camScroll = null; GameCamera.update(player.x, player.y, GameMap.width, GameMap.height); res(); return; }
                requestAnimationFrame(tick);
            })();
        });
    }
    var _camScroll = null;
    // Tile → on-screen position (% of the game-screen element), via the camera.
    // Centers the cue on the tile; works at any zoom/orientation.
    function _tileScreenPct(tx, ty) {
        var vw = GameCamera.viewportW || 15, vh = GameCamera.viewportH || 13;
        return { left: ((tx - GameCamera.x + 0.5) / vw) * 100, top: ((ty - GameCamera.y + 0.5) / vh) * 100 };
    }
    // ── Balloon icon: the real RTP Balloon.png (8 frames × 10 emotes, 32px cells),
    // animated over the player or an event's head. ──
    var _BALLOON_ROW = { exclaim: 0, question: 1, music: 2, heart: 3, anger: 4, sweat: 5, cobweb: 6, silence: 7, idea: 8, sleep: 9 };
    function _balloon(target, kind, wait) {
        return new Promise(function (res) {
            var scr = document.getElementById('screen-primary') || document.body;
            var tx = (target && target.x != null) ? target.x : player.x;
            var ty = (target && target.y != null) ? target.y : player.y;
            var pos = _tileScreenPct(tx, ty);
            var row = _BALLOON_ROW[kind] != null ? _BALLOON_ROW[kind] : 0;
            var sz = Math.max(20, (scr.clientWidth / (GameCamera.viewportW || 15)) * 1.1); // ~1 tile
            var d = document.createElement('div');
            d.style.cssText = 'position:absolute;z-index:7700;pointer-events:none;width:' + sz + 'px;height:' + sz + 'px;' +
                'background-image:url(data/system/Balloon.png);background-repeat:no-repeat;image-rendering:pixelated;' +
                'background-size:' + (sz * 8) + 'px ' + (sz * 10) + 'px;' +
                'left:' + pos.left + '%;top:' + pos.top + '%;transform:translate(-50%,-150%);';
            scr.appendChild(d);
            var frame = 0;
            var iv = setInterval(function () {
                // 8 frames: a couple of intro frames, then the held icon
                d.style.backgroundPosition = '-' + (frame * sz) + 'px -' + (row * sz) + 'px';
                frame++;
                if (frame >= 8) { clearInterval(iv); setTimeout(function () { d.remove(); if (wait) res(); }, 250); }
            }, 90);
            if (!wait) res();
        });
    }
    // ── Show Animation: flipbook the cells of an RTP animation sheet over a target.
    // (RTP ships only the sheets, not RM's frame-timing data, so we play the cells in
    // sequence — a faithful-enough hit/cast effect. An optional per-anim frames JSON
    // could drive exact timing later.) ──
    var _animDb = null;
    function _loadAnimDb() {
        if (_animDb) return Promise.resolve(_animDb);
        return fetch('data/animations/rtp_animations_index.json?b=' + (window.__BUILD__ || '0'), { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : { animations: [] }; })
            .then(function (j) { _animDb = {}; (j.animations || []).forEach(function (a) { _animDb[a.id] = a; }); return _animDb; })
            .catch(function () { return (_animDb = {}); });
    }
    async function _animation(target, id, wait) {
        await _loadAnimDb();
        var a = _animDb[id];
        if (!a) { console.warn('[Animation] not found:', id); return; }
        return new Promise(function (res) {
            var scr = document.getElementById('screen-primary') || document.body;
            var tx = (target && target.x != null) ? target.x : player.x;
            var ty = (target && target.y != null) ? target.y : player.y;
            var pos = _tileScreenPct(tx, ty);
            var sz = Math.max(48, (scr.clientWidth / (GameCamera.viewportW || 15)) * 2); // ~2 tiles
            var d = document.createElement('div');
            d.style.cssText = 'position:absolute;z-index:7750;pointer-events:none;width:' + sz + 'px;height:' + sz + 'px;' +
                'background-image:url(data/animations/' + a.id + '.png);background-repeat:no-repeat;image-rendering:pixelated;' +
                'background-size:' + (sz * a.cols) + 'px ' + (sz * a.rows) + 'px;' +
                'left:' + pos.left + '%;top:' + pos.top + '%;transform:translate(-50%,-50%);';
            scr.appendChild(d);
            var n = a.cells || (a.cols * a.rows), frame = 0;
            var iv = setInterval(function () {
                if (frame >= n) { clearInterval(iv); d.remove(); if (wait) res(); return; }
                var cx = frame % a.cols, cy = (frame / a.cols) | 0;
                d.style.backgroundPosition = '-' + (cx * sz) + 'px -' + (cy * sz) + 'px';
                frame++;
            }, 55);
            if (!wait) res();
        });
    }
    // ── Scrolling Text: full-screen credits-style text that scrolls up. ──
    function _scrollText(text, frames) {
        return new Promise(function (res) {
            var box = document.createElement('div');
            box.style.cssText = 'position:fixed;inset:0;z-index:8200;background:#000;color:#cfe;overflow:hidden;font:10px "Press Start 2P",monospace;line-height:2;text-align:center;';
            var inner = document.createElement('div');
            inner.style.cssText = 'position:absolute;width:100%;top:100%;padding:0 16px;white-space:pre-wrap;transition:top ' + (frames * 16) + 'ms linear;';
            inner.textContent = text;
            box.appendChild(inner); document.body.appendChild(box);
            box.addEventListener('click', function () { box.remove(); res(); });
            void inner.offsetWidth; inner.style.top = '-' + (inner.scrollHeight + 40) + 'px';
            setTimeout(function () { if (box.parentNode) box.remove(); res(); }, frames * 16 + 200);
        });
    }
    // ── Get Location Info: read map data at a tile into a number. ──
    function _locationInfo(x, y, info) {
        if (!GameMap.current) return 0;
        if (info === 'walkable') return GameMap.isWalkable(x, y) ? 1 : 0;
        if (info === 'region') {
            var L = GameMap.current.layout || GameMap.current;
            var regs = (GameMap.current.region_ids) || (L && L.region_ids);
            return regs ? (regs[y * GameMap.width + x] | 0) : 0;
        }
        if (info === 'event') { var e = _eventAt(x, y); return e ? (e.id | 0) : 0; }
        // default: collision byte (1 = solid)
        return GameMap.isWalkable(x, y) ? 0 : 1;
    }

    // Battle processing — start a combat and resolve when it ends.
    async function _battle(c) {
        var empty = { winner: null, surveillance: 0 };
        if (!window.GameCombatView || !GameCombatView.start) return empty;
        var opts = {};
        if (c.enemies && c.enemies.length) opts.enemies = c.enemies;
        // tethered run -> tell combat how much Surveillance budget remains before
        // the System collects you mid-fight (no more infinite saves / stalemate).
        var st = window.GameSave && GameSave.state;
        if (st && window.GameRun && GameRun.active(st.run) && st.run.tethered !== false) {
            await _loadCorrupt(); await _loadMetaDb(); await _loadRelicsDb();
            var thr = (_corruptDb.collectionThreshold | 0) + (_metaEffects().collectionBonus | 0) + (_relicEffects().collectionBonus | 0);
            opts.collectBudget = Math.max(15, thr - (st.run.surveillance | 0));
        }
        return new Promise(function (res) {
            opts.onEnd = function (r) { res(r || empty); };
            GameCombatView.start(opts);
            if (!GameCombatView.isActive()) res(empty);
        });
    }

    // ---- run loop (GameRun) ----
    var _runDb = null, _corruptDb = null;
    function _loadRunDb() {
        if (_runDb) return Promise.resolve(_runDb);
        return fetch('data/systems/run.json?b=' + (window.__BUILD__ || '0'), { cache: 'no-cache' })
            .then(function (r) { return r.json(); }).then(function (j) { return (_runDb = j); })
            .catch(function () { return (_runDb = { maxDepth: 4, floorPool: [], bossPool: [] }); });
    }
    function _loadCorrupt() {
        if (_corruptDb) return Promise.resolve(_corruptDb);
        return fetch('data/systems/corruption.json?b=' + (window.__BUILD__ || '0'), { cache: 'no-cache' })
            .then(function (r) { return r.json(); }).then(function (j) { return (window._corruptDb = _corruptDb = j); })
            .catch(function () { return (window._corruptDb = _corruptDb = { collectionThreshold: 240 }); });
    }
    var _relicsDb = null;
    function _loadRelicsDb() {
        if (_relicsDb) return Promise.resolve(_relicsDb);
        return fetch('data/systems/relics.json?b=' + (window.__BUILD__ || '0'), { cache: 'no-cache' })
            .then(function (r) { return r.json(); }).then(function (j) { return (window._relicsDb = _relicsDb = j); })
            .catch(function () { return (window._relicsDb = _relicsDb = { relics: [], weights: {} }); });
    }
    function _relicEffects() {
        var st = window.GameSave && GameSave.state;
        if (!window.GameRelics || !_relicsDb || !st || !st.run) return { survPerSaveMult: 0, collectionBonus: 0 };
        return GameRelics.effects(_relicsDb, st.run);
    }
    function _loadMetaDb() {
        if (window._metaDb) return Promise.resolve(window._metaDb);
        return fetch('data/systems/meta.json?b=' + (window.__BUILD__ || '0'), { cache: 'no-cache' })
            .then(function (r) { return r.json(); }).then(function (j) { return (window._metaDb = j); })
            .catch(function () { return (window._metaDb = { nodes: [] }); });
    }
    function _metaEffects() {
        var st = window.GameSave && GameSave.state;
        if (!window.GameMeta || !window._metaDb || !st || !st.meta) return { hpMult: 0, fragmentBonus: 0, collectionBonus: 0, untetheredBonus: 0, startItems: [], lore: [] };
        return GameMeta.effects(window._metaDb, st.meta);
    }
    // after each battle, a run reacts: accrue Surveillance -> maybe COLLECTED; defeat -> died.
    async function _runReact(result) {
        var st = window.GameSave && GameSave.state;
        if (!st || !window.GameRun || !GameRun.active(st.run)) return;
        await _loadCorrupt(); await _loadRelicsDb();
        var rel = _relicEffects();
        var threshold = (_corruptDb.collectionThreshold | 0) + (_metaEffects().collectionBonus | 0) + (rel.collectionBonus | 0);
        // relics like Faraday Cage reduce the Surveillance each fight added (mostly saves)
        var gained = Math.round(((result && result.surveillance) | 0) * (1 + (rel.survPerSaveMult || 0)));
        var col = GameRun.addSurveillance(st.run, Math.max(0, gained), threshold);
        if (GameSave.markDirty) GameSave.markDirty();
        if (result && result.collected) { await _endRun('collected'); return; }  // taken mid-fight
        if (result && result.winner === 'enemy') { await _endRun('died'); return; }
        if (col.collected) { await _endRun('collected'); return; }
    }
    // Run floors are EPHEMERAL: their per-floor event state (opened chests, etc.)
    // must not persist across descents, or chests won't refill and localStorage
    // grows unbounded. Wipe the whole run pool's self-switches at run boundaries.
    // (The map JSON itself is re-fetched fresh each visit and only one is held in
    // memory, so there's nothing else to free.)
    function _purgeRunFloors() {
        if (!ES || !ES.clearMaps || !_runDb) return;
        var pool = (_runDb.floorPool || []).concat(_runDb.bossPool || []);
        var n = ES.clearMaps(pool);
        if (n) console.log('[Run] purged ephemeral floor state for', pool.length, 'maps (', n, 'self-switches )');
    }
    function _grantStartItems() {
        var st = GameSave.state, me = _metaEffects();
        if (!st || !me.startItems.length) return;
        st.inventory = st.inventory || {};
        me.startItems.forEach(function (it) {
            var pk = 'items'; st.inventory[pk] = st.inventory[pk] || {};
            st.inventory[pk][it.id] = (st.inventory[pk][it.id] || 0) + (it.qty || 1);
        });
    }
    // The Remembrance interface: spend Memory Fragments on permanent unlocks.
    async function _metaMenu() {
        await _loadMetaDb();
        var st = GameSave.state; st.meta = st.meta || { fragments: 0, unlocks: [] };
        st.meta.unlocks = st.meta.unlocks || [];
        while (true) {
            var avail = GameMeta.available(window._metaDb, st.meta);
            await _say('Memory Fragments: ' + (st.meta.fragments | 0) + '   ·   Remembered: ' + (st.meta.unlocks.length));
            if (!avail.length) { await _say('Nothing more surfaces — for now.'); break; }
            var labels = avail.map(function (n) { return n.name + ' (' + n.cost + ')' + (GameMeta.canAfford(st.meta, n) ? '' : ' — locked'); });
            labels.push('Leave');
            var idx = await _choose('Recover which memory?', labels);
            if (idx < 0 || idx >= avail.length) break;
            var node = avail[idx];
            var res = GameMeta.purchase(window._metaDb, st.meta, node.id);
            if (res.ok) {
                if (GameSave.markDirty) GameSave.markDirty();
                await _say('Recovered: ' + node.name + '.\n' + node.desc);
                // lore unlocks reveal a buried memory of the cycle (the loop's hook)
                if (node.reveal) await _say(_subTokens(node.reveal));
            }
            else await _say(res.reason === 'cost' ? 'Not enough fragments yet.' : 'You cannot recover that yet.');
        }
        if (GameSave.save) GameSave.save(GameSave.currentSlot || 0, st);
    }

    // Relic reward: offer a choice of N rolled relics (default 3); the pick is
    // added to the current run. c.count = how many offered; c.guaranteed = relic id
    // to grant outright (boss drops). Roll is seeded by run.seed for reproducibility.
    async function _grantRelic(c) {
        var st = GameSave.state;
        if (!window.GameRun || !st || !GameRun.active(st.run)) { await _say('A relic glimmers — but only the descent reveals its worth.'); return; }
        await _loadRelicsDb();
        st.run.relics = st.run.relics || [];
        if (c && c.guaranteed) {
            var g = GameRelics.grant(st.run, _relicsDb, c.guaranteed);
            if (g) { if (GameSave.markDirty) GameSave.markDirty(); await _say('RELIC — ' + g.name + '\n' + g.desc); }
            return;
        }
        var n = (c && c.count) || 3;
        // deterministic per-encounter roll: run seed + a per-run pickup counter
        st.run._relicRolls = (st.run._relicRolls | 0) + 1;
        var seed = ((st.run.seed >>> 0) + st.run._relicRolls * 2654435761) >>> 0;
        var rng = (function (s) { return function () { s |= 0; s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })(seed);
        var choices = GameRelics.roll(_relicsDb, rng, n, st.run.relics);
        if (!choices.length) { await _say('Nothing here you do not already carry.'); return; }
        await _say('A cache hums with System residue — choose one to carry.');
        var labels = choices.map(function (r) { return r.name + ' [' + r.tier + '] — ' + r.desc; });
        labels.push('Leave it');
        var idx = await _choose('Take which relic?', labels);
        if (idx < 0 || idx >= choices.length) { await _say('You leave the cache untouched.'); return; }
        var got = GameRelics.grant(st.run, _relicsDb, choices[idx].id);
        if (got) { if (GameSave.markDirty) GameSave.markDirty(); await _say('RELIC — ' + got.name + '\n' + got.desc); }
    }

    async function _endRun(reason) {
        var st = GameSave.state; if (!window.GameRun || !st) return;
        var unteth = st.run && st.run.tethered === false;
        var firstRun = ((st.meta && st.meta.runs) | 0) === 0;   // capture BEFORE end() increments it
        var r = GameRun.end(st.run, st.meta || (st.meta = {}), reason);
        // FIRST DESCENT — the pivotal beat: death is not a game-over, it is the cycle
        // revealing itself. Teach the Intervention dilemma's stakes the first time, framed
        // by how you went down (tethered = the System "kept" you; untethered = the dark
        // took you, yet you woke anyway). One-time, then normal returns take over.
        if (firstRun) {
            // The pivotal first-descent beat lives in EDITABLE common events; the
            // engine only picks which one by how the run ended.
            var ceId = reason === 'cleared' ? 'first_descent_cleared'
                : unteth ? 'first_descent_untethered' : 'first_descent_tethered';
            await _callCommonEvent(ceId, { mapName: (GameMap.current && GameMap.current.name) || '', evId: 'endrun', event: null });
        }
        // meta boons: bonus fragments per run (+ untethered bonus)
        await _loadMetaDb();
        var me = _metaEffects();
        var bonus = (me.fragmentBonus | 0) + (unteth ? (me.untetheredBonus | 0) : 0);
        if (bonus) { st.meta.fragments = (st.meta.fragments | 0) + bonus; r.summary.fragments += bonus; r.summary.totalFragments += bonus; }
        var msg = reason === 'cleared' ? 'You break the surface — alive, and still yourself. The descent is cleared.'
            : reason === 'collected' ? 'SYSTEM: Surveillance threshold exceeded. You are reclaimed, [designation].\nYou wake in Dawnhearth. You remember a little more.'
            : unteth ? 'Untethered, you fall — and no hand catches you. The dark takes the run.\nYet you wake in Dawnhearth, clean, remembering more than you should.'
            : 'You fall in the dark. The System pulls you back up — you wake in Dawnhearth, remembering a little more.';
        await _say(_subTokens(msg));
        await _say('Memory fragments +' + r.summary.fragments + '  (total ' + r.summary.totalFragments + ' · deepest floor ' + (st.meta.deepest | 0) + ')');
        // ENDING GATES: on a CLEAR, the System delivers its verdict — which of the
        // four endings remain reachable, gated by your LIFETIME Surveillance. Clean
        // (untethered / low-Surveillance) play keeps the true way out open; leaning on
        // the System closes it, tilting you toward SUBMIT. This is the roguelite
        // foreshadow of the Act-IV finale; the gates are GameCorruption.endingsOpen.
        if (reason === 'cleared' && window.GameCorruption) {
            await _loadCorrupt();
            var lifeSurv = (st.meta.lifetimeSurveillance | 0);
            var open = GameCorruption.endingsOpen(_corruptDb, lifeSurv);
            var verdict = open['true']
                ? 'SYSTEM: …anomaly. Your record is too clean to read. Something in you still remembers a way OUT. (The true ending remains open.)'
                : open.good
                ? 'SYSTEM: Compliance acceptable, [designation]. You are still mostly yourself — for now. (A good ending is still reachable; the true one has slipped away.)'
                : 'SYSTEM: You lean on me so sweetly now. Soon there will be nothing left to reclaim. The cycle will keep you. (Only SUBMIT remains.)';
            await _say(_subTokens(verdict + '\n[Lifetime Surveillance ' + lifeSurv + ']'));
            st.meta.endingTier = open['true'] ? 'true' : open.good ? 'good' : 'submit';
        }
        // opening tutorial: the FIRST descent's return reveals the cycle (advance the
        // quest). The narration is in the first_descent_* common events above; here we
        // only advance the quest stage so Mira (stage 3) gives the next editable beat.
        if (window.GameQuests && st.quests && GameQuests.status(st.quests, 'awakening') === 'active'
            && GameQuests.stageIndex(st.quests, 'awakening') === 2) {
            GameQuests.setStage(st.quests, _questDbCache || {}, 'awakening', 3);
        }
        _purgeRunFloors();                                 // leaving the descent: drop all floor state
        var w = _findWalkable(DAWNHEARTH_SEED.x, DAWNHEARTH_SEED.y);
        await _enterMap('Dawnhearth', 'awakened', w.x, w.y);
        st.currentLocation = { region: 'awakened', mapName: 'Dawnhearth', x: w.x, y: w.y };
        if (GameSave.save) GameSave.save(GameSave.currentSlot || 0, st);
    }

    async function runCmdList(list, ctx) {
        var i = 0;
        while (i < list.length) {
            if (ctx.exited || ctx._break) return;   // Exit Event / Break Loop stop this list
            var c = list[i];
            if (c.type === 'label') { i++; continue; }
            await runCmd(c, ctx);
            if (ctx._jumpTo != null) {
                var target = ctx._jumpTo; ctx._jumpTo = null;
                var idx = -1;
                for (var j = 0; j < list.length; j++) { if (list[j].type === 'label' && list[j].label === target) { idx = j; break; } }
                if (idx >= 0) { i = idx + 1; continue; }
                // label not found in this list — fall through to next command
            }
            i++;
        }
    }
    // Substitute [name] / [designation] tokens in dialogue text.
    function _subTokens(s) {
        var p = (window.GameSave && GameSave.state && GameSave.state.player) || {};
        return String(s || '')
            .replace(/\[name\]/g, p.name || 'Awakened')
            .replace(/\[designation\]/g, p.designation || 'SUBJECT');
    }
    async function runCmd(c, ctx) {
        switch (c.type) {
            case 'text': await _say(_subTokens(c.text || ''), c.face); break;
            case 'voice': {
                // Reactive dialogue: pick a context-appropriate line for a speaker
                // (data/dialogue/<id>.json) from the current game state, then run it.
                var sp = await _loadVoice(c.speaker);
                if (sp && window.GameVoice) {
                    var picked = GameVoice.pick(sp, _voiceCtx(c.speaker), c.seed);
                    if (picked) { _voiceRecord(c.speaker, picked); await runCmdList(GameVoice.toCommands(sp, picked), ctx); }
                }
                break;
            }
            case 'choice': {
                var idx = await _choose(c.prompt || '', (c.options || []).map(function (o) { return o.label; }));
                var opt = (c.options || [])[idx];
                if (opt && opt.then) await runCmdList(opt.then, ctx);
                break;
            }
            case 'conditional':
                if (_evalCond(c.cond, ctx)) await runCmdList(c.then || [], ctx);
                else await runCmdList(c.else || [], ctx);
                break;
            case 'switch':     if (ES) ES.setSwitch(c.id, c.value === 'toggle' ? !ES.getSwitch(c.id) : !!c.value); break;
            case 'selfswitch': if (ES) ES.setSelf(ctx.mapName, ctx.evId, c.letter || 'A', c.value === 'toggle' ? !ES.getSelf(ctx.mapName, ctx.evId, c.letter || 'A') : !!c.value); break;
            case 'variable': {
                if (!ES) break;
                var cur = ES.getVar(c.id), val = c.value | 0;
                ES.setVar(c.id, c.op === '+' ? cur + val : c.op === '-' ? cur - val : c.op === '*' ? cur * val : val);
                break;
            }
            case 'wait':   await _wait((c.frames || 30) * 16); break;
            case 'se':     if (window.GameAudio && GameAudio.playSE) GameAudio.playSE(c.name); break;
            case 'script': _runScript(c.code || '', ctx); break;
            case 'transfer': ctx.exited = true; await transitionToEventTransfer(c); break;
            case 'money': {
                if (window.GameSave && GameSave.state && GameSave.state.player) {
                    var pl = GameSave.state.player, amt = (c.amount | 0), cur = pl.money || 0;
                    pl.money = Math.max(0, c.op === '-' ? cur - amt : c.op === '=' ? amt : cur + amt);
                    GameSave.markDirty();
                }
                break;
            }
            case 'item': {
                if (window.GameSave && GameSave.state && GameSave.state.inventory && c.id) {
                    var inv = GameSave.state.inventory, pk = c.pocket || 'items';
                    if (!inv[pk]) inv[pk] = {};
                    var n = (c.qty | 0) || 1, q = (inv[pk][c.id] || 0) + (c.op === '-' ? -n : n);
                    if (q <= 0) delete inv[pk][c.id]; else inv[pk][c.id] = q;
                    GameSave.markDirty();
                }
                break;
            }
            case 'setdir': {
                var td = _resolveTarget(c, ctx);
                if (td) { if (td === player) player.direction = c.dir || 'down'; else td.dir = c.dir || 'down'; }
                break;
            }
            case 'move':   await _moveRoute(_resolveTarget(c, ctx), c.steps || [], _resolveTarget(c, ctx) === player); break;
            case 'setgfx': {
                var tgf = _resolveTarget(c, ctx);
                if (tgf && c.graphic) {
                    if (tgf === player) {
                        try { localStorage.setItem('ac_player_sprite', JSON.stringify(c.graphic)); } catch (e) {}
                        if (window.GameRenderer && GameRenderer.reloadPlayer) GameRenderer.reloadPlayer();
                    } else { tgf.graphic = c.graphic; if (c.dir) tgf.dir = c.dir; }
                }
                break;
            }
            case 'spawn': {
                if (GameMap.current) {
                    if (!GameMap.current.events) GameMap.current.events = [];
                    var evs2 = GameMap.current.events, nid = 1;
                    for (var si = 0; si < evs2.length; si++) if (evs2[si].id >= nid) nid = evs2[si].id + 1;
                    var sev = {
                        id: nid, name: c.name || (c.kind === 'monster' ? 'Monster' : 'NPC'),
                        x: c.x | 0, y: c.y | 0, graphic: c.graphic || null, dir: c.dir || 'down',
                        trigger: c.kind === 'monster' ? 'touch' : 'action', through: false,
                        commands: [], _spawned: true
                    };
                    if (c.kind === 'monster') {
                        var foes = (c.enemies && c.enemies.length) ? c.enemies
                                   : [{ key: c.creature || 'emberling', level: c.level || 2 }];
                        sev.commands = [{ type: 'battle', enemies: foes }, { type: 'despawn' }];
                    } else if (c.text) {
                        sev.commands = [{ type: 'text', text: c.text, face: c.face }];
                    }
                    evs2.push(sev);
                }
                break;
            }
            case 'despawn': {
                var devs = GameMap.current && GameMap.current.events;
                if (devs) { var di = devs.indexOf(ctx.event); if (di >= 0) devs.splice(di, 1); }
                ctx.exited = true;
                break;
            }
            case 'system': await new Promise(function (res) { if (window.GameSystemShop) GameSystemShop.open(res); else res(); }); break;
            case 'grantclass': {
                // NPC/quest reward: give a Classification (the non-shop source).
                var st0 = window.GameSave && GameSave.state;
                if (st0 && st0.player) {
                    var dbg = await _loadClassDb();
                    var p0 = st0.player; p0.ownedClasses = p0.ownedClasses || (p0.class ? [p0.class.id] : []);
                    if (c.unlockOnly) {
                        if (p0.ownedClasses.indexOf(c.classId) < 0) p0.ownedClasses.push(c.classId);
                    } else if (window.GameClasses) {
                        GameClasses.changeClass(st0, c.classId, dbg);
                    }
                    if (window.GameSave) GameSave.markDirty();
                }
                break;
            }
            case 'grantspec': {
                var st1 = window.GameSave && GameSave.state;
                if (st1 && st1.player && st1.player.class && c.specId) {
                    st1.player.class.spec = c.specId;
                    var dbs = await _loadClassDb();
                    var cls1 = dbs.classes[st1.player.class.id];
                    var sp1 = ((cls1 && cls1.specializations) || []).filter(function (x) { return x.id === c.specId; })[0];
                    if (sp1 && sp1.grantsSkill) {
                        st1.player.skills = st1.player.skills || [];
                        if (st1.player.skills.indexOf(sp1.grantsSkill) < 0) st1.player.skills.push(sp1.grantsSkill);
                    }
                    if (window.GameSave) GameSave.markDirty();
                }
                break;
            }
            case 'quest': {
                var stq = window.GameSave && GameSave.state;
                if (stq && window.GameQuests && c.id) {
                    stq.quests = stq.quests || {};
                    var qdb = (await _loadQuestDb()) || {};
                    var op = c.op || 'start';
                    if (op === 'start') GameQuests.start(stq.quests, c.id);
                    else if (op === 'advance') GameQuests.advance(stq.quests, qdb, c.id);
                    else if (op === 'complete') GameQuests.complete(stq.quests, qdb, c.id);
                    else if (op === 'fail') GameQuests.fail(stq.quests, c.id);
                    else if (op === 'stage') GameQuests.setStage(stq.quests, qdb, c.id, (c.stage != null ? c.stage : 0));
                    // Apply rewards when a quest completes.
                    if (op === 'complete' && qdb[c.id] && qdb[c.id].reward) {
                        var rw = qdb[c.id].reward, p = stq.player;
                        if (p && rw.money) p.money = (p.money || 0) + (rw.money | 0);
                        if (p && rw.skill) { p.skills = p.skills || []; if (p.skills.indexOf(rw.skill) < 0) p.skills.push(rw.skill); }
                        if (rw.item) { stq.inventory = stq.inventory || {}; var def = window.GameItems && GameItems.get(rw.item); var pk = (def && def.pocket) || 'items'; stq.inventory[pk] = stq.inventory[pk] || {}; stq.inventory[pk][rw.item] = (stq.inventory[pk][rw.item] || 0) + 1; }
                    }
                    if (window.GameSave) GameSave.markDirty();
                    if (window.GameSystem && GameSystem.notify) {
                        var qn = (qdb[c.id] && qdb[c.id].name) || c.id;
                        GameSystem.notify(op === 'complete' ? ('Quest complete: ' + qn) : ('Quest updated: ' + qn), 'info');
                    }
                }
                break;
            }
            case 'heal': {
                // Healer NPC / town infirmary / wild healer: restore persistent
                // vitals (HP/MP/SP %). c.amount (0–100) or full when omitted.
                var sth = window.GameSave && GameSave.state;
                if (sth) {
                    var sv = sth.survival || (sth.survival = { surveillance: 0, stamina: 100, exposure: 0, hp: 100, mana: 100 });
                    var amt = (c.amount != null) ? Math.max(0, Math.min(100, c.amount | 0)) : 100;
                    var set = function (k) { sv[k] = (c.amount != null) ? Math.min(100, (sv[k] || 0) + amt) : 100; };
                    if (c.what === 'hp' || !c.what || c.what === 'all') set('hp');
                    if (c.what === 'mp' || !c.what || c.what === 'all') set('mana');
                    if (c.what === 'sp' || !c.what || c.what === 'all') set('stamina');
                    if (window.GameSave) GameSave.markDirty();
                    if (window.GameHUD && GameHUD.setMeters) GameHUD.setMeters(sv);
                    if (window.GameAudio) GameAudio.playSE('Heal1');
                }
                break;
            }
            case 'grantskill': {
                var st2 = window.GameSave && GameSave.state;
                if (st2 && st2.player && c.skill) {
                    st2.player.skills = st2.player.skills || [];
                    if (st2.player.skills.indexOf(c.skill) < 0) { st2.player.skills.push(c.skill); if (window.GameSave) GameSave.markDirty(); }
                }
                break;
            }
            case 'fade':   await _fade(c); break;
            case 'shake':  await _shake(c); break;
            case 'battle': { var _br = await _battle(c); await _runReact(_br); break; }
            case 'meta': await _metaMenu(); break;
            case 'relic': await _grantRelic(c); break;
            case 'descend': {
                var st = GameSave.state; st.run = st.run || {}; st.meta = st.meta || {};
                await _loadRunDb();
                if (c.start || !GameRun.active(st.run)) {
                    _purgeRunFloors();                     // fresh descent: chests refill, no stale state
                    GameRun.start(st.run, _runDb, (Math.random() * 0xffffffff) >>> 0, { tethered: c.tethered !== false });
                    await _loadMetaDb();
                    _grantStartItems();                    // meta boon: begin runs with kit
                    if (GameSave.markDirty) GameSave.markDirty();
                    await _enterMap(GameRun.floorMap(st.run, _runDb), 'awakened', null, null);
                } else {
                    var d = GameRun.descend(st.run, _runDb);
                    if (GameSave.markDirty) GameSave.markDirty();
                    if (d.cleared) await _endRun('cleared');
                    else await _enterMap(d.map, 'awakened', null, null);
                }
                break;
            }
            case 'jump':   ctx._jumpTo = c.label || ''; break;
            case 'label':  break; // resolved in runCmdList
            case 'comment': break; // author note; no-op at runtime
            case 'exit':   ctx.exited = true; break;

            // ── flow control (VX Ace) ──────────────────────────────────────────
            case 'loop': {
                // Repeat the nested body until Break Loop / Exit Event. A guard +
                // per-iteration yield keep a body with no Wait from freezing the page.
                ctx._break = false;
                var _g = 0;
                while (!ctx.exited && !ctx._break && _g++ < 10000) {
                    await runCmdList(c.commands || [], ctx);
                    await new Promise(function (r) { setTimeout(r, 0); });
                }
                ctx._break = false;
                break;
            }
            case 'break_loop': ctx._break = true; break;
            case 'input_number': {
                var inum = await _inputNumber(c.prompt || 'Enter a number', c.digits || 3, c.initial | 0);
                if (ES) ES.setVar(c.variable != null ? c.variable : (c.id || 1), inum | 0);
                break;
            }
            case 'common_event': await _callCommonEvent(c.id, ctx); break;
            case 'timer': {
                if (c.op === 'stop') { _timer.running = false; }
                else { _timer.running = true; _timer.remain = Math.max(0, (c.seconds | 0)); _timer.endAt = performance.now() + _timer.remain * 1000; }
                break;
            }

            // ── audio (VX Ace) ─────────────────────────────────────────────────
            case 'bgm': if (window.GameAudio) { if (c.op === 'stop') GameAudio.stopBGM(); else GameAudio.playBGM(c.name); } break;
            case 'bgs': if (window.GameAudio) { if (c.op === 'stop') GameAudio.stopBGS(); else GameAudio.playBGS(c.name); } break;
            case 'me':  if (window.GameAudio && c.name) GameAudio.playME(c.name); break;
            case 'stop_se': if (window.GameAudio && GameAudio.stopAllSE) GameAudio.stopAllSE(); break;

            // ── screen effects (VX Ace) ────────────────────────────────────────
            case 'tint':  _tint(c.color || 'rgba(0,0,0,0)', c.frames || 30); break;
            case 'flash': await _flash(c.color || '#ffffff', c.frames || 12); break;
            case 'scroll_map': await _scrollMap(c.dir || 'right', c.distance | 0 || 4, c.frames || 30); break;

            // ── character / message extras (VX Ace) ────────────────────────────
            case 'balloon': await _balloon(_resolveTarget(c, ctx), c.balloon || 'exclaim', c.wait !== false); break;
            case 'animation': await _animation(_resolveTarget(c, ctx), c.id || c.animation || 'Attack1', c.wait !== false); break;
            case 'scroll_text': await _scrollText(c.text || '', c.frames || 180); break;
            case 'location_info': {
                var li = _locationInfo(c.x | 0, c.y | 0, c.info || 'collision');
                if (ES) ES.setVar(c.variable != null ? c.variable : (c.id || 1), li | 0);
                break;
            }
        }
    }
    async function runEvent(ev) {
        if (!ev || _transitioning || _eventRunning || !ev.commands || !ev.commands.length) return;
        _eventRunning = true;
        var ctx = { mapName: (GameMap.current && GameMap.current.name) || '', evId: ev.id, event: ev, exited: false };
        try { await runCmdList(ev.commands, ctx); }
        catch (e) { console.warn('[Event] error', e); }
        finally { _eventRunning = false; }
    }

    async function transitionToConnection(connInfo) {
        if (_transitioning) return;
        _transitioning = true;
        try {
            const { connection, dir, exitX, exitY, offset } = connInfo;
            const destMapId = connection.dest_map || connection.map;
            if (!destMapId || destMapId === 'MAP_DYNAMIC' || destMapId === 'MAP_NONE') return;

            console.log(`[Connection] ${dir} -> ${destMapId}`);
            const result = await GameMap.loadById(destMapId, currentRegion);
            if (!result) return;
            window._mapName = destMapId; window._mapLoaded = true; window._currentMapType = (GameMap.current && GameMap.current.map_type) || "";

            const destW = GameMap.width;
            const destH = GameMap.height;
            let entryX, entryY;
            switch (dir) {
                case 'north': entryX = exitX - offset; entryY = destH - 1; break;
                case 'south': entryX = exitX - offset; entryY = 0;         break;
                case 'west':  entryX = destW - 1;       entryY = exitY - offset; break;
                case 'east':  entryX = 0;               entryY = exitY - offset; break;
                default:
                    entryX = Math.floor(destW / 2);
                    entryY = Math.floor(destH / 2);
            }

            player.x = Math.max(0, Math.min(entryX, destW - 1));
            player.y = Math.max(0, Math.min(entryY, destH - 1));
            _snapPlayer();

            GameCamera.update(player.x, player.y, destW, destH);
            if (window.GameSave) GameSave.markDirty();
            _warpCooldownUntil = performance.now() + WARP_COOLDOWN_MS;
            GameMap.loadEncounterData(currentRegion);
        } finally {
            _transitioning = false;
        }
    }

    // ---------------------------------------------------------------
    // Fly teleport
    // ---------------------------------------------------------------
    async function flyTo(dest) {
        if (_transitioning) return;
        _transitioning = true;
        try {
            await GameMap.load(dest.map, dest.region || currentRegion);
            currentRegion = dest.region || currentRegion;
            window._mapName = dest.map; window._currentMapType = (GameMap.current && GameMap.current.map_type) || "";
            window._mapLoaded = true;
            player.x = Math.max(0, Math.min(dest.x, GameMap.width  - 1));
            player.y = Math.max(0, Math.min(dest.y, GameMap.height - 1));
            player.direction = 'down';
            player.walkFrame = 0;
            _snapPlayer();
            GameCamera.update(player.x, player.y, GameMap.width, GameMap.height);
            GameHUD.update();
            if (window.GameSave) GameSave.markDirty();
            _warpCooldownUntil = performance.now() + WARP_COOLDOWN_MS;
            GameMap.loadEncounterData(currentRegion);
        } finally {
            _transitioning = false;
        }
    }

    // ---------------------------------------------------------------
    // Game loop
    // ---------------------------------------------------------------
    let _mapLoading = false;

    function gameLoop(timestamp) {
        const jp = GameInput.justPressed;

        // If map never loaded (init() may have not awaited it yet), kick it off now
        if (!window._mapLoaded && !_mapLoading) {
            _mapLoading = true;
            try {
                GameMap.load('AwakeningCamp', currentRegion).then(function (mapData) {
                    window._mapLoaded = true;
                    window._mapName   = (mapData && mapData.name) ? mapData.name : 'AwakeningCamp';
                    try { GameRenderer.setScene(GameMap, GameCamera, player); } catch(_){}
                    try { GameCamera.update(player.x, player.y, GameMap.width, GameMap.height); } catch(_){}
                    _mapLoading = false;
                }).catch(function () { _mapLoading = false; });
            } catch(_) { _mapLoading = false; }
        }

        // Title, character creation, and the evolution offer hold the world —
        // their DOM overlays handle their own input; pause everything underneath.
        if ((window.GameTitle && GameTitle.isActive()) ||
            (window.GamePlayerCreation && GamePlayerCreation.isActive()) ||
            (window.GameEvolvePopup && GameEvolvePopup.isActive()) ||
            (window.GameSystemShop && GameSystemShop.isActive())) {
            GameInput.consumeJustPressed();
            requestAnimationFrame(gameLoop);
            return;
        }

        // Tempo + Intervention combat view gets first priority on all input.
        if (window.GameCombatView && GameCombatView.isActive()) {
            GameCombatView.consumeInput(jp);
            GameInput.consumeJustPressed();
            if (window.GameHUD) GameHUD.update();   // hides the overworld meters during combat
            requestAnimationFrame(gameLoop);
            return;
        }

        // Battle gets first priority on all input.
        // Exception: start menu may be open over the battle (bag access).
        if (window.GameBattle && GameBattle.isActive()) {
            if (window.GameStartMenu && GameStartMenu.isOpen) {
                if (jp.up)    GameStartMenu.moveUp();
                if (jp.down)  GameStartMenu.moveDown();
                if (jp.left)  GameStartMenu.moveLeft();
                if (jp.right) GameStartMenu.moveRight();
                if (jp.a)     GameStartMenu.confirm();
                if (jp.b)     GameStartMenu.back();
            } else {
                GameBattle.consumeInput(jp);
            }
            GameInput.consumeJustPressed();
            if (window.GameHUD) GameHUD.update();   // keep the overworld meters hidden during battle
            requestAnimationFrame(gameLoop);
            return;
        }

        // Dialogue consumes A
        if (window.GameDialogue && GameDialogue.isOpen()) {
            if (jp.a || jp.b) GameDialogue.advance();
            GameInput.consumeJustPressed();
            requestAnimationFrame(gameLoop);
            return;
        }

        // Fly menu (select button) — navigation
        if (window.FlyMenu && FlyMenu.isOpen) {
            if (jp.up)   FlyMenu.moveUp();
            if (jp.down) FlyMenu.moveDown();
            if (jp.a)    FlyMenu.confirm();
            if (jp.b || jp.select) FlyMenu.cancel();
            GameInput.consumeJustPressed();
            requestAnimationFrame(gameLoop);
            return;
        }

        // Start menu
        if (window.GameStartMenu && GameStartMenu.isOpen) {
            if (jp.up)    GameStartMenu.moveUp();
            if (jp.down)  GameStartMenu.moveDown();
            if (jp.left)  GameStartMenu.moveLeft();
            if (jp.right) GameStartMenu.moveRight();
            if (jp.a)     GameStartMenu.confirm();
            if (jp.b || jp.start) GameStartMenu.back();
            GameInput.consumeJustPressed();
            GameCamera.update(player.x, player.y, GameMap.width, GameMap.height);
            GameHUD.update();
            requestAnimationFrame(gameLoop);
            return;
        }

        // Start menu toggle
        if (jp.start) {
            if (window.GameStartMenu) GameStartMenu.toggle();
        }

        // Select: start a test battle (Tempo + Intervention combat slice).
        if (jp.select && window.GameCombatView) {
            GameCombatView.start();
        }

        // A button: interact
        if (jp.a) {
            _interact();
        }

        // Roaming monsters wander and chase (only in free-roam, never mid-event).
        if (!_transitioning && !_eventRunning) _updateRoamers(timestamp);

        // Auto/parallel common events (cutscenes / background processes).
        _pumpCommonEvents();

        // Movement
        // justPressed bypasses the cooldown for immediate tap-to-move response.
        // state (held) fires again once the cooldown expires for smooth walking.
        if (!_transitioning && !_eventRunning) {
            const elapsed = timestamp - lastMoveTime;
            const inp = GameInput.state;
            const anyJp = jp.up || jp.down || jp.left || jp.right;
            if (elapsed >= MOVE_COOLDOWN_MS || anyJp) {
                let dx = 0, dy = 0;

                if      (inp.up    || jp.up)    { dy = -1; player.direction = 'up'; }
                else if (inp.down  || jp.down)  { dy =  1; player.direction = 'down'; }
                else if (inp.left  || jp.left)  { dx = -1; player.direction = 'left'; }
                else if (inp.right || jp.right) { dx =  1; player.direction = 'right'; }

                if (dx !== 0 || dy !== 0) {
                    const nx = player.x + dx;
                    const ny = player.y + dy;
                    const oob = nx < 0 || nx >= GameMap.width || ny < 0 || ny >= GameMap.height;

                    const blockEv = _eventAt(nx, ny);
                    if (oob) {
                        const connInfo = GameMap.getConnectionAt(nx, ny);
                        if (connInfo) transitionToConnection(connInfo);
                    } else if (blockEv && !blockEv.through && blockEv.trigger !== 'touch') {
                        // A solid event blocks movement (you interact with A instead).
                    } else if (GameMap.isWalkable(nx, ny)) {
                        player.prevX = player.x;
                        player.prevY = player.y;
                        player.x = nx;
                        player.y = ny;
                        player.moveStartTime = timestamp;
                        player.moveDuration  = MOVE_COOLDOWN_MS;

                        player.walkFrame = player.walkFrame === 0 ? 1 :
                                           player.walkFrame === 1 ? 2 : 1;
                        if (window.GameSave) GameSave.markDirty();

                        const ev = _eventAt(nx, ny);
                        const warp = GameMap.getWarp(nx, ny);
                        if (ev && (ev.trigger === 'touch' || ev.trigger === 'auto') &&
                            ev.commands && ev.commands.length && performance.now() >= _warpCooldownUntil) {
                            runEvent(ev);
                        } else if (warp && performance.now() >= _warpCooldownUntil) {
                            transitionToWarp(warp);
                        } else {
                            _checkEncounter();
                        }
                    }
                    lastMoveTime = timestamp;
                } else {
                    player.walkFrame = 0;
                }
            }
        }

        GameInput.consumeJustPressed();
        if (_camScroll == null) GameCamera.update(player.x, player.y, GameMap.width, GameMap.height);
        GameHUD.update();
        _tickTimer(timestamp);
        requestAnimationFrame(gameLoop);
    }

    // VX Ace Control Timer: count down in real time, show MM:SS, stop at 0.
    function _tickTimer() {
        var el = document.getElementById('ac-timer');
        if (!_timer.running) { if (el) el.style.display = 'none'; return; }
        var rem = Math.max(0, Math.ceil((_timer.endAt - performance.now()) / 1000));
        _timer.remain = rem;
        if (!el) {
            el = document.createElement('div'); el.id = 'ac-timer';
            el.style.cssText = 'position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:6000;font:12px "Press Start 2P",monospace;color:#7fe0ff;background:rgba(4,17,28,0.75);padding:3px 8px;border-radius:4px;';
            document.body.appendChild(el);
        }
        el.style.display = 'block';
        el.textContent = String((rem / 60) | 0).padStart(2, '0') + ':' + String(rem % 60).padStart(2, '0');
        if (rem <= 0) _timer.running = false;
    }

    // ---------------------------------------------------------------
    // Startup
    // ---------------------------------------------------------------
    async function init() {
        // Set map name immediately so HUD never shows '—' on first paint
        window._mapName   = 'AwakeningCamp';
        window._mapLoaded = false;

        try {
            const savedScale = localStorage.getItem('ac_control_scale');
            if (savedScale) {
                document.documentElement.style.setProperty('--control-scale', savedScale);
            }

            GameInput.init();
            GameLayout.init();
            GameControls.init();
            GameHUD.init(GameMap, player);
            if (window.GameAudio) GameAudio.init();
            if (window.GameItems) GameItems.load();   // preload item DB (battle/menus)
            _loadQuestDb();   // preload so quest conditionals resolve

            if (window.GameDialogue) GameDialogue.init();

            const canvas = document.getElementById('canvas-primary');
            GameRenderer.init(canvas);

            await GameMap.init();
            // Optional startup override: ?map=VerdantHollow&region=custom lets you
            // drop straight into any map (e.g. one built in the map editor).
            const _params   = new URLSearchParams(window.location.search);
            let _startMap = _params.get('map');
            let _startReg = _params.get('region');
            let _startX = null, _startY = null;
            const _ux = _params.get('x'), _uy = _params.get('y');
            // The player start set in the map editor (localStorage).
            let _sl = null;
            try { _sl = JSON.parse(localStorage.getItem('ac_start_location') || 'null'); } catch (e) {}
            if (!_startMap && _sl && _sl.map) {
                // No URL override → drop in at the editor's start map + coords.
                _startMap = _sl.map; _startReg = _startReg || _sl.region; _startX = _sl.x; _startY = _sl.y;
            } else if (_startMap && _sl && _sl.map === _startMap) {
                // Launched onto the same map (e.g. editor Play) → honor its start coords.
                _startX = _sl.x; _startY = _sl.y;
            }
            // Explicit ?x=&y= always win (editor Play passes these).
            if (_ux != null) _startX = parseInt(_ux, 10);
            if (_uy != null) _startY = parseInt(_uy, 10);
            _startMap = _startMap || 'AwakeningCamp';
            _startReg = _startReg || currentRegion;
            currentRegion = _startReg;
            await GameMap.load(_startMap, _startReg);
            window._mapName   = (GameMap.current && GameMap.current.name) || _startMap;
            window._mapLoaded = true;

            player.x    = (_startX != null) ? _startX : 7;
            player.y    = (_startY != null) ? _startY : 8;
            player.prevX = 7;
            player.prevY = 8;
            player.direction = 'down';
            player.moveStartTime = 0;
            player.x = Math.min(player.x, GameMap.width  - 1);
            player.y = Math.min(player.y, GameMap.height - 1);
            player.prevX = player.x;
            player.prevY = player.y;

            // Reconcile localStorage with the IndexedDB backup before reading slots.
            if (window.GameSave && GameSave.initStorage) {
                try { await GameSave.initStorage(); } catch (e) {}
            }

            // Initialize save state — must happen after map/renderer setup
            try {
                if (window.GameSave) {
                    if (!GameSave.load(0)) {
                        GameSave.state = GameSave.DEFAULT_SLOT_DATA();
                        GameSave.currentSlot = 0;
                    }
                }
            } catch (saveErr) {
                console.warn('[Main] Save load failed, using fresh state:', saveErr);
                if (window.GameSave) {
                    GameSave.state = GameSave.DEFAULT_SLOT_DATA();
                    GameSave.currentSlot = 0;
                }
            }

            // Pre-load encounter data for starting map
            GameMap.loadEncounterData(currentRegion);

            GameRenderer.setScene(GameMap, GameCamera, player);
            GameCamera.update(player.x, player.y, GameMap.width, GameMap.height);
            console.log('[Main] Game started. Map:', GameMap.current && GameMap.current.name);
            _checkForUpdate();

            // Title screen → New Game (Awakening → Dawnhearth) / Continue.
            // Skipped when an explicit ?map= override is used (editor Play / testing).
            if (!_params.get('map') && window.GameTitle) {
                var _hasSave = !!(window.GameSave && GameSave.hasAnySave());
                GameTitle.show({
                    hasSave: _hasSave,
                    meta: _hasSave ? _firstSlotMeta() : null,
                    onChoose: function (choice) {
                        if (choice === 'continue') _continueGame();
                        else _newGame();
                    }
                });
            }
        } catch (e) {
            console.error('[Main] init() error:', e);
            window._initError = e && e.message ? e.message : String(e);
        }
        // Game loop starts unconditionally so input/HUD always work
        requestAnimationFrame(gameLoop);
    }

    // Debug/automation hook (used by headless tests + content authoring). Exposes
    // the player, map entry, and event firing so a run can be driven without
    // pixel-perfect input. Presentation/testing only — no game logic lives here.
    window.GameDebug = {
        player: player,
        enterMap: function (m, x, y) { return _enterMap(m, currentRegion, x, y); },
        teleport: function (x, y) { player.x = x | 0; player.y = y | 0; player.prevX = player.x; player.prevY = player.y; _snapPlayer(); GameCamera.update(player.x, player.y, GameMap.width, GameMap.height); },
        eventAt: function (x, y) { return _eventAt(x, y); },
        fireEvent: function (ev) { return runEvent(ev); },
        fireEventAt: function (x, y) { var e = _eventAt(x, y); return e ? runEvent(e) : Promise.resolve(); },
        run: function () { return window.GameSave && GameSave.state && GameSave.state.run; },
        meta: function () { return window.GameSave && GameSave.state && GameSave.state.meta; },
        mapName: function () { return GameMap.current && GameMap.current.name; },
        busy: function () { return _eventRunning || _transitioning; }
    };

    document.addEventListener('DOMContentLoaded', init);
})();
