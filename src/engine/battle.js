// GameBattle — wild Pokemon battle engine (EE-style Gen 4 mechanics)
window.GameBattle = (function () {
    'use strict';

    // -----------------------------------------------------------------------
    // Legendary species — excluded from random encounters
    // -----------------------------------------------------------------------
    const LEGENDARIES = new Set([
        'articuno','zapdos','moltres','mewtwo','mew',
        'raikou','entei','suicune','lugia','ho_oh','celebi',
        'regirock','regice','registeel','latias','latios',
        'kyogre','groudon','rayquaza','jirachi','deoxys',
        'uxie','mesprit','azelf','dialga','palkia',
        'heatran','regigigas','giratina','cresselia',
        'phione','manaphy','darkrai','shaymin','arceus',
    ]);

    // -----------------------------------------------------------------------
    // Type effectiveness chart (Gen 4)
    // -----------------------------------------------------------------------
    const TYPE_CHART = {
        Normal:   { Rock:0.5, Ghost:0, Steel:0.5 },
        Fire:     { Fire:0.5, Water:0.5, Rock:0.5, Dragon:0.5, Grass:2, Ice:2, Bug:2, Steel:2 },
        Water:    { Water:0.5, Grass:0.5, Dragon:0.5, Fire:2, Ground:2, Rock:2 },
        Electric: { Electric:0.5, Grass:0.5, Dragon:0.5, Ground:0, Flying:2, Water:2 },
        Grass:    { Fire:0.5, Grass:0.5, Poison:0.5, Flying:0.5, Bug:0.5, Steel:0.5, Dragon:0.5, Water:2, Ground:2, Rock:2 },
        Ice:      { Water:0.5, Ice:0.5, Fire:0.5, Steel:0.5, Grass:2, Ground:2, Flying:2, Dragon:2 },
        Fighting: { Poison:0.5, Bug:0.5, Psychic:0.5, Flying:0.5, Ghost:0, Ice:2, Rock:2, Dark:2, Normal:2, Steel:2 },
        Poison:   { Poison:0.5, Ground:0.5, Rock:0.5, Ghost:0.5, Steel:0, Grass:2, Fairy:2 },
        Ground:   { Grass:0.5, Bug:0.5, Flying:0, Rock:2, Steel:2, Fire:2, Electric:2, Poison:2 },
        Flying:   { Electric:0.5, Rock:0.5, Steel:0.5, Grass:2, Fighting:2, Bug:2 },
        Psychic:  { Psychic:0.5, Steel:0.5, Dark:0, Fighting:2, Poison:2 },
        Bug:      { Fire:0.5, Fighting:0.5, Flying:0.5, Ghost:0.5, Steel:0.5, Fairy:0.5, Grass:2, Psychic:2, Dark:2 },
        Rock:     { Fighting:0.5, Ground:0.5, Steel:0.5, Fire:2, Flying:2, Bug:2, Ice:2 },
        Ghost:    { Dark:0.5, Normal:0, Ghost:2, Psychic:2 },
        Dragon:   { Steel:0.5, Dragon:2 },
        Dark:     { Fighting:0.5, Dark:0.5, Fairy:0.5, Ghost:2, Psychic:2 },
        Steel:    { Fire:0.5, Water:0.5, Electric:0.5, Steel:0.5, Rock:2, Ice:2, Fairy:2 },
        Fairy:    { Fire:0.5, Poison:0.5, Steel:0.5, Fighting:2, Dragon:2, Dark:2 },
    };

    // Nature modifiers
    const NATURE_MODS = {
        hardy:{}, docile:{}, serious:{}, bashful:{}, quirky:{},
        lonely:{atk:1.1,def:0.9}, brave:{atk:1.1,spe:0.9}, adamant:{atk:1.1,spa:0.9}, naughty:{atk:1.1,spd:0.9},
        bold:{def:1.1,atk:0.9}, relaxed:{def:1.1,spe:0.9}, impish:{def:1.1,spa:0.9}, lax:{def:1.1,spd:0.9},
        timid:{spe:1.1,atk:0.9}, hasty:{spe:1.1,def:0.9}, jolly:{spe:1.1,spa:0.9}, naive:{spe:1.1,spd:0.9},
        modest:{spa:1.1,atk:0.9}, mild:{spa:1.1,def:0.9}, quiet:{spa:1.1,spe:0.9}, rash:{spa:1.1,spd:0.9},
        calm:{spd:1.1,atk:0.9}, gentle:{spd:1.1,def:0.9}, sassy:{spd:1.1,spe:0.9}, careful:{spd:1.1,spa:0.9},
    };
    const NATURES = Object.keys(NATURE_MODS);

    // -----------------------------------------------------------------------
    // Stat stage multipliers (Gen 4: -6 to +6)
    // -----------------------------------------------------------------------
    const STAGE_MULT = [2/8, 2/7, 2/6, 2/5, 2/4, 2/3, 2/2, 3/2, 4/2, 5/2, 6/2, 7/2, 8/2]; // index 0 = stage -6
    const ACC_STAGE  = [3/9, 3/8, 3/7, 3/6, 3/5, 3/4, 1, 4/3, 5/3, 6/3, 7/3, 8/3, 9/3];

    function _stageMult(stage, isAcc) {
        const table = isAcc ? ACC_STAGE : STAGE_MULT;
        return table[Math.max(0, Math.min(12, stage + 6))];
    }

    function _newStages() {
        return { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
    }

    // -----------------------------------------------------------------------
    // Move effects table
    // Keyed by move ID. Only moves that deviate from plain damage need entries.
    // status: always inflict | statusChance: % secondary | statChanges: [{who:'self'|'foe', stat, stages}]
    // -----------------------------------------------------------------------
    const MOVE_FX = {
        // --- Status-inflicting (primary effect) ---
        thunder_wave:   { status:'para', statusChance:100 },
        stun_spore:     { status:'para', statusChance:100 },
        glare:          { status:'para', statusChance:100 },
        toxic:          { status:'badpoison', statusChance:100 },
        poison_powder:  { status:'poison', statusChance:100 },
        poison_gas:     { status:'poison', statusChance:100 },
        sleep_powder:   { status:'sleep', statusChance:100 },
        spore:          { status:'sleep', statusChance:100 },
        hypnosis:       { status:'sleep', statusChance:100 },
        lovely_kiss:    { status:'sleep', statusChance:100 },
        sing:           { status:'sleep', statusChance:100 },
        grass_whistle:  { status:'sleep', statusChance:100 },
        will_o_wisp:    { status:'burn', statusChance:100 },
        confuse_ray:    { status:'confuse', statusChance:100 },
        supersonic:     { status:'confuse', statusChance:55 },
        swagger:        { status:'confuse', statusChance:100, statChanges:[{who:'foe',stat:'atk',stages:2}] },
        flatter:        { status:'confuse', statusChance:100, statChanges:[{who:'foe',stat:'spa',stages:2}] },
        teeter_dance:   { status:'confuse', statusChance:100 },
        sweet_kiss:     { status:'confuse', statusChance:75 },

        // --- Stat-lowering moves (target foe) ---
        growl:          { statChanges:[{who:'foe',stat:'atk',stages:-1}] },
        tail_whip:      { statChanges:[{who:'foe',stat:'def',stages:-1}] },
        leer:           { statChanges:[{who:'foe',stat:'def',stages:-1}] },
        screech:        { statChanges:[{who:'foe',stat:'def',stages:-2}] },
        string_shot:    { statChanges:[{who:'foe',stat:'spe',stages:-1}] },
        scary_face:     { statChanges:[{who:'foe',stat:'spe',stages:-2}] },
        charm:          { statChanges:[{who:'foe',stat:'atk',stages:-2}] },
        feather_dance:  { statChanges:[{who:'foe',stat:'atk',stages:-2}] },
        sand_attack:    { statChanges:[{who:'foe',stat:'acc',stages:-1}] },
        smokescreen:    { statChanges:[{who:'foe',stat:'acc',stages:-1}] },
        flash:          { statChanges:[{who:'foe',stat:'acc',stages:-1}] },
        sweet_scent:    { statChanges:[{who:'foe',stat:'eva',stages:-1}] },
        fake_tears:     { statChanges:[{who:'foe',stat:'spd',stages:-2}] },
        metal_sound:    { statChanges:[{who:'foe',stat:'spd',stages:-2}] },
        captivate:      { statChanges:[{who:'foe',stat:'spa',stages:-2}] },

        // --- Stat-raising moves (self) ---
        swords_dance:   { statChanges:[{who:'self',stat:'atk',stages:2}] },
        nasty_plot:     { statChanges:[{who:'self',stat:'spa',stages:2}] },
        dragon_dance:   { statChanges:[{who:'self',stat:'atk',stages:1},{who:'self',stat:'spe',stages:1}] },
        bulk_up:        { statChanges:[{who:'self',stat:'atk',stages:1},{who:'self',stat:'def',stages:1}] },
        calm_mind:      { statChanges:[{who:'self',stat:'spa',stages:1},{who:'self',stat:'spd',stages:1}] },
        agility:        { statChanges:[{who:'self',stat:'spe',stages:2}] },
        rock_polish:    { statChanges:[{who:'self',stat:'spe',stages:2}] },
        iron_defense:   { statChanges:[{who:'self',stat:'def',stages:2}] },
        harden:         { statChanges:[{who:'self',stat:'def',stages:1}] },
        withdraw:       { statChanges:[{who:'self',stat:'def',stages:1}] },
        defense_curl:   { statChanges:[{who:'self',stat:'def',stages:1}] },
        amnesia:        { statChanges:[{who:'self',stat:'spd',stages:2}] },
        growth:         { statChanges:[{who:'self',stat:'spa',stages:1}] },
        meditate:       { statChanges:[{who:'self',stat:'atk',stages:1}] },
        sharpen:        { statChanges:[{who:'self',stat:'atk',stages:1}] },
        double_team:    { statChanges:[{who:'self',stat:'eva',stages:1}] },
        minimize:       { statChanges:[{who:'self',stat:'eva',stages:1}] },
        focus_energy:   { critBoost: true },
        stockpile:      { statChanges:[{who:'self',stat:'def',stages:1},{who:'self',stat:'spd',stages:1}] },

        // --- Secondary status on hit ---
        body_slam:      { statusChance:30, status:'para' },
        thunder:        { statusChance:30, status:'para' },
        thunderbolt:    { statusChance:10, status:'para' },
        spark:          { statusChance:30, status:'para' },
        discharge:      { statusChance:30, status:'para' },
        volt_tackle:    { statusChance:10, status:'para', recoilFrac:0.25 },
        lick:           { statusChance:30, status:'para' },
        nuzzle:         { statusChance:100, status:'para' },

        flamethrower:   { statusChance:10, status:'burn' },
        fire_blast:     { statusChance:10, status:'burn' },
        flame_wheel:    { statusChance:10, status:'burn' },
        ember:          { statusChance:10, status:'burn' },
        heat_wave:      { statusChance:10, status:'burn' },
        lava_plume:     { statusChance:30, status:'burn' },
        scald:          { statusChance:30, status:'burn' },
        sacred_fire:    { statusChance:50, status:'burn' },
        blaze_kick:     { statusChance:10, status:'burn' },
        fire_punch:     { statusChance:10, status:'burn' },
        inferno:        { statusChance:100, status:'burn' },

        sludge_bomb:    { statusChance:30, status:'poison' },
        sludge:         { statusChance:30, status:'poison' },
        poison_jab:     { statusChance:30, status:'poison' },
        gunk_shot:      { statusChance:30, status:'poison' },
        poison_sting:   { statusChance:30, status:'poison' },
        twineedle:      { statusChance:20, status:'poison' },
        cross_poison:   { statusChance:10, status:'poison' },

        blizzard:       { statusChance:10, status:'freeze' },
        ice_beam:       { statusChance:10, status:'freeze' },
        powder_snow:    { statusChance:10, status:'freeze' },
        ice_punch:      { statusChance:10, status:'freeze' },
        freeze_dry:     { statusChance:10, status:'freeze' },

        dark_pulse:     { flinchChance:20 },
        air_slash:      { flinchChance:30 },
        iron_head:      { flinchChance:30 },
        rock_slide:     { flinchChance:30 },
        stomp:          { flinchChance:30 },
        waterfall:      { flinchChance:20 },
        headbutt:       { flinchChance:30 },
        bite:           { flinchChance:30 },
        astonish:       { flinchChance:30 },
        twister:        { flinchChance:20 },
        extrasensory:   { flinchChance:10 },
        zen_headbutt:   { flinchChance:20 },
        fake_out:       { flinchChance:100 },

        // --- Stat changes on hit ---
        crunch:         { statChanges:[{who:'foe',stat:'def',stages:-1}], statChance:20 },
        shadow_ball:    { statChanges:[{who:'foe',stat:'spd',stages:-1}], statChance:20 },
        energy_ball:    { statChanges:[{who:'foe',stat:'spd',stages:-1}], statChance:10 },
        bug_buzz:       { statChanges:[{who:'foe',stat:'spd',stages:-1}], statChance:10 },
        psychic:        { statChanges:[{who:'foe',stat:'spd',stages:-1}], statChance:10 },
        earth_power:    { statChanges:[{who:'foe',stat:'spd',stages:-1}], statChance:10 },
        flash_cannon:   { statChanges:[{who:'foe',stat:'spd',stages:-1}], statChance:10 },
        acid:           { statChanges:[{who:'foe',stat:'spd',stages:-1}], statChance:10 },
        bubble:         { statChanges:[{who:'foe',stat:'spe',stages:-1}], statChance:10 },
        bubble_beam:    { statChanges:[{who:'foe',stat:'spe',stages:-1}], statChance:10 },
        mud_shot:       { statChanges:[{who:'foe',stat:'spe',stages:-1}], statChance:100 },
        constrict:      { statChanges:[{who:'foe',stat:'spe',stages:-1}], statChance:10 },
        icy_wind:       { statChanges:[{who:'foe',stat:'spe',stages:-1}], statChance:100 },
        rock_tomb:      { statChanges:[{who:'foe',stat:'spe',stages:-1}], statChance:100 },
        aurora_beam:    { statChanges:[{who:'foe',stat:'atk',stages:-1}], statChance:10 },
        close_combat:   { statChanges:[{who:'self',stat:'def',stages:-1},{who:'self',stat:'spd',stages:-1}] },
        overheat:       { statChanges:[{who:'self',stat:'spa',stages:-2}] },
        leaf_storm:     { statChanges:[{who:'self',stat:'spa',stages:-2}] },
        draco_meteor:   { statChanges:[{who:'self',stat:'spa',stages:-2}] },
        superpower:     { statChanges:[{who:'self',stat:'atk',stages:-1},{who:'self',stat:'def',stages:-1}] },
        v_create:       { statChanges:[{who:'self',stat:'def',stages:-1},{who:'self',stat:'spd',stages:-1},{who:'self',stat:'spe',stages:-1}] },

        // --- Recoil moves ---
        take_down:      { recoilFrac: 0.25 },
        double_edge:    { recoilFrac: 0.33 },
        brave_bird:     { recoilFrac: 0.33 },
        flare_blitz:    { recoilFrac: 0.33, statusChance:10, status:'burn' },
        head_smash:     { recoilFrac: 0.5 },
        submission:     { recoilFrac: 0.25 },
        struggle:       { recoilFrac: 0.25, ignoreType: true },

        // --- Drain moves ---
        giga_drain:     { drainFrac: 0.5 },
        mega_drain:     { drainFrac: 0.5 },
        absorb:         { drainFrac: 0.5 },
        leech_life:     { drainFrac: 0.5 },
        drain_punch:    { drainFrac: 0.5 },
        dream_eater:    { drainFrac: 0.5 },
        horn_leech:     { drainFrac: 0.5 },

        // --- Multi-hit ---
        double_slap:    { multiHit:[2,5] },
        comet_punch:    { multiHit:[2,5] },
        fury_swipes:    { multiHit:[2,5] },
        bone_rush:      { multiHit:[2,5] },
        rock_blast:     { multiHit:[2,5] },
        bullet_seed:    { multiHit:[2,5] },
        spike_cannon:   { multiHit:[2,5] },
        barrage:        { multiHit:[2,5] },
        arm_thrust:     { multiHit:[2,5] },
        pin_missile:    { multiHit:[2,5] },
        double_hit:     { multiHit:[2,2] },
        bonemerang:     { multiHit:[2,2] },
        double_kick:    { multiHit:[2,2] },
        twineedle_x:    { multiHit:[2,2] },
        twin_needle:    { multiHit:[2,2] },

        // --- Self-heal ---
        recover:        { healFrac: 0.5 },
        softboiled:     { healFrac: 0.5 },
        rest:           { healFull: true, status:'sleep', statusChance:100, skipIfFull: true },
        roost:          { healFrac: 0.5 },
        milk_drink:     { healFrac: 0.5 },
        slack_off:      { healFrac: 0.5 },
        morning_sun:    { healFrac: 0.5 },
        synthesis:      { healFrac: 0.5 },
        moonlight:      { healFrac: 0.5 },
        swallow:        { healFrac: 0.5 },
        wish:           { healFrac: 0.5 },

        // --- High-crit moves ---
        slash:          { highCrit: true },
        crabhammer:     { highCrit: true },
        cross_chop:     { highCrit: true },
        karate_chop:    { highCrit: true },
        razor_leaf:     { highCrit: true },
        psycho_cut:     { highCrit: true },
        shadow_claw:    { highCrit: true },
        night_slash:    { highCrit: true },
        leaf_blade:     { highCrit: true },
        stone_edge:     { highCrit: true },
        sky_attack:     { highCrit: true },
    };

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    let _active = false;
    let _el = null;
    let _enemy = null;      // wild Pokemon object
    let _player = null;     // save party slot reference
    let _playerStatCache = null;
    let _phase = 'action';
    let _onEnd = null;
    let _movesDb = null;
    let _pokedexDb = null;
    let _learnsetsDb = null;
    let _escaped = false;
    let _escapeAttempts = 0;
    let _selectedAction = 0;
    let _selectedMove = 0;
    let _selectedBag = 0;
    let _selectedParty = 0;
    let _bagPocket = 0;
    let _messageQueue = [];
    let _animBusy = false;
    let _bagItems = [];
    let _pendingCallback = null;

    // Combat-only state (reset each battle)
    let _playerStages = null;  // {atk,def,spa,spd,spe,acc,eva}
    let _enemyStages  = null;
    let _playerStatus = null;  // {cond, turns} — burn/poison/para/sleep/freeze
    let _enemyStatus  = null;
    let _playerPP = null;      // {moveIdx: currentPP}
    let _playerConfuse = 0;    // confusion turns remaining
    let _enemyConfuse  = 0;
    let _playerFlinch = false;
    let _enemyFlinch  = false;
    let _playerFocusEnergy = false;
    let _enemyFocusEnergy  = false;
    let _turnCount = 0;

    // -----------------------------------------------------------------------
    // Data loading
    // -----------------------------------------------------------------------
    async function _ensureData() {
        if (!_movesDb) {
            try { const r = await fetch('data/pokemon/moves.json'); _movesDb = r.ok ? await r.json() : {}; }
            catch(e) { _movesDb = {}; }
        }
        if (!_pokedexDb) {
            try { const r = await fetch('data/pokemon/pokedex.json'); _pokedexDb = r.ok ? await r.json() : {}; }
            catch(e) { _pokedexDb = {}; }
        }
        if (!_learnsetsDb) {
            try { const r = await fetch('data/pokemon/learnsets.json'); _learnsetsDb = r.ok ? await r.json() : {}; }
            catch(e) { _learnsetsDb = {}; }
        }
    }

    // -----------------------------------------------------------------------
    // Stat calculation (Gen 4 formula)
    // -----------------------------------------------------------------------
    function calcHP(base, iv, ev, level) {
        return Math.floor(((2 * base + iv + Math.floor(ev/4)) * level) / 100) + level + 10;
    }
    function calcStat(base, iv, ev, level, natureMod) {
        return Math.floor((Math.floor(((2 * base + iv + Math.floor(ev/4)) * level) / 100) + 5) * (natureMod || 1));
    }
    function calcAllStats(speciesData, level, ivs, evs, nature) {
        const nm = NATURE_MODS[nature] || {};
        const b = speciesData.stats;
        return {
            hp:  calcHP(b.hp, ivs.hp, evs.hp, level),
            atk: calcStat(b.atk, ivs.atk, evs.atk, level, nm.atk || 1),
            def: calcStat(b.def, ivs.def, evs.def, level, nm.def || 1),
            spa: calcStat(b.spa, ivs.spa, evs.spa, level, nm.spa || 1),
            spd: calcStat(b.spd, ivs.spd, evs.spd, level, nm.spd || 1),
            spe: calcStat(b.spe, ivs.spe, evs.spe, level, nm.spe || 1),
        };
    }

    // Apply stat stages and status modifiers to a raw stat value
    function _effectiveStat(raw, statKey, stages, statusCond) {
        let val = Math.floor(raw * _stageMult(stages[statKey] || 0, statKey === 'acc' || statKey === 'eva'));
        if (statKey === 'atk' && statusCond && statusCond.cond === 'burn') val = Math.floor(val / 2);
        if (statKey === 'spe' && statusCond && statusCond.cond === 'para') val = Math.floor(val / 4);
        return Math.max(1, val);
    }

    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function randIVs() {
        return { hp:randInt(0,31), atk:randInt(0,31), def:randInt(0,31),
                 spa:randInt(0,31), spd:randInt(0,31), spe:randInt(0,31) };
    }

    // -----------------------------------------------------------------------
    // Generate wild Pokemon
    // -----------------------------------------------------------------------
    function _generateWild(entry) {
        const level = (entry.level !== undefined) ? entry.level
                    : randInt(entry.min_level || 2, entry.max_level || 5);
        const rawName = entry.species.replace('SPECIES_', '').toLowerCase();
        if (!_pokedexDb[rawName]) return null;
        const dex = _pokedexDb[rawName];
        const ivs = randIVs();
        const evs = { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 };
        const nature = NATURES[randInt(0, NATURES.length-1)];
        const stats = calcAllStats(dex, level, ivs, evs, nature);
        const moves = _pickWildMoves(rawName, level);
        return {
            species: rawName, name: dex.name, level,
            types: dex.types, baseStats: dex.stats,
            ivs, evs, nature, stats,
            hp: stats.hp, maxHp: stats.hp, moves,
            statusCondition: null,
            isShiny: Math.random() < (1/8192),
            catchRate: dex.catch_rate || 45,
            baseExp: dex.base_exp || 50,
        };
    }

    function _pickWildMoves(speciesName, level) {
        const learnset = (_learnsetsDb && _learnsetsDb[speciesName]) || [];
        const available = learnset.filter(([lv]) => lv <= level);
        const selected = available.slice(-4).map(([, mv]) => mv);
        while (selected.length < 1) selected.push('tackle');
        return selected.map(key => {
            const md = _movesDb[key] || { name:_fmt(key), power:40, type:'Normal', accuracy:100, pp:35, category:'physical' };
            return { id:key, name:md.name||_fmt(key), power:md.power||0, type:md.type||'Normal',
                     accuracy:md.accuracy||100, pp:md.pp||10, currentPP:md.pp||10, category:md.category||'physical' };
        });
    }

    function _fmt(key) {
        return key.split('_').map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
    }

    // -----------------------------------------------------------------------
    // Random encounter from map encounter data
    // -----------------------------------------------------------------------
    function rollEncounter(region) {
        const enc = GameMap.getEncounterData();
        if (!enc || !enc.land_mons) return null;
        const mons = enc.land_mons.mons || [];
        if (!mons.length) return null;
        const weights = [20,20,10,10,10,10,5,5,4,4,1,1];
        const pool = mons.map((m,i) => ({...m, w:weights[i]||1}));
        const total = pool.reduce((s,m) => s+m.w, 0);
        let r = Math.random() * total;
        for (const m of pool) {
            r -= m.w;
            if (r <= 0) {
                const key = m.species.replace('SPECIES_','').toLowerCase();
                if (!LEGENDARIES.has(key) && _pokedexDb && _pokedexDb[key]) return m;
            }
        }
        return pool[0];
    }

    // -----------------------------------------------------------------------
    // Damage calculation (Gen 4 + stat stages + crits)
    // -----------------------------------------------------------------------
    function calcDamage(attacker, atkStats, atkStages, atkStatus, move, defender, defStats, defStages, defStatus, forceCrit) {
        if (!move || move.power === 0) return 0;
        const isPhysical = move.category === 'physical';
        const atkKey = isPhysical ? 'atk' : 'spa';
        const defKey = isPhysical ? 'def' : 'spd';

        const isCrit = forceCrit || _rollCrit(move);
        // Crits ignore negative attack stages and positive defense stages
        const atkStage = isCrit ? Math.max(0, (atkStages[atkKey]||0)) : (atkStages[atkKey]||0);
        const defStage = isCrit ? Math.min(0, (defStages[defKey]||0)) : (defStages[defKey]||0);

        const atkStat = _effectiveStat(atkStats[atkKey]||50, atkKey, {[atkKey]:atkStage}, atkStatus);
        const defStat = _effectiveStat(defStats[defKey]||50, defKey, {[defKey]:defStage}, null);

        let dmg = Math.floor(((2 * attacker.level / 5 + 2) * move.power * atkStat / defStat) / 50) + 2;

        // STAB
        if (!MOVE_FX[move.id]?.ignoreType && attacker.types && attacker.types.includes(move.type)) {
            dmg = Math.floor(dmg * 1.5);
        }
        // Type effectiveness
        const eff = MOVE_FX[move.id]?.ignoreType ? 1 : _typeEff(move.type, defender.types || []);
        dmg = Math.floor(dmg * eff);
        if (dmg === 0) return 0;

        // Crit multiplier (1.5× in Gen 4)
        if (isCrit) dmg = Math.floor(dmg * 1.5);

        // Random factor 85-100%
        dmg = Math.floor(dmg * randInt(85, 100) / 100);

        return Math.max(1, dmg);
    }

    function _rollCrit(move) {
        const fx = MOVE_FX[move.id];
        const critRate = fx && fx.highCrit ? (1/8) : (1/16);
        return Math.random() < critRate;
    }

    function _typeEff(moveType, defenderTypes) {
        let mult = 1;
        for (const dt of defenderTypes) {
            const row = TYPE_CHART[moveType] || {};
            if (row[dt] !== undefined) mult *= row[dt];
        }
        return mult;
    }

    // -----------------------------------------------------------------------
    // Status / stages helpers
    // -----------------------------------------------------------------------
    function _statusLabel(s) {
        if (!s) return '';
        return { burn:'BRN', poison:'PSN', badpoison:'PSN', para:'PAR', sleep:'SLP', freeze:'FRZ', confuse:'CNF' }[s] || '';
    }
    function _statusColor(s) {
        return { burn:'#e84040', poison:'#a040c8', badpoison:'#a040c8', para:'#e8c000', sleep:'#8090a0', freeze:'#80d8f8', confuse:'#e080f0' }[s] || '#888';
    }

    function _canInflict(currentStatus, newCond) {
        // Can't inflict status if already has one (confuse is separate)
        if (newCond === 'confuse') return true;
        return !currentStatus;
    }

    function _updateStatusDisplay() {
        const ps = document.getElementById('bt-player-status');
        const es = document.getElementById('bt-enemy-status');
        if (ps) {
            const s = _playerStatus ? _playerStatus.cond : '';
            const c = _playerConfuse > 0 ? 'CNF' : '';
            const label = [_statusLabel(s), c].filter(Boolean).join(' ');
            ps.textContent = label;
            ps.style.color = s ? _statusColor(s) : '#e080f0';
        }
        if (es) {
            const s = _enemyStatus ? _enemyStatus.cond : '';
            const c = _enemyConfuse > 0 ? 'CNF' : '';
            const label = [_statusLabel(s), c].filter(Boolean).join(' ');
            es.textContent = label;
            es.style.color = s ? _statusColor(s) : '#e080f0';
        }
    }

    // -----------------------------------------------------------------------
    // Catch calculation
    // -----------------------------------------------------------------------
    function calcCatch(wildMon, ballBonus) {
        const a = Math.floor((wildMon.maxHp*3 - wildMon.hp*2) * wildMon.catchRate * ballBonus / (wildMon.maxHp*3));
        const b = Math.floor(1048560 / Math.floor(Math.sqrt(Math.floor(Math.sqrt(Math.floor(16711680 / Math.max(1,a)))))));
        let shakes = 0;
        for (let i = 0; i < 4; i++) {
            if (Math.random() * 65535 < b) shakes++;
            else break;
        }
        return shakes === 4;
    }

    // -----------------------------------------------------------------------
    // EXP gain
    // -----------------------------------------------------------------------
    function giveExp(mon, wildMon) {
        if (!mon || !wildMon) return 0;
        const expGain = Math.floor((wildMon.baseExp * wildMon.level) / 7);
        mon.exp = (mon.exp || 0) + expGain;
        return expGain;
    }

    // -----------------------------------------------------------------------
    // Bag pocket definitions
    // -----------------------------------------------------------------------
    const BAG_POCKETS = [
        {
            label: 'Items',
            invKey: 'items',
            defs: [
                { key:'potion',       name:'Potion',       useType:'potion', heal:20 },
                { key:'super_potion', name:'Super Potion', useType:'potion', heal:50 },
                { key:'hyper_potion', name:'Hyper Potion', useType:'potion', heal:200 },
                { key:'max_potion',   name:'Max Potion',   useType:'potion', heal:99999 },
                { key:'full_restore', name:'Full Restore', useType:'potion', heal:99999, cureStatus:true },
                { key:'antidote',     name:'Antidote',     useType:'potion', heal:0, cureStatus:'poison' },
                { key:'burn_heal',    name:'Burn Heal',    useType:'potion', heal:0, cureStatus:'burn' },
                { key:'awakening',    name:'Awakening',    useType:'potion', heal:0, cureStatus:'sleep' },
                { key:'parlyz_heal',  name:'Parlyz Heal',  useType:'potion', heal:0, cureStatus:'para' },
                { key:'ice_heal',     name:'Ice Heal',     useType:'potion', heal:0, cureStatus:'freeze' },
                { key:'full_heal',    name:'Full Heal',    useType:'potion', heal:0, cureStatus:true },
                { key:'repel',        name:'Repel',        useType:'empty' },
                { key:'super_repel',  name:'Super Repel',  useType:'empty' },
                { key:'max_repel',    name:'Max Repel',    useType:'empty' },
                { key:'escape_rope',  name:'Escape Rope',  useType:'empty' },
            ],
        },
        {
            label: 'Medicine',
            invKey: 'medicine',
            defs: [
                { key:'antidote',     name:'Antidote',     useType:'potion', heal:0, cureStatus:'poison' },
                { key:'full_heal',    name:'Full Heal',    useType:'potion', heal:0, cureStatus:true },
                { key:'revive',       name:'Revive',       useType:'revive', healFrac:0.5 },
                { key:'max_revive',   name:'Max Revive',   useType:'revive', healFrac:1 },
                { key:'elixir',       name:'Elixir',       useType:'empty' },
                { key:'max_elixir',   name:'Max Elixir',   useType:'empty' },
            ],
        },
        {
            label: 'Poké Balls',
            invKey: 'pokeBalls',
            defs: [
                { key:'poke_ball',   name:'Poké Ball',   useType:'ball', ballBonus:1 },
                { key:'great_ball',  name:'Great Ball',  useType:'ball', ballBonus:1.5 },
                { key:'ultra_ball',  name:'Ultra Ball',  useType:'ball', ballBonus:2 },
                { key:'master_ball', name:'Master Ball', useType:'ball', ballBonus:255 },
                { key:'safari_ball', name:'Safari Ball', useType:'ball', ballBonus:1.5 },
                { key:'net_ball',    name:'Net Ball',    useType:'ball', ballBonus:3 },
                { key:'dive_ball',   name:'Dive Ball',   useType:'ball', ballBonus:3.5 },
                { key:'nest_ball',   name:'Nest Ball',   useType:'ball', ballBonus:3 },
                { key:'repeat_ball', name:'Repeat Ball', useType:'ball', ballBonus:3 },
                { key:'timer_ball',  name:'Timer Ball',  useType:'ball', ballBonus:4 },
                { key:'luxury_ball', name:'Luxury Ball', useType:'ball', ballBonus:1 },
                { key:'premier_ball',name:'Premier Ball',useType:'ball', ballBonus:1 },
                { key:'dusk_ball',   name:'Dusk Ball',   useType:'ball', ballBonus:3.5 },
                { key:'heal_ball',   name:'Heal Ball',   useType:'ball', ballBonus:1 },
                { key:'quick_ball',  name:'Quick Ball',  useType:'ball', ballBonus:5 },
            ],
        },
        {
            label: 'TMs/HMs',
            invKey: 'tms',
            defs: [],
        },
        {
            label: 'Berries',
            invKey: 'berries',
            defs: [
                { key:'oran_berry',  name:'Oran Berry',  useType:'potion', heal:10 },
                { key:'sitrus_berry',name:'Sitrus Berry', useType:'potion', heal:30 },
                { key:'lum_berry',   name:'Lum Berry',   useType:'potion', heal:0, cureStatus:true },
                { key:'pecha_berry', name:'Pecha Berry', useType:'potion', heal:0, cureStatus:'poison' },
                { key:'rawst_berry', name:'Rawst Berry', useType:'potion', heal:0, cureStatus:'burn' },
                { key:'chesto_berry',name:'Chesto Berry',useType:'potion', heal:0, cureStatus:'sleep' },
                { key:'cheri_berry', name:'Cheri Berry', useType:'potion', heal:0, cureStatus:'para' },
                { key:'aspear_berry',name:'Aspear Berry',useType:'potion', heal:0, cureStatus:'freeze' },
            ],
        },
    ];

    function _buildBagItems() {
        const st = window.GameSave && GameSave.state;
        if (!st) return [{ label:'No items', useType:'empty' }];
        const pocket = BAG_POCKETS[_bagPocket];
        if (!pocket) return [];
        const inv = (st.inventory && st.inventory[pocket.invKey]) || {};
        const items = [];

        if (pocket.defs.length > 0) {
            for (const d of pocket.defs) {
                const cnt = inv[d.key] || 0;
                if (cnt > 0) items.push({ ...d, label:`${d.name} ×${cnt}`, count:cnt });
            }
        } else {
            // Dynamic pocket (TMs etc) — enumerate all keys
            for (const [k, cnt] of Object.entries(inv)) {
                if (cnt > 0) items.push({ key:k, label:`${k.toUpperCase()} ×${cnt}`, useType:'empty', count:cnt });
            }
        }

        if (!items.length) items.push({ label:`${pocket.label} is empty`, useType:'empty' });
        return items;
    }

    // -----------------------------------------------------------------------
    // Entry point
    // -----------------------------------------------------------------------
    async function start(entry, onEnd) {
        if (_active) return;
        await _ensureData();
        const wild = _generateWild(entry);
        if (!wild) { if (onEnd) onEnd('invalid'); return; }

        const st = window.GameSave && GameSave.state;
        if (!st || !st.party || !st.party[0]) { if (onEnd) onEnd('no_party'); return; }

        _active = true;
        _enemy = wild;
        _player = st.party[0];

        // Mark enemy as seen in Pokédex
        const dexEntry = _pokedexDb && _pokedexDb[wild.species];
        if (dexEntry && dexEntry.num) {
            if (!st.pokedex) st.pokedex = { seen: [], caught: [] };
            if (!st.pokedex.seen.includes(dexEntry.num)) { st.pokedex.seen.push(dexEntry.num); GameSave.markDirty(); }
        }
        _playerStatCache = _calcPlayerStats();
        _onEnd = onEnd || null;
        _phase = 'action';
        _escapeAttempts = 0;
        _escaped = false;
        _messageQueue = [];
        _animBusy = false;
        _selectedAction = 0;
        _selectedMove = 0;
        _selectedBag = 0;
        _selectedParty = 0;
        _pendingCallback = null;
        _turnCount = 0;

        // Reset combat state
        _playerStages = _newStages();
        _enemyStages  = _newStages();
        _playerStatus = _player.statusCondition ? { cond: _player.statusCondition, turns: 0 } : null;
        _enemyStatus  = null;
        _playerConfuse = 0;
        _enemyConfuse  = 0;
        _playerFlinch = false;
        _enemyFlinch  = false;
        _playerFocusEnergy = false;
        _enemyFocusEnergy  = false;

        // PP: initialize from player moves
        _playerPP = {};
        if (_player.moves) {
            _player.moves.forEach((mv, i) => {
                const md = _movesDb[mv] || {};
                _playerPP[i] = _player.movePP && _player.movePP[i] !== undefined ? _player.movePP[i] : (md.pp || 10);
            });
        }

        _buildUI();
        _playEntryAnimation(() => {
            _showMessage(`A wild ${wild.name} appeared!`, () => _showActionMenu());
        });
    }

    function _calcPlayerStats() {
        const dexEntry = _pokedexDb && _pokedexDb[_player.speciesId];
        return calcAllStats(
            dexEntry || { stats:{ hp:45, atk:49, def:49, spa:65, spd:65, spe:45 } },
            _player.level || 5,
            _player.ivs || randIVs(),
            _player.evs || { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 },
            _player.nature || 'hardy'
        );
    }

    // -----------------------------------------------------------------------
    // Sprite transparency helper
    // GBA palette PNGs use palette index 0 as transparent; browsers show it as
    // a solid colour. Strip every pixel that matches the top-left corner pixel.
    // -----------------------------------------------------------------------
    function _stripBg(imgEl) {
        try {
            const c = document.createElement('canvas');
            c.width  = imgEl.naturalWidth  || 64;
            c.height = imgEl.naturalHeight || 64;
            const ctx = c.getContext('2d');
            ctx.drawImage(imgEl, 0, 0);
            const d = ctx.getImageData(0, 0, c.width, c.height);
            const r = d.data[0], g = d.data[1], b = d.data[2];
            for (let i = 0; i < d.data.length; i += 4) {
                if (d.data[i]===r && d.data[i+1]===g && d.data[i+2]===b) d.data[i+3] = 0;
            }
            ctx.putImageData(d, 0, 0);
            imgEl.src = c.toDataURL();
        } catch(_) {}
    }

    // -----------------------------------------------------------------------
    // UI
    // -----------------------------------------------------------------------
    // Map type → terrain key
    function _getTerrainKey() {
        const mapType = window._currentMapType || '';
        if (mapType === 'MAP_TYPE_UNDERGROUND') return 'cave';
        if (mapType === 'MAP_TYPE_INDOOR')      return 'indoor';
        if (mapType === 'MAP_TYPE_TOWN')        return 'building';
        // Route — check map name for hints
        const mapName = (window._mapName || '').toLowerCase();
        if (mapName.includes('cave') || mapName.includes('tunnel')) return 'cave';
        if (mapName.includes('water') || mapName.includes('sea'))   return 'water';
        if (mapName.includes('sand') || mapName.includes('beach'))  return 'sand';
        return 'grass';
    }

    // Ball sprite for a given item key
    function _ballSrc(itemKey) {
        const A = window._BattleAssets;
        if (!A) return null;
        if (itemKey === 'poke_ball')   return A.ball_poke;
        if (itemKey === 'great_ball')  return A.ball_great;
        if (itemKey === 'ultra_ball')  return A.ball_ultra;
        if (itemKey === 'master_ball') return A.ball_master;
        if (itemKey === 'premier_ball') return A.ball_premier;
        return A.ball_poke;
    }

    // Entry animation: wild Pokémon slides in from right side
    function _playEntryAnimation(onDone) {
        const eWrap = document.getElementById('bt-enemy-sprite-wrap');
        if (!eWrap) { onDone(); return; }

        eWrap.style.opacity = '0';
        eWrap.style.transform = 'translateX(60px) scale(0.7)';

        // Short delay then animate in
        setTimeout(() => {
            eWrap.style.transition = 'opacity 0.3s ease-out, transform 0.35s ease-out';
            eWrap.style.opacity = '1';
            eWrap.style.transform = 'translateX(0) scale(1)';
            setTimeout(() => {
                eWrap.style.transition = '';
                onDone();
            }, 380);
        }, 200);
    }

    // Pokéball throw + catch/fail animation
    function _animateBallThrow(itemKey, caught, onDone) {
        const field = document.getElementById('bt-field');
        const eWrap = document.getElementById('bt-enemy-sprite-wrap');
        if (!field || !eWrap) { onDone(); return; }

        const ballSrc = _ballSrc(itemKey);
        let ball;
        if (ballSrc) {
            ball = document.createElement('img');
            ball.src = ballSrc;
        } else {
            // CSS fallback ball
            ball = document.createElement('div');
            ball.style.background = 'radial-gradient(circle at 35% 35%, #ff4444, #cc0000)';
            ball.style.borderRadius = '50%';
            ball.style.border = '2px solid #333';
        }
        ball.id = 'bt-ball-anim';
        ball.style.cssText += 'position:absolute;width:32px;height:32px;image-rendering:pixelated;z-index:20;left:60%;bottom:20%;';
        field.appendChild(ball);

        // Phase 1: throw arc
        ball.style.animation = 'bt-throw-arc 0.5s ease-out forwards';
        ball.addEventListener('animationend', function throwDone() {
            // Phase 2: enemy disappears into ball
            eWrap.style.animation = 'bt-pokemon-caught 0.2s ease-in forwards';
            eWrap.addEventListener('animationend', function () {
                eWrap.style.opacity = '0';
                eWrap.style.animation = '';

                if (caught) {
                    // Shake 3 times then stay
                    let shakes = 0;
                    function doShake() {
                        if (shakes >= 3) { onDone(); return; }
                        shakes++;
                        ball.style.animation = 'none';
                        void ball.offsetWidth;
                        ball.style.animation = 'bt-ball-shake 0.5s ease-in-out';
                        ball.addEventListener('animationend', doShake, { once: true });
                    }
                    setTimeout(doShake, 300);
                } else {
                    // Shake once then break open → enemy reappears
                    ball.style.animation = 'none';
                    void ball.offsetWidth;
                    ball.style.animation = 'bt-ball-shake 0.5s ease-in-out';
                    ball.addEventListener('animationend', function () {
                        ball.style.animation = 'bt-ball-break 0.3s ease-in forwards';
                        ball.addEventListener('animationend', function () {
                            ball.remove();
                            eWrap.style.opacity = '1';
                            eWrap.style.animation = 'bt-pokemon-appear 0.3s ease-out forwards';
                            eWrap.addEventListener('animationend', function () {
                                eWrap.style.animation = '';
                                onDone();
                            }, { once: true });
                        }, { once: true });
                    }, { once: true });
                }
            }, { once: true });
        }, { once: true });
    }

    function _buildUI() {
        const screen = document.getElementById('screen-primary');
        if (!screen) return;

        _el = document.createElement('div');
        _el.id = 'battle-overlay';
        screen.appendChild(_el);

        // Pick terrain based on current map type
        const terrainKey = _getTerrainKey();
        const terrainBg = window._BattleAssets && window._BattleAssets['terrain_' + terrainKey];

        _el.innerHTML = `
<div id="bt-field">
  <div id="bt-terrain-bg" style="${terrainBg ? `background-image:url('${terrainBg}')` : ''}"></div>
  <div id="bt-enemy-info">
    <div id="bt-enemy-name-row">
      <span id="bt-enemy-name">${_enemy.name}</span>
    </div>
    <div class="bt-level-row">Lv <span id="bt-enemy-lv">${_enemy.level}</span></div>
    <div class="bt-hp-wrap"><div class="bt-hp-bar" id="bt-enemy-hp-bar"></div></div>
    <div id="bt-enemy-status"></div>
  </div>
  <div id="bt-enemy-sprite-wrap">
    <img id="bt-enemy-sprite" src="data/sprites/pokemon/front/${_enemy.species}.png"
         onerror="this.style.display='none'" alt="${_enemy.name}">
  </div>
  <div id="bt-player-sprite-wrap">
    <img id="bt-player-sprite" src="data/sprites/pokemon/back/${_player.speciesId || 'charizard'}.png"
         onerror="this.style.display='none'" alt="player pokemon">
  </div>
  <div id="bt-player-info">
    <div id="bt-player-name-row">
      <span id="bt-player-name">${_getPlayerName()}</span>
    </div>
    <div class="bt-level-row">Lv <span id="bt-player-lv">${_player.level || 1}</span></div>
    <div class="bt-hp-wrap"><div class="bt-hp-bar" id="bt-player-hp-bar"></div></div>
    <div class="bt-hp-text">
      <span id="bt-player-hp-cur">${_player.currentHp || 0}</span> / <span id="bt-player-hp-max">${_playerStatCache.hp}</span>
    </div>
    <div id="bt-player-status"></div>
  </div>
</div>
<div id="bt-bottom">
  <div id="bt-text-box"><div id="bt-text"></div></div>
  <div id="bt-action-box" style="display:none">
    <button class="bt-act" data-act="0">FIGHT</button>
    <button class="bt-act" data-act="1">BAG</button>
    <button class="bt-act" data-act="2">POKéMON</button>
    <button class="bt-act" data-act="3">RUN</button>
  </div>
  <div id="bt-move-box" style="display:none"></div>
  <div id="bt-bag-box" style="display:none"></div>
  <div id="bt-party-box" style="display:none"></div>
</div>`;

        _updateHP();
        _updateStatusDisplay();

        // Strip palette background from sprites
        const eSprite = document.getElementById('bt-enemy-sprite');
        const pSprite = document.getElementById('bt-player-sprite');
        if (eSprite) eSprite.addEventListener('load', function() { _stripBg(this); }, { once: true });
        if (pSprite) pSprite.addEventListener('load', function() { _stripBg(this); }, { once: true });
        // If already loaded (cached), strip immediately
        if (eSprite && eSprite.complete && eSprite.naturalWidth) _stripBg(eSprite);
        if (pSprite && pSprite.complete && pSprite.naturalWidth) _stripBg(pSprite);

        _el.querySelectorAll('.bt-act').forEach(btn => {
            btn.addEventListener('click', () => _onActionSelect(parseInt(btn.dataset.act)));
        });

        // Tap text box to advance message on mobile
        const textBox = document.getElementById('bt-text-box');
        if (textBox) {
            textBox.addEventListener('click', () => { if (_pendingCallback) _advanceMessage(); });
        }

        document.addEventListener('keydown', _onKeyDown);
    }

    function _getPlayerName() {
        if (!_player || !_player.speciesId) return 'POKéMON';
        const dex = _pokedexDb && _pokedexDb[_player.speciesId];
        return _player.nickname || (dex && dex.name) || 'POKéMON';
    }

    function _getPartyName(mon) {
        if (!mon || !mon.speciesId) return '---';
        const dex = _pokedexDb && _pokedexDb[mon.speciesId];
        return mon.nickname || (dex && dex.name) || mon.speciesId;
    }

    function _updateHP() {
        const maxHp = _playerStatCache ? _playerStatCache.hp : 1;
        const ePct = Math.max(0, _enemy.hp / _enemy.maxHp);
        const pPct = Math.max(0, (_player.currentHp || 0) / maxHp);

        const ebar = document.getElementById('bt-enemy-hp-bar');
        const pbar = document.getElementById('bt-player-hp-bar');
        if (ebar) { ebar.style.width = (ePct*100)+'%'; ebar.className = 'bt-hp-bar '+_hpColor(ePct); }
        if (pbar) { pbar.style.width = (pPct*100)+'%'; pbar.className = 'bt-hp-bar '+_hpColor(pPct); }

        const hpCur = document.getElementById('bt-player-hp-cur');
        const hpMax = document.getElementById('bt-player-hp-max');
        if (hpCur) hpCur.textContent = Math.max(0, _player.currentHp || 0);
        if (hpMax) hpMax.textContent = maxHp;
    }

    function _hpColor(pct) {
        if (pct > 0.5) return 'hp-green';
        if (pct > 0.2) return 'hp-yellow';
        return 'hp-red';
    }

    // -----------------------------------------------------------------------
    // Message system
    // -----------------------------------------------------------------------
    function _showMessage(text, callback) {
        _phase = 'anim';
        const textEl   = document.getElementById('bt-text');
        const textBox  = document.getElementById('bt-text-box');
        const actionBox = document.getElementById('bt-action-box');
        const moveBox  = document.getElementById('bt-move-box');
        const bagBox   = document.getElementById('bt-bag-box');
        const partyBox = document.getElementById('bt-party-box');
        if (textBox)   textBox.style.display   = 'block';
        if (actionBox) actionBox.style.display = 'none';
        if (moveBox)   moveBox.style.display   = 'none';
        if (bagBox)    bagBox.style.display    = 'none';
        if (partyBox)  partyBox.style.display  = 'none';
        if (!textEl)   { if (callback) callback(); return; }

        textEl.textContent = '';
        let i = 0;
        const iv = setInterval(() => {
            if (i < text.length) {
                textEl.textContent += text[i++];
            } else {
                clearInterval(iv);
                _pendingCallback = callback;
            }
        }, 22);
    }

    // Chain multiple messages one after another, then call final callback
    function _showMessages(msgs, callback) {
        if (!msgs.length) { callback(); return; }
        _showMessage(msgs[0], () => _showMessages(msgs.slice(1), callback));
    }

    function _advanceMessage() {
        if (_pendingCallback) {
            const cb = _pendingCallback;
            _pendingCallback = null;
            cb();
        }
    }

    // -----------------------------------------------------------------------
    // Action menu
    // -----------------------------------------------------------------------
    function _showActionMenu() {
        _phase = 'action';
        const textBox   = document.getElementById('bt-text-box');
        const actionBox = document.getElementById('bt-action-box');
        const moveBox   = document.getElementById('bt-move-box');
        const bagBox    = document.getElementById('bt-bag-box');
        const partyBox  = document.getElementById('bt-party-box');
        if (textBox)   textBox.style.display   = 'none';
        if (actionBox) { actionBox.style.display = 'grid'; _highlightAction(0); }
        if (moveBox)   moveBox.style.display   = 'none';
        if (bagBox)    bagBox.style.display    = 'none';
        if (partyBox)  partyBox.style.display  = 'none';
    }

    function _highlightAction(idx) {
        _selectedAction = idx;
        if (!_el) return;
        _el.querySelectorAll('.bt-act').forEach((b,i) => b.classList.toggle('selected', i === idx));
    }

    function _onActionSelect(idx) {
        if (_phase !== 'action') return;
        switch (idx) {
            case 0: _showMoveSelect(); break;
            case 1: _showBagSelect(); break;
            case 2: _showPartySelect(false); break;
            case 3: _tryRun(); break;
        }
    }

    // -----------------------------------------------------------------------
    // Move selection
    // -----------------------------------------------------------------------
    function _showMoveSelect() {
        _phase = 'move_select';
        const textBox   = document.getElementById('bt-text-box');
        const actionBox = document.getElementById('bt-action-box');
        const moveBox   = document.getElementById('bt-move-box');
        if (textBox)   textBox.style.display   = 'none';
        if (actionBox) actionBox.style.display = 'none';
        if (!moveBox) return;
        moveBox.style.display = 'grid';
        moveBox.innerHTML = '';

        const moves = _player.moves || [];
        const realMoves = moves.filter(Boolean);

        // Check if all moves are at 0 PP → force Struggle
        const allPPZero = realMoves.length > 0 &&
            realMoves.every((mv, idx) => (_playerPP[moves.indexOf(mv)] || 0) === 0);

        if (allPPZero || realMoves.length === 0) {
            const btn = document.createElement('button');
            btn.className = 'bt-move-btn selected';
            btn.innerHTML = '<span class="bt-move-name">Struggle</span>';
            btn.addEventListener('click', () => _useStruggle());
            moveBox.appendChild(btn);
        } else {
            // Always render 4 slots
            for (let i = 0; i < 4; i++) {
                const mv = moves[i];
                const btn = document.createElement('button');
                if (!mv) {
                    btn.className = 'bt-move-btn bt-move-empty';
                    btn.disabled = true;
                    btn.innerHTML = '<span class="bt-move-name">—</span>';
                } else {
                    const md = (_movesDb && _movesDb[mv]) || { name:_fmt(mv), type:'Normal', pp:10, category:'physical' };
                    const pp = _playerPP[i] !== undefined ? _playerPP[i] : (md.pp || 10);
                    const maxPP = md.pp || 10;
                    const ppLow = pp === 0;
                    btn.className = 'bt-move-btn' + (ppLow ? ' pp-zero' : '');
                    btn.dataset.idx = i;
                    btn.innerHTML = `<span class="bt-move-name">${md.name||_fmt(mv)}</span>`
                                  + `<span class="bt-move-pp${ppLow?' pp-empty':''}">${pp}/${maxPP}</span>`
                                  + `<span class="bt-move-type type-badge" data-type="${(md.type||'Normal').toLowerCase()}">${md.type||'Normal'}</span>`;
                    btn.addEventListener('click', () => { if (!ppLow) _useMove(i); });
                }
                moveBox.appendChild(btn);
            }
        }

        const back = document.createElement('button');
        back.className = 'bt-back-btn';
        back.textContent = '← Back';
        back.addEventListener('click', () => _showActionMenu());
        moveBox.appendChild(back);
        _selectedMove = 0;
        _highlightMove(0);
    }

    function _highlightMove(idx) {
        _selectedMove = idx;
        if (!_el) return;
        _el.querySelectorAll('.bt-move-btn').forEach((b,i) => b.classList.toggle('selected', i === idx));
    }

    // -----------------------------------------------------------------------
    // Bag selection
    // -----------------------------------------------------------------------
    function _showBagSelect() {
        _phase = 'bag_select';
        if (window.GameStartMenu) {
            GameStartMenu.openBagForBattle(
                function(smItem) { _useItemById(smItem.itemId, smItem.name); },
                function()       { _showActionMenu(); }
            );
        } else {
            // Fallback: custom bag UI if startmenu not available
            const textBox   = document.getElementById('bt-text-box');
            const actionBox = document.getElementById('bt-action-box');
            const bagBox    = document.getElementById('bt-bag-box');
            if (textBox)   textBox.style.display   = 'none';
            if (actionBox) actionBox.style.display = 'none';
            if (!bagBox) return;
            bagBox.style.display = 'flex';
            _rebuildBagUI(bagBox);
        }
    }

    // Map a save-inventory itemId to battle use action
    function _useItemById(itemId, itemName) {
        const st = window.GameSave && GameSave.state;
        if (!st) { _showActionMenu(); return; }

        // Consume one from inventory
        const pockets = ['items','medicine','pokeBalls','berries'];
        let used = false;
        for (const p of pockets) {
            if (st.inventory && st.inventory[p] && st.inventory[p][itemId] > 0) {
                st.inventory[p][itemId]--;
                used = true; break;
            }
        }
        if (!used) { _showMessage(`Couldn't use ${itemName}!`, () => _showActionMenu()); return; }
        GameSave.markDirty();

        // Determine effect
        const BALL_BONUS = { poke_ball:1, great_ball:1.5, ultra_ball:2, master_ball:255,
            safari_ball:1.5, net_ball:3, dive_ball:3.5, nest_ball:3, repeat_ball:3,
            timer_ball:4, luxury_ball:1, premier_ball:1, dusk_ball:3.5, heal_ball:1, quick_ball:5 };
        const POTIONS = {
            potion:{heal:20}, super_potion:{heal:50}, hyper_potion:{heal:200},
            max_potion:{heal:99999}, full_restore:{heal:99999,cureStatus:true},
            antidote:{heal:0,cureStatus:'poison'}, burn_heal:{heal:0,cureStatus:'burn'},
            awakening:{heal:0,cureStatus:'sleep'}, parlyz_heal:{heal:0,cureStatus:'para'},
            ice_heal:{heal:0,cureStatus:'freeze'}, full_heal:{heal:0,cureStatus:true},
            oran_berry:{heal:10}, sitrus_berry:{heal:30}, lum_berry:{heal:0,cureStatus:true},
            pecha_berry:{heal:0,cureStatus:'poison'}, rawst_berry:{heal:0,cureStatus:'burn'},
            chesto_berry:{heal:0,cureStatus:'sleep'}, cheri_berry:{heal:0,cureStatus:'para'},
            aspear_berry:{heal:0,cureStatus:'freeze'},
        };

        if (BALL_BONUS[itemId] !== undefined) {
            const ballBonus = BALL_BONUS[itemId];
            const caught = ballBonus >= 255 || calcCatch(_enemy, ballBonus);
            if (caught) {
                _showMessage(`${_enemy.name} was caught!`, () => { _catchPokemon(); _endBattle('caught'); });
            } else {
                _showMessage(`${_enemy.name} broke free!`, () => {
                    _enemyTurn(() => {
                        if ((_player.currentHp || 0) <= 0) { _onPlayerFaint(); return; }
                        _showActionMenu();
                    });
                });
            }
        } else if (POTIONS[itemId]) {
            _usePotion({ ...POTIONS[itemId], key: itemId });
        } else {
            _showMessage(`${itemName} can't be used here.`, () => _showActionMenu());
        }
    }

    function _rebuildBagUI(bagBox) {
        if (!bagBox) bagBox = document.getElementById('bt-bag-box');
        if (!bagBox) return;
        bagBox.innerHTML = '';

        // Pocket tab row
        const tabRow = document.createElement('div');
        tabRow.id = 'bt-bag-tabs';
        BAG_POCKETS.forEach((p, i) => {
            const tab = document.createElement('button');
            tab.className = 'bt-bag-tab' + (i === _bagPocket ? ' active' : '');
            tab.textContent = p.label;
            tab.addEventListener('click', () => { _bagPocket = i; _selectedBag = 0; _rebuildBagUI(); });
            tabRow.appendChild(tab);
        });
        bagBox.appendChild(tabRow);

        // Item list
        const listEl = document.createElement('div');
        listEl.id = 'bt-bag-list';
        _bagItems = _buildBagItems();
        _bagItems.forEach((item, i) => {
            const btn = document.createElement('button');
            btn.className = 'bt-bag-btn';
            btn.textContent = item.label;
            if (item.useType !== 'empty') {
                btn.addEventListener('click', () => { _selectedBag = i; _useBagItem(i); });
            }
            listEl.appendChild(btn);
        });
        bagBox.appendChild(listEl);

        const back = document.createElement('button');
        back.className = 'bt-back-btn';
        back.textContent = '← Back';
        back.addEventListener('click', () => _showActionMenu());
        bagBox.appendChild(back);

        _selectedBag = Math.min(_selectedBag, Math.max(0, _bagItems.length - 1));
        _highlightBag(_selectedBag);
    }

    function _highlightBag(idx) {
        _selectedBag = idx;
        if (!_el) return;
        _el.querySelectorAll('.bt-bag-btn').forEach((b,i) => b.classList.toggle('selected', i === idx));
    }

    // -----------------------------------------------------------------------
    // Party selection (switching)
    // -----------------------------------------------------------------------
    function _showPartySelect(forcedSwitch) {
        _phase = 'party_select';
        if (window.GameStartMenu) {
            GameStartMenu.openPartyForBattle(
                function(mon) {
                    var party = window.GameSave && GameSave.state && GameSave.state.party;
                    if (!party) { _showActionMenu(); return; }
                    var idx = party.indexOf(mon);
                    if (idx < 0) { _showActionMenu(); return; }
                    _switchTo(idx, forcedSwitch);
                },
                function() {
                    if (forcedSwitch) {
                        _showMessage('No backing out!', function() { _showPartySelect(true); });
                    } else {
                        _showActionMenu();
                    }
                }
            );
        } else {
            _showActionMenu();
        }
    }

    function _highlightParty(idx) {
        _selectedParty = idx;
        if (!_el) return;
        _el.querySelectorAll('.bt-party-btn').forEach((b,i) => b.classList.toggle('selected', i === idx));
    }

    function _switchTo(partyIdx) {
        const st = window.GameSave && GameSave.state;
        if (!st || !st.party) return;
        const mon = st.party[partyIdx];
        if (!mon || (mon.currentHp || 0) <= 0 || mon === _player) return;

        // Save PP for current mon
        _savePP();

        _player = mon;
        _playerStatCache = _calcPlayerStats();
        // Restore stages (reset on switch-in) and carry-over status
        _playerStages = _newStages();
        _playerStatus = mon.statusCondition ? { cond: mon.statusCondition, turns: 0 } : null;
        _playerConfuse = 0;
        _playerFlinch = false;

        // Restore PP for incoming mon
        _playerPP = {};
        if (_player.moves) {
            _player.moves.forEach((mv, i) => {
                const md = _movesDb[mv] || {};
                _playerPP[i] = _player.movePP && _player.movePP[i] !== undefined ? _player.movePP[i] : (md.pp || 10);
            });
        }

        // Update player sprite
        const pSprite = document.getElementById('bt-player-sprite');
        if (pSprite) {
            pSprite.src = `data/sprites/pokemon/back/${_player.speciesId || 'charizard'}.png`;
            pSprite.addEventListener('load', function() { _stripBg(this); }, { once: true });
            if (pSprite.complete) _stripBg(pSprite);
        }
        const pName = document.getElementById('bt-player-name');
        if (pName) pName.textContent = _getPlayerName();
        const pLv = document.getElementById('bt-player-lv');
        if (pLv) pLv.textContent = _player.level || 1;

        _showMessage(`Go! ${_getPlayerName()}!`, () => {
            _updateHP();
            _updateStatusDisplay();
            // Enemy gets a free attack on the switch-in
            _enemyTurn(() => {
                if ((_player.currentHp || 0) <= 0) { _onPlayerFaint(); return; }
                _showActionMenu();
            });
        });
    }

    function _savePP() {
        if (!_player || !_player.moves) return;
        if (!_player.movePP) _player.movePP = {};
        _player.moves.forEach((mv, i) => {
            if (_playerPP[i] !== undefined) _player.movePP[i] = _playerPP[i];
        });
    }

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------
    function _useMove(moveIdx) {
        if (_phase !== 'move_select') return;
        const moves = _player.moves || [];
        const mv = moves[moveIdx];
        if (!mv) return;
        const md = (_movesDb && _movesDb[mv]) || { power:40, type:'Normal', accuracy:100, pp:10, category:'physical' };
        if ((_playerPP[moveIdx] || 0) <= 0) {
            _showMessage('No PP left for that move!', () => _showMoveSelect());
            return;
        }
        // Deduct PP
        _playerPP[moveIdx] = Math.max(0, (_playerPP[moveIdx] || 0) - 1);
        const moveObj = { id:mv, name:md.name||_fmt(mv), power:md.power||0, type:md.type||'Normal',
                          accuracy:md.accuracy||100, pp:md.pp||10, category:md.category||'physical' };
        _executeTurn(moveObj);
    }

    function _useStruggle() {
        const moveObj = { id:'struggle', name:'Struggle', power:50, type:'Normal', accuracy:100, pp:99, category:'physical' };
        _executeTurn(moveObj);
    }

    function _useBagItem(idx) {
        if (_phase !== 'bag_select') return;
        const item = _bagItems[idx];
        if (!item || item.useType === 'empty') {
            _showMessage('No usable items!', () => _showActionMenu());
            return;
        }
        if (item.useType === 'ball') {
            _throwBall(item);
        } else if (item.useType === 'potion') {
            _usePotion(item);
        }
    }

    function _throwBall(item) {
        const st = GameSave.state;
        if (st.inventory?.pokeBalls) {
            st.inventory.pokeBalls[item.key] = Math.max(0, (st.inventory.pokeBalls[item.key] || 0) - 1);
        }
        GameSave.markDirty();
        const caught = (item.ballBonus >= 255) || calcCatch(_enemy, item.ballBonus);
        _showMessage(`You threw a ${item.name}!`, () => {
            _animateBallThrow(item.key, caught, () => {
                if (caught) {
                    _showMessage(`${_enemy.name} was caught!`, () => { _catchPokemon(); _endBattle('caught'); });
                } else {
                    _showMessage(`${_enemy.name} broke free!`, () => {
                        _enemyTurn(() => {
                            if ((_player.currentHp || 0) <= 0) { _onPlayerFaint(); return; }
                            _showActionMenu();
                        });
                    });
                }
            });
        });
    }

    function _usePotion(item) {
        const st = GameSave.state;
        if (st.inventory?.items) {
            st.inventory.items[item.key] = Math.max(0, (st.inventory.items[item.key] || 0) - 1);
        }
        const maxHp = _playerStatCache ? _playerStatCache.hp : 100;
        const msgs = [];
        if (item.cureStatus === true) {
            _playerStatus = null;
            _player.statusCondition = null;
            msgs.push('Status condition cured!');
        } else if (item.cureStatus && _playerStatus && _playerStatus.cond === item.cureStatus) {
            _playerStatus = null;
            _player.statusCondition = null;
            msgs.push('Status condition cured!');
        }
        if (item.heal > 0) {
            const healed = Math.min(item.heal, maxHp - (_player.currentHp || 0));
            _player.currentHp = Math.min(maxHp, (_player.currentHp || 0) + item.heal);
            msgs.push(`${_getPlayerName()} recovered ${healed} HP!`);
        }
        GameSave.markDirty();
        _updateHP();
        _updateStatusDisplay();
        if (!msgs.length) msgs.push('Used the item!');
        _showMessages(msgs, () => {
            _enemyTurn(() => {
                if ((_player.currentHp || 0) <= 0) { _onPlayerFaint(); return; }
                _showActionMenu();
            });
        });
    }

    function _catchPokemon() {
        const st = GameSave.state;
        if (!st || !st.party) return;

        // Mark as caught in Pokédex
        const dexE = _pokedexDb && _pokedexDb[_enemy.species];
        if (dexE && dexE.num) {
            if (!st.pokedex) st.pokedex = { seen: [], caught: [] };
            if (!st.pokedex.caught.includes(dexE.num)) st.pokedex.caught.push(dexE.num);
            if (!st.pokedex.seen.includes(dexE.num))   st.pokedex.seen.push(dexE.num);
        }
        const slot = st.party.findIndex(m => m === null);
        if (slot === -1 && st.party.length >= 6) return;
        const mon = {
            speciesId: _enemy.species,
            nickname: '',
            level: _enemy.level,
            moves: _enemy.moves.map(m => m.id),
            currentHp: _enemy.hp,
            maxHp: _enemy.maxHp,
            evs: _enemy.evs,
            ivs: _enemy.ivs,
            nature: _enemy.nature,
            ability: 0,
            heldItem: null,
            statusCondition: null,
            friendship: 70,
            isShiny: _enemy.isShiny,
            originalTrainer: 'Player',
            caughtMapName: GameMap.current?.name || '',
            caughtLevel: _enemy.level,
            exp: 0,
        };
        if (slot !== -1) st.party[slot] = mon;
        else st.party.push(mon);
        GameSave.markDirty();
    }

    function _tryRun() {
        _escapeAttempts++;
        const playerSpe = _effectiveStat((_playerStatCache?.spe) || 50, 'spe', _playerStages, _playerStatus);
        const enemySpe  = _effectiveStat((_enemy.stats?.spe) || 50, 'spe', _enemyStages, _enemyStatus);
        const escapeVal = Math.floor((playerSpe * 128 / enemySpe) + 30 * _escapeAttempts) % 256;
        if (Math.random() * 256 < escapeVal || playerSpe > enemySpe) {
            _showMessage('Got away safely!', () => _endBattle('fled'));
        } else {
            _showMessage("Can't escape!", () => {
                _enemyTurn(() => {
                    if ((_player.currentHp || 0) <= 0) { _onPlayerFaint(); return; }
                    _showActionMenu();
                });
            });
        }
    }

    // -----------------------------------------------------------------------
    // Turn execution
    // -----------------------------------------------------------------------
    function _executeTurn(playerMove) {
        _phase = 'anim';
        _turnCount++;

        const playerSpe = _effectiveStat((_playerStatCache?.spe) || 50, 'spe', _playerStages, _playerStatus);
        const enemySpe  = _effectiveStat((_enemy.stats?.spe) || 50, 'spe', _enemyStages, _enemyStatus);

        // Priority: normal moves all priority 0; Quick Attack +1, etc. (simplified)
        const playerFirst = playerSpe >= enemySpe;

        if (playerFirst) {
            _doPlayerMoveFull(playerMove, () => {
                if (_enemy.hp <= 0) { _onEnemyFaint(); return; }
                _enemyTurn(() => {
                    if ((_player.currentHp || 0) <= 0) { _onPlayerFaint(); return; }
                    _doEndOfTurn(() => _showActionMenu());
                });
            });
        } else {
            _enemyTurn(() => {
                if ((_player.currentHp || 0) <= 0) { _onPlayerFaint(); return; }
                _doPlayerMoveFull(playerMove, () => {
                    if (_enemy.hp <= 0) { _onEnemyFaint(); return; }
                    _doEndOfTurn(() => _showActionMenu());
                });
            });
        }
    }

    // Full player move: status checks → move → effects
    function _doPlayerMoveFull(move, cb) {
        // Flinch check
        if (_playerFlinch) {
            _playerFlinch = false;
            _showMessage(`${_getPlayerName()} flinched!`, cb);
            return;
        }
        _playerFlinch = false;

        // Sleep check
        if (_playerStatus && _playerStatus.cond === 'sleep') {
            _playerStatus.turns = (_playerStatus.turns || 0) + 1;
            if (_playerStatus.turns >= 3) {
                _playerStatus = null;
                _player.statusCondition = null;
                _updateStatusDisplay();
                _showMessage(`${_getPlayerName()} woke up!`, () => _doPlayerMoveAction(move, cb));
            } else {
                _showMessage(`${_getPlayerName()} is fast asleep.`, cb);
            }
            return;
        }

        // Freeze check
        if (_playerStatus && _playerStatus.cond === 'freeze') {
            if (Math.random() < 0.2) {
                _playerStatus = null;
                _player.statusCondition = null;
                _updateStatusDisplay();
                _showMessage(`${_getPlayerName()} thawed out!`, () => _doPlayerMoveAction(move, cb));
            } else {
                _showMessage(`${_getPlayerName()} is frozen solid!`, cb);
            }
            return;
        }

        // Paralysis immobilization (25% chance)
        if (_playerStatus && _playerStatus.cond === 'para') {
            if (Math.random() < 0.25) {
                _showMessage(`${_getPlayerName()} is fully paralyzed!`, cb);
                return;
            }
        }

        // Confusion
        if (_playerConfuse > 0) {
            _playerConfuse--;
            _updateStatusDisplay();
            if (Math.random() < 0.5) {
                // Hit self
                const selfDmg = Math.max(1, Math.floor((_playerStatCache.atk * 40) / (_playerStatCache.def * 50)));
                _player.currentHp = Math.max(0, (_player.currentHp || 0) - selfDmg);
                _updateHP();
                _showMessage(`${_getPlayerName()} is confused!\nIt hurt itself in its confusion!`, cb);
                return;
            } else {
                _showMessage(`${_getPlayerName()} is confused!`, () => _doPlayerMoveAction(move, cb));
                return;
            }
        }

        _doPlayerMoveAction(move, cb);
    }

    function _doPlayerMoveAction(move, cb) {
        const fx = MOVE_FX[move.id] || {};
        const playerMon = { level: _player.level || 5, types: (_pokedexDb && _pokedexDb[_player.speciesId])?.types || ['Normal'] };

        // Accuracy check (ignore for status moves that always hit like thunder_wave at full accuracy)
        if (move.accuracy < 100) {
            const playerAcc = _stageMult(_playerStages.acc || 0, true);
            const enemyEva  = _stageMult(_enemyStages.eva || 0, true);
            const hitChance = move.accuracy * playerAcc / enemyEva;
            if (Math.random() * 100 > hitChance) {
                _showMessage(`${_getPlayerName()}'s attack missed!`, cb);
                return;
            }
        }

        const msgs = [`${_getPlayerName()} used ${move.name}!`];

        // Stat-only moves (no damage)
        if (move.power === 0) {
            _applyMoveFxMessages(fx, 'player', msgs, cb);
            return;
        }

        // Multi-hit
        const hits = fx.multiHit ? randInt(fx.multiHit[0], fx.multiHit[1]) : 1;
        let totalDmg = 0;
        for (let h = 0; h < hits; h++) {
            const dmg = calcDamage(
                { level: _player.level || 5, types: playerMon.types }, _playerStatCache, _playerStages, _playerStatus,
                move,
                _enemy, _enemy.stats, _enemyStages, _enemyStatus, false
            );
            _enemy.hp = Math.max(0, _enemy.hp - dmg);
            totalDmg += dmg;
        }
        if (hits > 1) msgs.push(`Hit ${hits} time(s)!`);

        // Effectiveness message
        const eff = fx.ignoreType ? 1 : _typeEff(move.type, _enemy.types || []);
        if (eff >= 2)          msgs.push("It's super effective!");
        else if (eff > 0 && eff < 1) msgs.push("It's not very effective...");
        else if (eff === 0)    msgs.push("It had no effect!");

        _updateHP();

        // Recoil
        if (fx.recoilFrac && totalDmg > 0) {
            const recoil = Math.max(1, Math.floor(totalDmg * fx.recoilFrac));
            _player.currentHp = Math.max(0, (_player.currentHp || 0) - recoil);
            _updateHP();
            msgs.push(`${_getPlayerName()} was hurt by recoil!`);
        }

        // Drain
        if (fx.drainFrac && totalDmg > 0) {
            const drained = Math.max(1, Math.floor(totalDmg * fx.drainFrac));
            const maxHp = _playerStatCache ? _playerStatCache.hp : 100;
            _player.currentHp = Math.min(maxHp, (_player.currentHp || 0) + drained);
            _updateHP();
            msgs.push(`${_getPlayerName()} absorbed energy!`);
        }

        // Self-heal
        if (fx.healFrac) {
            const maxHp = _playerStatCache ? _playerStatCache.hp : 100;
            const heal = Math.max(1, Math.floor(maxHp * fx.healFrac));
            _player.currentHp = Math.min(maxHp, (_player.currentHp || 0) + heal);
            _updateHP();
            msgs.push(`${_getPlayerName()} restored HP!`);
        }

        _applyMoveFxMessages(fx, 'player', msgs, cb);
    }

    // Apply stat changes / status effects from move, build message list, then call cb
    function _applyMoveFxMessages(fx, who, msgs, cb) {
        // Stat changes
        if (fx.statChanges) {
            for (const sc of fx.statChanges) {
                const chance = fx.statChance !== undefined ? fx.statChance : 100;
                if (Math.random() * 100 > chance) continue;
                if (sc.who === 'self') {
                    const target = (who === 'player') ? _playerStages : _enemyStages;
                    const name   = (who === 'player') ? _getPlayerName() : _enemy.name;
                    _applyStage(target, sc.stat, sc.stages, name, msgs);
                } else {
                    const target = (who === 'player') ? _enemyStages : _playerStages;
                    const name   = (who === 'player') ? _enemy.name : _getPlayerName();
                    _applyStage(target, sc.stat, sc.stages, name, msgs);
                }
            }
        }

        // Status infliction
        const statusToApply = fx.status;
        const statusChance  = fx.statusChance || 0;
        if (statusToApply && statusChance > 0 && Math.random() * 100 < statusChance) {
            const targetStatus = (who === 'player') ? _enemyStatus : _playerStatus;
            const targetName   = (who === 'player') ? _enemy.name : _getPlayerName();
            if (_canInflict(targetStatus, statusToApply)) {
                if (statusToApply === 'confuse') {
                    if (who === 'player') { _enemyConfuse = randInt(2, 5); }
                    else                  { _playerConfuse = randInt(2, 5); }
                    msgs.push(`${targetName} became confused!`);
                } else {
                    const newStatus = { cond: statusToApply, turns: 0, counter: 0 };
                    if (who === 'player') {
                        _enemyStatus = newStatus;
                    } else {
                        _playerStatus = newStatus;
                        _player.statusCondition = statusToApply;
                    }
                    msgs.push(`${targetName} ${_statusMsg(statusToApply)}!`);
                }
                _updateStatusDisplay();
            }
        }

        // Flinch
        if (fx.flinchChance && Math.random() * 100 < fx.flinchChance) {
            if (who === 'player') _enemyFlinch = true;
            else                  _playerFlinch = true;
        }

        _showMessages(msgs, cb);
    }

    function _applyStage(stages, stat, delta, name, msgs) {
        const prev = stages[stat] || 0;
        stages[stat] = Math.max(-6, Math.min(6, prev + delta));
        const actual = stages[stat] - prev;
        if (actual === 0) {
            msgs.push(`${name}'s ${stat.toUpperCase()} won't go any ${delta > 0 ? 'higher' : 'lower'}!`);
        } else {
            const words = { 2:'rose sharply', 1:'rose', '-1':'fell', '-2':'fell sharply' }[actual] || (actual > 2 ? 'rose drastically' : 'fell drastically');
            msgs.push(`${name}'s ${stat.toUpperCase()} ${words}!`);
        }
    }

    function _statusMsg(cond) {
        return { burn:"was burned", poison:"was poisoned", badpoison:"was badly poisoned",
                 para:"was paralyzed", sleep:"fell asleep", freeze:"was frozen solid" }[cond] || 'is affected';
    }

    // -----------------------------------------------------------------------
    // Enemy turn
    // -----------------------------------------------------------------------
    function _enemyTurn(cb) {
        if (!_enemy.moves || !_enemy.moves.length) { cb(); return; }

        // Flinch
        if (_enemyFlinch) {
            _enemyFlinch = false;
            _showMessage(`${_enemy.name} flinched!`, cb);
            return;
        }

        // Sleep
        if (_enemyStatus && _enemyStatus.cond === 'sleep') {
            _enemyStatus.turns = (_enemyStatus.turns || 0) + 1;
            if (_enemyStatus.turns >= 3) {
                _enemyStatus = null;
                _updateStatusDisplay();
                _showMessage(`${_enemy.name} woke up!`, () => _enemyMoveAction(cb));
            } else {
                _showMessage(`${_enemy.name} is fast asleep.`, cb);
            }
            return;
        }

        // Freeze
        if (_enemyStatus && _enemyStatus.cond === 'freeze') {
            if (Math.random() < 0.2) {
                _enemyStatus = null;
                _updateStatusDisplay();
                _showMessage(`${_enemy.name} thawed out!`, () => _enemyMoveAction(cb));
            } else {
                _showMessage(`${_enemy.name} is frozen solid!`, cb);
            }
            return;
        }

        // Paralysis
        if (_enemyStatus && _enemyStatus.cond === 'para') {
            if (Math.random() < 0.25) {
                _showMessage(`${_enemy.name} is fully paralyzed!`, cb);
                return;
            }
        }

        // Confusion
        if (_enemyConfuse > 0) {
            _enemyConfuse--;
            _updateStatusDisplay();
            if (Math.random() < 0.5) {
                const selfDmg = Math.max(1, Math.floor((_enemy.stats.atk * 40) / (_enemy.stats.def * 50)));
                _enemy.hp = Math.max(0, _enemy.hp - selfDmg);
                _updateHP();
                _showMessage(`${_enemy.name} is confused!\nIt hurt itself in its confusion!`, () => {
                    if (_enemy.hp <= 0) { _onEnemyFaint(); return; }
                    cb();
                });
                return;
            }
        }

        _enemyMoveAction(cb);
    }

    function _enemyMoveAction(cb) {
        // Simple AI: pick best move considering type effectiveness + PP
        const move = _enemyPickMove();
        if (!move) { cb(); return; }

        const fx = MOVE_FX[move.id] || {};
        const msgs = [`${_enemy.name} used ${move.name}!`];

        // Accuracy check
        if (move.accuracy < 100) {
            const enemyAcc = _stageMult(_enemyStages.acc || 0, true);
            const playerEva = _stageMult(_playerStages.eva || 0, true);
            const hitChance = move.accuracy * enemyAcc / playerEva;
            if (Math.random() * 100 > hitChance) {
                _showMessage(`${_enemy.name}'s attack missed!`, cb);
                return;
            }
        }

        if (move.power === 0) {
            _applyMoveFxMessages(fx, 'enemy', msgs, cb);
            return;
        }

        const hits = fx.multiHit ? randInt(fx.multiHit[0], fx.multiHit[1]) : 1;
        let totalDmg = 0;
        for (let h = 0; h < hits; h++) {
            const playerTypes = (_pokedexDb && _pokedexDb[_player.speciesId])?.types || ['Normal'];
            const dmg = calcDamage(
                _enemy, _enemy.stats, _enemyStages, _enemyStatus,
                move,
                { types: playerTypes }, _playerStatCache, _playerStages, _playerStatus, false
            );
            _player.currentHp = Math.max(0, (_player.currentHp || 0) - dmg);
            totalDmg += dmg;
        }
        if (hits > 1) msgs.push(`Hit ${hits} time(s)!`);

        const playerTypes = (_pokedexDb && _pokedexDb[_player.speciesId])?.types || ['Normal'];
        const eff = fx.ignoreType ? 1 : _typeEff(move.type, playerTypes);
        if (eff >= 2)         msgs.push("It's super effective!");
        else if (eff > 0 && eff < 1) msgs.push("It's not very effective...");
        else if (eff === 0)   msgs.push("It had no effect!");

        _updateHP();

        if (fx.recoilFrac && totalDmg > 0) {
            const recoil = Math.max(1, Math.floor(totalDmg * fx.recoilFrac));
            _enemy.hp = Math.max(0, _enemy.hp - recoil);
            _updateHP();
            msgs.push(`${_enemy.name} was hurt by recoil!`);
        }
        if (fx.drainFrac && totalDmg > 0) {
            const drained = Math.max(1, Math.floor(totalDmg * fx.drainFrac));
            _enemy.hp = Math.min(_enemy.maxHp, _enemy.hp + drained);
            _updateHP();
        }

        _applyMoveFxMessages(fx, 'enemy', msgs, () => {
            if (_enemy.hp <= 0) { _onEnemyFaint(); return; }
            cb();
        });
    }

    function _enemyPickMove() {
        if (!_enemy.moves || !_enemy.moves.length) return null;
        const available = _enemy.moves.filter(m => m && m.currentPP > 0);
        if (!available.length) {
            // Struggle
            return { id:'struggle', name:'Struggle', power:50, type:'Normal', accuracy:100, pp:99, currentPP:99, category:'physical' };
        }

        const playerTypes = (_pokedexDb && _pokedexDb[_player.speciesId])?.types || ['Normal'];

        // Score each move: prefer super-effective damaging moves
        let best = null, bestScore = -1;
        for (const move of available) {
            let score = 0;
            if (move.power > 0) {
                const eff = _typeEff(move.type, playerTypes);
                score = move.power * eff;
                // Prefer STAB
                if (_enemy.types.includes(move.type)) score *= 1.5;
                // Add some randomness
                score *= (0.85 + Math.random() * 0.3);
            } else {
                // Status moves: occasional use if relevant
                const fx = MOVE_FX[move.id] || {};
                if (fx.status && _canInflict(_playerStatus, fx.status)) score = 30 + Math.random() * 20;
                if (fx.statChanges) score = 20 + Math.random() * 20;
            }
            if (score > bestScore) { bestScore = score; best = move; }
        }
        return best || available[Math.floor(Math.random() * available.length)];
    }

    // -----------------------------------------------------------------------
    // End-of-turn effects (poison, burn, bad poison)
    // -----------------------------------------------------------------------
    function _doEndOfTurn(cb) {
        const msgs = [];

        // Player status damage
        if (_playerStatus) {
            const maxHp = _playerStatCache ? _playerStatCache.hp : 100;
            if (_playerStatus.cond === 'burn') {
                const dmg = Math.max(1, Math.floor(maxHp / 8));
                _player.currentHp = Math.max(0, (_player.currentHp || 0) - dmg);
                msgs.push(`${_getPlayerName()} is hurt by its burn!`);
                _updateHP();
            } else if (_playerStatus.cond === 'poison') {
                const dmg = Math.max(1, Math.floor(maxHp / 8));
                _player.currentHp = Math.max(0, (_player.currentHp || 0) - dmg);
                msgs.push(`${_getPlayerName()} is hurt by poison!`);
                _updateHP();
            } else if (_playerStatus.cond === 'badpoison') {
                _playerStatus.counter = (_playerStatus.counter || 0) + 1;
                const dmg = Math.max(1, Math.floor(maxHp / 16 * _playerStatus.counter));
                _player.currentHp = Math.max(0, (_player.currentHp || 0) - dmg);
                msgs.push(`${_getPlayerName()} is badly hurt by poison!`);
                _updateHP();
            }
        }

        // Enemy status damage
        if (_enemyStatus) {
            if (_enemyStatus.cond === 'burn') {
                const dmg = Math.max(1, Math.floor(_enemy.maxHp / 8));
                _enemy.hp = Math.max(0, _enemy.hp - dmg);
                msgs.push(`${_enemy.name} is hurt by its burn!`);
                _updateHP();
            } else if (_enemyStatus.cond === 'poison') {
                const dmg = Math.max(1, Math.floor(_enemy.maxHp / 8));
                _enemy.hp = Math.max(0, _enemy.hp - dmg);
                msgs.push(`${_enemy.name} is hurt by poison!`);
                _updateHP();
            } else if (_enemyStatus.cond === 'badpoison') {
                _enemyStatus.counter = (_enemyStatus.counter || 0) + 1;
                const dmg = Math.max(1, Math.floor(_enemy.maxHp / 16 * _enemyStatus.counter));
                _enemy.hp = Math.max(0, _enemy.hp - dmg);
                msgs.push(`${_enemy.name} is badly hurt by poison!`);
                _updateHP();
            }
        }

        if (!msgs.length) { cb(); return; }

        _showMessages(msgs, () => {
            if (_enemy.hp <= 0) { _onEnemyFaint(); return; }
            if ((_player.currentHp || 0) <= 0) { _onPlayerFaint(); return; }
            cb();
        });
    }

    // -----------------------------------------------------------------------
    // Faint / EXP / End
    // -----------------------------------------------------------------------
    function _onEnemyFaint() {
        const expGain = giveExp(_player, _enemy);
        _showMessage(`${_enemy.name} fainted!`, () => {
            if (expGain) {
                _showMessage(`${_getPlayerName()} gained ${expGain} EXP. Points!`, () => _endBattle('won'));
            } else {
                _endBattle('won');
            }
        });
    }

    function _onPlayerFaint() {
        // Save current HP to save state
        _player.currentHp = 0;
        _savePP();
        GameSave.markDirty();

        // Check if any party member can still fight
        const st = window.GameSave && GameSave.state;
        const aliveInParty = (st && st.party || []).some(m => m && (m.currentHp || 0) > 0 && m !== _player);

        _showMessage(`${_getPlayerName()} fainted!`, () => {
            if (aliveInParty) {
                _showMessage('Choose another Pokémon!', () => _showPartySelect(true));
            } else {
                _endBattle('lost');
            }
        });
    }

    // -----------------------------------------------------------------------
    // Keyboard / D-pad input
    // -----------------------------------------------------------------------
    function _onKeyDown(e) {
        if (!_active) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') {
            e.preventDefault();
            if (_pendingCallback) { _advanceMessage(); return; }
        }
        if (_phase === 'action') {
            if (e.key === 'ArrowLeft')  _highlightAction(_selectedAction % 2 === 1 ? _selectedAction - 1 : _selectedAction);
            if (e.key === 'ArrowRight') _highlightAction(_selectedAction % 2 === 0 ? _selectedAction + 1 : _selectedAction);
            if (e.key === 'ArrowUp')    _highlightAction(Math.max(0, _selectedAction - 2));
            if (e.key === 'ArrowDown')  _highlightAction(Math.min(3, _selectedAction + 2));
            if (e.key === 'Enter' || e.key === 'z') _onActionSelect(_selectedAction);
        } else if (_phase === 'move_select') {
            const btns = _el ? _el.querySelectorAll('.bt-move-btn') : [];
            if (e.key === 'ArrowUp')   _highlightMove(Math.max(0, _selectedMove - 1));
            if (e.key === 'ArrowDown') _highlightMove(Math.min(btns.length - 1, _selectedMove + 1));
            if (e.key === 'Enter' || e.key === 'z') { const m = _el && _el.querySelectorAll('.bt-move-btn')[_selectedMove]; if(m) m.click(); }
            if (e.key === 'Escape' || e.key === 'x') _showActionMenu();
        } else if (_phase === 'bag_select') {
            const btns = _el ? _el.querySelectorAll('.bt-bag-btn') : [];
            if (e.key === 'ArrowUp')   _highlightBag(Math.max(0, _selectedBag - 1));
            if (e.key === 'ArrowDown') _highlightBag(Math.min(btns.length - 1, _selectedBag + 1));
            if (e.key === 'Enter' || e.key === 'z') _useBagItem(_selectedBag);
            if (e.key === 'Escape' || e.key === 'x') _showActionMenu();
        } else if (_phase === 'party_select') {
            const btns = _el ? _el.querySelectorAll('.bt-party-btn') : [];
            if (e.key === 'ArrowUp')   _highlightParty(Math.max(0, _selectedParty - 1));
            if (e.key === 'ArrowDown') _highlightParty(Math.min(btns.length - 1, _selectedParty + 1));
            if (e.key === 'Enter' || e.key === 'z') {
                const btn = btns[_selectedParty];
                if (btn) btn.click();
            }
            if (e.key === 'Escape' || e.key === 'x') _showActionMenu();
        }
    }

    function handleInput(jp) {
        if (!_active) return;
        if (jp.a) {
            if (_pendingCallback) { _advanceMessage(); return; }
            // Use else-if to prevent cascade: _onActionSelect changes _phase, and we must
            // not immediately act on the new phase in the same A-button press.
            if (_phase === 'action')            _onActionSelect(_selectedAction);
            else if (_phase === 'move_select')  { const m = _el && _el.querySelectorAll('.bt-move-btn')[_selectedMove]; if(m) m.click(); }
            else if (_phase === 'bag_select')   _useBagItem(_selectedBag);
            else if (_phase === 'party_select') { const b = _el && _el.querySelectorAll('.bt-party-btn')[_selectedParty]; if(b) b.click(); }
        }
        if (jp.b) {
            if (_phase === 'move_select' || _phase === 'bag_select') _showActionMenu();
            if (_phase === 'party_select') _showActionMenu();
        }
        if (_phase === 'action') {
            if (jp.up)    _highlightAction(Math.max(0, _selectedAction - 2));
            if (jp.down)  _highlightAction(Math.min(3, _selectedAction + 2));
            if (jp.left)  _highlightAction(_selectedAction % 2 === 1 ? _selectedAction - 1 : _selectedAction);
            if (jp.right) _highlightAction(_selectedAction % 2 === 0 ? _selectedAction + 1 : _selectedAction);
        }
        if (_phase === 'move_select') {
            // Move box is a 2-column grid: indices 0,1 = row 0; 2,3 = row 1; back btn = last
            const moveBtns = _el ? Array.from(_el.querySelectorAll('.bt-move-btn')).filter(b => !b.classList.contains('bt-back-btn')) : [];
            const numMoves = moveBtns.length;
            const allBtns  = _el ? _el.querySelectorAll('.bt-move-btn') : [];
            const total    = allBtns.length; // includes back button
            const cur      = _selectedMove;
            const isBack   = cur >= numMoves;
            if (jp.up) {
                if (isBack) _highlightMove(Math.max(0, numMoves - (numMoves % 2 === 0 ? 2 : 1)));
                else        _highlightMove(Math.max(0, cur - 2));
            }
            if (jp.down) {
                if (!isBack && cur + 2 < numMoves) _highlightMove(cur + 2);
                else if (!isBack)                  _highlightMove(total - 1); // go to back button
            }
            if (jp.left  && !isBack && cur % 2 === 1) _highlightMove(cur - 1);
            if (jp.right && !isBack && cur % 2 === 0 && cur + 1 < numMoves) _highlightMove(cur + 1);
        }
        if (_phase === 'bag_select') {
            const btns = _el ? _el.querySelectorAll('.bt-bag-btn') : [];
            if (jp.up)    _highlightBag(Math.max(0, _selectedBag - 1));
            if (jp.down)  _highlightBag(Math.min(btns.length - 1, _selectedBag + 1));
            if (jp.left)  { _bagPocket = (_bagPocket - 1 + BAG_POCKETS.length) % BAG_POCKETS.length; _selectedBag = 0; _rebuildBagUI(); }
            if (jp.right) { _bagPocket = (_bagPocket + 1) % BAG_POCKETS.length; _selectedBag = 0; _rebuildBagUI(); }
        }
        if (_phase === 'party_select') {
            const btns = _el ? _el.querySelectorAll('.bt-party-btn') : [];
            if (jp.up)   _highlightParty(Math.max(0, _selectedParty - 1));
            if (jp.down) _highlightParty(Math.min(btns.length - 1, _selectedParty + 1));
        }
    }

    // -----------------------------------------------------------------------
    // End battle
    // -----------------------------------------------------------------------
    function _endBattle(result) {
        _savePP();
        // Persist status to save state
        if (_player) _player.statusCondition = _playerStatus ? _playerStatus.cond : null;
        _active = false;
        document.removeEventListener('keydown', _onKeyDown);
        if (_el && _el.parentNode) _el.parentNode.removeChild(_el);
        _el = null;
        GameSave.markDirty();
        if (_onEnd) _onEnd(result);
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------
    function isActive() { return _active; }

    function consumeInput(jp) {
        if (!_active) return false;
        handleInput(jp);
        return true;
    }

    return { start, isActive, consumeInput, LEGENDARIES, rollEncounter };
})();
