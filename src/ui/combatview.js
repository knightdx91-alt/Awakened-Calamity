// GameCombatView — PRESENTATION for the Tempo + Intervention battle.
// This is the throwaway view layer (ARCHITECTURE.md): it owns NO game logic.
// All resolution comes from the pure rules core src/systems/combat.js + rng.js,
// fed by data/systems/*.json. The view only renders returned state + forwards input.
(function (root) {
    'use strict';

    var db = null;            // { combat, skills, affinities, creatures, classes }
    var state = null;         // live battle state from GameCombat
    var active = false;
    var busy = false;         // true while an enemy/intervention beat is animating
    var awaitingClose = false;
    var pendingActorId = null;// a player actor waiting for the menu
    var menuSkills = [];      // skillIds shown in the menu
    var cursor = 0;
    var els = {};
    var seedCounter = 1;

    var BUILD = (root.__BUILD__ || 'dev');
    var STEP_MS = 420;        // pacing between automated beats

    // ---- data load --------------------------------------------------------
    function fetchJSON(path) {
        return fetch(path + '?b=' + BUILD, { cache: 'no-cache' }).then(function (r) {
            if (!r.ok) throw new Error('fetch ' + path + ' ' + r.status);
            return r.json();
        });
    }
    function loadDB() {
        if (db) return Promise.resolve(db);
        var base = 'data/systems/';
        return Promise.all([
            fetchJSON(base + 'combat.json'),
            fetchJSON(base + 'skills.json'),
            fetchJSON(base + 'affinities.json'),
            fetchJSON(base + 'creatures.json'),
            fetchJSON(base + 'classes.json')
        ]).then(function (r) {
            db = { combat: r[0], skills: r[1], affinities: r[2], creatures: r[3], classes: r[4] };
            return db;
        });
    }

    // ---- actor construction (test build: Smith vs a creature) -------------
    // The player loadout is a representative COMBAT mix so the engine is fully
    // exercised: a light hit, a heavy hit, a defensive buff, a heal, plus the
    // passives (Toughness raises maxHp). Smith stats come from classes.json.
    function buildPlayer() {
        var smith = (db.classes && db.classes.smith) || { statProfile: { hp: 80, atk: 16, def: 18, speed: 46 }, affinityLean: 'stone' };
        return {
            id: 'p1', side: 'player', name: 'Smith', affinity: smith.affinityLean || 'stone',
            stats: Object.assign({}, smith.statProfile),
            loadout: ['jab', 'heavy_strike', 'guard', 'mend', 'toughness', 'sturdy']
        };
    }
    function buildEnemy(key) {
        var c = db.creatures[key] || db.creatures.emberling;
        return {
            id: 'e1', side: 'enemy', name: c.name, affinity: c.affinity,
            stats: Object.assign({}, c.stats),
            loadout: (c.loadout || ['jab']).slice()
        };
    }

    // ---- public: start ----------------------------------------------------
    function start(opts) {
        if (active) return;
        opts = opts || {};
        active = true;
        loadDB().then(function () {
            var enemyKey = opts.enemy || (Math.random() < 0.5 ? 'emberling' : 'thornwolf');
            var actors = [buildPlayer(), buildEnemy(enemyKey)];
            var seed = (Date.now() ^ (seedCounter++ * 0x9e3779b1)) >>> 0;
            state = root.GameCombat.createBattle(db, actors, seed);
            pendingActorId = null; awaitingClose = false; busy = false; cursor = 0;
            _mount();
            _render('A wild ' + state.actors.e1.name + ' interrupts your work!');
            setTimeout(_resume, 700);
        }).catch(function (e) {
            active = false;
            console.error('[combat] failed to start', e);
        });
    }

    function isActive() { return active; }

    // ---- the step loop ----------------------------------------------------
    // Advance the pure rules until a PLAYER actor is ready (then wait for input)
    // or the battle ends. Enemy/intervention beats animate with a pause.
    function _resume() {
        if (!active) return;
        if (state.over) { _finish(); return; }
        var beforeLen = state.log.length;
        var id = root.GameCombat.advanceToReady(state);
        // Surface anything the System did while ticking (interventions).
        _flushLog(beforeLen);
        if (state.over || id == null) { _render(); _finish(); return; }
        var a = state.actors[id];
        if (a.side === 'player') {
            pendingActorId = id;
            _openMenu(a);
            _render(a.name + ' is ready.');
        } else {
            busy = true;
            _render();
            setTimeout(function () {
                var before = state.log.length;
                var action = root.GameCombat.enemyAction(state, db, id);
                root.GameCombat.act(state, db, action);
                _flushLog(before);
                _render();
                setTimeout(function () { busy = false; _resume(); }, STEP_MS);
            }, STEP_MS);
        }
    }

    var logQueue = [];
    function _flushLog(fromIndex) {
        for (var i = fromIndex; i < state.log.length; i++) logQueue.push(_fmt(state.log[i]));
    }
    function _fmt(e) {
        var nm = function (id) { return state.actors[id] ? state.actors[id].name : id; };
        var sk = function (id) { return (db.skills[id] && db.skills[id].name) || id; };
        switch (e.type) {
            case 'hit':   return nm(e.actor) + ' used ' + sk(e.skill) + ' — ' + e.dmg + ' dmg';
            case 'heal':  return nm(e.actor) + ' used ' + sk(e.skill) + ' — restored ' + e.amount + ' HP';
            case 'buff':  return nm(e.actor) + ' braced (defense up)';
            case 'down':  return nm(e.actor) + ' went down!';
            case 'intervention': return '⟁ THE SYSTEM intervened — +' + e.heal + ' HP. Surveillance ' + e.surveillance;
            default:      return '';
        }
    }

    // ---- input ------------------------------------------------------------
    function consumeInput(jp) {
        if (!active) return;
        if (awaitingClose) { if (jp.a || jp.b || jp.start) _teardown(); return; }
        if (busy || pendingActorId == null) return;       // not the player's moment
        if (jp.up)   { cursor = (cursor - 1 + menuSkills.length) % menuSkills.length; _render(); }
        if (jp.down) { cursor = (cursor + 1) % menuSkills.length; _render(); }
        if (jp.a)    { _choose(); }
        if (jp.b)    { _flee(); }
    }

    function _choose() {
        var skillId = menuSkills[cursor];
        var foes = Object.keys(state.actors).map(function (k) { return state.actors[k]; })
            .filter(function (a) { return a.side === 'enemy' && a.hp > 0; });
        var target = foes[0];
        var before = state.log.length;
        root.GameCombat.act(state, db, { actorId: pendingActorId, skillId: skillId, targetId: target ? target.id : null });
        _flushLog(before);
        pendingActorId = null;
        _closeMenu();
        busy = true;
        _render();
        setTimeout(function () { busy = false; _resume(); }, STEP_MS);
    }

    function _flee() {
        logQueue.push('You slip away from the fight.');
        _render('You slip away from the fight.');
        awaitingClose = true;
    }

    // ---- end --------------------------------------------------------------
    function _finish() {
        var msg = state.winner === 'player' ? 'You won the exchange.' :
                  state.winner === 'enemy'  ? 'You were overcome…' : 'The fight ends.';
        _render(msg + '  (Surveillance ' + state.surveillance + ')  — press A');
        awaitingClose = true;
    }

    // ---- DOM --------------------------------------------------------------
    function _mount() {
        _injectCSS();
        var host = document.getElementById('screen-primary') || document.body;
        var root_ = document.createElement('div');
        root_.id = 'combat-view';
        root_.innerHTML =
            '<div class="cv-field">' +
            '  <div class="cv-card cv-enemy" id="cv-enemy">' +
            '    <div class="cv-name"></div>' +
            '    <div class="cv-bar cv-hp"><span></span></div>' +
            '    <div class="cv-bar cv-tempo"><span></span></div>' +
            '    <div class="cv-sprite">👹</div>' +
            '  </div>' +
            '  <div class="cv-system" id="cv-system">' +
            '    <div class="cv-sys-label">SYSTEM</div>' +
            '    <div class="cv-bar cv-iv"><span></span></div>' +
            '    <div class="cv-surv" id="cv-surv">Surveillance 0</div>' +
            '  </div>' +
            '  <div class="cv-card cv-player" id="cv-player">' +
            '    <div class="cv-sprite">🛠</div>' +
            '    <div class="cv-name"></div>' +
            '    <div class="cv-bar cv-hp"><span></span></div>' +
            '    <div class="cv-bar cv-tempo"><span></span></div>' +
            '  </div>' +
            '</div>' +
            '<div class="cv-msg" id="cv-msg"></div>' +
            '<div class="cv-menu" id="cv-menu"></div>';
        host.appendChild(root_);
        els.root = root_;
        els.enemy = root_.querySelector('#cv-enemy');
        els.player = root_.querySelector('#cv-player');
        els.iv = root_.querySelector('#cv-system .cv-iv span');
        els.surv = root_.querySelector('#cv-surv');
        els.msg = root_.querySelector('#cv-msg');
        els.menu = root_.querySelector('#cv-menu');
    }

    function _openMenu(a) {
        // Only show skills the engine can resolve as a battle action.
        menuSkills = a.loadout.filter(function (id) {
            var s = db.skills[id]; if (!s) return false;
            return s.power > 0 || (s.effect && (s.effect.type === 'heal' || s.effect.type === 'defUp'));
        });
        cursor = 0;
    }
    function _closeMenu() { menuSkills = []; }

    function _bar(card, sel, ratio, cls) {
        var span = card.querySelector('.' + sel + ' span');
        if (span) { span.style.width = Math.max(0, Math.min(1, ratio)) * 100 + '%'; if (cls) span.className = cls; }
    }

    function _render(msg) {
        if (!els.root) return;
        var p = state.actors.p1, e = state.actors.e1;
        var max = state.tuning.tempoMax;
        els.enemy.querySelector('.cv-name').textContent = e.name + '  Lv?';
        els.player.querySelector('.cv-name').textContent = p.name;
        _bar(els.enemy, 'cv-hp', e.hp / e.maxHp, 'hp-fill' + (e.hp / e.maxHp < 0.3 ? ' low' : ''));
        _bar(els.player, 'cv-hp', p.hp / p.maxHp, 'hp-fill' + (p.hp / p.maxHp < 0.3 ? ' low' : ''));
        _bar(els.enemy, 'cv-tempo', e.tempo / max, 'tempo-fill');
        _bar(els.player, 'cv-tempo', p.tempo / max, 'tempo-fill');
        els.iv.style.width = Math.min(1, (state._ivTempo || 0) / max) * 100 + '%';
        els.surv.textContent = 'Surveillance ' + state.surveillance;

        // drain one queued message per render for readability
        if (msg) els.msg.textContent = msg;
        else if (logQueue.length) els.msg.textContent = logQueue.shift();

        // menu
        if (menuSkills.length && pendingActorId) {
            els.menu.style.display = 'grid';
            els.menu.innerHTML = menuSkills.map(function (id, i) {
                var s = db.skills[id];
                var cost = s.tempoCost ? ('<em>' + s.tempoCost + '</em>') : '';
                return '<div class="cv-opt' + (i === cursor ? ' sel' : '') + '">' +
                       (i === cursor ? '▶ ' : '') + s.name + ' ' + cost + '</div>';
            }).join('');
        } else {
            els.menu.style.display = 'none';
            els.menu.innerHTML = '';
        }
    }

    function _teardown() {
        active = false; awaitingClose = false; busy = false; pendingActorId = null;
        menuSkills = []; logQueue = [];
        if (els.root && els.root.parentNode) els.root.parentNode.removeChild(els.root);
        els = {}; state = null;
    }

    // ---- CSS (injected once) ---------------------------------------------
    function _injectCSS() {
        if (document.getElementById('cv-style')) return;
        var css =
        '#combat-view{position:absolute;inset:0;z-index:50;display:flex;flex-direction:column;' +
        'font-family:"Courier New",monospace;color:#e6eef6;background:radial-gradient(circle at 50% 35%,#2a2330,#0b0a12 80%);}' +
        '.cv-field{position:relative;flex:1;}' +
        '.cv-card{position:absolute;width:46%;padding:2% 3%;background:#060610;border:1px solid #000;' +
        'box-shadow:0 0 0 2px #3a2f1e,0 0 0 3px #000;border-radius:3px;}' +
        '.cv-enemy{top:6%;right:3%;}' +
        '.cv-player{bottom:6%;left:3%;}' +
        '.cv-name{font-size:11px;font-weight:bold;color:#f2d39a;margin-bottom:3px;}' +
        '.cv-bar{height:7px;background:#1a1a24;border:1px solid #000;border-radius:3px;margin:2px 0;overflow:hidden;}' +
        '.cv-bar span{display:block;height:100%;width:100%;}' +
        '.hp-fill{background:linear-gradient(#7bd66a,#3da13a);} .hp-fill.low{background:linear-gradient(#e06a4a,#b03020);}' +
        '.tempo-fill{background:linear-gradient(#e8c46a,#b88a2a);}' +
        '.cv-sprite{font-size:30px;text-align:center;margin-top:4px;}' +
        '.cv-system{position:absolute;top:4%;left:50%;transform:translateX(-50%);width:38%;text-align:center;' +
        'padding:4px 6px;background:rgba(2,12,18,0.7);border:1px solid #002830;box-shadow:0 0 0 1px #18b8c8;border-radius:3px;}' +
        '.cv-sys-label{font-size:9px;letter-spacing:3px;color:#80d0e8;}' +
        '.cv-iv span{background:linear-gradient(#5fe0f0,#18b8c8);} .cv-system .cv-bar{border-color:#0a3038;}' +
        '.cv-surv{font-size:9px;color:#80d0e8;margin-top:2px;}' +
        '.cv-msg{min-height:30px;padding:6px 10px;font-size:11px;background:#060610;border-top:1px solid #18b8c8;' +
        'box-shadow:inset 0 1px 0 #002830;display:flex;align-items:center;}' +
        '.cv-menu{display:none;grid-template-columns:1fr 1fr;gap:2px;padding:6px 10px;background:#0a1830;' +
        'border-top:1px solid #18b8c8;}' +
        '.cv-opt{font-size:11px;padding:3px 6px;color:#c8d8e8;border-radius:2px;}' +
        '.cv-opt.sel{background:rgba(24,184,200,0.18);color:#fff;}' +
        '.cv-opt em{float:right;font-style:normal;color:#8aa0b4;font-size:9px;}';
        var st = document.createElement('style');
        st.id = 'cv-style'; st.textContent = css;
        document.head.appendChild(st);
    }

    root.GameCombatView = { start: start, isActive: isActive, consumeInput: consumeInput };
})(typeof window !== 'undefined' ? window : this);
