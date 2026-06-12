// save.js — Save data management for all 3 save slots
// Exposes window.GameSave
(function () {
    'use strict';

    const SAVE_KEY = 'pokemon_save_v1';
    const SETTINGS_KEY = 'pokemon_settings_v1';
    const SAVE_VERSION = 1;

    // --- Default Pokemon object ---
    function DEFAULT_POKEMON() {
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
            originalTrainer: '',
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
                currentMapName: 'PalletTown',
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

            // Pokedex
            pokedex: {
                seen: [6],    // dex numbers (Charizard starter pre-seen)
                caught: [6]   // dex numbers
            },

            // Party — up to 6 Pokemon (null = empty slot)
            // speciesId must be lowercase string matching pokedex.json keys
            // moves must be array of move ID strings matching moves.json keys
            party: [
                Object.assign(DEFAULT_POKEMON(), {
                    speciesId: 'charizard', nickname: 'CHARIZARD', level: 50,
                    currentHp: 153, maxHp: 153, nature: 'adamant',
                    moves: ['flamethrower', 'air_slash', 'dragon_claw', 'earthquake'],
                    ivs: { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 },
                    evs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 },
                }),
                null, null, null, null, null,
            ],

            // Bonded creatures (Awakened Calamity). Empty at start — you Awaken
            // alone; the System grants bonds later. Drives the BONDS start-menu
            // item (hidden until you have bonded at least one).
            bonds: [],

            // Survival meters (DESIGN.md §7) — Surveillance is the spine mechanic.
            survival: { surveillance: 0, stamina: 100, exposure: 0 },

            // PC Boxes — 20 boxes × 30 slots
            pcBoxes: Array.from({ length: 20 }, (_, i) => DEFAULT_BOX('Box ' + (i + 1))),

            // Inventory pockets — keyed by item ID string, value = quantity
            inventory: {
                items:     { potion: 5, super_potion: 1 },
                medicine:  { antidote: 2 },
                valuables: {},
                keyItems:  {},
                pokeBalls: { poke_ball: 10, great_ball: 3 },
                tms:       {},
                berries:   { oran_berry: 3 },
            },

            // Badges per region
            badges: {
                kanto:  [false, false, false, false, false, false, false, false],
                johto:  [false, false, false, false, false, false, false, false],
                hoenn:  [false, false, false, false, false, false, false, false],
                sinnoh: [false, false, false, false, false, false, false, false]
            },

            // World flags (stored as array; converted to Set on load)
            worldFlags: [],

            // Visited maps (stored as array; converted to Set on load)
            visitedMaps: [],

            // Current location
            currentLocation: {
                region: 'kanto',
                mapName: 'PalletTown',
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
                    naturalists:    100,
                    students:       100,
                    nobles:         100,
                    pokefans:       100,
                    outcasts:       100,
                    professionals:  100,
                    pokemonLeague:  100
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

            // Following Pokemon
            followingPokemon: {
                speciesId: null,
                nickname: null
            },

            // Pokenav Rematch Scheduler
            pokenav: {
                rematchable: [] // { trainerId, availableFrom }
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
                pokemonCaught:    0,
                eggsHatched:      0,
                stepsWalked:      0,
                moneyEarned:      0,
                moneySpent:       0,
                berriesPlanted:   0,
                critCaptures:     0,
                totalDamageDealt: 0,
                pokemonFainted:   0
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
        DEFAULT_POKEMON,

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
            const POCKETS = ['items','medicine','valuables','keyItems','pokeBalls','tms','berries'];
            for (const p of POCKETS) {
                // Migrate old array format to object format
                if (Array.isArray(inv[p])) inv[p] = {};
                if (!inv[p] || typeof inv[p] !== 'object') inv[p] = {};
            }
            if (!inv.items.potion)    inv.items.potion    = 5;
            if (!inv.pokeBalls.poke_ball) inv.pokeBalls.poke_ball = 10;

            // Backfill starter Charizard if party is completely empty
            if (!Array.isArray(data.party) || data.party.every(s => s === null)) {
                data.party = [
                    Object.assign(DEFAULT_POKEMON(), {
                        speciesId: 'charizard', nickname: 'CHARIZARD', level: 50,
                        currentHp: 153, maxHp: 153, nature: 'adamant',
                        moves: ['flamethrower', 'air_slash', 'dragon_claw', 'earthquake'],
                        ivs: { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 },
                        evs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 },
                    }),
                    null, null, null, null, null,
                ];
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
                badgeCount:      countBadges(data),
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
