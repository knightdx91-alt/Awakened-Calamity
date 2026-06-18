// GameVoice — reactive dialogue selection (pure, portable, deterministic).
// Each SPEAKER has a pool of context-tagged lines; given the current game state
// (quest stages, Surveillance, flags, how many times you've talked), pick the
// most appropriate line — Hades-style reactive barks. No DOM, no engine. The
// authoring drafter (tools/gen_dialogue.mjs) writes these pools from the docs;
// this engine serves them at runtime.
//
// Speaker file (data/dialogue/<id>.json):
//   { "id","name","face":{sheet,index},"persona":"...",
//     "lines":[ { "id", "when":{...}, "priority":N, "once":bool,
//                 "text":["box1","box2",...] }, ... ] }
//
// Context passed to pick():  { quests:{<id>:{status,stage}}, surveillance:N,
//   flags:{<k>:bool}, meet:N (talk count), map, biome, said:Set<lineId> }
(function (root) {
  'use strict';

  // ---- condition evaluation -------------------------------------------------
  function cmp(val, expr) {
    if (typeof expr === 'number') return val === expr;
    if (typeof expr !== 'string') return false;
    var m = expr.match(/^(<=|>=|<|>|=)?\s*(-?\d+)$/);
    if (!m) return String(val) === expr;
    var n = parseInt(m[2], 10), op = m[1] || '=';
    if (op === '<') return val < n; if (op === '<=') return val <= n;
    if (op === '>') return val > n; if (op === '>=') return val >= n;
    return val === n;
  }

  function questOk(ctx, id, expr) {
    var q = (ctx.quests && ctx.quests[id]) || null;
    var status = q ? q.status : 'none', stage = q ? (q.stage | 0) : -1;
    if (expr === 'done') return status === 'done';
    if (expr === 'active') return status === 'active';
    if (expr === 'notstarted' || expr === 'none') return status === 'none';
    if (typeof expr === 'string' && /^(<=|>=|<|>|=)/.test(expr)) return status !== 'none' && cmp(stage, expr);
    return cmp(stage, expr);
  }

  function whenMatches(when, ctx) {
    if (!when) return true;
    for (var key in when) {
      var v = when[key];
      if (key === 'quest') { for (var qid in v) if (!questOk(ctx, qid, v[qid])) return false; }
      else if (key === 'surveillance') { if (!cmp(ctx.surveillance | 0, v)) return false; }
      else if (key === 'meet') { if (!cmp(ctx.meet | 0, v)) return false; }
      else if (key === 'flag') { for (var fk in v) if (!!(ctx.flags && ctx.flags[fk]) !== !!v[fk]) return false; }
      else if (key === 'map') { if (ctx.map !== v) return false; }
      else if (key === 'biome') { if (ctx.biome !== v) return false; }
    }
    return true;
  }

  // ---- selection ------------------------------------------------------------
  // Deterministic: among the eligible lines of the highest priority, choose by a
  // seed (default = talk count) so repeat visits cycle variety, same state→same line.
  function eligible(speaker, ctx) {
    var said = ctx.said || {};
    return (speaker.lines || []).filter(function (l) {
      if (l.once && said[l.id]) return false;
      return whenMatches(l.when, ctx);
    });
  }

  function pick(speaker, ctx, seed) {
    var elig = eligible(speaker, ctx);
    if (!elig.length) return null;
    var top = elig.reduce(function (a, b) { return (b.priority | 0) > (a.priority | 0) ? b : a; });
    var topPri = top.priority | 0;
    var band = elig.filter(function (l) { return (l.priority | 0) === topPri; });
    var s = (seed == null ? (ctx.meet | 0) : seed) >>> 0;
    var line = band[s % band.length];
    return { id: line.id, once: !!line.once, text: Array.isArray(line.text) ? line.text : [line.text] };
  }

  // Build dialogue-engine command list ({type:'text',text,face}) from a picked line.
  function toCommands(speaker, picked) {
    if (!picked) return [];
    return picked.text.map(function (t) {
      return speaker.face ? { type: 'text', text: t, face: speaker.face } : { type: 'text', text: t };
    });
  }

  var GameVoice = { pick: pick, eligible: eligible, whenMatches: whenMatches, toCommands: toCommands };
  root.GameVoice = GameVoice;
  if (typeof module !== 'undefined' && module.exports) module.exports = GameVoice;
})(typeof window !== 'undefined' ? window : globalThis);
