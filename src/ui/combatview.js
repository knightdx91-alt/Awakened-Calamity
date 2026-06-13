// GameCombatView — PRESENTATION for the Tempo + Intervention battle.
// Throwaway view layer (ARCHITECTURE.md): owns NO game logic. All resolution
// comes from the pure rules core src/systems/combat.js + rng.js, fed by
// data/systems/*.json. The view drives the core's per-frame step() so Tempo
// bars fill in REAL TIME, renders returned state, and forwards input.
(function (root) {
    'use strict';

    var db = null;
    var state = null;
    var active = false;
    var mode = 'idle';          // 'beat' | 'ticking' | 'menu' | 'over'
    var awaitingClose = false;
    var pendingActorId = null;
    var menuSkills = [], cursor = 0;
    var els = {};
    var logQueue = [], currentMsg = '';
    var rafId = 0, lastTs = 0, acc = 0, waitUntil = 0;
    var seedCounter = 1;

    var BUILD = (root.__BUILD__ || 'dev');
    var MS_PER_STEP = 45;       // real ms per one core tickStep → ATB pacing (~3s to fill at speed 60)

    // ---- data -------------------------------------------------------------
    function fetchJSON(p) {
        return fetch(p + '?b=' + BUILD, { cache: 'no-cache' }).then(function (r) {
            if (!r.ok) throw new Error('fetch ' + p + ' ' + r.status); return r.json();
        });
    }
    function loadDB() {
        if (db) return Promise.resolve(db);
        var base = 'data/systems/';
        return Promise.all(['combat.json', 'skills.json', 'affinities.json', 'creatures.json', 'classes.json'].map(function (f) { return fetchJSON(base + f); }))
            .then(function (r) { db = { combat: r[0], skills: r[1], affinities: r[2], creatures: r[3], classes: r[4] }; return db; });
    }

    // ---- test actors (Smith vs a creature) --------------------------------
    // Loadout is a representative COMBAT mix exercising several effect types so
    // they can be felt live: a light & heavy hit, a defensive buff, a heal,
    // plus Pin Shot (slow — visibly slows the foe's bar), Coat Blade (toxin DoT),
    // Unmake (sunder = armor shred) and Riposte (reactive counter).
    function buildPlayer() {
        var smith = (db.classes && db.classes.smith) || { statProfile: { hp: 80, atk: 16, def: 18, speed: 46 }, affinityLean: 'stone' };
        return {
            id: 'p1', side: 'player', name: 'Smith', affinity: smith.affinityLean || 'stone',
            stats: Object.assign({}, smith.statProfile),
            loadout: ['jab', 'heavy_strike', 'guard', 'mend', 'pin_shot', 'coat_blade', 'unmake', 'riposte']
        };
    }
    function buildEnemy(key) {
        var c = db.creatures[key] || db.creatures.emberling;
        return { id: 'e1', side: 'enemy', name: c.name, affinity: c.affinity, stats: Object.assign({}, c.stats), loadout: (c.loadout || ['jab']).slice() };
    }

    // ---- lifecycle --------------------------------------------------------
    function start(opts) {
        if (active) return;
        opts = opts || {};
        active = true;
        loadDB().then(function () {
            var enemyKey = opts.enemy || (Math.random() < 0.5 ? 'emberling' : 'thornwolf');
            var seed = (Date.now() ^ (seedCounter++ * 0x9e3779b1)) >>> 0;
            state = root.GameCombat.createBattle(db, [buildPlayer(), buildEnemy(enemyKey)], seed);
            pendingActorId = null; awaitingClose = false; menuSkills = []; cursor = 0; logQueue = [];
            currentMsg = 'A wild ' + state.actors.e1.name + ' interrupts your work!';
            _mount();
            mode = 'beat'; waitUntil = _now() + 900; lastTs = _now(); acc = 0;
            rafId = requestAnimationFrame(_loop);
        }).catch(function (e) { active = false; console.error('[combat] start failed', e); });
    }
    function isActive() { return active; }
    function _now() { return (root.performance && performance.now) ? performance.now() : Date.now(); }

    // ---- the real-time loop ----------------------------------------------
    function _loop(ts) {
        if (!active) return;
        var dt = ts - lastTs; lastTs = ts;
        if (mode === 'ticking') {
            acc += dt;
            var guard = 300;
            while (acc >= MS_PER_STEP && mode === 'ticking' && guard-- > 0) {
                acc -= MS_PER_STEP;
                var before = state.log.length;
                var id = root.GameCombat.step(state);
                var interv = _flush(before);
                if (state.over) { mode = 'over'; break; }
                if (interv) { mode = 'beat'; waitUntil = ts + 850; break; }   // surface the System moment
                if (id) {
                    var a = state.actors[id];
                    if (a.side === 'player' && !a.ai) { pendingActorId = id; _openMenu(a); mode = 'menu'; }
                    else { _autoTurn(id, ts); }
                    break;
                }
            }
        } else if (mode === 'beat') {
            if (ts >= waitUntil) mode = state.over ? 'over' : 'ticking';
        }
        _render();
        if (mode === 'over' && !awaitingClose) _finish();
        rafId = requestAnimationFrame(_loop);
    }

    function _autoTurn(id, ts) {
        var before = state.log.length;
        var action = root.GameCombat.enemyAction(state, db, id);
        root.GameCombat.act(state, db, action);
        _flush(before);
        mode = 'beat'; waitUntil = ts + 650;
    }

    function _flush(fromIndex) {
        var interv = false;
        for (var i = fromIndex; i < state.log.length; i++) {
            var e = state.log[i];
            if (e.type === 'intervention') interv = true;
            var line = _fmt(e); if (line) { logQueue.push(line); currentMsg = line; }
        }
        return interv;
    }
    function _fmt(e) {
        var nm = function (id) { return state.actors[id] ? state.actors[id].name : id; };
        var sk = function (id) { return (db.skills[id] && db.skills[id].name) || id; };
        switch (e.type) {
            case 'hit':   return nm(e.actor) + ' — ' + sk(e.skill) + (e.crit ? ' CRIT' : '') + ' — ' + e.dmg + ' dmg';
            case 'heal':  return nm(e.actor) + ' — ' + sk(e.skill) + ' — +' + e.amount + ' HP';
            case 'buff':  return nm(e.actor) + ' braced (defense up)';
            case 'partybuff': return nm(e.actor) + ' rallied the party (' + e.kind + ' up)';
            case 'taunt': return nm(e.actor) + ' taunts — drawing fire';
            case 'summon': return nm(e.actor) + ' deployed a Turret';
            case 'debuff':return nm(e.actor) + ' — ' + sk(e.skill) + ' on ' + nm(e.target);
            case 'dot':   return nm(e.actor) + ' takes ' + e.dmg + ' toxin damage';
            case 'counter': return nm(e.actor) + ' counters! ' + e.dmg + ' dmg';
            case 'miss':  return nm(e.target) + ' evaded';
            case 'down':  return nm(e.actor) + ' went down!';
            case 'intervention': return '⟁ THE SYSTEM intervened — +' + e.heal + ' HP. Surveillance ' + e.surveillance;
            default: return '';
        }
    }

    // ---- input ------------------------------------------------------------
    function consumeInput(jp) {
        if (!active) return;
        if (awaitingClose) { if (jp.a || jp.b || jp.start) _teardown(); return; }
        if (mode !== 'menu') return;
        // 2-column grid nav (like the Pokémon fight menu): left/right within a
        // row, up/down by a row. Clamped so an odd last row can't overshoot.
        var COLS = 2, n = menuSkills.length;
        if (jp.left)  { if (cursor % COLS > 0) cursor -= 1; }
        if (jp.right) { if (cursor % COLS < COLS - 1 && cursor + 1 < n) cursor += 1; }
        if (jp.up)    { if (cursor - COLS >= 0) cursor -= COLS; }
        if (jp.down)  { if (cursor + COLS < n) cursor += COLS; }
        if (jp.left || jp.right || jp.up || jp.down) _render();
        if (jp.a) _choose();
        if (jp.b) _flee();
    }
    function _choose() {
        var skillId = menuSkills[cursor];
        var foes = Object.keys(state.actors).map(function (k) { return state.actors[k]; }).filter(function (a) { return a.side === 'enemy' && a.hp > 0; });
        var before = state.log.length;
        root.GameCombat.act(state, db, { actorId: pendingActorId, skillId: skillId, targetId: foes[0] ? foes[0].id : null });
        _flush(before);
        pendingActorId = null; _closeMenu();
        mode = 'beat'; waitUntil = _now() + 550;
    }
    function _flee() { currentMsg = 'You slip away from the fight.'; awaitingClose = true; mode = 'over'; _closeMenu(); }

    function _finish() {
        var msg = state.winner === 'player' ? 'You won the exchange.' : state.winner === 'enemy' ? 'You were overcome…' : 'The fight ends.';
        currentMsg = msg + '  (Surveillance ' + state.surveillance + ')  — press A';
        awaitingClose = true;
    }

    // ---- DOM --------------------------------------------------------------
    function _mount() {
        _injectCSS();
        var host = document.getElementById('screen-primary') || document.body;
        var r = document.createElement('div');
        r.id = 'combat-view';
        r.innerHTML =
            '<div class="cv-field">' +
            '  <div class="cv-card cv-enemy" id="cv-enemy"><div class="cv-name"></div>' +
            '    <div class="cv-bar cv-hp"><span></span></div><div class="cv-bar cv-tempo"><span></span></div>' +
            '    <div class="cv-status"></div><div class="cv-sprite">👹</div></div>' +
            '  <div class="cv-system" id="cv-system"><div class="cv-sys-label">SYSTEM</div>' +
            '    <div class="cv-bar cv-iv"><span></span></div><div class="cv-surv" id="cv-surv">Surveillance 0</div></div>' +
            '  <div class="cv-card cv-player" id="cv-player"><div class="cv-sprite">🛠</div><div class="cv-name"></div>' +
            '    <div class="cv-bar cv-hp"><span></span></div><div class="cv-bar cv-tempo"><span></span></div>' +
            '    <div class="cv-status"></div></div>' +
            '</div><div class="cv-msg" id="cv-msg"></div><div class="cv-menu" id="cv-menu"></div>';
        host.appendChild(r);
        els.root = r;
        els.enemy = r.querySelector('#cv-enemy'); els.player = r.querySelector('#cv-player');
        els.iv = r.querySelector('#cv-system .cv-iv span'); els.surv = r.querySelector('#cv-surv');
        els.msg = r.querySelector('#cv-msg'); els.menu = r.querySelector('#cv-menu');
    }
    function _openMenu(a) {
        menuSkills = a.loadout.filter(function (id) {
            var s = db.skills[id]; if (!s) return false;
            return s.power > 0 || (s.effect && ['heal', 'defUp', 'slow', 'markTarget', 'sunder', 'applyToxin', 'taunt', 'partyBuff', 'summon'].indexOf(s.effect.type) >= 0);
        });
        cursor = 0;
    }
    function _closeMenu() { menuSkills = []; }

    function _statusTags(a) {
        var t = [];
        if (a.defBuff > 0) t.push('DEF↑'); if (a.atkBuff > 0) t.push('ATK↑');
        if (a.speedMod < 0) t.push('SLOW'); if (a.sundered > 0) t.push('ARMOR↓');
        if (a.markMult > 0) t.push('MARKED'); if (a.dot && a.dot.length) t.push('☠TOXIN');
        if (a.taunting > 0) t.push('TAUNT');
        return t.join(' ');
    }
    function _setBar(card, sel, ratio, cls) {
        var span = card.querySelector('.' + sel + ' span');
        if (span) { span.style.width = Math.max(0, Math.min(1, ratio)) * 100 + '%'; if (cls) span.className = cls; }
    }
    // Continuous tempo: interpolate the in-progress fraction of the next core
    // step (acc/MS_PER_STEP) so the gauge fills smoothly every frame (MMBN-style),
    // not in discrete tickStep jumps. Frozen (frac 0) when not ticking.
    function _tempoDisp(a) {
        var max = state.tuning.tempoMax;
        var frac = (mode === 'ticking') ? Math.min(1, acc / MS_PER_STEP) : 0;
        var gain = Math.max(0, a.speed * (1 + (a.speedMod || 0))) * (state.tuning.tickStep / 100);
        return Math.min(1, (a.tempo + gain * frac) / max);
    }
    function _render() {
        if (!els.root) return;
        var p = state.actors.p1, e = state.actors.e1, max = state.tuning.tempoMax;
        els.enemy.querySelector('.cv-name').textContent = e.name;
        els.player.querySelector('.cv-name').textContent = p.name;
        _setBar(els.enemy, 'cv-hp', e.hp / e.maxHp, 'hp-fill' + (e.hp / e.maxHp < 0.3 ? ' low' : ''));
        _setBar(els.player, 'cv-hp', p.hp / p.maxHp, 'hp-fill' + (p.hp / p.maxHp < 0.3 ? ' low' : ''));
        _setBar(els.enemy, 'cv-tempo', _tempoDisp(e), 'tempo-fill' + (e.tempo >= max ? ' ready' : ''));
        _setBar(els.player, 'cv-tempo', _tempoDisp(p), 'tempo-fill' + (p.tempo >= max ? ' ready' : ''));
        els.enemy.querySelector('.cv-status').textContent = _statusTags(e);
        els.player.querySelector('.cv-status').textContent = _statusTags(p);
        els.iv.style.width = Math.min(1, (state._ivTempo || 0) / max) * 100 + '%';
        els.surv.textContent = 'Surveillance ' + state.surveillance;
        els.msg.textContent = currentMsg;
        if (mode === 'menu' && menuSkills.length) {
            els.menu.style.display = 'grid';
            els.menu.innerHTML = menuSkills.map(function (id, i) {
                var s = db.skills[id];
                return '<div class="cv-opt' + (i === cursor ? ' sel' : '') + '">' + (i === cursor ? '▶ ' : '') + s.name +
                    (s.tempoCost ? ' <em>' + s.tempoCost + '</em>' : '') + '</div>';
            }).join('');
        } else { els.menu.style.display = 'none'; els.menu.innerHTML = ''; }
    }

    function _teardown() {
        active = false; awaitingClose = false; mode = 'idle'; pendingActorId = null;
        menuSkills = []; logQueue = [];
        if (rafId) cancelAnimationFrame(rafId), rafId = 0;
        if (els.root && els.root.parentNode) els.root.parentNode.removeChild(els.root);
        els = {}; state = null;
    }

    function _injectCSS() {
        if (document.getElementById('cv-style')) return;
        var css =
        '#combat-view{position:absolute;inset:0;z-index:50;display:flex;flex-direction:column;font-family:"Courier New",monospace;color:#e6eef6;background:radial-gradient(circle at 50% 35%,#2a2330,#0b0a12 80%);}' +
        '.cv-field{position:relative;flex:1;}' +
        '.cv-card{position:absolute;width:46%;padding:2% 3%;background:#060610;border:1px solid #000;box-shadow:0 0 0 2px #3a2f1e,0 0 0 3px #000;border-radius:3px;}' +
        '.cv-enemy{top:6%;right:3%;} .cv-player{bottom:6%;left:3%;}' +
        '.cv-name{font-size:11px;font-weight:bold;color:#f2d39a;margin-bottom:3px;}' +
        '.cv-bar{height:7px;background:#1a1a24;border:1px solid #000;border-radius:3px;margin:2px 0;overflow:hidden;}' +
        '.cv-bar span{display:block;height:100%;width:100%;}' +
        '.hp-fill{background:linear-gradient(#7bd66a,#3da13a);transition:width 140ms ease;} .hp-fill.low{background:linear-gradient(#e06a4a,#b03020);transition:width 140ms ease;}' +
        '.tempo-fill{background:linear-gradient(#e8c46a,#b88a2a);} .tempo-fill.ready{background:linear-gradient(#ffe9a0,#e8b94a);box-shadow:0 0 4px #ffd96a;}' +
        '.cv-status{font-size:8px;letter-spacing:1px;color:#9ab0c4;min-height:10px;margin-top:2px;}' +
        '.cv-sprite{font-size:30px;text-align:center;margin-top:4px;}' +
        '.cv-system{position:absolute;top:4%;left:50%;transform:translateX(-50%);width:38%;text-align:center;padding:4px 6px;background:rgba(2,12,18,0.7);border:1px solid #002830;box-shadow:0 0 0 1px #18b8c8;border-radius:3px;}' +
        '.cv-sys-label{font-size:9px;letter-spacing:3px;color:#80d0e8;}' +
        '.cv-iv span{background:linear-gradient(#5fe0f0,#18b8c8);} .cv-system .cv-bar{border-color:#0a3038;}' +
        '.cv-surv{font-size:9px;color:#80d0e8;margin-top:2px;}' +
        '.cv-msg{min-height:30px;padding:6px 10px;font-size:11px;background:#060610;border-top:1px solid #18b8c8;box-shadow:inset 0 1px 0 #002830;display:flex;align-items:center;}' +
        '.cv-menu{display:none;grid-template-columns:1fr 1fr;gap:2px;padding:6px 10px;background:#0a1830;border-top:1px solid #18b8c8;}' +
        '.cv-opt{font-size:11px;padding:3px 6px;color:#c8d8e8;border-radius:2px;}' +
        '.cv-opt.sel{background:rgba(24,184,200,0.18);color:#fff;}' +
        '.cv-opt em{float:right;font-style:normal;color:#8aa0b4;font-size:9px;}';
        var st = document.createElement('style'); st.id = 'cv-style'; st.textContent = css; document.head.appendChild(st);
    }

    root.GameCombatView = { start: start, isActive: isActive, consumeInput: consumeInput };
})(typeof window !== 'undefined' ? window : this);
