// save.js — Save data management for all 3 save slots
// Exposes window.GameSave
(function () {
    'use strict';

    const SAVE_KEY = 'ac_save_v1';
    const SETTINGS_KEY = 'ac_settings_v1';
    const SAVE_VERSION = 2;

    // --- Default creature (bonded/wild) ---
    function DEFAULT_CREATURE() {
        return {
            speciesId: 0,
            nickname: '',
            level: 1,
            moves: [null, null, null, null],
            currentHp: 0,
            maxHp: 0,
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            nature: 'hardy',
            ability: 0,
            heldItem: null,
            statusCondition: null,
            friendship: 70,
            isShiny: false,
            hasPokerus: false,
            bondedBy: '',
            caughtMapName: '',
            caughtLevel: 1,
            exp: 0
        };
    }

    // --- Default PC box (30 slots) ---
    function DEFAULT_BOX(name) {
        return {
            name: name,
            slots: Array.from({ length: 30 }, () => null)
        };
    }

    // --- Default slot data (fresh new game) ---
    function DEFAULT_SLOT_DATA() {
        return {
            saveVersion: SAVE_VERSION,

            // Meta (mirrored to top-level meta for fast slot select)
            meta: {
                slotIndex: -1,
                playerName: '',
                playtimeSeconds: 0,
                badgeCount: 0,
                currentMapName: 'AwakeningCamp',
                lastSaved: null
            },

            // Player
            player: {
                name: '',
                sprite: 'brendan', // 'brendan' | 'may'
                playtimeSeconds: 0,
                money: 3000,
                battlePoints: 0,
                // Class system (set during the Awakening). Defaults keep old
                // saves shaped so they load under newer code.
                affinity: null,
                appearance: null,
                designation: '',    // System catalog tag (random at creation)
                class: null,        // { id, level, xp, spec }
                skills: [],         // learned skill ids
                ownedClasses: [],   // classes you can switch to for free
                // Equipment slots (GameEquip). Weapons/armor/accessories/relics found
                // as loot equip here; combat reads ONLY equipped pieces. One relic max.
                equipment: { weapon: null, body: null, accessory: null, hazard: null }
            },

            // Unified progression (XP/level/attributes). createProgress() seeds it
            // at creation; left null here so a fresh slot starts blank.
            progress: null,


            // Party — donor combat roster (null = empty). AC uses bonds[].
                        // moves must be array of move ID strings matching moves.json keys
            party: [ null, null, null, null, null, null ],

            // Bonded creatures (Awakened Calamity). Empty at start — you Awaken
            // alone; the System grants bonds later. Drives the BONDS start-menu
            // item (hidden until you have bonded at least one).
            bonds: [],

            // Survival meters (DESIGN.md §7) — Surveillance is the spine mechanic.
            // hp/mana/stamina (0–100%) are the PERSISTENT vitals carried between
            // battles; recover only via items/healing skills (in battle) or a
            // healer / System crystal (out of battle). No passive regen.
            survival: { surveillance: 0, stamina: 100, exposure: 0, hp: 100, mana: 100 },

            // PC Boxes — 20 boxes × 30 slots
            pcBoxes: Array.from({ length: 20 }, (_, i) => DEFAULT_BOX('Box ' + (i + 1))),

            // Inventory pockets — keyed by item ID string, value = quantity
            // Survival supplies (see SUPPLIES menu)
            inventory: {
                items:     {},   // consumables
                campKits:  {},
                food:      {},
                tethers:   {},   // Bind a weakened creature
                tonics:    {},   // purge Exposure
                materials: {},
                gear:      [],   // LIST of equipment instances { id, ilvl } (not id:qty)
                keyItems:  {},
            },

            // World flags (stored as array; converted to Set on load)
            worldFlags: [],

            // Visited maps (stored as array; converted to Set on load)
            visitedMaps: [],

            // Current location
            currentLocation: {
                region: 'awakened',
                mapName: 'AwakeningCamp',
                x: 10,
                y: 10
            },

            // Achievements
            achievements: {
                unlocked: [],          // achievement ID strings
                totalAP: 0,
                spentAP: 0,
                active: []             // active AP powers
            },

            // Factions
            factions: {
                standings: {
                    wardens:    100,
                    scavengers: 100,
                    untethered: 100,
                    theSystem:  100
                },
                dailyQuests: {
                    lastResetDate: null,
                    completedToday: []
                }
            },

            // Life Skills
            lifeSkills: {
                alchemy: {
                    xp: 0,
                    level: 1,
                    recipesKnown: []
                },
                botany: {
                    xp: 0,
                    level: 1,
                    plantsGrowing: [] // { slot, itemId, plantedDate, readyDate }
                },
                mining: {
                    xp: 0,
                    level: 1,
                    sitesMinedToday: [],
                    lastMineReset: null
                }
            },

            // Real Estate
            realEstate: {
                properties: []
                // Each: { id, owned, purchaseDate, lastRentCollected, damageEvents: [] }
            },

            // Quest progress — keyed by quest id: { <id>: { status, stage } }.
            // Driven by GameQuests + the `quest` event command; read by the Journal.
            quests: {},

            // Dynamic Deliveries
            deliveries: {
                activeDelivery: null, // { packageId, targetNpc, targetMap, acceptedDate } | null
                totalCompleted: 0,
                lastDeliveryDate: null
            },

            // Rivals / Companions
            rivals: {
                unlockedRivals: [],    // e.g. ['blue', 'silver']
                activeCompanion: null  // string | null
            },

            // Following creature (overworld companion)
            followingCreature: {
                speciesId: null,
                nickname: null
            },

            // Reaches fast-travel unlocks
            reaches: {
                unlocked: []
            },

            // Challenge modifiers
            challenge: {
                nuzlocke:    false,
                hardcore:    false,
                monochrome:  false
            },

            // Statistics
            statistics: {
                battlesWon:       0,
                battlesLost:      0,
                creaturesBound:   0,
                eggsHatched:      0,
                stepsWalked:      0,
                moneyEarned:      0,
                moneySpent:       0,
                berriesPlanted:   0,
                critCaptures:     0,
                totalDamageDealt: 0,
                creaturesFainted: 0
            }
        };
    }

    // --- Helper: count badges ---
    function countBadges(slot) {
        if (!slot || !slot.badges) return 0;
        let count = 0;
        for (const region of Object.values(slot.badges)) {
            count += region.filter(Boolean).length;
        }
        return count;
    }

    // --- Helper: read full save file from localStorage ---
    function _readFile() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return [null, null, null];
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
            return [null, null, null];
        } catch (e) {
            console.error('[GameSave] Failed to parse save file:', e);
            return [null, null, null];
        }
    }

    // --- IndexedDB backup store -------------------------------------------
    // Saves live primarily in localStorage (synchronous, simple). We ALSO
    // mirror them into IndexedDB so the two back each other up: if localStorage
    // is cleared but IndexedDB survives (or vice-versa), boot restores from
    // whichever still has data. IndexedDB writes are async and best-effort.
    var _IDB_DB = 'ac_saves', _IDB_STORE = 'kv', _idbPromise = null;
    function _idbOpen() {
        if (_idbPromise) return _idbPromise;
        _idbPromise = new Promise(function (resolve) {
            try {
                if (typeof indexedDB === 'undefined') { resolve(null); return; }
                var req = indexedDB.open(_IDB_DB, 1);
                req.onupgradeneeded = function () {
                    var db = req.result;
                    if (!db.objectStoreNames.contains(_IDB_STORE)) db.createObjectStore(_IDB_STORE);
                };
                req.onsuccess = function () { resolve(req.result); };
                req.onerror = function () { resolve(null); };
            } catch (e) { resolve(null); }
        });
        return _idbPromise;
    }
    function _idbSet(key, value) {
        return _idbOpen().then(function (db) {
            if (!db) return;
            return new Promise(function (resolve) {
                try {
                    var tx = db.transaction(_IDB_STORE, 'readwrite');
                    tx.objectStore(_IDB_STORE).put(value, key);
                    tx.oncomplete = function () { resolve(); };
                    tx.onerror = function () { resolve(); };
                } catch (e) { resolve(); }
            });
        });
    }
    function _idbDel(key) {
        return _idbOpen().then(function (db) {
            if (!db) return;
            return new Promise(function (resolve) {
                try {
                    var tx = db.transaction(_IDB_STORE, 'readwrite');
                    tx.objectStore(_IDB_STORE).delete(key);
                    tx.oncomplete = function () { resolve(); };
                    tx.onerror = function () { resolve(); };
                } catch (e) { resolve(); }
            });
        });
    }
    function _idbGet(key) {
        return _idbOpen().then(function (db) {
            if (!db) return null;
            return new Promise(function (resolve) {
                try {
                    var tx = db.transaction(_IDB_STORE, 'readonly');
                    var rq = tx.objectStore(_IDB_STORE).get(key);
                    rq.onsuccess = function () { resolve(rq.result != null ? rq.result : null); };
                    rq.onerror = function () { resolve(null); };
                } catch (e) { resolve(null); }
            });
        });
    }

    // --- Helper: write full save file (localStorage + IndexedDB mirror) ----
    function _writeFile(slots) {
        var json = JSON.stringify(slots);
        var wroteLS = false;
        try { localStorage.setItem(SAVE_KEY, json); wroteLS = true; }
        catch (e) { console.warn('[GameSave] localStorage write failed; relying on IndexedDB:', e); }
        _idbSet(SAVE_KEY, json); // best-effort async mirror (also the fallback when LS is blocked)
        return wroteLS;
    }

    // --- Migration ---------------------------------------------------------
    // Two layers: (1) explicit version steps for structural changes, then
    // (2) _ensureShape — a deep backfill that adds any field present in the
    // current DEFAULT_SLOT_DATA but missing from the old save (never overwrites
    // existing values). This makes additive schema changes (new menus, systems,
    // fields) load old saves safely without a version bump every time.
    function _clone(v) { return (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v; }
    function _ensureShape(target, defaults) {
        if (!target || typeof target !== 'object') return defaults;
        for (var k in defaults) {
            if (!(k in target) || target[k] === undefined) {
                target[k] = _clone(defaults[k]);
            } else if (defaults[k] && typeof defaults[k] === 'object' && !Array.isArray(defaults[k]) &&
                       target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
                _ensureShape(target[k], defaults[k]);   // recurse into plain objects
            }
        }
        return target;
    }
    function migrate(data) {
        if (!data) return data;
        var v = data.saveVersion || 1;
        // ---- explicit structural steps ----
        if (v < 2) {
            // v1 → v2: class-system fields (additive, handled by the backfill
            // below) + convert the legacy quests shape {active:[],completed:[]}
            // to the new id-keyed map used by GameQuests.
            if (data.quests && (Array.isArray(data.quests.active) || Array.isArray(data.quests.completed))) {
                data.quests = {};
            }
            v = 2;
        }
        // ---- additive backfill against the current default shape ----
        _ensureShape(data, DEFAULT_SLOT_DATA());
        data.saveVersion = SAVE_VERSION;
        return data;
    }

    // --- Public API ---
    const GameSave = {
        SAVE_VERSION,
        DEFAULT_SLOT_DATA,
        DEFAULT_CREATURE,

        currentSlot: -1,
        state: null,
        _dirty: false,

        /** Load slot (0–2). Returns slot object or null if empty. */
        load(slotIndex) {
            const slots = _readFile();
            const raw = slots[slotIndex] || null;
            if (!raw) return null;
            const data = migrate(raw);
            // Re-inflate Sets
            if (Array.isArray(data.worldFlags))  data.worldFlags  = new Set(data.worldFlags);
            if (Array.isArray(data.visitedMaps)) data.visitedMaps = new Set(data.visitedMaps);
            // Backfill inventory pockets if missing or wrong format. GEAR is a LIST of
            // equipment instances { id, ilvl }; all other pockets are id:qty maps.
            const inv = data.inventory || (data.inventory = {});
            const POCKETS = ['items','campKits','food','tethers','tonics','materials','keyItems'];
            for (const p of POCKETS) {
                if (Array.isArray(inv[p])) inv[p] = {};
                if (!inv[p] || typeof inv[p] !== 'object') inv[p] = {};
            }
            // gear: ensure a list; convert any legacy id:qty map into instances (ilvl 1).
            if (!Array.isArray(inv.gear)) {
                const legacy = (inv.gear && typeof inv.gear === 'object') ? inv.gear : {};
                const list = [];
                for (const id in legacy) for (let i = 0; i < (legacy[id] | 0); i++) list.push({ id, ilvl: 1 });
                inv.gear = list;
            }
            // equipment: bare-id slots → instances (ilvl 1)
            if (data.player && data.player.equipment) {
                const eq = data.player.equipment;
                for (const sl in eq) if (eq[sl] && typeof eq[sl] === 'string') eq[sl] = { id: eq[sl], ilvl: 1 };
            }
            this.currentSlot = slotIndex;
            this.state = data;
            this._dirty = false;
            return data;
        },

        /** Save slot (0–2) with provided data object. Updates meta. */
        save(slotIndex, data) {
            if (!data) return;
            // Deflate Sets for JSON serialization
            const serializable = Object.assign({}, data);
            if (serializable.worldFlags instanceof Set)  serializable.worldFlags  = Array.from(serializable.worldFlags);
            if (serializable.visitedMaps instanceof Set) serializable.visitedMaps = Array.from(serializable.visitedMaps);

            // Update meta
            const now = new Date().toISOString();
            serializable.meta = {
                slotIndex,
                playerName:      data.player ? data.player.name : '',
                playtimeSeconds: data.player ? data.player.playtimeSeconds : 0,
                badgeCount:      0,
                currentMapName:  data.currentLocation ? data.currentLocation.mapName : 'Unknown',
                lastSaved:       now
            };

            const slots = _readFile();
            slots[slotIndex] = serializable;
            _writeFile(slots);

            // Keep in-memory state up to date (re-inflate Sets if this is the current slot)
            if (slotIndex === this.currentSlot) {
                this.state = data;
                // Make sure in-memory Sets are still Sets
                if (Array.isArray(this.state.worldFlags))  this.state.worldFlags  = new Set(this.state.worldFlags);
                if (Array.isArray(this.state.visitedMaps)) this.state.visitedMaps = new Set(this.state.visitedMaps);
            }
            this._dirty = false;
        },

        /** Returns array of 3 meta objects (or null for empty slots). */
        getAllSlotMeta() {
            const slots = _readFile();
            return slots.map((slot, i) => {
                if (!slot) return null;
                return slot.meta || {
                    slotIndex: i,
                    playerName: '',
                    playtimeSeconds: 0,
                    badgeCount: 0,
                    currentMapName: '',
                    lastSaved: null
                };
            });
        },

        /** Wipe a save slot. */
        deleteSlot(slotIndex) {
            const slots = _readFile();
            slots[slotIndex] = null;
            _writeFile(slots);
            if (this.currentSlot === slotIndex) {
                this.currentSlot = -1;
                this.state = null;
            }
        },

        /**
         * Reconcile localStorage with the IndexedDB backup at boot. If
         * localStorage has no save but IndexedDB does, hydrate localStorage
         * from it (and vice-versa). Async; call once before reading slots.
         */
        initStorage() {
            return Promise.resolve().then(function () {
                var lsRaw = null;
                try { lsRaw = localStorage.getItem(SAVE_KEY); } catch (e) {}
                return _idbGet(SAVE_KEY).then(function (idbRaw) {
                    // localStorage missing but IndexedDB has it → restore LS.
                    if ((!lsRaw || lsRaw === 'null') && idbRaw) {
                        try { localStorage.setItem(SAVE_KEY, idbRaw); } catch (e) {}
                        return;
                    }
                    // localStorage has it but IndexedDB doesn't → seed the backup.
                    if (lsRaw && !idbRaw) { _idbSet(SAVE_KEY, lsRaw); }
                });
            }).catch(function () {});
        },

        /**
         * Erase ALL save data from BOTH stores (localStorage + IndexedDB) and
         * reset in-memory state. Async (IndexedDB). Settings are NOT touched.
         */
        wipeAllSaves() {
            try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
            this.state = null;
            this.currentSlot = -1;
            this._dirty = false;
            return _idbDel(SAVE_KEY).catch(function () {});
        },

        /** True if any of the 3 slots holds a save. */
        hasAnySave() {
            var slots = _readFile();
            return slots.some(function (s) { return !!s; });
        },

        /** Migration stub — returns data as-is for v1. */
        migrate,

        /** Flag that the current state needs saving. */
        markDirty() {
            this._dirty = true;
        },

        /** Save current slot if dirty. */
        autosave() {
            if (this._dirty && this.currentSlot >= 0 && this.state) {
                this.save(this.currentSlot, this.state);
                console.log('[GameSave] Autosaved slot', this.currentSlot);
            }
        },

        // --- Settings (separate key, never wiped by new game) ---

        loadSettings() {
            try {
                const raw = localStorage.getItem(SETTINGS_KEY);
                if (!raw) return this._defaultSettings();
                return Object.assign(this._defaultSettings(), JSON.parse(raw));
            } catch (e) {
                return this._defaultSettings();
            }
        },

        saveSettings(settings) {
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            } catch (e) {
                console.error('[GameSave] Failed to save settings:', e);
            }
        },

        _defaultSettings() {
            return {
                controlScale: 1.0,
                controlMode:  'dpad',
                musicVolume:  0.8,
                sfxVolume:    1.0
            };
        }
    };

    window.GameSave = GameSave;
})();
