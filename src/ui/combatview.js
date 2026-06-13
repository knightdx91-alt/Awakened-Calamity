// GameCombatView — PRESENTATION for the Tempo + Intervention battle.
// Throwaway view layer (ARCHITECTURE.md): owns NO game logic. All resolution
// comes from the pure rules core src/systems/combat.js + rng.js + progression.js,
// fed by data/systems/*.json. Drives the core's per-frame step() so Tempo bars
// fill in REAL TIME; supports multiple enemies/allies + target selection.
(function (root) {
    'use strict';

    var db = null, state = null, active = false;
    var mode = 'idle';                  // 'beat' | 'ticking' | 'menu' | 'target' | 'over'
    var awaitingClose = false, pendingActorId = null;
    var menuSkills = [], cursor = 0;
    var chosenSkill = null, targetList = [], targetIdx = 0;
    var els = {}, cards = {};
    var logQueue = [], currentMsg = '';
    var rafId = 0, lastTs = 0, acc = 0, waitUntil = 0, seedCounter = 1;
    var prog = null, enemyMeta = {}, _localProg = null;

    var BUILD = (root.__BUILD__ || 'dev');
    var MS_PER_STEP = 45;

    // ---- data -------------------------------------------------------------
    function fetchJSON(p) { return fetch(p + '?b=' + BUILD, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('fetch ' + p + ' ' + r.status); return r.json(); }); }
    function loadDB() {
        if (db) return Promise.resolve(db);
        var base = 'data/systems/';
        return Promise.all(['combat.json', 'skills.json', 'affinities.json', 'creatures.json', 'classes.json', 'progression.json'].map(function (f) { return fetchJSON(base + f); }))
            .then(function (r) { db = { combat: r[0], skills: r[1], affinities: r[2], creatures: r[3], classes: r[4], progression: r[5] }; return db; });
    }

    // ---- persistent progression ------------------------------------------
    function _loadProg() {
        var s = (root.GameSave && root.GameSave.state) ? root.GameSave.state : null;
        if (s) { s.progress = s.progress || root.GameProgression.createProgress('basic', 1); return s.progress; }
        _localProg = _localProg || root.GameProgression.createProgress('basic', 1);
        return _localProg;
    }
    function _saveProg() {
        var s = (root.GameSave && root.GameSave.state) ? root.GameSave.state : null;
        if (s) { s.progress = prog; if (root.GameSave.markDirty) root.GameSave.markDirty(); } else { _localProg = prog; }
    }

    // ---- actors -----------------------------------------------------------
    function buildPlayer() {
        var smith = (db.classes && db.classes.smith) || { statProfile: { hp: 80, atk: 16, def: 18, speed: 46 }, affinityLean: 'stone' };
        return { id: 'p1', side: 'player', name: 'Smith', affinity: smith.affinityLean || 'stone',
            stats: Object.assign({}, smith.statProfile),
            loadout: ['jab', 'heavy_strike', 'cleave', 'guard', 'mend', 'pin_shot', 'coat_blade', 'unmake', 'riposte'] };
    }
    function buildEnemies(opts) {
        // opts.enemies = [{key, level}] OR single opts.enemy/opts.level. Default one.
        var list = opts.enemies;
        if (!list) list = [{ key: opts.enemy || (Math.random() < 0.5 ? 'emberling' : 'thornwolf'), level: opts.level || 2 }];
        enemyMeta = {};
        return list.map(function (spec, i) {
            var c = db.creatures[spec.key] || db.creatures.emberling;
            var id = 'e' + (i + 1);
            enemyMeta[id] = { key: spec.key, level: spec.level || 2, xpYield: c.xpYield != null ? c.xpYield : 1.0, name: c.name };
            return { id: id, side: 'enemy', name: c.name, affinity: c.affinity, stats: Object.assign({}, c.stats), loadout: (c.loadout || ['jab']).slice() };
        });
    }

    // ---- lifecycle --------------------------------------------------------
    function start(opts) {
        if (active) return;
        opts = opts || {}; active = true;
        loadDB().then(function () {
            prog = _loadProg();
            var actors = [buildPlayer()].concat(buildEnemies(opts));
            var seed = (Date.now() ^ (seedCounter++ * 0x9e3779b1)) >>> 0;
            state = root.GameCombat.createBattle(db, actors, seed);
            pendingActorId = null; awaitingClose = false; menuSkills = []; cursor = 0; chosenSkill = null; logQueue = [];
            cards = {};
            currentMsg = (actors.length > 2 ? actors.length - 1 + ' foes close in!' : 'A wild ' + state.actors.e1.name + ' interrupts your work!');
            _mount();
            mode = 'beat'; waitUntil = _now() + 900; lastTs = _now(); acc = 0;
            rafId = requestAnimationFrame(_loop);
        }).catch(function (e) { active = false; console.error('[combat] start failed', e); });
    }
    function isActive() { return active; }
    function _now() { return (root.performance && performance.now) ? performance.now() : Date.now(); }
    function _alive(side) { return state.order.map(function (id) { return state.actors[id]; }).filter(function (a) { return a.side === side && a.hp > 0; }); }

    // ---- real-time loop ---------------------------------------------------
    function _loop(ts) {
        if (!active) return;
        var dt = ts - lastTs; lastTs = ts;
        if (mode === 'ticking') {
            acc += dt; var guard = 300;
            while (acc >= MS_PER_STEP && mode === 'ticking' && guard-- > 0) {
                acc -= MS_PER_STEP;
                var before = state.log.length;
                var id = root.GameCombat.step(state);
                var interv = _flush(before);
                if (state.over) { mode = 'over'; break; }
                if (interv) { mode = 'beat'; waitUntil = ts + 850; break; }
                if (id) {
                    var a = state.actors[id];
                    if (a.side === 'player' && !a.ai) { pendingActorId = id; _openMenu(a); mode = 'menu'; }
                    else { _autoTurn(id, ts); }
                    break;
                }
            }
        } else if (mode === 'beat') { if (ts >= waitUntil) mode = state.over ? 'over' : 'ticking'; }
        _render();
        if (mode === 'over' && !awaitingClose) _finish();
        rafId = requestAnimationFrame(_loop);
    }
    function _autoTurn(id, ts) {
        var before = state.log.length;
        root.GameCombat.act(state, db, root.GameCombat.enemyAction(state, db, id));
        _flush(before);
        mode = 'beat'; waitUntil = ts + 600;
    }

    function _flush(fromIndex) {
        var interv = false;
        for (var i = fromIndex; i < state.log.length; i++) {
            var e = state.log[i]; if (e.type === 'intervention') interv = true;
            var line = _fmt(e); if (line) { logQueue.push(line); currentMsg = line; }
        }
        return interv;
    }
    function _fmt(e) {
        var nm = function (id) { return state.actors[id] ? state.actors[id].name : id; };
        var sk = function (id) { return (db.skills[id] && db.skills[id].name) || id; };
        switch (e.type) {
            case 'hit': return nm(e.actor) + ' — ' + sk(e.skill) + (e.crit ? ' CRIT' : '') + ' → ' + nm(e.target) + ' ' + e.dmg;
            case 'heal': return nm(e.actor) + ' — ' + sk(e.skill) + ' +' + e.amount + ' HP';
            case 'buff': return nm(e.actor) + ' braced (defense up)';
            case 'partybuff': return nm(e.actor) + ' rallied the party (' + e.kind + ' up)';
            case 'taunt': return nm(e.actor) + ' taunts — drawing fire';
            case 'summon': return nm(e.actor) + ' deployed a Turret';
            case 'debuff': return nm(e.actor) + ' — ' + sk(e.skill) + ' on ' + nm(e.target);
            case 'dot': return nm(e.actor) + ' takes ' + e.dmg + ' toxin';
            case 'counter': return nm(e.actor) + ' counters! ' + e.dmg;
            case 'miss': return nm(e.target) + ' evaded';
            case 'down': return nm(e.actor) + ' went down!';
            case 'intervention': return '⟁ THE SYSTEM intervened — +' + e.heal + ' HP. Surveillance ' + e.surveillance;
            default: return '';
        }
    }

    // ---- input ------------------------------------------------------------
    function consumeInput(jp) {
        if (!active) return;
        if (awaitingClose) { if (jp.a || jp.b || jp.start) _teardown(); return; }
        if (mode === 'menu') {
            var COLS = 2, n = menuSkills.length;
            if (jp.left)  { if (cursor % COLS > 0) cursor -= 1; }
            if (jp.right) { if (cursor % COLS < COLS - 1 && cursor + 1 < n) cursor += 1; }
            if (jp.up)    { if (cursor - COLS >= 0) cursor -= COLS; }
            if (jp.down)  { if (cursor + COLS < n) cursor += COLS; }
            if (jp.left || jp.right || jp.up || jp.down) _render();
            if (jp.a) _selectSkill();
            if (jp.b) _flee();
        } else if (mode === 'target') {
            if (jp.left)  { targetIdx = (targetIdx - 1 + targetList.length) % targetList.length; _render(); }
            if (jp.right) { targetIdx = (targetIdx + 1) % targetList.length; _render(); }
            if (jp.a) _resolve(chosenSkill, targetList[targetIdx]);
            if (jp.b) { mode = 'menu'; _render(); }
        }
    }

    function _selectSkill() {
        var skillId = menuSkills[cursor], sk = db.skills[skillId], eff = sk.effect || {};
        var needsTarget = (sk.power > 0 || ['slow', 'markTarget', 'sunder', 'applyToxin'].indexOf(eff.type) >= 0) && eff.type !== 'aoe';
        var foes = _alive('enemy');
        if (needsTarget && foes.length > 1) {
            chosenSkill = skillId; targetList = foes.map(function (a) { return a.id; }); targetIdx = 0;
            mode = 'target'; _render();
        } else {
            _resolve(skillId, needsTarget || eff.type === 'aoe' ? (foes[0] ? foes[0].id : null) : null);
        }
    }
    function _resolve(skillId, targetId) {
        var before = state.log.length;
        root.GameCombat.act(state, db, { actorId: pendingActorId, skillId: skillId, targetId: targetId });
        _flush(before);
        pendingActorId = null; chosenSkill = null; _closeMenu();
        mode = 'beat'; waitUntil = _now() + 520;
    }
    function _flee() { currentMsg = 'You slip away from the fight.'; awaitingClose = true; mode = 'over'; _closeMenu(); }

    function _finish() {
        var msg;
        if (state.winner === 'player') {
            var totalXp = 0, lvlEvents = [];
            for (var id in enemyMeta) {
                var g = root.GameProgression.gainFromKill(prog, { level: enemyMeta[id].level, xpYield: enemyMeta[id].xpYield }, db.progression);
                totalXp += g.xp; lvlEvents = lvlEvents.concat(g.events);
            }
            _saveProg();
            msg = 'You won.  +' + totalXp + ' XP';
            if (lvlEvents.length) {
                var pts = lvlEvents.reduce(function (s, e) { return s + e.points; }, 0);
                msg += '   ⤴ LEVEL UP → Lv' + prog.level + ' (+' + pts + ' pts)';
            }
        } else { msg = state.winner === 'enemy' ? 'You were overcome…' : 'The fight ends.'; }
        currentMsg = msg + '   (Surv ' + state.surveillance + ')  — press A';
        awaitingClose = true;
    }

    // ---- DOM --------------------------------------------------------------
    function _mount() {
        _injectCSS();
        var host = document.getElementById('screen-primary') || document.body;
        var r = document.createElement('div'); r.id = 'combat-view';
        r.innerHTML =
            '<div class="cv-field">' +
            '  <div class="cv-row cv-enemies" id="cv-enemies"></div>' +
            '  <div class="cv-system" id="cv-system"><div class="cv-sys-label">SYSTEM</div>' +
            '    <div class="cv-bar cv-iv"><span></span></div><div class="cv-surv" id="cv-surv">Surveillance 0</div></div>' +
            '  <div class="cv-row cv-players" id="cv-players"></div>' +
            '</div><div class="cv-msg" id="cv-msg"></div><div class="cv-menu" id="cv-menu"></div>';
        host.appendChild(r);
        els.root = r;
        els.enemies = r.querySelector('#cv-enemies'); els.players = r.querySelector('#cv-players');
        els.iv = r.querySelector('#cv-system .cv-iv span'); els.surv = r.querySelector('#cv-surv');
        els.msg = r.querySelector('#cv-msg'); els.menu = r.querySelector('#cv-menu');
    }
    function _sprite(a) { return a.side === 'enemy' ? '👹' : (a.summon ? '⚙' : '🛠'); }
    function _card(a) {
        var c = document.createElement('div');
        c.className = 'cv-card cv-' + a.side + (a.summon ? ' cv-summon' : '');
        c.innerHTML = (a.side === 'enemy'
            ? '<div class="cv-tgt">▼</div><div class="cv-name"></div><div class="cv-bar cv-hp"><span></span></div><div class="cv-bar cv-tempo"><span></span></div><div class="cv-status"></div><div class="cv-sprite">' + _sprite(a) + '</div>'
            : '<div class="cv-sprite">' + _sprite(a) + '</div><div class="cv-name"></div><div class="cv-bar cv-hp"><span></span></div><div class="cv-bar cv-tempo"><span></span></div><div class="cv-status"></div>');
        return c;
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
        if (a.markMult > 0) t.push('MARK'); if (a.dot && a.dot.length) t.push('☠'); if (a.taunting > 0) t.push('TAUNT');
        return t.join(' ');
    }
    function _tempoDisp(a) {
        var max = state.tuning.tempoMax, frac = (mode === 'ticking') ? Math.min(1, acc / MS_PER_STEP) : 0;
        var gain = Math.max(0, a.speed * (1 + (a.speedMod || 0))) * (state.tuning.tickStep / 100);
        return Math.min(1, (a.tempo + gain * frac) / max);
    }
    function _setBar(card, sel, ratio, cls) {
        var span = card.querySelector('.' + sel + ' span');
        if (span) { span.style.width = Math.max(0, Math.min(1, ratio)) * 100 + '%'; if (cls) span.className = cls; }
    }
    function _updateCard(a) {
        var c = cards[a.id];
        if (!c) { c = cards[a.id] = _card(a); (a.side === 'enemy' ? els.enemies : els.players).appendChild(c); }
        var max = state.tuning.tempoMax, lvl = a.side === 'enemy' ? (enemyMeta[a.id] ? ' Lv' + enemyMeta[a.id].level : '') : (a.id === 'p1' && prog ? ' Lv' + prog.level : '');
        c.querySelector('.cv-name').textContent = a.name + lvl;
        _setBar(c, 'cv-hp', a.hp / a.maxHp, 'hp-fill' + (a.hp / a.maxHp < 0.3 ? ' low' : ''));
        _setBar(c, 'cv-tempo', _tempoDisp(a), 'tempo-fill' + (a.tempo >= max ? ' ready' : ''));
        c.querySelector('.cv-status').textContent = _statusTags(a);
        c.classList.toggle('dead', a.hp <= 0);
        var targeting = (mode === 'target' && targetList[targetIdx] === a.id);
        c.classList.toggle('targeted', targeting);
    }

    function _render() {
        if (!els.root) return;
        state.order.forEach(function (id) { _updateCard(state.actors[id]); });
        els.iv.style.width = Math.min(1, (state._ivTempo || 0) / state.tuning.tempoMax) * 100 + '%';
        els.surv.textContent = 'Surveillance ' + state.surveillance;
        els.msg.textContent = (mode === 'target') ? 'Choose target  ◄ ►   (B: back)' : currentMsg;
        if (mode === 'menu' && menuSkills.length) {
            els.menu.style.display = 'grid';
            els.menu.innerHTML = menuSkills.map(function (id, i) {
                var s = db.skills[id];
                return '<div class="cv-opt' + (i === cursor ? ' sel' : '') + '">' + (i === cursor ? '▶ ' : '') + s.name + (s.tempoCost ? ' <em>' + s.tempoCost + '</em>' : '') + '</div>';
            }).join('');
        } else { els.menu.style.display = 'none'; els.menu.innerHTML = ''; }
    }

    function _teardown() {
        active = false; awaitingClose = false; mode = 'idle'; pendingActorId = null; menuSkills = []; logQueue = [];
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        if (els.root && els.root.parentNode) els.root.parentNode.removeChild(els.root);
        els = {}; cards = {}; state = null;
    }

    function _injectCSS() {
        if (document.getElementById('cv-style')) return;
        var css =
        '#combat-view{position:absolute;inset:0;z-index:50;display:flex;flex-direction:column;font-family:"Courier New",monospace;color:#e6eef6;background:radial-gradient(circle at 50% 35%,#2a2330,#0b0a12 80%);}' +
        '.cv-field{position:relative;flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:4px;}' +
        '.cv-row{display:flex;gap:4px;justify-content:center;flex-wrap:wrap;}' +
        '.cv-enemies{align-items:flex-start;} .cv-players{align-items:flex-end;}' +
        '.cv-card{position:relative;flex:0 1 auto;min-width:28%;max-width:46%;padding:4px 6px;background:#060610;border:1px solid #000;box-shadow:0 0 0 2px #3a2f1e,0 0 0 3px #000;border-radius:3px;}' +
        '.cv-card.cv-summon{box-shadow:0 0 0 2px #2a4a52,0 0 0 3px #000;}' +
        '.cv-card.dead{opacity:0.3;filter:grayscale(1);}' +
        '.cv-card.targeted{box-shadow:0 0 0 2px #ffd96a,0 0 6px #ffd96a;}' +
        '.cv-tgt{position:absolute;top:-12px;left:50%;transform:translateX(-50%);color:#ffd96a;font-size:12px;display:none;}' +
        '.cv-card.targeted .cv-tgt{display:block;}' +
        '.cv-name{font-size:10px;font-weight:bold;color:#f2d39a;margin-bottom:2px;}' +
        '.cv-bar{height:6px;background:#1a1a24;border:1px solid #000;border-radius:3px;margin:2px 0;overflow:hidden;}' +
        '.cv-bar span{display:block;height:100%;width:100%;}' +
        '.hp-fill{background:linear-gradient(#7bd66a,#3da13a);transition:width 140ms ease;} .hp-fill.low{background:linear-gradient(#e06a4a,#b03020);transition:width 140ms ease;}' +
        '.tempo-fill{background:linear-gradient(#e8c46a,#b88a2a);} .tempo-fill.ready{background:linear-gradient(#ffe9a0,#e8b94a);box-shadow:0 0 4px #ffd96a;}' +
        '.cv-status{font-size:8px;letter-spacing:1px;color:#9ab0c4;min-height:9px;margin-top:1px;}' +
        '.cv-sprite{font-size:26px;text-align:center;}' +
        '.cv-system{align-self:center;text-align:center;width:36%;padding:3px 6px;background:rgba(2,12,18,0.7);border:1px solid #002830;box-shadow:0 0 0 1px #18b8c8;border-radius:3px;}' +
        '.cv-sys-label{font-size:8px;letter-spacing:3px;color:#80d0e8;}' +
        '.cv-iv span{background:linear-gradient(#5fe0f0,#18b8c8);} .cv-system .cv-bar{border-color:#0a3038;}' +
        '.cv-surv{font-size:8px;color:#80d0e8;margin-top:1px;}' +
        '.cv-msg{min-height:28px;padding:5px 10px;font-size:11px;background:#060610;border-top:1px solid #18b8c8;box-shadow:inset 0 1px 0 #002830;display:flex;align-items:center;}' +
        '.cv-menu{display:none;grid-template-columns:1fr 1fr;gap:2px;padding:5px 10px;background:#0a1830;border-top:1px solid #18b8c8;}' +
        '.cv-opt{font-size:11px;padding:3px 6px;color:#c8d8e8;border-radius:2px;}' +
        '.cv-opt.sel{background:rgba(24,184,200,0.18);color:#fff;}' +
        '.cv-opt em{float:right;font-style:normal;color:#8aa0b4;font-size:9px;}';
        var st = document.createElement('style'); st.id = 'cv-style'; st.textContent = css; document.head.appendChild(st);
    }

    root.GameCombatView = { start: start, isActive: isActive, consumeInput: consumeInput };
})(typeof window !== 'undefined' ? window : this);
