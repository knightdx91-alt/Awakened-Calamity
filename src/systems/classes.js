// GameClasses — class growth logic (evolve + specialize). PURE, no DOM,
// deterministic, serializable (CLASSES.md §1.7). Mirrors to the Unity port.
//
// Reads class/skill data (data/systems/{classes,skills}.json) and a light
// ctx/state; never touches the renderer. The STATUS UI calls these.
(function (root) {
    'use strict';

    var EVOLVE_MIN_LEVEL = 10;   // minimum level to evolve a class up a Tier

    function _def(db, id) { return db && db.classes && db.classes[id]; }
    function _skillTags(db, skillId) {
        var s = db && db.skills && db.skills[skillId];
        return (s && s.tags) || [];
    }

    // Does a build satisfy an EvolveBranch.requires gate? (CLASSES.md §1.5)
    // skillTags are matched against the tags of the player's LEARNED skills;
    // stat/affinity are checked against the live build. Unknown/absent → met.
    function requiresMet(req, ctx, db) {
        if (!req) return true;
        if (req.skillTags && req.skillTags.length) {
            var min = req.minCount || 1, n = 0, need = req.skillTags;
            (ctx.skills || []).forEach(function (sid) {
                var tags = _skillTags(db, sid);
                if (tags.some(function (t) { return need.indexOf(t) >= 0; })) n++;
            });
            if (n < min) return false;
        }
        if (req.stat) {
            for (var k in req.stat) { if (((ctx.attributes || {})[k] || 0) < req.stat[k]) return false; }
        }
        if (req.affinity && ctx.affinity !== req.affinity) return false;
        return true;
    }

    // List the evolution branches for a class, each annotated with eligibility.
    function evolveOptions(currentId, ctx, db) {
        var cls = _def(db, currentId);
        if (!cls || !cls.evolvesInto || !cls.evolvesInto.length) return [];
        var level = ctx.level || 1;
        return cls.evolvesInto.map(function (ev) {
            var id = (typeof ev === 'string') ? ev : ev.class;
            var target = _def(db, id);
            var levelOk = level >= EVOLVE_MIN_LEVEL;
            var reqOk = (typeof ev === 'string') ? true : (ev.default ? true : requiresMet(ev.requires, ctx, db));
            var reason = !target ? '(missing)' : !levelOk ? ('Reach Lv' + EVOLVE_MIN_LEVEL)
                       : !reqOk ? 'Path not met' : '';
            return { id: id, name: target ? target.name : id, tier: target ? target.tier : null,
                     eligible: !!target && levelOk && reqOk, reason: reason };
        });
    }

    // Evolve the character into targetId: switch class, grant the new class's
    // skills (union), and raise the progression Tier (keeping level/xp).
    function evolve(state, currentId, targetId, db) {
        var target = _def(db, targetId);
        if (!target || !state || !state.player) return false;
        // Only allow declared branches from the current class.
        var opts = evolveOptions(currentId, _ctxFromState(state), db);
        var ok = opts.some(function (o) { return o.id === targetId && o.eligible; });
        if (!ok) return false;
        var p = state.player;
        if (!p.class) p.class = { id: targetId, level: 1, xp: 0 };
        p.class.id = targetId;
        p.class.spec = null;                       // a fresh Tier; spec re-picked
        p.skills = p.skills || [];
        (target.grantsSkills || []).forEach(function (s) { if (p.skills.indexOf(s) < 0) p.skills.push(s); });
        if (state.progress) state.progress.tier = target.tier || state.progress.tier;
        return true;
    }

    // Specializations available for a class, annotated with eligibility (level).
    function specOptions(currentId, ctx, db) {
        var cls = _def(db, currentId);
        if (!cls || !cls.specializations || !cls.specializations.length) return [];
        var level = ctx.level || 1;
        return cls.specializations.map(function (sp) {
            return { id: sp.id, name: sp.name, unlockAtLevel: sp.unlockAtLevel || 1,
                     focus: sp.focus, grantsSkill: sp.grantsSkill,
                     eligible: level >= (sp.unlockAtLevel || 1) };
        });
    }

    // Pick a specialization (permanent — CLASSES.md §1.5). Grants its skill.
    function chooseSpec(state, currentId, specId, db) {
        var cls = _def(db, currentId);
        if (!cls || !state || !state.player || !state.player.class) return false;
        var sp = (cls.specializations || []).filter(function (x) { return x.id === specId; })[0];
        if (!sp) return false;
        if ((state.progress && state.progress.level || state.player.class.level || 1) < (sp.unlockAtLevel || 1)) return false;
        state.player.class.spec = specId;
        if (sp.grantsSkill) {
            state.player.skills = state.player.skills || [];
            if (state.player.skills.indexOf(sp.grantsSkill) < 0) state.player.skills.push(sp.grantsSkill);
        }
        return true;
    }

    // Lateral class change (CLASSES.md §1.7 axis 4): keep level/xp + all learned
    // skills; switch id, union the new class's grants, set Tier to the new class.
    // Source of a NEW class is gated by the caller (System Shop / NPC / quest).
    function changeClass(state, targetId, db) {
        var target = _def(db, targetId);
        if (!target || !state || !state.player) return false;
        var p = state.player;
        if (!p.class) p.class = { id: targetId, level: 1, xp: 0 };
        p.class.id = targetId;
        p.class.spec = null;
        p.skills = p.skills || [];
        (target.grantsSkills || []).forEach(function (s) { if (p.skills.indexOf(s) < 0) p.skills.push(s); });
        if (state.progress) state.progress.tier = target.tier || state.progress.tier;
        // Record ownership so you can switch back for free later.
        p.ownedClasses = p.ownedClasses || [];
        if (p.ownedClasses.indexOf(targetId) < 0) p.ownedClasses.push(targetId);
        return true;
    }

    // All classes of a tier (default 'basic') — the System Shop catalogue.
    function classesOfTier(tier, db) {
        tier = tier || 'basic';
        var out = [];
        var cs = (db && db.classes) || {};
        for (var id in cs) { if (id === '_meta') continue; if (cs[id] && cs[id].tier === tier) out.push({ id: id, name: cs[id].name, lifestyle: cs[id].lifestyle }); }
        return out;
    }

    function _ctxFromState(state) {
        var p = state.player || {}, prog = state.progress || {};
        return { level: prog.level || (p.class && p.class.level) || 1,
                 attributes: prog.attributes || {}, affinity: p.affinity || null,
                 skills: p.skills || [] };
    }

    root.GameClasses = {
        evolveOptions: evolveOptions, evolve: evolve,
        specOptions: specOptions, chooseSpec: chooseSpec,
        changeClass: changeClass, classesOfTier: classesOfTier,
        requiresMet: requiresMet, ctxFromState: _ctxFromState,
        EVOLVE_MIN_LEVEL: EVOLVE_MIN_LEVEL,
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = root.GameClasses;
})(typeof window !== 'undefined' ? window : globalThis);
