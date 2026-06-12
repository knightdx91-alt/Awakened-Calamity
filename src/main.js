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

        // Select: open fly menu
        if (jp.select && window.FlyMenu) {
            FlyMenu.open(function (dest) { flyTo(dest); });
        }

        // A button: interact
        if (jp.a) {
            _interact();
        }

        // Movement
        // justPressed bypasses the cooldown for immediate tap-to-move response.
        // state (held) fires again once the cooldown expires for smooth walking.
        if (!_transitioning) {
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

                    if (oob) {
                        const connInfo = GameMap.getConnectionAt(nx, ny);
                        if (connInfo) transitionToConnection(connInfo);
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

                        const warp = GameMap.getWarp(nx, ny);
                        if (warp && performance.now() >= _warpCooldownUntil) {
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
        GameCamera.update(player.x, player.y, GameMap.width, GameMap.height);
        GameHUD.update();
        requestAnimationFrame(gameLoop);
    }

    // ---------------------------------------------------------------
    // Startup
    // ---------------------------------------------------------------
    async function init() {
        // Set map name immediately so HUD never shows '—' on first paint
        window._mapName   = 'AwakeningCamp';
        window._mapLoaded = false;

        try {
            const savedScale = localStorage.getItem('pokemon_control_scale');
            if (savedScale) {
                document.documentElement.style.setProperty('--control-scale', savedScale);
            }

            GameInput.init();
            GameLayout.init();
            GameControls.init();
            GameHUD.init(GameMap, player);

            if (window.GameDialogue) GameDialogue.init();

            const canvas = document.getElementById('canvas-primary');
            GameRenderer.init(canvas);

            await GameMap.init();
            // Optional startup override: ?map=VerdantHollow&region=custom lets you
            // drop straight into any map (e.g. one built in the map editor).
            const _params   = new URLSearchParams(window.location.search);
            const _startMap = _params.get('map') || 'AwakeningCamp';
            const _startReg = _params.get('region') || currentRegion;
            currentRegion = _startReg;
            await GameMap.load(_startMap, _startReg);
            window._mapName   = (GameMap.current && GameMap.current.name) || _startMap;
            window._mapLoaded = true;

            player.x    = 7;
            player.y    = 8;
            player.prevX = 7;
            player.prevY = 8;
            player.direction = 'down';
            player.moveStartTime = 0;
            player.x = Math.min(player.x, GameMap.width  - 1);
            player.y = Math.min(player.y, GameMap.height - 1);
            player.prevX = player.x;
            player.prevY = player.y;

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
        } catch (e) {
            console.error('[Main] init() error:', e);
            window._initError = e && e.message ? e.message : String(e);
        }
        // Game loop starts unconditionally so input/HUD always work
        requestAnimationFrame(gameLoop);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
