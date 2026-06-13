// GameProgression — XP, leveling, attribute points. PURE LOGIC (PROGRESSION.md
// §2, §3.7). NO DOM, deterministic, serializable. All tuning from
// data/systems/progression.json; nothing hardcoded. Mirrors function-for-
// function for the Unity/C# port.
(function (root) {
    'use strict';

    // ---- formulas ---------------------------------------------------------
    // Cost to go level L -> L+1 for a class Tier.  XP_needed = B · L^p · m(Tier)
    function xpToNext(level, tier, db) {
        var x = db.xp, m = x.tierMult[tier] != null ? x.tierMult[tier] : 1.0;
        return Math.round(x.B * Math.pow(level, x.p) * m);
    }
    // Mob XP income.  mob_XP = K · L^q · speciesXpYield   (q < cost's p, by design)
    function mobXP(mobLevel, speciesXpYield, db) {
        return Math.round(db.mob.K * Math.pow(mobLevel, db.mob.q) * (speciesXpYield != null ? speciesXpYield : 1.0));
    }
    // Level-difference multiplier (PROGRESSION.md §5): lethal gap → bonus,
    // matched → full, trivial → near-zero.  diff = mobLevel - playerLevel.
    function levelDiffMult(playerLevel, mobLevel, db) {
        var d = db.levelDiff, diff = mobLevel - playerLevel;
        if (diff >= d.redAt)  return d.redMult;
        if (diff <= d.greyAt) return d.greyMult;
        return d.whiteMult;
    }
    // Attribute points granted per level for a Tier = base + rank above Basic.
    function pointsForLevel(tier, db) {
        var pp = db.pointsPerLevel, rank = pp.tierOrder.indexOf(tier);
        if (rank < 0) rank = 0;
        return pp.base + pp.perTierAboveBasic * rank;
    }

    // ---- state ------------------------------------------------------------
    function createProgress(tier, level) {
        tier = tier || 'basic'; level = level || 1;
        var attrs = {};
        // attributes filled lazily; left empty here (allocation is a later system)
        return { tier: tier, level: level, xp: 0, attrPoints: 0, attributes: attrs, totalXP: 0 };
    }

    // Award raw XP; auto-levels while the threshold is met. Returns the level-up
    // events (each with the points granted) for the view to surface.
    function awardXP(prog, amount, db) {
        amount = Math.max(0, Math.round(amount));
        prog.xp += amount; prog.totalXP += amount;
        var events = [], guard = 100000;
        while (guard-- > 0) {
            var need = xpToNext(prog.level, prog.tier, db);
            if (prog.xp < need) break;
            prog.xp -= need; prog.level += 1;
            var pts = pointsForLevel(prog.tier, db);
            prog.attrPoints += pts;
            events.push({ level: prog.level, points: pts, pastSoftCap: prog.level > db.softCap });
        }
        return events;
    }

    // Convenience: award XP for defeating a mob {level, xpYield}, applying the
    // level-difference modifier. Returns { xp, base, mult, events }.
    function gainFromKill(prog, mob, db) {
        var base = mobXP(mob.level, mob.xpYield, db);
        var mult = levelDiffMult(prog.level, mob.level, db);
        var total = Math.max(1, Math.round(base * mult));
        var events = awardXP(prog, total, db);
        return { xp: total, base: base, mult: mult, events: events };
    }

    var GameProgression = {
        xpToNext: xpToNext, mobXP: mobXP, levelDiffMult: levelDiffMult,
        pointsForLevel: pointsForLevel, createProgress: createProgress,
        awardXP: awardXP, gainFromKill: gainFromKill,
    };
    root.GameProgression = GameProgression;
    if (typeof module !== 'undefined' && module.exports) module.exports = GameProgression;
})(typeof window !== 'undefined' ? window : globalThis);
