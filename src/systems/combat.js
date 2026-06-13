// GameCombat — Tempo + Intervention battle RULES (DESIGN.md §1). PURE LOGIC.
// NO DOM, NO rendering, deterministic (seeded RNG), serializable state.
// This is the reference implementation a Unity/C# port mirrors function-for-
// function; the browser view only feeds input and renders the returned state.
// All tuning/content comes from data/systems/*.json — nothing is hardcoded here.
(function (root) {
    'use strict';
    const RNG = root.GameRNG || (typeof require !== 'undefined' && require('./rng.js'));

    // ---- helpers ----------------------------------------------------------
    function affinityMult(chart, atkAff, defAff) {
        if (!atkAff || !defAff || !chart) return 1.0;
        const row = chart[atkAff];
        return (row && row[defAff] != null) ? row[defAff] : 1.0;
    }

    function aliveOnSide(state, side) {
        return Object.values(state.actors).filter(a => a.side === side && a.hp > 0);
    }

    function log(state, type, data) { state.log.push(Object.assign({ t: state.time, type }, data)); }

    // ---- battle construction ---------------------------------------------
    // db = { combat, skills, affinities }. actors = [{id, side, name, affinity,
    //   stats:{hp,atk,def,speed}, loadout:[skillId]}]. side: 'player' | 'enemy'.
    function createBattle(db, actorDefs, seed) {
        const state = {
            rng: RNG.create(seed),
            tuning: db.combat,
            chart: (db.affinities && db.affinities.chart) || {},
            time: 0,
            actors: {},
            order: [],
            log: [],
            over: false,
            winner: null,
            surveillance: 0,
        };
        for (const d of actorDefs) {
            // Passive skills modify base stats up front (e.g. Toughness → +maxHp).
            let maxHp = d.stats.hp;
            for (const sid of (d.loadout || [])) {
                const sk = db.skills[sid];
                if (sk && sk.kind === 'passive' && sk.effect && sk.effect.type === 'maxHp')
                    maxHp = Math.round(maxHp * (1 + sk.effect.amount));
            }
            state.actors[d.id] = {
                id: d.id, side: d.side, name: d.name, affinity: d.affinity || null,
                atk: d.stats.atk, def: d.stats.def, speed: d.stats.speed,
                hp: maxHp, maxHp,
                tempo: 0, defBuff: 0, defBuffTurns: 0,
                loadout: (d.loadout || []).filter(sid => db.skills[sid] && db.skills[sid].kind !== 'passive'),
            };
            state.order.push(d.id);
        }
        return state;
    }

    // ---- tempo: advance until someone is READY (or battle ends) -----------
    // Returns the id of the actor whose Tempo bar filled first (deterministic),
    // or null if the battle is already over. Pure w.r.t. inputs besides `state`.
    function advanceToReady(state) {
        if (state.over) return null;
        const max = state.tuning.tempoMax, step = state.tuning.tickStep;
        let guard = 100000;
        while (guard-- > 0) {
            // Battle end check
            const p = aliveOnSide(state, 'player').length, e = aliveOnSide(state, 'enemy').length;
            if (p === 0 || e === 0) { state.over = true; state.winner = e === 0 ? 'player' : 'enemy'; return null; }
            // Tick every living actor's tempo by speed.
            state.time += step;
            for (const id of state.order) {
                const a = state.actors[id];
                if (a.hp <= 0) continue;
                a.tempo += a.speed * (step / 100);
            }
            // Intervention (the System) fills its own bar between actors.
            _interventionTick(state, step);
            // First to fill (ties broken by turn order) acts.
            for (const id of state.order) {
                const a = state.actors[id];
                if (a.hp > 0 && a.tempo >= max) return id;
            }
        }
        return null; // safety
    }

    // ---- resolve an action -----------------------------------------------
    // action = { actorId, skillId, targetId }. Mutates+returns state. Caller
    // gets readiness again via advanceToReady.
    function act(state, db, action) {
        const a = state.actors[action.actorId];
        const sk = db.skills[action.skillId];
        if (!a || a.hp <= 0 || !sk) return state;

        if (sk.effect && sk.effect.type === 'heal') {
            const heal = Math.round(a.maxHp * sk.effect.amount);
            a.hp = Math.min(a.maxHp, a.hp + heal);
            log(state, 'heal', { actor: a.id, skill: action.skillId, amount: heal, hp: a.hp });
        } else if (sk.effect && sk.effect.type === 'defUp') {
            a.defBuff = sk.effect.amount; a.defBuffTurns = sk.effect.turns;
            log(state, 'buff', { actor: a.id, skill: action.skillId, defUp: sk.effect.amount });
        } else if (sk.power > 0) {
            const t = state.actors[action.targetId];
            if (t && t.hp > 0) {
                const dmg = _damage(state, a, t, sk);
                t.hp = Math.max(0, t.hp - dmg);
                log(state, 'hit', { actor: a.id, skill: action.skillId, target: t.id, dmg, targetHp: t.hp });
                if (t.hp === 0) log(state, 'down', { actor: t.id });
            }
        }
        // Action weight: spend Tempo to recover from the move.
        a.tempo -= sk.tempoCost;
        // Tick down this actor's defensive buff each time it acts.
        if (a.defBuffTurns > 0 && (--a.defBuffTurns === 0)) a.defBuff = 0;
        return state;
    }

    function _damage(state, atk, def, sk) {
        const effDef = def.def * (1 + (def.defBuff || 0));
        const base = (atk.atk * sk.power) * (atk.atk / (atk.atk + effDef));
        const aff = affinityMult(state.chart, sk.affinity || atk.affinity, def.affinity);
        const [vmin, vmax] = state.tuning.variance;
        const variance = RNG.range(state.rng, vmin, vmax);
        return Math.max(1, Math.round(base * aff * variance));
    }

    // ---- intervention: the System as a third will -------------------------
    function _interventionTick(state, step) {
        const iv = state.tuning.intervention;
        if (!iv || !iv.enabled) return;
        state._ivTempo = (state._ivTempo || 0) + iv.speed * (step / 100);
        if (state._ivTempo < state.tuning.tempoMax) return;
        state._ivTempo = 0;
        // Bait: if a player actor is hurting, the System "helps" — and logs Surveillance.
        const hurt = aliveOnSide(state, 'player').find(a => a.hp / a.maxHp <= iv.helpThreshold);
        if (hurt) {
            const heal = Math.round(hurt.maxHp * 0.18);
            hurt.hp = Math.min(hurt.maxHp, hurt.hp + heal);
            state.surveillance += iv.surveillancePerHelp;
            log(state, 'intervention', { kind: 'emergency_restore', actor: hurt.id, heal, surveillance: state.surveillance });
        }
    }

    // ---- simple enemy AI (deterministic) ----------------------------------
    function enemyAction(state, db, actorId) {
        const a = state.actors[actorId];
        const target = RNG.pick(state.rng, aliveOnSide(state, 'player'));
        // Prefer the heaviest affordable attack; fall back to a jab.
        const atks = a.loadout.map(id => db.skills[id]).filter(s => s.power > 0);
        const sk = atks.length ? atks.reduce((b, s) => s.power > b.power ? s : b) : db.skills[a.loadout[0]];
        const skillId = a.loadout.find(id => db.skills[id] === sk) || a.loadout[0];
        return { actorId, skillId, targetId: target ? target.id : null };
    }

    const GameCombat = { createBattle, advanceToReady, act, enemyAction };
    root.GameCombat = GameCombat;
    if (typeof module !== 'undefined' && module.exports) module.exports = GameCombat;
})(typeof window !== 'undefined' ? window : globalThis);
