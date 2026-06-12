// factions.js — Faction standing management
// Exposes window.GameFactions
(function () {
    'use strict';

    const FACTIONS = {
        wardens:    { name: 'The Wardens',   opposes: ['scavengers'],            achievementId: 'the_guardian'  },
        scavengers: { name: 'Scavengers',    opposes: ['wardens'],               achievementId: 'the_magician'  },
        untethered: { name: 'The Untethered',opposes: ['theSystem'],             achievementId: 'the_explorer'  },
        theSystem:  { name: 'The System',    opposes: ['untethered'],            achievementId: 'the_warrior'   }
    };

    /** Get standings object from current save state (mutates in place). */
    function _standings() {
        const state = window.GameSave && window.GameSave.state;
        if (!state) return null;
        return state.factions.standings;
    }

    const GameFactions = {
        FACTIONS,

        /**
         * Adjust standing for a faction by `amount` (positive or negative).
         * Clamps result to 0–200.
         * Reduces opposing factions by floor(amount * 0.5) if amount > 0.
         */
        adjust(factionId, amount) {
            const standings = _standings();
            if (!standings) { console.warn('[Factions] No active save state'); return; }
            if (!(factionId in standings)) { console.warn('[Factions] Unknown faction:', factionId); return; }

            standings[factionId] = Math.max(0, Math.min(200, standings[factionId] + amount));

            // Penalise opposing factions when gaining standing
            if (amount > 0) {
                const penalty = Math.floor(amount * 0.5);
                if (penalty > 0) {
                    const opposes = FACTIONS[factionId] ? FACTIONS[factionId].opposes : [];
                    for (const oppId of opposes) {
                        if (oppId in standings) {
                            standings[oppId] = Math.max(0, Math.min(200, standings[oppId] - penalty));
                        }
                    }
                }
            }

            if (window.GameSave) window.GameSave.markDirty();
            this.checkFactionAchievements();
        },

        /** Returns current standing value for a faction. */
        getStanding(factionId) {
            const standings = _standings();
            if (!standings) return 100;
            return standings[factionId] !== undefined ? standings[factionId] : 100;
        },

        /** Returns rank string based on standing value. */
        getRank(factionId) {
            const val = this.getStanding(factionId);
            if (val < 50)   return 'Hostile';
            if (val < 100)  return 'Unfriendly';
            if (val < 125)  return 'Neutral';
            if (val < 150)  return 'Friendly';
            if (val < 175)  return 'Allied';
            return 'Honoured';
        },

        /**
         * Check if any faction is at Honoured (175+) and unlock the
         * corresponding achievement. Also checks if all factions are
         * Honoured for the_universalist.
         */
        checkFactionAchievements() {
            if (!window.GameAchievements) return;
            let allHonoured = true;
            for (const [id, def] of Object.entries(FACTIONS)) {
                if (this.getStanding(id) >= 175) {
                    GameAchievements.unlock(def.achievementId);
                } else {
                    allHonoured = false;
                }
            }
            if (allHonoured) {
                GameAchievements.unlock('the_universalist');
            }
        }
    };

    window.GameFactions = GameFactions;
})();
