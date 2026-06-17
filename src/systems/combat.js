// GameCombat — Tempo + Intervention battle RULES (DESIGN.md §1). PURE LOGIC.
// NO DOM, NO rendering, deterministic (seeded RNG), serializable state.
// Reference implementation a Unity/C# port mirrors function-for-function; the
// view only feeds input and renders the returned state. All tuning/content from
// data/systems/*.json — nothing hardcoded here.
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
        return Object.keys(state.actors).map(k => state.actors[k]).filter(a => a.side === side && a.hp > 0);
    }
    function oppSide(side) { return side === 'player' ? 'enemy' : 'player'; }
    function log(state, type, data) { state.log.push(Object.assign({ t: state.time, type }, data)); }

    // ---- battle construction ---------------------------------------------
    // db = { combat, skills, affinities }. actors = [{id, side, name, affinity,
    //   stats:{hp,atk,def,speed}, loadout:[skillId], ai?}]. side: 'player'|'enemy'.
    function createBattle(db, actorDefs, seed) {
        const state = {
            rng: RNG.create(seed), tuning: db.combat,
            chart: (db.affinities && db.affinities.chart) || {},
            time: 0, actors: {}, order: [], log: [],
            over: false, winner: null, surveillance: 0, _sumN: 0,
        };
        for (const d of actorDefs) { state.actors[d.id] = _mkActor(db, d); state.order.push(d.id); }
        return state;
    }

    // Build one actor, folding passive + reactive skills into traits up front.
    function _mkActor(db, d) {
        let maxHp = d.stats.hp, defBonus = 0, evadeChance = 0, critChance = 0, counterChance = 0;
        const actives = [];
        for (const sid of (d.loadout || [])) {
            const sk = db.skills[sid]; if (!sk) continue;
            const e = sk.effect || {};
            if (sk.kind === 'passive') {
                if (e.type === 'maxHp')  maxHp = Math.round(maxHp * (1 + e.amount));
                else if (e.type === 'def')    defBonus += e.amount;
                else if (e.type === 'evade')  evadeChance += e.amount;
                else if (e.type === 'critUp') critChance += e.amount;
            } else if (sk.kind === 'reactive') {
                if (e.type === 'counter') counterChance += (e.chance || 0);
                else if (e.type === 'evade') evadeChance += (e.chance || 0);
            } else if (sk.kind === 'active') {
                actives.push(sid);
            }
            // utility skills are out-of-battle; not added to the battle loadout
        }
        return {
            id: d.id, side: d.side, name: d.name, affinity: d.affinity || null, ai: !!d.ai,
            battler: d.battler || null, charset: d.charset || null,   // presentation: sprite art travels with the actor
            atk: d.stats.atk, def: d.stats.def, speed: d.stats.speed,
            hp: maxHp, maxHp, tempo: 0, hasActed: false,
            defBonus, evadeChance, critChance, counterChance,
            // timed statuses (all decrement on this actor's own turn)
            defBuff: 0, defBuffTurns: 0, atkBuff: 0, atkBuffTurns: 0,
            speedMod: 0, speedModTurns: 0, markMult: 0, markTurns: 0,
            sundered: 0, sunderTurns: 0, taunting: 0, dot: [],
            loadout: actives,
        };
    }

    // ---- tempo: ONE step (real-time view drives this; AI uses advanceToReady)
    // Returns the id of an actor whose Tempo filled, or null (also sets over).
    function step(state) {
        if (state.over) return null;
        const max = state.tuning.tempoMax, sz = state.tuning.tickStep;
        const p = aliveOnSide(state, 'player').length, e = aliveOnSide(state, 'enemy').length;
        if (p === 0 || e === 0) { state.over = true; state.winner = e === 0 ? 'player' : 'enemy'; return null; }
        state.time += sz;
        for (const id of state.order) {
            const a = state.actors[id]; if (a.hp <= 0) continue;
            const sp = a.speed * (1 + (a.speedMod || 0));
            a.tempo += Math.max(0, sp) * (sz / 100);
        }
        _interventionTick(state, sz);
        for (const id of state.order) { const a = state.actors[id]; if (a.hp > 0 && a.tempo >= max) return id; }
        return null;
    }
    // Fast-forward until someone is READY or the battle ends (AI / headless).
    function advanceToReady(state) {
        if (state.over) return null;
        let guard = 100000;
        while (guard-- > 0) { const id = step(state); if (state.over) return null; if (id) return id; }
        return null;
    }

    // ---- resolve an action -----------------------------------------------
    // action = { actorId, skillId, targetId }. Mutates+returns state.
    function act(state, db, action) {
        const a = state.actors[action.actorId];
        const sk = db.skills[action.skillId];
        if (!a || a.hp <= 0 || !sk) return state;
        _startTurn(state, a);                 // DoT + decrement this actor's timers
        if (a.hp <= 0) { a.tempo -= sk.tempoCost; return state; }
        const eff = sk.effect || {};

        if (eff.type === 'heal') {
            const heal = Math.round(a.maxHp * eff.amount);
            a.hp = Math.min(a.maxHp, a.hp + heal);
            log(state, 'heal', { actor: a.id, skill: action.skillId, amount: heal, hp: a.hp });
        } else if (eff.type === 'defUp') {
            a.defBuff = Math.max(a.defBuff, eff.amount); a.defBuffTurns = eff.turns || 2;
            log(state, 'buff', { actor: a.id, skill: action.skillId, defUp: eff.amount });
        } else if (eff.type === 'partyBuff') {
            const kind = eff.tag === 'defense' ? 'def' : 'atk';
            for (const al of aliveOnSide(state, a.side)) {
                if (kind === 'def') { al.defBuff = Math.max(al.defBuff, eff.amount); al.defBuffTurns = 3; }
                else { al.atkBuff = Math.max(al.atkBuff, eff.amount); al.atkBuffTurns = 3; }
            }
            log(state, 'partybuff', { actor: a.id, skill: action.skillId, kind, amount: eff.amount });
        } else if (eff.type === 'taunt') {
            a.taunting = eff.turns || 2;
            log(state, 'taunt', { actor: a.id, skill: action.skillId, turns: a.taunting });
        } else if (eff.type === 'summon') {
            _summon(state, db, a, sk);
        } else if (sk.power > 0) {
            _attack(state, db, a, sk, action);
        } else if (eff.type === 'slow' || eff.type === 'markTarget' || eff.type === 'sunder' || eff.type === 'applyToxin') {
            const t = state.actors[action.targetId];
            if (t && t.hp > 0) { _applyRider(state, a, t, eff); log(state, 'debuff', { actor: a.id, skill: action.skillId, target: t.id, effect: eff.type }); }
        }

        if (eff.type === 'selfCost') { a.hp = Math.max(1, a.hp - Math.round(a.maxHp * eff.amount)); }
        a.hasActed = true;
        a.tempo -= sk.tempoCost;
        return state;
    }

    // Damaging skill: primary target (+AoE splash), then riders + counter.
    function _attack(state, db, a, sk, action) {
        const eff = sk.effect || {};
        const primary = state.actors[action.targetId];
        if (!primary) return;
        const targets = [primary];
        if (eff.type === 'aoe') {
            for (const o of aliveOnSide(state, oppSide(a.side))) if (o.id !== primary.id) targets.push(o);
        }
        for (let i = 0; i < targets.length; i++) {
            const t = targets[i]; if (!t || t.hp <= 0) continue;
            const splash = (i === 0) ? 1 : (eff.splits || 0.5);
            const r = _damage(state, a, t, sk, splash);
            if (r.evaded) { log(state, 'miss', { actor: a.id, skill: action.skillId, target: t.id }); continue; }
            t.hp = Math.max(0, t.hp - r.dmg);
            log(state, 'hit', { actor: a.id, skill: action.skillId, target: t.id, dmg: r.dmg, crit: r.crit, targetHp: t.hp });
            if (i === 0 && t.hp > 0 && ['slow', 'markTarget', 'sunder', 'applyToxin'].indexOf(eff.type) >= 0)
                _applyRider(state, a, t, eff);          // rider applies to primary only
            if (t.hp === 0) log(state, 'down', { actor: t.id });
            else _counter(state, db, a, t);             // survivors may counter
        }
    }

    function _damage(state, atk, def, sk, splash) {
        if (def.evadeChance && RNG.next(state.rng) < def.evadeChance) return { dmg: 0, evaded: true };
        const effAtk = atk.atk * (1 + (atk.atkBuff || 0));
        const effDef = Math.max(1, (def.def * (1 + (def.defBuff || 0) + (def.defBonus || 0))) * (1 - (def.sundered || 0)));
        let base = (effAtk * sk.power) * (effAtk / (effAtk + effDef)) * (splash || 1);
        base *= affinityMult(state.chart, sk.affinity || atk.affinity, def.affinity);
        const e = sk.effect || {};
        if (e.type === 'bonusVsUnaware' && !def.hasActed) base *= (1 + (e.amount || 0));
        base *= (1 + (def.markMult || 0));
        let crit = false;
        const critCh = (atk.critChance || 0) + (e.type === 'critUp' ? (e.amount || 0) : 0);
        if (critCh && RNG.next(state.rng) < critCh) { base *= 1.5; crit = true; }
        const [vmin, vmax] = state.tuning.variance;
        return { dmg: Math.max(1, Math.round(base * RNG.range(state.rng, vmin, vmax))), evaded: false, crit };
    }

    // Non-damaging or rider status onto a target.
    function _applyRider(state, src, t, eff) {
        if (eff.type === 'slow')            { t.speedMod = -(eff.amount || 0.25); t.speedModTurns = eff.turns || 3; }
        else if (eff.type === 'markTarget') { t.markMult = eff.amount || 0.18; t.markTurns = eff.turns || 3; }
        else if (eff.type === 'sunder')     { t.sundered = Math.min(0.9, (t.sundered || 0) + (eff.amount || 0.3)); t.sunderTurns = eff.turns || 3; }
        else if (eff.type === 'applyToxin') { t.dot.push({ dmg: Math.max(1, Math.round(src.atk * (eff.amount || 0.2))), turns: eff.turns || 3 }); }
    }

    function _counter(state, db, attacker, defender) {
        if (!defender.counterChance || attacker.hp <= 0) return;
        if (RNG.next(state.rng) >= defender.counterChance) return;
        const r = _damage(state, defender, attacker, { power: 0.6, effect: {} }, 1);
        if (r.evaded) return;
        attacker.hp = Math.max(0, attacker.hp - r.dmg);
        log(state, 'counter', { actor: defender.id, target: attacker.id, dmg: r.dmg, targetHp: attacker.hp });
        if (attacker.hp === 0) log(state, 'down', { actor: attacker.id });
    }

    function _summon(state, db, summoner, sk) {
        const id = 'sum' + (++state._sumN);
        state.actors[id] = {
            id, side: summoner.side, name: 'Turret', affinity: summoner.affinity, ai: true, summon: true,
            battler: 'rtp/Puppet.png',   // construct ally art
            atk: Math.max(6, Math.round(summoner.atk * 0.6)), def: 10, speed: 50,
            hp: 25, maxHp: 25, tempo: 0, hasActed: false,
            defBonus: 0, evadeChance: 0, critChance: 0, counterChance: 0,
            defBuff: 0, defBuffTurns: 0, atkBuff: 0, atkBuffTurns: 0, speedMod: 0, speedModTurns: 0,
            markMult: 0, markTurns: 0, sundered: 0, sunderTurns: 0, taunting: 0, dot: [],
            loadout: ['jab'],
        };
        state.order.push(id);
        log(state, 'summon', { actor: summoner.id, summon: id });
    }

    // Start-of-turn upkeep: damage-over-time + decrement this actor's timers.
    function _startTurn(state, a) {
        if (a.dot && a.dot.length) {
            let total = 0;
            for (const d of a.dot) { total += d.dmg; d.turns--; }
            a.dot = a.dot.filter(d => d.turns > 0);
            if (total > 0) {
                a.hp = Math.max(0, a.hp - total);
                log(state, 'dot', { actor: a.id, dmg: total, hp: a.hp });
                if (a.hp === 0) log(state, 'down', { actor: a.id });
            }
        }
        if (a.defBuffTurns > 0 && --a.defBuffTurns === 0) a.defBuff = 0;
        if (a.atkBuffTurns > 0 && --a.atkBuffTurns === 0) a.atkBuff = 0;
        if (a.speedModTurns > 0 && --a.speedModTurns === 0) a.speedMod = 0;
        if (a.markTurns > 0 && --a.markTurns === 0) a.markMult = 0;
        if (a.sunderTurns > 0 && --a.sunderTurns === 0) a.sundered = 0;
        if (a.taunting > 0) a.taunting--;
    }

    // ---- intervention: the System as a third will -------------------------
    function _interventionTick(state, step) {
        const iv = state.tuning.intervention;
        if (!iv || !iv.enabled) return;
        state._ivTempo = (state._ivTempo || 0) + iv.speed * (step / 100);
        if (state._ivTempo < state.tuning.tempoMax) return;
        state._ivTempo = 0;
        const hurt = aliveOnSide(state, 'player').find(a => a.hp / a.maxHp <= iv.helpThreshold);
        if (hurt) {
            const heal = Math.round(hurt.maxHp * 0.18);
            hurt.hp = Math.min(hurt.maxHp, hurt.hp + heal);
            state.surveillance += iv.surveillancePerHelp;
            log(state, 'intervention', { kind: 'emergency_restore', actor: hurt.id, heal, surveillance: state.surveillance });
        }
    }

    // ---- deterministic enemy / AI-ally AI ---------------------------------
    function enemyAction(state, db, actorId) {
        const a = state.actors[actorId];
        const foes = aliveOnSide(state, oppSide(a.side));
        // Taunt forces targeting: if any foe is taunting, it must be the target.
        const taunter = foes.find(f => f.taunting > 0);
        const target = taunter || (foes.length ? RNG.pick(state.rng, foes) : null);
        const atks = a.loadout.map(id => db.skills[id]).filter(s => s && s.power > 0);
        const sk = atks.length ? atks.reduce((b, s) => s.power > b.power ? s : b) : db.skills[a.loadout[0]];
        const skillId = a.loadout.find(id => db.skills[id] === sk) || a.loadout[0];
        return { actorId, skillId, targetId: target ? target.id : null };
    }

    const GameCombat = { createBattle, step, advanceToReady, act, enemyAction };
    root.GameCombat = GameCombat;
    if (typeof module !== 'undefined' && module.exports) module.exports = GameCombat;
})(typeof window !== 'undefined' ? window : globalThis);
