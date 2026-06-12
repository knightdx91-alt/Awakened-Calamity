// save.js — Save data management for all 3 save slots
// Exposes window.GameSave
(function () {
    'use strict';

    const SAVE_KEY = 'ac_save_v1';
    const SETTINGS_KEY = 'ac_settings_v1';
    const SAVE_VERSION = 1;

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
                battlePoints: 0
            },


            // Party — donor combat roster (null = empty). AC uses bonds[].
                        // moves must be array of move ID strings matching moves.json keys
            party: [ null, null, null, null, null, null ],

            // Bonded creatures (Awakened Calamity). Empty at start — you Awaken
            // alone; the System grants bonds later. Drives the BONDS start-menu
            // item (hidden until you have bonded at least one).
            bonds: [],

            // Survival meters (DESIGN.md §7) — Surveillance is the spine mechanic.
            survival: { surveillance: 0, stamina: 100, exposure: 0 },

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
                gear:      {},
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

            // Quests
            quests: {
                active: [],    // { id, stage, startedDate }
                completed: []  // { id, completedDate }
            },

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

    // --- Helper: write full save file ---
    function _writeFile(slots) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(slots));
        } catch (e) {
            console.error('[GameSave] Failed to write save file:', e);
        }
    }

    // --- Migration stub ---
    function migrate(data) {
        if (!data) return data;
        // Future: if (data.saveVersion < 2) { ... }
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
            // Backfill inventory pockets if missing or wrong format
            const inv = data.inventory || (data.inventory = {});
            const POCKETS = ['items','campKits','food','tethers','tonics','materials','gear','keyItems'];
            for (const p of POCKETS) {
                // Migrate old array format to object format
                if (Array.isArray(inv[p])) inv[p] = {};
                if (!inv[p] || typeof inv[p] !== 'object') inv[p] = {};
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
