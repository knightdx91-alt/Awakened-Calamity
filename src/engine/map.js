// GameMap — loads and manages map data, warps, and connections
window.GameMap = (function () {
    'use strict';

    const DEFAULT_SIZE = 20;

    const REGIONS = { kanto: 'kanto', johto: 'johto', hoenn: 'hoenn', sinnoh: 'sinnoh' };

    // Tall grass / long grass / short grass behavior bytes → trigger land encounters
    const GRASS_BEHAVIORS = new Set([0x02, 0x03, 0x07]);
    // Cave floor behavior byte → trigger land encounters (no visual grass)
    const CAVE_BEHAVIORS  = new Set([0x08]);

    // Behavior bytes that require Surf — player cannot walk on these on foot.
    // Values are consistent across FireRed, Emerald, HeartGold, and Platinum.
    const WATER_BEHAVIORS = new Set([
        0x10, // MB_POND_WATER
        0x11, // MB_FAST_WATER / MB_INTERIOR_DEEP_WATER
        0x12, // MB_DEEP_WATER
        0x13, // MB_WATERFALL
        0x14, // MB_SOOTOPOLIS_DEEP_WATER (Emerald)
        0x15, // MB_OCEAN_WATER
        0x16, // MB_PUDDLE (Emerald)
        0x17, // MB_SHALLOW_WATER
        0x19, // MB_NO_SURFACING / MB_UNDERWATER_BLOCKED_ABOVE
        0x1A, // MB_UNUSED_WATER
        0x1B, // MB_CYCLING_ROAD_WATER / MB_SEAWEED_NO_SURFACING
    ]);

    // Module state
    let current          = null;   // raw map JSON
    let layoutData       = null;   // layout JSON (width, height, metatiles, collision, tileset)
    let tilesetBehaviors = null;   // behavior byte per metatile index from tileset JSON
    let mapWidth         = DEFAULT_SIZE;
    let mapHeight        = DEFAULT_SIZE;
    let _nameIndex       = null;   // MAP_CONST -> filename, loaded from kanto_index.json
    let _region          = 'kanto';

    // ---------------------------------------------------------------
    // Index loading
    // ---------------------------------------------------------------
    // Region -> index file mapping
    const INDEX_FILES = {
        kanto:     'data/maps/kanto_index.json',
        hoenn:     'data/maps/hoenn_index.json',
        heartgold: 'data/maps/heartgold_index.json',
        sinnoh:    'data/maps/sinnoh_index.json',
        custom:    'data/maps/custom_index.json',
        awakened:  'data/maps/awakened_index.json',
    };

    async function init(region) {
        const indexFile = INDEX_FILES[region || 'kanto'] || INDEX_FILES.kanto;
        try {
            const resp = await fetch(indexFile, { cache: 'no-cache' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            _nameIndex = await resp.json();
            console.log(`[Map] Loaded index (${region}): ${Object.keys(_nameIndex).length} entries`);
        } catch (e) {
            console.error(`[Map] Failed to load index for ${region}:`, e);
            _nameIndex = {};
        }
    }

    // ---------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------
    function _fallbackSize(data) {
        let maxX = DEFAULT_SIZE - 1;
        let maxY = DEFAULT_SIZE - 1;
        if (data.npcs)  data.npcs.forEach(n => { if (n.x > maxX) maxX = n.x; if (n.y > maxY) maxY = n.y; });
        if (data.warps) data.warps.forEach(w => { if (w.x > maxX) maxX = w.x; if (w.y > maxY) maxY = w.y; });
        if (data.signs) data.signs.forEach(s => { if (s.x > maxX) maxX = s.x; if (s.y > maxY) maxY = s.y; });
        mapWidth  = Math.max(DEFAULT_SIZE, maxX + 4);
        mapHeight = Math.max(DEFAULT_SIZE, maxY + 4);
    }

    async function _loadLayout(data) {
        const layoutId = data.layout;
        tilesetBehaviors = null;
        if (!layoutId) {
            layoutData = null;
            _fallbackSize(data);
            return;
        }
        // Layouts live in region subdirectories for non-Kanto regions.
        // Try region subdir first, fall back to flat root for Kanto.
        const layoutPaths = _region && _region !== 'kanto'
            ? [`data/layouts/${_region}/${layoutId}.json`, `data/layouts/${layoutId}.json`]
            : [`data/layouts/${layoutId}.json`];
        try {
            let lresp = null;
            for (const path of layoutPaths) {
                lresp = await fetch(path, { cache: 'no-cache' });
                if (lresp.ok) break;
            }
            if (!lresp || !lresp.ok) throw new Error(`HTTP ${lresp ? lresp.status : 'none'}`);
            layoutData = await lresp.json();
            mapWidth   = layoutData.width;
            mapHeight  = layoutData.height;

            // Load tileset behavior data so isWalkable can block water tiles
            const tilesetName = layoutData.tileset;
            if (tilesetName) {
                try {
                    const tresp = await fetch(`data/tilesets/${tilesetName}.json`, { cache: 'no-cache' });
                    if (tresp.ok) {
                        const tj = await tresp.json();
                        tilesetBehaviors = tj.behaviors || null;
                        window._dbgTileset = tilesetName + ':' + (tilesetBehaviors ? tilesetBehaviors.length : 'null');
                    } else {
                        window._dbgTileset = tilesetName + ':HTTP' + tresp.status;
                    }
                } catch (e) { window._dbgTileset = tilesetName + ':ERR'; }
            } else {
                window._dbgTileset = 'no-tileset';
            }
        } catch (e) {
            console.warn(`[Map] Layout not found: ${layoutId}`, e);
            layoutData = null;
            _fallbackSize(data);
        }
    }

    // ---------------------------------------------------------------
    // Loading
    // ---------------------------------------------------------------

    /** Load by filename (e.g. "PalletTown"). Region defaults to 'kanto'. */
    async function load(mapName, region) {
        region = region || 'kanto';
        // Reload index when region changes
        if (region !== _region || !_nameIndex) await init(region);
        _region = region;
        _encounterData = null; _encounterMapId = null; _encounterPromise = null;
        const url = `data/maps/${region}/${mapName}.json`;
        try {
            const resp = await fetch(url, { cache: 'no-cache' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status} loading ${url}`);
            current = await resp.json();
            await _loadLayout(current);
            console.log(`[Map] Loaded ${mapName} (${mapWidth}x${mapHeight}) tileset=${getTilesetName() || 'none'}`);
        } catch (err) {
            console.error('[Map] Failed to load map:', err);
            current = { id: mapName, name: mapName, npcs: [], warps: [], signs: [], connections: [], triggers: [] };
            layoutData = null;
            mapWidth   = DEFAULT_SIZE;
            mapHeight  = DEFAULT_SIZE;
        }
        return current;
    }

    /** Load by MAP_CONST id (e.g. "MAP_PALLET_TOWN"). Fetches index first if needed. */
    async function loadById(mapId, region) {
        // Skip special/invalid constants
        if (!mapId || mapId === 'MAP_DYNAMIC' || mapId === 'MAP_NONE') return null;
        if (!_nameIndex) await init(region || _region);
        const mapName = _nameIndex[mapId];
        if (!mapName) {
            console.warn(`[Map] Unknown map id: ${mapId}`);
            return null;
        }
        return load(mapName, region || _region);
    }

    // ---------------------------------------------------------------
    // Warp resolution
    // ---------------------------------------------------------------

    /**
     * Given a warp object {dest_map, dest_warp_id}, return {mapName, warpIndex}.
     * Returns null for invalid/unresolvable warps.
     */
    function resolveWarp(warp) {
        if (!warp || !warp.dest_map) return null;
        if (warp.dest_map === 'MAP_DYNAMIC' || warp.dest_map === 'MAP_NONE') return null;
        if (!_nameIndex) { console.warn('[Map] Index not loaded yet'); return null; }
        const mapName = _nameIndex[warp.dest_map];
        if (!mapName) {
            console.warn(`[Map] resolveWarp: unknown dest_map ${warp.dest_map}`);
            return null;
        }
        const warpIndex = parseInt(warp.dest_warp_id, 10);
        return { mapName, warpIndex: isNaN(warpIndex) ? 0 : warpIndex };
    }

    // ---------------------------------------------------------------
    // Connection resolution
    // ---------------------------------------------------------------

    /**
     * Check if (x, y) is at a map edge that has a connection.
     * Returns { connection, entryX, entryY } or null.
     * Accepts out-of-bounds coords (one step past edge).
     */
    function getConnectionAt(x, y) {
        if (!current || !current.connections) return null;
        for (const conn of current.connections) {
            const dir = conn.direction || conn.dir;
            if (!dir) continue;
            // Normalise direction names (some jsons use "up"/"down", spec uses "north"/"south")
            const d = dir.toLowerCase();
            const north = d === 'north' || d === 'up';
            const south = d === 'south' || d === 'down';
            const west  = d === 'west'  || d === 'left';
            const east  = d === 'east'  || d === 'right';

            if (north && y < 0)          return _connectionEntry(conn, 'north', x, y);
            if (south && y >= mapHeight) return _connectionEntry(conn, 'south', x, y);
            if (west  && x < 0)          return _connectionEntry(conn, 'west',  x, y);
            if (east  && x >= mapWidth)  return _connectionEntry(conn, 'east',  x, y);
        }
        return null;
    }

    /** Build an entry position for a connection given current exit coords. */
    function _connectionEntry(conn, dir, exitX, exitY) {
        // dest_map field may be "map" in some JSONs
        const destMapId = conn.dest_map || conn.map;
        const offset    = conn.offset || 0;
        // We don't know destHeight/destWidth yet — caller must fill in after load
        // Return a descriptor; entryX/Y will be finalised by the caller
        return { connection: { ...conn, dest_map: destMapId }, dir, exitX, exitY, offset };
    }

    // ---------------------------------------------------------------
    // Tile queries
    // ---------------------------------------------------------------

    function getTile(x, y) {
        if (!layoutData) return null;
        if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return null;
        return layoutData.metatiles[y * mapWidth + x];
    }

    function isWalkable(x, y) {
        if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return false;
        if (current && current.npcs) {
            for (const npc of current.npcs) {
                if (npc.x === x && npc.y === y) return false;
            }
        }
        // Warp tiles are always walkable (door/stairs)
        if (getWarp(x, y)) return true;
        if (layoutData && layoutData.collision && tilesetBehaviors && layoutData.metatiles) {
            const metatileIdx = layoutData.metatiles[y * mapWidth + x];
            const behavior = metatileIdx !== undefined ? tilesetBehaviors[metatileIdx] : 0;
            // Grass/cave behaviors are walkable even if collision byte is set
            if (GRASS_BEHAVIORS.has(behavior) || CAVE_BEHAVIORS.has(behavior)) return true;
            // Water requires Surf — block regardless of collision byte
            if (WATER_BEHAVIORS.has(behavior)) return false;
            if (layoutData.collision[y * mapWidth + x] !== 0) return false;
        } else if (layoutData && layoutData.collision) {
            if (layoutData.collision[y * mapWidth + x] !== 0) return false;
        }
        return true;
    }

    function getWarp(x, y) {
        if (!current || !current.warps) return null;
        return current.warps.find(w => w.x === x && w.y === y) || null;
    }

    function getSign(x, y) {
        if (!current || !current.signs) return null;
        return current.signs.find(s => s.x === x && s.y === y) || null;
    }

    function getNpcAt(x, y) {
        if (!current || !current.npcs) return null;
        return current.npcs.find(n => n.x === x && n.y === y) || null;
    }

    function getTilesetName() {
        if (layoutData && layoutData.tileset) return layoutData.tileset;
        // Fallback for DS maps (no layout): use tileset field on the map JSON itself
        return (current && current.tileset) || null;
    }

    // Optional overlay layer (a second tileset drawn on top — buildings/props
    // over autotiled ground). layout.overlay_tileset + layout.overlay[] (-1 = none).
    function getOverlayTilesetName() {
        return (layoutData && layoutData.overlay_tileset) || null;
    }
    function getOverlay(x, y) {
        if (!layoutData || !layoutData.overlay) return -1;
        if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return -1;
        const v = layoutData.overlay[y * mapWidth + x];
        return (v === undefined || v === null) ? -1 : v;
    }
    // Optional UPPER layer (RPG Maker layer 3) — drawn ABOVE the player
    // (roofs / treetops). layout.upper_tileset + layout.upper[] (-1 = none).
    function getUpperTilesetName() {
        return (layoutData && layoutData.upper_tileset) || null;
    }
    function getUpper(x, y) {
        if (!layoutData || !layoutData.upper) return -1;
        if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return -1;
        const v = layoutData.upper[y * mapWidth + x];
        return (v === undefined || v === null) ? -1 : v;
    }

    // Per-map render cell size in px (default 16). A layout may declare
    // tileSize: 32 to render bigger cells (fewer tiles on screen).
    function getTileSize() {
        return (layoutData && layoutData.tileSize) || 16;
    }

    // Returns 'grass' | 'cave' | 'water' | null for the given tile
    function getTileTerrainType(x, y) {
        if (!tilesetBehaviors || !layoutData || !layoutData.metatiles) return null;
        const metatileIdx = layoutData.metatiles[y * mapWidth + x];
        if (metatileIdx === undefined) return null;
        const b = tilesetBehaviors[metatileIdx];
        if (GRASS_BEHAVIORS.has(b)) return 'grass';
        if (CAVE_BEHAVIORS.has(b))  return 'cave';
        if (WATER_BEHAVIORS.has(b)) return 'water';
        return null;
    }

    // Encounter data for the current map — loaded lazily
    let _encounterData = null;
    let _encounterMapId = null;
    let _encounterPromise = null;

    async function loadEncounterData(region) {
        const mapId = current && current.id;
        if (!mapId) return;
        if (_encounterMapId === mapId && _encounterPromise) {
            await _encounterPromise; // already loading or loaded — wait for it
            return;
        }
        _encounterData = null;
        _encounterMapId = mapId;
        _encounterPromise = (async () => {
        try {
            const resp = await fetch(`data/encounters/${region}.json`, { cache: 'no-cache' });
            if (!resp.ok) return;
            const blob = await resp.json();
            // Flatten across wild_encounter_groups
            const groups = blob.wild_encounter_groups || [];
            for (const grp of groups) {
                for (const enc of (grp.encounters || [])) {
                    if (enc.map === mapId) {
                        _encounterData = enc;
                        return;
                    }
                }
            }
        } catch(e) { /* no encounter data */ }
        })();
        await _encounterPromise;
    }

    function getEncounterData() { return _encounterData; }

    // ---------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------
    function getTileDebug(x, y) {
        if (!layoutData || !layoutData.metatiles) return { metatile: null, behavior: null, hasBehaviors: !!tilesetBehaviors };
        const metatileIdx = layoutData.metatiles[y * mapWidth + x];
        const b = tilesetBehaviors ? tilesetBehaviors[metatileIdx] : null;
        return { metatile: metatileIdx, behavior: b, hasBehaviors: !!tilesetBehaviors };
    }

    return {
        get current()  { return current; },
        get layout()   { return layoutData; },
        get width()    { return mapWidth; },
        get height()   { return mapHeight; },
        get region()   { return _region; },
        REGIONS,
        init,
        load,
        loadById,
        resolveWarp,
        getConnectionAt,
        getTile,
        isWalkable,
        getWarp,
        getSign,
        getNpcAt,
        getTilesetName,
        getOverlayTilesetName,
        getOverlay,
        getUpperTilesetName,
        getUpper,
        getTileSize,
        getTileTerrainType,
        getTileDebug,
        loadEncounterData,
        getEncounterData,
    };
})();
