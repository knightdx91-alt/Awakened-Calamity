// achievements.js — Achievement definitions and management
// Exposes window.GameAchievements
(function () {
    'use strict';

    const TIER_AP = {
        bronze:   5,
        silver:   15,
        gold:     30,
        platinum: 50
    };

    // --- Full achievement list ---
    const ACHIEVEMENTS = [
        // Story / Tutorial
        { id: 'a_whole_new_world',    name: 'A Whole New World',      desc: 'Welcome. Explore to your heart\'s content! (Completed tutorial)',                tier: 'bronze',   apReward: 5  },
        { id: 'enhanced_battle',      name: 'Enhanced Battle',        desc: 'Experience your first enhanced battle.',                                           tier: 'bronze',   apReward: 5  },
        { id: 'adventure_time',       name: 'Adventure Time',         desc: 'Set out on your Pokémon journey.',                                                 tier: 'bronze',   apReward: 5  },
        { id: 'new_region_who_dis',   name: 'New Region, Who Dis?',   desc: 'Travel to a region you\'ve never visited before.',                                 tier: 'bronze',   apReward: 5  },

        // Region Champions
        { id: 'kanto_champion',   name: 'Kanto Champion',   desc: 'Defeat the Elite Four and Champion of Kanto.',   tier: 'gold', apReward: 30 },
        { id: 'johto_champion',   name: 'Johto Champion',   desc: 'Defeat the Elite Four and Champion of Johto.',   tier: 'gold', apReward: 30 },
        { id: 'hoenn_champion',   name: 'Hoenn Champion',   desc: 'Defeat the Elite Four and Champion of Hoenn.',   tier: 'gold', apReward: 30 },
        { id: 'sinnoh_champion',  name: 'Sinnoh Champion',  desc: 'Defeat the Elite Four and Champion of Sinnoh.',  tier: 'gold', apReward: 30 },

        // Endings
        { id: 'the_good_ending',      name: 'The Good Ending',       desc: 'Achieve the best possible outcome for everyone.',                             tier: 'platinum', apReward: 50 },
        { id: 'eternal_damnation',    name: 'Eternal Damnation',     desc: 'Some roads lead only to ruin.',                                               tier: 'gold',     apReward: 30 },
        { id: 'truly_bad_ending',     name: 'Truly Bad Ending',      desc: 'Things could not have gone worse.',                                           tier: 'silver',   apReward: 15 },
        { id: 'the_ultimate_end',     name: 'The Ultimate End',      desc: 'Witness the final conclusion.',                                               tier: 'platinum', apReward: 50 },
        { id: 'the_phoenix',          name: 'The Phoenix',           desc: 'Rise from the ashes stronger than before.',                                  tier: 'gold',     apReward: 30 },
        { id: 'marked_for_death',     name: 'Marked for Death',      desc: 'Some debts cannot be repaid.',                                               tier: 'silver',   apReward: 15 },
        { id: 'deja_vu',              name: 'Déjà Vu',               desc: 'You\'ve been here before. Start a New Game+.',                               tier: 'gold',     apReward: 30 },

        // Rivals / Companions
        { id: 'a_childhood_friend',   name: 'A Childhood Friend',    desc: 'Recruit Blue as your rival/companion.',                                       tier: 'silver', apReward: 15 },
        { id: 'silver_lining',        name: 'Silver Lining',         desc: 'Recruit Silver as your rival/companion.',                                     tier: 'silver', apReward: 15 },
        { id: 'opposite_attract',     name: 'Opposite Attract',      desc: 'Recruit Brendan or May as your rival/companion.',                             tier: 'silver', apReward: 15 },
        { id: 'going_barry',          name: 'Going Barry',           desc: 'Recruit Barry as your rival/companion.',                                      tier: 'silver', apReward: 15 },

        // Combat
        { id: 'you_died',               name: 'You Died',               desc: 'Lose a battle for the first time.',                                          tier: 'bronze',   apReward: 5  },
        { id: 'wasted',                 name: 'Wasted',                 desc: 'Black out in a town with nowhere to run.',                                   tier: 'bronze',   apReward: 5  },
        { id: 'plot_armor',             name: 'Plot Armor',             desc: 'Survive a battle with 1 HP across your entire party.',                       tier: 'silver',   apReward: 15 },
        { id: 'favor_of_the_goddess',   name: 'Favor of the Goddess',   desc: 'Win a battle after landing five consecutive critical hits.',                 tier: 'silver',   apReward: 15 },
        { id: 'no_kill_like_overkill',  name: 'No Kill Like Overkill',  desc: 'Deal at least double a target\'s max HP in one hit.',                        tier: 'bronze',   apReward: 5  },
        { id: 'additive_overkill',      name: 'Additive Overkill',      desc: 'Deal overkill damage 10 times.',                                             tier: 'silver',   apReward: 15 },
        { id: 'multiplicative_overkill',name: 'Multiplicative Overkill','desc': 'Deal overkill damage 50 times.',                                           tier: 'gold',     apReward: 30 },
        { id: 'exponential_overkill',   name: 'Exponential Overkill',   desc: 'Deal overkill damage 200 times.',                                            tier: 'platinum', apReward: 50 },
        { id: 'ultrakill',              name: 'ULTRAKILL',              desc: 'Deal more than 10× a target\'s max HP in a single hit.',                     tier: 'gold',     apReward: 30 },
        { id: 'warlord',                name: 'Warlord',                desc: 'Win 500 battles.',                                                           tier: 'gold',     apReward: 30 },
        { id: 'evil_incarnate',         name: 'Evil Incarnate',         desc: 'Win 1,000 battles.',                                                         tier: 'platinum', apReward: 50 },
        { id: 'immortal',               name: 'Immortal',               desc: 'Win 100 battles without any of your Pokémon fainting.',                      tier: 'gold',     apReward: 30 },

        // Collection
        { id: 'pokemon_trainer',    name: 'Pokémon Trainer',    desc: 'Catch your first Pokémon.',                                                tier: 'bronze',   apReward: 5  },
        { id: 'pokemon_master',     name: 'Pokémon Master',     desc: 'Complete the National Pokédex.',                                           tier: 'platinum', apReward: 50 },
        { id: 'master_breeder',     name: 'Master Breeder',     desc: 'Hatch 100 eggs.',                                                          tier: 'gold',     apReward: 30 },
        { id: 'fitness_guru',       name: 'Fitness Guru',       desc: 'Fully EV-train a Pokémon.',                                               tier: 'silver',   apReward: 15 },
        { id: 'patient_zero',       name: 'Patient Zero',       desc: 'Spread Pokérus to every member of your party.',                           tier: 'silver',   apReward: 15 },
        { id: 'ultra_beastly',      name: 'Ultra Beastly',      desc: 'Catch an Ultra Beast.',                                                    tier: 'gold',     apReward: 30 },
        { id: 'brand_loyalty',      name: 'Brand Loyalty',      desc: 'Use only Pokémon from a single evolution line throughout a full region.',  tier: 'gold',     apReward: 30 },
        { id: 'gen_wunner',         name: 'Gen Wunner',         desc: 'Complete the Kanto Pokédex using only Generation I Pokémon.',             tier: 'silver',   apReward: 15 },
        { id: 'nuzlocke_master',    name: 'Nuzlocke Master',    desc: 'Complete a region in Nuzlocke mode.',                                      tier: 'platinum', apReward: 50 },
        { id: 'monochromatic',      name: 'Monochromatic',      desc: 'Complete a region in Monochrome mode.',                                    tier: 'platinum', apReward: 50 },
        { id: 'serpentine',         name: 'Serpentine',         desc: 'Catch every Snake-type Pokémon in the game.',                              tier: 'silver',   apReward: 15 },
        { id: 'natural_selection',  name: 'Natural Selection',  desc: 'Own one of each Pokémon type at the same time.',                           tier: 'gold',     apReward: 30 },

        // Exploration
        { id: 'well_travelled',         name: 'Well Travelled',         desc: 'Visit every map in the game.',                          tier: 'platinum', apReward: 50 },
        { id: 'leave_no_stone_unturned',name: 'Leave No Stone Unturned',desc: 'Mine every available mining site.',                    tier: 'silver',   apReward: 15 },
        { id: 'tourist',                name: 'Tourist',                desc: 'Visit at least one map in every region.',              tier: 'bronze',   apReward: 5  },
        { id: 'loremaster',             name: 'Loremaster',             desc: 'Read every in-game book and lore sign.',               tier: 'gold',     apReward: 30 },

        // Factions (silver tier)
        { id: 'the_explorer',     name: 'The Explorer',     desc: 'Reach Honoured standing with the Naturalists.',      tier: 'silver', apReward: 15 },
        { id: 'the_protege',      name: 'The Protégé',      desc: 'Reach Honoured standing with the Students.',         tier: 'silver', apReward: 15 },
        { id: 'the_emperor',      name: 'The Emperor',      desc: 'Reach Honoured standing with the Nobles.',           tier: 'silver', apReward: 15 },
        { id: 'the_guardian',     name: 'The Guardian',     desc: 'Reach Honoured standing with the Pokéfans.',         tier: 'silver', apReward: 15 },
        { id: 'the_magician',     name: 'The Magician',     desc: 'Reach Honoured standing with the Outcasts.',         tier: 'silver', apReward: 15 },
        { id: 'the_tradesman',    name: 'The Tradesman',    desc: 'Reach Honoured standing with the Professionals.',    tier: 'silver', apReward: 15 },
        { id: 'the_warrior',      name: 'The Warrior',      desc: 'Reach Honoured standing with the Pokémon League.',   tier: 'silver', apReward: 15 },
        { id: 'the_universalist', name: 'The Universalist', desc: 'Reach Honoured standing with every faction.',        tier: 'gold',   apReward: 30 },

        // Life Skills
        { id: 'green_thumb',  name: 'Green Thumb',   desc: 'Harvest 50 berries you personally planted.',             tier: 'silver', apReward: 15 },
        { id: 'dietician',    name: 'Dietician',     desc: 'Use 20 different berry effects in battle.',              tier: 'silver', apReward: 15 },
        { id: 'field_medic',  name: 'Field Medic',   desc: 'Craft and use 10 potions via Alchemy.',                  tier: 'bronze', apReward: 5  },
        { id: 'mentor',       name: 'Mentor',        desc: 'Reach Alchemy level 10.',                                tier: 'gold',   apReward: 30 },
        { id: 'undertaker',   name: 'Undertaker',    desc: 'Mine 200 ore nodes.',                                    tier: 'silver', apReward: 15 },
        { id: 'rough_and_tough',name: 'Rough and Tough',desc: 'Reach Mining level 10.',                             tier: 'gold',   apReward: 30 },
        { id: 'technical',    name: 'Technical',     desc: 'Learn every TM in the game.',                           tier: 'gold',   apReward: 30 },

        // Real Estate / Money
        { id: 'realtor',    name: 'Realtor',    desc: 'Purchase your first property.',                   tier: 'silver', apReward: 15 },
        { id: 'millionaire',name: 'Millionaire',desc: 'Accumulate ₽1,000,000 at one time.',              tier: 'gold',   apReward: 30 },
        { id: 'money_bags',  name: 'Money Bags', desc: 'Earn a total of ₽10,000,000 across your journey.',tier: 'platinum', apReward: 50 },
        { id: 'slum_lord',  name: 'Slum Lord',  desc: 'Own 5 properties simultaneously.',               tier: 'gold',   apReward: 30 },

        // Quests
        { id: '1337',             name: '1337',               desc: 'Complete a quest in record time.',                    tier: 'silver', apReward: 15 },
        { id: 'wanted',           name: 'Wanted',             desc: 'Become wanted by a faction.',                         tier: 'bronze', apReward: 5  },
        { id: 'de_orphaned',      name: 'De-orphaned',        desc: 'Find your origins.',                                  tier: 'gold',   apReward: 30 },
        { id: 'lost_girl',        name: 'Lost Girl',          desc: 'Help the lost child find her way home.',              tier: 'silver', apReward: 15 },
        { id: 'corporate_shill',  name: 'Corporate Shill',    desc: 'Complete 10 delivery missions.',                      tier: 'bronze', apReward: 5  },
        { id: 'astronomical',     name: 'Astronomical',       desc: 'Solve the mystery of the strange signals.',           tier: 'gold',   apReward: 30 },
        { id: 'eye_of_the_storm', name: 'Eye of the Storm',   desc: 'Survive the great storm.',                           tier: 'gold',   apReward: 30 },
        { id: 'water_logged',     name: 'Water Logged',       desc: 'Explore every underwater route.',                    tier: 'silver', apReward: 15 },
        { id: 'through_the_fire', name: 'Through the Fire',   desc: 'Traverse the volcanic caves.',                       tier: 'silver', apReward: 15 },
        { id: 'hunting_trip',     name: 'Hunting Trip',       desc: 'Track and catch a legendary Pokémon in the wild.',   tier: 'gold',   apReward: 30 },
        { id: 'heated_argument',  name: 'Heated Argument',    desc: 'Win a debate with a Pokémon professor.',             tier: 'silver', apReward: 15 },

        // Challenge
        { id: 'patient',      name: 'Patient',      desc: 'Complete a region without ever using a healing item in battle.',  tier: 'platinum', apReward: 50 },
        { id: 'unmotivated',  name: 'Unmotivated',  desc: 'Reach the credits without ever gaining a level above 50.',        tier: 'gold',     apReward: 30 }
    ];

    // --- Build lookup map ---
    const _byId = {};
    for (const a of ACHIEVEMENTS) _byId[a.id] = a;

    // --- Helper: get save state ---
    function _state() {
        return window.GameSave && window.GameSave.state ? window.GameSave.state : null;
    }

    const GameAchievements = {
        /** Full list of achievement definitions. */
        list: ACHIEVEMENTS,

        /** Unlock an achievement by ID. Awards AP and triggers notification. */
        unlock(id) {
            const state = _state();
            if (!state) { console.warn('[Achievements] No active save state'); return; }
            if (!_byId[id]) { console.warn('[Achievements] Unknown achievement:', id); return; }
            if (state.achievements.unlocked.includes(id)) return; // already unlocked

            state.achievements.unlocked.push(id);
            const ap = _byId[id].apReward || TIER_AP[_byId[id].tier] || 0;
            state.achievements.totalAP = (state.achievements.totalAP || 0) + ap;
            GameSave.markDirty();

            console.log(`[Achievements] Unlocked: ${_byId[id].name} (+${ap} AP)`);
            // Trigger notification if available
            if (window.GameHUD && window.GameHUD.showAchievementToast) {
                window.GameHUD.showAchievementToast(_byId[id]);
            }
        },

        /** Check if an achievement is unlocked. */
        isUnlocked(id) {
            const state = _state();
            if (!state) return false;
            return state.achievements.unlocked.includes(id);
        },

        /** Returns full list with unlocked status appended. */
        getAll() {
            return ACHIEVEMENTS.map(a => Object.assign({}, a, { unlocked: this.isUnlocked(a.id) }));
        },

        /** Returns the tier string for an achievement ID. */
        getTier(id) {
            return _byId[id] ? _byId[id].tier : null;
        }
    };

    window.GameAchievements = GameAchievements;
})();
