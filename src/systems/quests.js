// GameQuests — quest tracking. PURE logic over a quest-state map + the quest
// database (data/systems/quests.json). No DOM. The event runner drives it
// (the `quest` command); the Journal UI + `conditional` kind 'quest' read it.
//
// State shape (lives in GameSave.state.quests):
//   { <questId>: { status: 'active'|'done'|'failed', stage: <index> } }
(function (root) {
    'use strict';

    function _q(db, id) { return db && db[id]; }
    function _stages(db, id) { var q = _q(db, id); return (q && q.stages) || []; }

    function start(qs, id) {
        if (!qs || !id) return false;
        if (qs[id] && qs[id].status) return false;        // already started
        qs[id] = { status: 'active', stage: 0 };
        return true;
    }
    function status(qs, id) { return (qs && qs[id] && qs[id].status) || 'none'; }
    function stageIndex(qs, id) { return (qs && qs[id] && qs[id].stage) | 0; }
    function isActive(qs, id) { return status(qs, id) === 'active'; }
    function isDone(qs, id) { return status(qs, id) === 'done'; }

    // Move to a specific stage (index or stage-id). Auto-starts if needed.
    function setStage(qs, db, id, ref) {
        if (!qs || !id) return false;
        if (!qs[id]) qs[id] = { status: 'active', stage: 0 };
        var stages = _stages(db, id), idx = ref;
        if (typeof ref === 'string') { idx = stages.map(function (s) { return s.id; }).indexOf(ref); }
        if (idx == null || idx < 0) idx = qs[id].stage;
        qs[id].stage = Math.min(idx, Math.max(0, stages.length - 1));
        return true;
    }
    // Advance one stage; completing past the last stage marks the quest done.
    function advance(qs, db, id) {
        if (!qs || !id) return false;
        if (!qs[id]) { qs[id] = { status: 'active', stage: 0 }; }
        var stages = _stages(db, id);
        if (qs[id].stage >= stages.length - 1) { qs[id].status = 'done'; }
        else { qs[id].stage += 1; }
        return true;
    }
    function complete(qs, db, id) {
        if (!qs || !id) return false;
        var stages = _stages(db, id);
        qs[id] = { status: 'done', stage: Math.max(0, stages.length - 1) };
        return true;
    }
    function fail(qs, id) {
        if (!qs || !id) return false;
        qs[id] = { status: 'failed', stage: (qs[id] && qs[id].stage) | 0 };
        return true;
    }

    // Current objective text for a quest's active stage.
    function objective(qs, db, id) {
        var stages = _stages(db, id), i = stageIndex(qs, id);
        return (stages[i] && stages[i].text) || '';
    }

    // List quests for the Journal. filter: 'active' | 'done' | 'all'.
    function list(qs, db, filter) {
        filter = filter || 'active';
        var out = [];
        for (var id in (qs || {})) {
            var st = qs[id].status;
            if (filter !== 'all' && st !== filter) continue;
            var q = _q(db, id) || {};
            out.push({ id: id, name: q.name || id, status: st, objective: objective(qs, db, id), summary: q.summary || '' });
        }
        return out;
    }

    // Condition check used by `conditional` kind 'quest'.
    // check: 'active'|'done'|'failed'|'notstarted'|'stage' (stage uses ref index/id, >=).
    function check(qs, db, id, kind, ref) {
        var st = status(qs, id);
        switch (kind) {
            case 'done': return st === 'done';
            case 'failed': return st === 'failed';
            case 'notstarted': return st === 'none';
            case 'active': return st === 'active';
            case 'stage': {
                var stages = _stages(db, id), idx = ref;
                if (typeof ref === 'string') idx = stages.map(function (s) { return s.id; }).indexOf(ref);
                return st !== 'none' && stageIndex(qs, id) >= (idx | 0);
            }
            default: return st === 'active';
        }
    }

    root.GameQuests = {
        start: start, advance: advance, complete: complete, fail: fail, setStage: setStage,
        status: status, stageIndex: stageIndex, isActive: isActive, isDone: isDone,
        objective: objective, list: list, check: check
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = root.GameQuests;
})(typeof window !== 'undefined' ? window : globalThis);
