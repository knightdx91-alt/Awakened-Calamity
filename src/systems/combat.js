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
        // External bonuses (relics now, gear later): a flat, data-driven trait
        // bundle folded in on top of skills. Keeps combat engine-agnostic — any
        // data layer can feed {crit, evade, defBonus, lifesteal, thorns}.
        const b = d.bonuses || {};
        critChance += (b.crit || 0);
        evadeChance += (b.evade || 0);
        defBonus += (b.defBonus || 0);
        const lifesteal = b.lifesteal || 0, thorns = b.thorns || 0;
        // Resource pools: MP fuels magical (affinity) skills, SP (stamina) fuels
        // physical ones. Defaults if the build doesn't specify.
        const maxMp = (d.stats.mp != null) ? d.stats.mp : 30;
        const maxSp = (d.stats.sp != null) ? d.stats.sp : 100;
        return {
            id: d.id, side: d.side, name: d.name, affinity: d.affinity || null, ai: !!d.ai,
            battler: d.battler || null, charset: d.charset || null,   // presentation: sprite art travels with the actor
            atk: d.stats.atk, def: d.stats.def, speed: d.stats.speed,
            hp: maxHp, maxHp, mp: maxMp, maxMp, sp: maxSp, maxSp, tempo: 0, hasActed: false,
            defBonus, evadeChance, critChance, counterChance, lifesteal, thorns,
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
        if (state.pendingSave) return null;            // paused: awaiting the player's save choice
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
        while (guard-- > 0) { if (state.pendingSave) return null; const id = step(state); if (state.over) return null; if (id) return id; }
        return null;
    }

    // ---- resource costs ---------------------------------------------------
    // A skill's cost: magical (has affinity) draws MP, physical (deals damage)
    // draws SP/stamina, support/utility a little SP. Scales with the skill's
    // tempo weight so heavier skills cost more.
    function skillCost(sk) {
        if (!sk) return { mp: 0, sp: 0 };
        if (sk.cost) return { mp: sk.cost.mp || 0, sp: sk.cost.sp || 0 };   // explicit (e.g. free Strike)
        const amt = Math.max(4, Math.round((sk.tempoCost || 300) / 40));
        if (sk.affinity) return { mp: amt, sp: 0 };
        if ((sk.power || 0) > 0) return { mp: 0, sp: amt };
        return { mp: 0, sp: Math.max(3, Math.round(amt * 0.5)) };
    }
    function canAfford(a, sk) {
        const c = skillCost(sk);
        return (a.mp || 0) >= c.mp && (a.sp || 0) >= c.sp;
    }

    // ---- resolve an action -----------------------------------------------
    // action = { actorId, skillId, targetId }. Mutates+returns state.
    function act(state, db, action) {
        const a = state.actors[action.actorId];
        const sk = db.skills[action.skillId];
        if (!a || a.hp <= 0 || !sk) return state;
        _startTurn(state, a);                 // DoT + decrement this actor's timers
        if (a.hp <= 0) { a.tempo = 0; return state; }
        const cost = skillCost(sk);           // spend MP/SP (UI gates affordability)
        a.mp = Math.max(0, (a.mp || 0) - cost.mp);
        a.sp = Math.max(0, (a.sp || 0) - cost.sp);
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
        a.tempo = 0;          // MMBN-style: acting empties the gauge fully (cost no longer carries over)
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
            _guardLethal(state, t);
            log(state, 'hit', { actor: a.id, skill: action.skillId, target: t.id, dmg: r.dmg, crit: r.crit, aff: r.aff, targetHp: t.hp });
            // relic/gear bonuses: lifesteal heals the attacker; thorns reflect to it
            if (a.lifesteal && a.hp > 0) { const h = Math.round(r.dmg * a.lifesteal); if (h > 0) { a.hp = Math.min(a.maxHp, a.hp + h); log(state, 'lifesteal', { actor: a.id, amount: h, hp: a.hp }); } }
            if (t.thorns && a.hp > 0) { const tn = Math.max(1, Math.round(r.dmg * t.thorns)); a.hp = Math.max(0, a.hp - tn); _guardLethal(state, a); log(state, 'thorns', { actor: t.id, target: a.id, dmg: tn, targetHp: a.hp }); }
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
        const am = affinityMult(state.chart, sk.affinity || atk.affinity, def.affinity);
        base *= am;
        const e = sk.effect || {};
        if (e.type === 'bonusVsUnaware' && !def.hasActed) base *= (1 + (e.amount || 0));
        base *= (1 + (def.markMult || 0));
        let crit = false;
        const critCh = (atk.critChance || 0) + (e.type === 'critUp' ? (e.amount || 0) : 0);
        if (critCh && RNG.next(state.rng) < critCh) { base *= 1.5; crit = true; }
        const [vmin, vmax] = state.tuning.variance;
        // aff: 'super' (>1) / 'resist' (<1) / null — for the combat log's effectiveness cue
        return { dmg: Math.max(1, Math.round(base * RNG.range(state.rng, vmin, vmax))), evaded: false, crit, aff: am > 1.05 ? 'super' : am < 0.95 ? 'resist' : null };
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
        _guardLethal(state, attacker);
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
                _guardLethal(state, a);
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
        // NO passive HP/MP/SP regen in battle (by design): recover only via
        // items, healing skills, or a healer ally. A free basic 'strike' (cost 0)
        // keeps a drained fighter from soft-locking.
    }

    // The System will not let a tethered Subject die: when a player actor would
    // fall, it revives them — for a steep, escalating Surveillance cost. THIS is
    // the temptation (near-unkillable while tethered) AND the horror (your number
    // rockets, and high Surveillance corrupts you). Call wherever a player's hp
    // could reach 0 (attack / counter / DoT).
    function _guardLethal(state, t) {
        if (state.tethered === false) return;          // UNTETHERED: the System won't catch you
        const iv = state.tuning.intervention;
        if (!iv || !iv.enabled || !iv.lethalSave) return;
        if (!t || t.id !== 'p1' || t.hp > 0) return;   // the System only catches YOU (the Subject)
        if (state.pendingSave) return;                 // already offering a save
        // COLLECTION: if leaning on the System has spent the run's whole budget,
        // it takes you on the spot instead of saving you again — the fight ends.
        if (state.collectBudget != null && state.surveillance >= state.collectBudget) {
            state.over = true; state.winner = 'collected'; state.collected = true;
            log(state, 'intervention', { kind: 'collected', actor: t.id, surveillance: state.surveillance });
            return;
        }
        // OFFER the save — the player must CHOOSE (resolveSave). The fight pauses
        // until then; refusing means death. This is the dilemma with teeth.
        state.pendingSave = { actorId: t.id, nextSurv: (iv.surveillancePerSave || 10) * ((state._saves || 0) + 1) };
        log(state, 'intervention', { kind: 'offer', actor: t.id, surveillance: state.surveillance });
    }

    // Resolve a pending System save: accept (revive at saveTo%, escalating
    // Surveillance) or refuse (stay dead — the next step ends the fight as a loss).
    function resolveSave(state, accept) {
        const ps = state.pendingSave; if (!ps) return state;
        state.pendingSave = null;
        const t = state.actors[ps.actorId];
        const iv = state.tuning.intervention;
        if (accept && t) {
            t.hp = Math.max(1, Math.round(t.maxHp * (iv.saveTo || 0.3)));
            state._saves = (state._saves || 0) + 1;
            state.surveillance += (iv.surveillancePerSave || 10) * state._saves; // escalates
            log(state, 'intervention', { kind: 'lethal_save', actor: t.id, hp: t.hp, saves: state._saves, surveillance: state.surveillance });
        } else {
            log(state, 'intervention', { kind: 'refused', actor: ps.actorId });
        }
        return state;
    }

    // The periodic auto-heal was removed: the ONLY System help is the lethal-save
    // OFFER (a deliberate choice), so dying is real and tense.
    function _interventionTick() { /* no-op — kept for the step() call site */ }

    // ---- deterministic enemy / AI-ally AI ---------------------------------
    function enemyAction(state, db, actorId) {
        const a = state.actors[actorId];
        const foes = aliveOnSide(state, oppSide(a.side));
        // Taunt forces targeting: if any foe is taunting, it must be the target.
        const taunter = foes.find(f => f.taunting > 0);
        const target = taunter || (foes.length ? RNG.pick(state.rng, foes) : null);
        // AI is bound by the same MP/SP rules: prefer skills it can afford; only
        // fall back to the full loadout if nothing is affordable this turn.
        const loadout = a.loadout.map(id => ({ id: id, sk: db.skills[id] })).filter(x => x.sk);
        const affordable = loadout.filter(x => canAfford(a, x.sk));
        // Nothing affordable → fall back to the free basic Strike (no resource regen).
        if (!affordable.length) return { actorId, skillId: (db.skills.strike ? 'strike' : a.loadout[0]), targetId: target ? target.id : null };
        const atks = affordable.filter(x => x.sk.power > 0);
        const chosen = atks.length ? atks.reduce((b, x) => x.sk.power > b.sk.power ? x : b) : affordable[0];
        return { actorId, skillId: chosen.id, targetId: target ? target.id : null };
    }

    // ---- use an item in battle -------------------------------------------
    // action = { actorId, targetId, restore:{hp,mp,sp} }. Restores the target's
    // pools and consumes the actor's turn (resets tempo). Mutates+returns state.
    function useItem(state, action) {
        const a = state.actors[action.actorId];
        if (!a) return state;
        const t = state.actors[action.targetId] || a;
        const r = action.restore || {};
        if (r.hp) { t.hp = Math.min(t.maxHp, t.hp + r.hp); log(state, 'heal', { actor: a.id, target: t.id, amount: r.hp, hp: t.hp, item: true }); }
        if (r.mp) { t.mp = Math.min(t.maxMp, (t.mp || 0) + r.mp); log(state, 'restore', { actor: a.id, target: t.id, mp: r.mp }); }
        if (r.sp) { t.sp = Math.min(t.maxSp, (t.sp || 0) + r.sp); log(state, 'restore', { actor: a.id, target: t.id, sp: r.sp }); }
        a.tempo = 0;   // using an item spends the turn
        return state;
    }

    const GameCombat = { createBattle, step, advanceToReady, act, enemyAction, skillCost, canAfford, useItem, resolveSave };
    root.GameCombat = GameCombat;
    if (typeof module !== 'undefined' && module.exports) module.exports = GameCombat;
})(typeof window !== 'undefined' ? window : globalThis);
