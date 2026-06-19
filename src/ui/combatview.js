// GameCombatView — PRESENTATION for the Tempo + Intervention battle.
// Throwaway view layer (ARCHITECTURE.md): owns NO game logic. All resolution
// comes from the pure rules core src/systems/combat.js + rng.js + progression.js,
// fed by data/systems/*.json. Drives the core's per-frame step() so Tempo bars
// fill in REAL TIME; supports multiple enemies/allies + target selection.
(function (root) {
    'use strict';

    var db = null, state = null, active = false;
    var _onEnd = null;   // optional callback fired when combat tears down
    var _lastResult = null; // {winner, surveillance} captured before teardown nulls state
    var mode = 'idle';                  // 'beat'|'ticking'|'action'|'menu'|'item'|'target'|'over'
    var awaitingClose = false, pendingActorId = null;
    var menuSkills = [], cursor = 0;
    var chosenSkill = null, targetList = [], targetIdx = 0;
    var ACTIONS = ['FIGHT', 'ITEM', 'RUN'], actionCursor = 0;
    var itemList = [], itemCursor = 0, chosenItem = null, targetMode = 'skill';
    var els = {}, cards = {};
    var logQueue = [], currentMsg = '';
    var rafId = 0, lastTs = 0, acc = 0, waitUntil = 0, seedCounter = 1;
    var prog = null, enemyMeta = {}, allyMeta = {}, _localProg = null;
    var _battleback = 'Grassland';   // RTP battleback id (floor+wall layer share the name)
    var _playerSprite = null;        // player charset for the battle sprite

    // The player's chosen overworld charset (editor picker) or a default RTP hero.
    function _buildPlayerSprite() {
        var ov = null; try { ov = JSON.parse(localStorage.getItem('ac_player_sprite') || 'null'); } catch (e) {}
        // The chosen appearance is stored either as a cropped dataUrl (creation) or a
        // charset file ref. Honour BOTH so the battle sprite matches the overworld one.
        if (ov && ov.frame_w && (ov.dataUrl || ov.file))
            return { src: ov.dataUrl ? ov.dataUrl : ('data/sprites/' + ov.file), cols: ov.cols || 3, rows: ov.rows || 4, fw: ov.frame_w, fh: ov.frame_h, char: 0 };
        return { src: 'data/sprites/rtp/Actor1.png', cols: 12, rows: 8, fw: 32, fh: 32, char: 0 };
    }
    // A scaled, cropped standing frame of a charset. dir: 0=down 1=left 2=right 3=up.
    function _charSpriteHTML(sp, hpx, dir) {
        var perRow = Math.max(1, (sp.cols / 3) | 0), ch = sp.char || 0;
        var cc = ch % perRow, cr = (ch / perRow) | 0;
        var fx = (cc * 3 + 1) * sp.fw, fy = (cr * 4 + (dir || 0)) * sp.fh;   // middle col = stand
        var S = hpx / sp.fh, sw = sp.cols * sp.fw, sh = sp.rows * sp.fh;
        return '<div class="cv-charsprite" style="width:' + (sp.fw * S) + 'px;height:' + (sp.fh * S) + 'px;' +
            "background-image:url('" + sp.src + "');background-size:" + (sw * S) + 'px ' + (sh * S) + 'px;' +
            'background-position:-' + (fx * S) + 'px -' + (fy * S) + 'px;"></div>';
    }

    var BUILD = (root.__BUILD__ || 'dev');
    var MS_PER_STEP = 30;   // real-time bar tick (lower = snappier; view-only, no balance change)

    // Per-affinity impact SE (RTP). Physical (no affinity) falls back to a Blow.
    var AFF_SE = {
        ember: 'Fire2', tide: 'Water3', verdant: 'Wind3', storm: 'Thunder2',
        stone: 'Earth2', frost: 'Ice2', toxin: 'Poison', umbral: 'Darkness2',
        lumen: 'Saint5', corruption: 'Darkness5'
    };

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
        if (s) {
            if (!s.progress) {
                // Seed progression from the player's chosen class (tier + level).
                var cls = s.player && s.player.class;
                var tier = (cls && db && db.classes && db.classes[cls.id] && db.classes[cls.id].tier) || 'basic';
                s.progress = root.GameProgression.createProgress(tier, (cls && cls.level) || 1);
                if (cls && cls.xp) s.progress.xp = cls.xp;
            }
            return s.progress;
        }
        _localProg = _localProg || root.GameProgression.createProgress('basic', 1);
        return _localProg;
    }
    function _saveProg() {
        var s = (root.GameSave && root.GameSave.state) ? root.GameSave.state : null;
        if (s) {
            s.progress = prog;
            // Mirror level/xp back onto player.class so the STATUS screen + class
            // logic share one source of truth.
            if (s.player && s.player.class) { s.player.class.level = prog.level; s.player.class.xp = prog.xp; }
            if (root.GameSave.markDirty) root.GameSave.markDirty();
        } else { _localProg = prog; }
    }

    // ---- actors -----------------------------------------------------------
    function buildPlayer() {
        var ps = (window.GameSave && GameSave.state && GameSave.state.player) || {};
        var clsId = (ps.class && ps.class.id) || 'smith';
        var cls = (db.classes && (db.classes[clsId] || db.classes.smith)) ||
                  { name: 'Survivor', statProfile: { hp: 80, atk: 16, def: 18, speed: 46 }, affinityLean: 'stone', grantsSkills: ['jab'] };
        // Loadout = the skills the player has learned, else the class's granted set.
        var loadout = (ps.skills && ps.skills.length) ? ps.skills.slice() : (cls.grantsSkills || ['jab']).slice();
        if (!loadout.length) loadout = ['jab'];
        // Base class stats + allocated attribute bonuses.
        var stats = Object.assign({}, cls.statProfile);
        var pr = (root.GameSave && root.GameSave.state && root.GameSave.state.progress) || null;
        if (pr && root.GameProgression && root.GameProgression.applyAttributes) {
            stats = root.GameProgression.applyAttributes(stats, pr.attributes, db.progression);
        }
        // meta-progression boon: permanent max-HP unlocks carry across runs
        if (root.GameMeta && root._metaDb && root.GameSave && root.GameSave.state && root.GameSave.state.meta) {
            var me = root.GameMeta.effects(root._metaDb, root.GameSave.state.meta);
            if (me.hpMult) stats = Object.assign({}, stats, { hp: Math.round(stats.hp * (1 + me.hpMult)) });
        }
        // RELICS: per-run rewards. Stat multipliers scale the build; the trait
        // bundle (crit/evade/lifesteal/thorns/defBonus) feeds the combat actor.
        var _run = (root.GameSave && root.GameSave.state && root.GameSave.state.run) || null;
        var bonuses = null;
        if (_run && root.GameRelics && root._relicsDb) {
            var re = root.GameRelics.effects(root._relicsDb, _run);
            stats = Object.assign({}, stats, {
                atk: Math.max(1, Math.round(stats.atk * (1 + re.atkMult))),
                hp: Math.max(1, Math.round(stats.hp * (1 + re.hpMult))),
                def: Math.max(0, Math.round(stats.def * (1 + re.defMult))),
                speed: Math.max(1, Math.round((stats.speed || 40) * (1 + re.spdMult)))
            });
            bonuses = { crit: re.crit, evade: re.evade, lifesteal: re.lifesteal, thorns: re.thorns, defBonus: re.defBonus };
        }
        // CORRUPTION: during a run, cumulative Surveillance saps your atk (the System
        // "deciding for you"). This is the FELT in-combat cost of leaning on the
        // System's saves — it mounts tier by tier until Collection ends the run.
        if (_run && _run.active && root.GameCorruption && root._corruptDb) {
            var mod = root.GameCorruption.atkMod(root._corruptDb, _run.surveillance | 0);
            if (mod) stats = Object.assign({}, stats, { atk: Math.max(1, Math.round(stats.atk * (1 + mod))) });
        }
        var def = {
            id: 'p1', side: 'player',
            name: ps.name || cls.name || 'Survivor',
            affinity: ps.affinity || cls.affinityLean || 'stone',
            stats: stats,
            loadout: loadout
        };
        if (bonuses) def.bonuses = bonuses;
        return def;
    }
    // Bonded creatures fight at your side. Bond shape: { key, nickname?, level? }
    // (key = creature id in creatures.json). Up to 3 active. AI-controlled.
    function buildAllies(opts) {
        var bonds = opts.allies || (window.GameSave && GameSave.state && GameSave.state.bonds) || [];
        allyMeta = {};
        if (!Array.isArray(bonds)) return [];
        var out = [];
        bonds.slice(0, 3).forEach(function (bd, i) {
            var key = bd.key || bd.species, c = db.creatures[key];
            if (!c) return;
            var lv = bd.level || bd.tier || 2, s = c.stats, f = 1 + 0.10 * (lv - 1);
            allyMeta['a' + (i + 1)] = { level: lv };
            out.push({
                id: 'a' + (i + 1), side: 'player', ai: true, ally: true,
                name: bd.nickname || c.name, affinity: c.affinity,
                battler: c.battler || null, charset: c.charset || null,
                stats: { hp: Math.round(s.hp * f), atk: Math.round(s.atk * f), def: Math.round(s.def * f), speed: Math.round(s.speed * f) },
                loadout: (c.loadout || ['jab']).slice()
            });
        });
        return out;
    }
    function buildEnemies(opts) {
        // opts.enemies = [{key, level}] OR single opts.enemy/opts.level. Default one.
        var list = opts.enemies;
        if (!list && opts.enemy) list = [{ key: opts.enemy, level: opts.level || 2 }];
        if (!list) {
            // SELECT test: usually one foe, sometimes a pack of 2-3, so the
            // multi-enemy view + target select are exercisable from the button.
            var pool = ['emberling', 'thornwolf'], n = Math.random() < 0.4 ? (Math.random() < 0.5 ? 2 : 3) : 1;
            list = [];
            for (var k = 0; k < n; k++) list.push({ key: pool[Math.floor(Math.random() * pool.length)], level: 2 });
        }
        enemyMeta = {};
        return list.map(function (spec, i) {
            var c = db.creatures[spec.key] || db.creatures.emberling;
            var id = 'e' + (i + 1);
            enemyMeta[id] = { key: spec.key, level: spec.level || 2, xpYield: c.xpYield != null ? c.xpYield : 1.0, creditYield: c.creditYield != null ? c.creditYield : 1.0, name: c.name, battler: c.battler || null };
            return { id: id, side: 'enemy', name: c.name, affinity: c.affinity, stats: Object.assign({}, c.stats), loadout: (c.loadout || ['jab']).slice(), battler: c.battler || null, charset: c.charset || null };
        });
    }

    // ---- lifecycle --------------------------------------------------------
    function start(opts) {
        if (active) return;
        opts = opts || {}; active = true;
        if (root.GameItems) GameItems.load();   // so the battle ITEM menu resolves names/effects
        _onEnd = (typeof opts.onEnd === 'function') ? opts.onEnd : null;
        if (opts.battleback) _battleback = opts.battleback;
        _playerSprite = _buildPlayerSprite();
        loadDB().then(function () {
            prog = _loadProg();
            var actors = [buildPlayer()].concat(buildAllies(opts)).concat(buildEnemies(opts));
            var seed = (Date.now() ^ (seedCounter++ * 0x9e3779b1)) >>> 0;
            state = root.GameCombat.createBattle(db, actors, seed);
            // Tether stance: the System only catches you if you're TETHERED. A run
            // started untethered (refusing its help) gets no lethal-save / no top-up.
            var _run = (root.GameSave && root.GameSave.state && root.GameSave.state.run) || null;
            state.tethered = !(_run && _run.active && _run.tethered === false);
            // remaining Surveillance budget before the System collects you mid-fight
            if (state.tethered && opts && opts.collectBudget != null) state.collectBudget = opts.collectBudget;
            _seedVitals();   // carry persistent HP/MP/SP into the battle (no full-heal each fight)
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
        // The System offers a lethal save — pause everything and let the player CHOOSE.
        // The FIRST time ever, this is the keystone teaching beat: spell out the whole
        // dilemma (Surveillance → Collection → the bad ending).
        if (state && state.pendingSave && mode !== 'save') {
            var add = state.pendingSave.nextSurv || 0;
            var taught = root.GameEventState && GameEventState.getSwitch('taught_save');
            if (!taught) {
                currentMsg = '⟁ THE SYSTEM reaches into the killing blow. Here is the bargain beneath everything:\n'
                    + 'ACCEPT and you live — but SURVEILLANCE climbs (+' + add + '). Watch the bar above. If it ever fills, the System COLLECTS you: the run ends and you are reclaimed — the worst ending.\n'
                    + 'REFUSE and you die now — but you wake clean, remembering more.\n'
                    + '[A] ACCEPT — live   ·   [B] REFUSE — die';
                if (root.GameEventState) GameEventState.setSwitch('taught_save', true);
            } else {
                currentMsg = '⟁ THE SYSTEM closes its hand around you.   [A] ACCEPT — live (Surveillance +' + add + ')   ·   [B] REFUSE — die';
            }
            mode = 'save'; _render();
            rafId = requestAnimationFrame(_loop); return;
        }
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
                    if (a.side === 'player' && !a.ai) { pendingActorId = id; _openMenu(a); mode = 'action'; actionCursor = 0; }
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
            _juice(e);
            var line = _fmt(e); if (line) { logQueue.push(line); currentMsg = line; }
        }
        return interv;
    }

    // ---- JUICE (floating numbers, hit-flash, screenshake, impact SE) -------
    // Presentation feedback only — reads the resolved log, changes no game state.
    function _floatNum(id, text, cls) {
        var c = cards[id]; if (!c) return;
        var f = document.createElement('div');
        f.className = 'cv-float ' + (cls || ''); f.textContent = text;
        c.appendChild(f);
        setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 900);
    }
    function _flashCard(id, cls) {
        var c = cards[id]; if (!c) return;
        var spr = c.querySelector('.cv-sprite'); if (!spr) return;
        spr.classList.remove(cls); void spr.offsetWidth; spr.classList.add(cls);
        setTimeout(function () { spr.classList.remove(cls); }, 320);
    }
    function _shake(mag) {
        if (!els.root) return;
        var f = els.root.querySelector('.cv-field'); if (!f) return;
        var cls = mag >= 2 ? 'cv-shake-big' : 'cv-shake';
        f.classList.remove('cv-shake', 'cv-shake-big'); void f.offsetWidth; f.classList.add(cls);
        setTimeout(function () { f.classList.remove(cls); }, 380);
    }
    function _seForHit(e) {
        var sk = db.skills[e.skill] || {};
        if (sk.affinity && AFF_SE[sk.affinity]) return AFF_SE[sk.affinity];
        return e.crit ? 'Blow7' : 'Blow3';   // physical impact
    }
    function _juice(e) {
        switch (e.type) {
            case 'hit':
                _floatNum(e.target, '-' + e.dmg + (e.crit ? '!' : ''),
                    'dmg' + (e.crit ? ' crit' : '') + (e.aff === 'super' ? ' super' : e.aff === 'resist' ? ' resist' : ''));
                _flashCard(e.target, 'cv-hitflash');
                if (root.GameAudio) GameAudio.playSE(_seForHit(e));
                _shake(e.crit || e.aff === 'super' ? 2 : 1);
                break;
            case 'heal':
                _floatNum(e.target || e.actor, '+' + e.amount, 'heal');
                _flashCard(e.target || e.actor, 'cv-healflash');
                if (root.GameAudio) GameAudio.playSE('Heal2');
                break;
            case 'dot':
                _floatNum(e.actor, '-' + e.dmg, 'dmg poison');
                break;
            case 'counter':
                _floatNum(e.target, '-' + e.dmg, 'dmg');
                _flashCard(e.target, 'cv-hitflash'); _shake(1);
                if (root.GameAudio) GameAudio.playSE('Blow5');
                break;
            case 'miss':
                _floatNum(e.target, 'MISS', 'miss');
                if (root.GameAudio) GameAudio.playSE('Miss');
                break;
            case 'down':
                if (root.GameAudio) GameAudio.playSE('Collapse1');
                break;
        }
    }
    function _fmt(e) {
        var nm = function (id) { return state.actors[id] ? state.actors[id].name : id; };
        var sk = function (id) { return (db.skills[id] && db.skills[id].name) || id; };
        switch (e.type) {
            case 'hit': return nm(e.actor) + ' — ' + sk(e.skill) + (e.crit ? ' CRIT' : '') + ' → ' + nm(e.target) + ' ' + e.dmg
                + (e.aff === 'super' ? '  ⚡SUPER EFFECTIVE!' : e.aff === 'resist' ? '  …resisted' : '');
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
            case 'intervention':
                if (e.kind === 'offer') return '⟁ THE SYSTEM reaches for you…';
                if (e.kind === 'lethal_save') return '⟁ THE SYSTEM caught you — revived. Surveillance ' + e.surveillance;
                if (e.kind === 'refused') return 'You refuse its hand. The dark takes you.';
                if (e.kind === 'collected') return '⟁ COLLECTED. The System reclaims you.';
                return '⟁ THE SYSTEM intervened. Surveillance ' + e.surveillance;
            default: return '';
        }
    }

    // ---- input ------------------------------------------------------------
    function consumeInput(jp) {
        if (!active) return;
        if (awaitingClose) { if (jp.a || jp.b || jp.start) _teardown(); return; }
        // The lethal-save dilemma: A accepts (live, Surveillance ↑), B refuses (die).
        if (mode === 'save') {
            if (jp.a || jp.b) {
                var before = state.log.length;
                root.GameCombat.resolveSave(state, !!jp.a);   // A = accept, B = refuse
                _flush(before);
                if (root.GameAudio) GameAudio.playSE(jp.a ? 'Recovery' : 'Collapse4');
                mode = state.over ? 'over' : 'beat'; waitUntil = _now() + 700; _render();
            }
            return;
        }
        if (mode === 'action') {
            if (jp.up)   { actionCursor = (actionCursor - 1 + ACTIONS.length) % ACTIONS.length; _render(); }
            if (jp.down) { actionCursor = (actionCursor + 1) % ACTIONS.length; _render(); }
            if (jp.a)    _chooseAction();
            if (jp.b)    _flee();
        } else if (mode === 'menu') {
            var COLS = 2, n = menuSkills.length;
            if (jp.left)  { if (cursor % COLS > 0) cursor -= 1; }
            if (jp.right) { if (cursor % COLS < COLS - 1 && cursor + 1 < n) cursor += 1; }
            if (jp.up)    { if (cursor - COLS >= 0) cursor -= COLS; }
            if (jp.down)  { if (cursor + COLS < n) cursor += COLS; }
            if (jp.left || jp.right || jp.up || jp.down) _render();
            if (jp.a) _selectSkill();
            if (jp.b) { mode = 'action'; _render(); }
        } else if (mode === 'item') {
            if (jp.up)   { if (itemList.length) itemCursor = (itemCursor - 1 + itemList.length) % itemList.length; _render(); }
            if (jp.down) { if (itemList.length) itemCursor = (itemCursor + 1) % itemList.length; _render(); }
            if (jp.a)    _selectItem();
            if (jp.b)    { mode = 'action'; _render(); }
        } else if (mode === 'target') {
            if (jp.left)  { targetIdx = (targetIdx - 1 + targetList.length) % targetList.length; _render(); }
            if (jp.right) { targetIdx = (targetIdx + 1) % targetList.length; _render(); }
            if (jp.a) { if (targetMode === 'item') _resolveItem(chosenItem, targetList[targetIdx]); else _resolve(chosenSkill, targetList[targetIdx]); }
            if (jp.b) { mode = (targetMode === 'item') ? 'item' : 'menu'; _render(); }
        }
    }

    function _chooseAction() {
        if (root.GameEventState) GameEventState.setSwitch('taught_combat', true);   // first action taken
        var act = ACTIONS[actionCursor];
        if (act === 'FIGHT') { mode = 'menu'; cursor = 0; _render(); }
        else if (act === 'ITEM') {
            itemList = _battleItems(); itemCursor = 0;
            if (!itemList.length) { currentMsg = 'No usable items.'; if (root.GameAudio) GameAudio.playSE('Buzzer1'); _render(); }
            else { mode = 'item'; _render(); }
        } else { _flee(); }
    }

    function _selectSkill() {
        var skillId = menuSkills[cursor], sk = db.skills[skillId], eff = sk.effect || {};
        var actor = state.actors[pendingActorId];
        if (root.GameCombat.canAfford && !root.GameCombat.canAfford(actor, sk)) {
            currentMsg = 'Not enough ' + (sk.affinity ? 'MP' : 'Stamina') + '.';
            if (root.GameAudio) GameAudio.playSE('Buzzer1'); _render(); return;
        }
        var needsTarget = (sk.power > 0 || ['slow', 'markTarget', 'sunder', 'applyToxin'].indexOf(eff.type) >= 0) && eff.type !== 'aoe';
        var foes = _alive('enemy');
        if (needsTarget && foes.length > 1) {
            chosenSkill = skillId; targetMode = 'skill'; targetList = foes.map(function (a) { return a.id; }); targetIdx = 0;
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

    // Items usable in battle, from the player's inventory.
    function _battleItems() {
        var inv = (root.GameSave && root.GameSave.state && root.GameSave.state.inventory) || {};
        if (!root.GameItems) return [];
        var out = [];
        for (var pk in inv) {
            var pocket = inv[pk]; if (!pocket) continue;
            for (var id in pocket) {
                if ((pocket[id] | 0) > 0 && GameItems.battleUsable(id)) out.push({ id: id, qty: pocket[id] | 0, name: GameItems.name(id) });
            }
        }
        return out;
    }
    function _selectItem() {
        var it = itemList[itemCursor]; if (!it) return;
        chosenItem = it.id; targetMode = 'item';
        var allies = _alive('player');   // recovery items target your side (incl. summons)
        if (allies.length > 1) { targetList = allies.map(function (a) { return a.id; }); targetIdx = 0; mode = 'target'; _render(); }
        else { _resolveItem(it.id, allies[0] ? allies[0].id : pendingActorId); }
    }
    function _resolveItem(itemId, targetId) {
        var restore = root.GameItems && GameItems.battleRestore(itemId);
        if (!restore) { mode = 'action'; _render(); return; }
        // Consume one from inventory.
        var inv = root.GameSave && root.GameSave.state && root.GameSave.state.inventory;
        var def = GameItems.get(itemId), pk = (def && def.pocket) || 'items';
        if (inv && inv[pk] && inv[pk][itemId]) { inv[pk][itemId] -= 1; if (inv[pk][itemId] <= 0) delete inv[pk][itemId]; if (root.GameSave.markDirty) GameSave.markDirty(); }
        var before = state.log.length;
        root.GameCombat.useItem(state, { actorId: pendingActorId, targetId: targetId, restore: restore });
        var tname = state.actors[targetId] ? state.actors[targetId].name : 'ally';
        currentMsg = 'Used ' + GameItems.name(itemId) + ' on ' + tname + '.';
        _flush(before);
        if (root.GameAudio) GameAudio.playSE('Heal1');
        pendingActorId = null; chosenItem = null; _closeMenu();
        mode = 'beat'; waitUntil = _now() + 520;
    }
    function _flee() { _persistVitals(); currentMsg = 'You slip away from the fight.'; awaitingClose = true; mode = 'over'; _closeMenu(); }

    // ---- persistent vitals (HP/MP/SP carry between fights via state.survival %) --
    function _surv() {
        var s = root.GameSave && root.GameSave.state;
        if (!s) return null;
        s.survival = s.survival || { surveillance: 0, stamina: 100, exposure: 0 };
        if (s.survival.hp == null) s.survival.hp = 100;
        if (s.survival.mana == null) s.survival.mana = 100;
        return s.survival;
    }
    function _seedVitals() {
        var sv = _surv(), a = state && state.actors.p1; if (!sv || !a) return;
        a.hp = Math.max(1, Math.round(a.maxHp * (sv.hp || 100) / 100));
        a.mp = Math.round(a.maxMp * (sv.mana != null ? sv.mana : 100) / 100);
        a.sp = Math.round(a.maxSp * (sv.stamina != null ? sv.stamina : 100) / 100);
    }
    function _persistVitals() {
        var sv = _surv(), a = state && state.actors.p1; if (!sv || !a) return;
        // carry Surveillance accrued this fight onto the persistent meter + remember
        // the outcome for the run controller (passed to onEnd).
        sv.surveillance = (sv.surveillance | 0) + (state.surveillance | 0);
        _lastResult = { winner: state.winner, surveillance: state.surveillance | 0, collected: !!state.collected };
        if (state.winner === 'enemy') {
            // System "rescue" on defeat — back on your feet, but watched (TODO: real down/respawn + penalty).
            sv.hp = 50; if (sv.mana < 30) sv.mana = 30; if (sv.stamina < 30) sv.stamina = 30;
        } else {
            sv.hp = Math.max(0, Math.round(a.hp / a.maxHp * 100));
            sv.mana = Math.max(0, Math.round(a.mp / a.maxMp * 100));
            sv.stamina = Math.max(0, Math.round(a.sp / a.maxSp * 100));
        }
        if (root.GameSave.markDirty) GameSave.markDirty();
        if (root.GameHUD && GameHUD.setMeters) GameHUD.setMeters(sv);
    }

    function _finish() {
        _persistVitals();
        var msg;
        if (state.winner === 'player') {
            var totalXp = 0, lvlEvents = [], totalCr = 0;
            var cc = (db.progression && db.progression.credits) || { base: 15, variance: [0.85, 1.15] };
            for (var id in enemyMeta) {
                var g = root.GameProgression.gainFromKill(prog, { level: enemyMeta[id].level, xpYield: enemyMeta[id].xpYield }, db.progression);
                totalXp += g.xp; lvlEvents = lvlEvents.concat(g.events);
                // Credit drop: base * level * creditYield * variance (defeated foes only).
                var em = enemyMeta[id];
                if (em.creditYield > 0) {
                    var vmin = cc.variance[0], vspan = cc.variance[1] - cc.variance[0];
                    var v = vmin + Math.random() * vspan;
                    totalCr += Math.round(cc.base * em.level * em.creditYield * v);
                }
            }
            _saveProg();
            if (totalCr > 0 && root.GameSave && GameSave.state && GameSave.state.player) {
                var pl = GameSave.state.player; pl.money = (pl.money || 0) + totalCr;
                if (GameSave.markDirty) GameSave.markDirty();
            }
            msg = 'You won.  +' + totalXp + ' XP' + (totalCr > 0 ? ' · +' + totalCr + ' Cr' : '');
            if (lvlEvents.length) {
                var pts = lvlEvents.reduce(function (s, e) { return s + e.points; }, 0);
                msg += '   ⤴ LEVEL UP → Lv' + prog.level + ' (+' + pts + ' pts)';
                if (root.GameAudio) GameAudio.playSE('Powerup');
                // First level-up ever: teach where points go.
                if (root.GameEventState && !GameEventState.getSwitch('taught_levelup')) {
                    msg += '\n(You grew stronger. Spend attribute points on the STATUS screen to shape your build.)';
                    GameEventState.setSwitch('taught_levelup', true);
                }
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
            '<div class="cv-system" id="cv-system"><div class="cv-sys-label">SYSTEM</div>' +
            '  <div class="cv-bar cv-iv"><span></span></div><div class="cv-surv" id="cv-surv">Surveillance 0</div></div>' +
            '<div class="cv-field">' +
            '  <div class="cv-row cv-enemies" id="cv-enemies"></div>' +
            '  <div class="cv-row cv-players" id="cv-players"></div>' +
            '</div><div class="cv-bottom"><div class="cv-msg" id="cv-msg"></div><div class="cv-menu" id="cv-menu"></div></div>';
        host.appendChild(r);
        els.root = r;
        els.enemies = r.querySelector('#cv-enemies'); els.players = r.querySelector('#cv-players');
        els.iv = r.querySelector('#cv-system .cv-iv span'); els.surv = r.querySelector('#cv-surv');
        els.system = r.querySelector('#cv-system');
        els.msg = r.querySelector('#cv-msg'); els.menu = r.querySelector('#cv-menu');
        // RTP battleback: wall layer as the backdrop (cover) + floor layer tiled
        // along the bottom — the classic RM battle scene composite.
        var field = r.querySelector('.cv-field'), bb = _battleback;
        field.style.backgroundColor = '#0a0e14';
        field.style.backgroundImage = "url('data/battlebacks/2/" + bb + ".png'), url('data/battlebacks/1/" + bb + ".png')";
        field.style.backgroundRepeat = 'no-repeat, repeat-x';
        field.style.backgroundSize = 'cover, auto 42%';
        field.style.backgroundPosition = 'center top, center bottom';
    }
    // charset spec on a creature: { file:'rtp/Monster1.png', cols, rows, frame, char }
    function _creatureCharsetHTML(ch, dir) {
        return _charSpriteHTML({ src: 'data/sprites/' + ch.file, cols: ch.cols, rows: ch.rows, fw: ch.frame, fh: ch.frame, char: ch.char || 0 }, 56, dir);
    }
    function _sprite(a) {
        // toward the foe: enemies (left) face right (2), allies/hero (right) face left (1)
        var dir = a.side === 'enemy' ? 2 : 1;
        // The player hero = their own overworld charset.
        if (a.side === 'player' && a.id === 'p1' && !a.battler && !a.charset)
            return _charSpriteHTML(_playerSprite || (_playerSprite = _buildPlayerSprite()), 58, 1);
        // Anyone with real art (enemy creature, summon, or a bonded-creature ally):
        if (a.battler) return '<img class="cv-battler" src="data/battlers/' + a.battler + '" alt="">';
        if (a.charset) return _creatureCharsetHTML(a.charset, dir);
        return a.side === 'enemy' ? '👹' : (a.summon ? '⚙' : '🛠');
    }
    function _card(a) {
        var c = document.createElement('div');
        c.className = 'cv-card cv-' + a.side + (a.summon ? ' cv-summon' : '');
        // Sprite stands on the battleback; a small translucent strip holds name + bars.
        // Player-side actors show MP + SP (resource) bars; enemies show only HP.
        var resBars = (a.side === 'player')
            ? '<div class="cv-bar cv-mp"><span></span></div><div class="cv-bar cv-sp"><span></span></div>'
            : '';
        c.innerHTML = '<div class="cv-tgt">▼</div>' +
            '<div class="cv-sprite">' + _sprite(a) + '</div>' +
            '<div class="cv-info"><div class="cv-name"></div>' +
            '<div class="cv-bar cv-hp"><span></span></div>' +
            resBars +
            '<div class="cv-bar cv-tempo"><span></span></div>' +
            '<div class="cv-status"></div></div>';
        return c;
    }
    function _openMenu(a) {
        var skills = a.loadout.filter(function (id) {
            var s = db.skills[id]; if (!s) return false;
            return s.power > 0 || (s.effect && ['heal', 'defUp', 'slow', 'markTarget', 'sunder', 'applyToxin', 'taunt', 'partyBuff', 'summon'].indexOf(s.effect.type) >= 0);
        });
        // Everyone gets a universal basic combat kit (Strike/Jab/Guard) so no one
        // is ever stuck with only Strike — crafting/lifestyle classes grant
        // non-combat skills that all filter out of the battle menu, which left
        // their FIGHT menu empty but for the free Strike. Class skills come first
        // (after Strike), then any missing basics, deduped.
        var order = ['strike'].concat(skills).concat(['jab', 'guard']);
        var seen = {}; menuSkills = [];
        order.forEach(function (id) {
            if (db.skills[id] && !seen[id]) { seen[id] = 1; menuSkills.push(id); }
        });
        cursor = 0;
    }
    function _closeMenu() { menuSkills = []; itemList = []; chosenItem = null; }

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
        var max = state.tuning.tempoMax, lvl = enemyMeta[a.id] ? ' Lv' + enemyMeta[a.id].level
            : (a.id === 'p1' && prog ? ' Lv' + prog.level : (allyMeta[a.id] ? ' Lv' + allyMeta[a.id].level : ''));
        c.querySelector('.cv-name').textContent = a.name + lvl;
        _setBar(c, 'cv-hp', a.hp / a.maxHp, 'hp-fill' + (a.hp / a.maxHp < 0.3 ? ' low' : ''));
        if (a.side === 'player') {
            _setBar(c, 'cv-mp', a.maxMp ? a.mp / a.maxMp : 0, 'mp-fill');
            _setBar(c, 'cv-sp', a.maxSp ? a.sp / a.maxSp : 0, 'sp-fill');
        }
        _setBar(c, 'cv-tempo', _tempoDisp(a), 'tempo-fill' + (a.tempo >= max ? ' ready' : ''));
        // Enemies may show status tags (DEF↑/SLOW/…); only their MP/SP bars are
        // hidden (player-only, handled in _card).
        c.querySelector('.cv-status').textContent = _statusTags(a);
        c.classList.toggle('dead', a.hp <= 0);
        var targeting = (mode === 'target' && targetList[targetIdx] === a.id);
        c.classList.toggle('targeted', targeting);
    }

    function _render() {
        if (!els.root) return;
        state.order.forEach(function (id) { _updateCard(state.actors[id]); });
        // The System bar = your LEASH: CUMULATIVE Surveillance filling toward Collection.
        // At max the System reclaims you (run over, bad ending). Shows run-level total
        // (what you carried in + what you've leaned this fight) so it matches the HUD.
        var runBase = (root.GameSave && root.GameSave.state && root.GameSave.state.run && root.GameSave.state.run.surveillance) | 0;
        var thr = runBase + ((state.collectBudget != null) ? state.collectBudget : 300);
        var cur = runBase + (state.surveillance | 0);
        var frac = Math.min(1, cur / thr), near = frac >= 0.75;
        els.iv.style.width = (frac * 100) + '%';
        els.system && els.system.classList.toggle('cv-iv-near', near);
        els.surv.textContent = 'SURVEILLANCE ' + cur + ' / ' + thr + (near ? '  ⚠ COLLECTION NEAR' : '');
        els.msg.textContent =
            (mode === 'target') ? (targetMode === 'item' ? 'Use on who?  ◄ ►   (B: back)' : 'Choose target  ◄ ►   (B: back)')
            : (mode === 'item') ? 'Choose item  ▲ ▼   (B: back)'
            : (mode === 'action') ? ((root.GameEventState && !GameEventState.getSwitch('taught_combat')) ? 'Your move. The gauge fills with your speed; full = you act, then it empties. FIGHT to act · ITEM for supplies · RUN to flee.' : 'Your move.')
            : currentMsg;

        var actor = state.actors[pendingActorId];
        if (mode === 'action') {
            els.menu.style.display = 'grid';
            els.menu.classList.add('cv-menu-1col');
            els.menu.innerHTML = ACTIONS.map(function (lbl, i) {
                return '<div class="cv-opt' + (i === actionCursor ? ' sel' : '') + '">' + (i === actionCursor ? '▶ ' : '') + lbl + '</div>';
            }).join('');
        } else if (mode === 'menu' && menuSkills.length) {
            els.menu.style.display = 'grid';
            els.menu.classList.remove('cv-menu-1col');
            els.menu.innerHTML = menuSkills.map(function (id, i) {
                var s = db.skills[id], cost = root.GameCombat.skillCost(s);
                var costStr = cost.mp ? (cost.mp + ' MP') : cost.sp ? (cost.sp + ' SP') : '';
                var afford = !actor || root.GameCombat.canAfford(actor, s);
                return '<div class="cv-opt' + (i === cursor ? ' sel' : '') + (afford ? '' : ' cv-opt-dis') + '">' +
                    (i === cursor ? '▶ ' : '') + s.name + (costStr ? ' <em>' + costStr + '</em>' : '') + '</div>';
            }).join('');
            var selOpt = els.menu.querySelector('.cv-opt.sel');
            if (selOpt) selOpt.scrollIntoView({ block: 'nearest' });
        } else if (mode === 'item') {
            els.menu.style.display = 'grid';
            els.menu.classList.add('cv-menu-1col');
            els.menu.innerHTML = itemList.length ? itemList.map(function (it, i) {
                return '<div class="cv-opt' + (i === itemCursor ? ' sel' : '') + '">' + (i === itemCursor ? '▶ ' : '') + it.name + ' <em>×' + it.qty + '</em></div>';
            }).join('') : '<div class="cv-opt cv-opt-dis">No usable items</div>';
            var selI = els.menu.querySelector('.cv-opt.sel');
            if (selI) selI.scrollIntoView({ block: 'nearest' });
        } else { els.menu.style.display = 'none'; els.menu.classList.remove('cv-menu-1col'); els.menu.innerHTML = ''; }
    }

    function _teardown() {
        active = false; awaitingClose = false; mode = 'idle'; pendingActorId = null; menuSkills = []; logQueue = [];
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        if (els.root && els.root.parentNode) els.root.parentNode.removeChild(els.root);
        els = {}; cards = {}; state = null;
        // Notify any awaiter (e.g. an event 'battle' command) that combat is over.
        var cb = _onEnd, result = _lastResult; _onEnd = null; _lastResult = null;
        if (cb) try { cb(result || { winner: null, surveillance: 0 }); } catch (e) {}
        // Combat may have leveled the player past an evolution threshold.
        if (root.GameEvolvePopup) try { root.GameEvolvePopup.check(); } catch (e) {}
    }

    function _injectCSS() {
        if (document.getElementById('cv-style')) return;
        var css =
        '#combat-view{position:absolute;inset:0;z-index:50;display:flex;flex-direction:column;font-family:"Courier New",monospace;color:#e6eef6;background:radial-gradient(circle at 50% 35%,#2a2330,#0b0a12 80%);}' +
        // Side-view (FF-style): enemies left, SYSTEM centre, hero(es) right.
        '.cv-field{position:relative;flex:1;display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:4px;padding:6px 8%;}' +
        '.cv-row{display:flex;flex-direction:column;gap:8px;justify-content:center;flex-wrap:wrap;max-height:100%;}' +
        '.cv-enemies{align-items:flex-start;} .cv-players{align-items:flex-end;}' +
        '.cv-card{position:relative;flex:0 1 auto;min-width:20%;max-width:40%;display:flex;flex-direction:column;align-items:center;padding:0 2px;background:transparent;}' +
        '.cv-card.dead{opacity:0.32;filter:grayscale(1);}' +
        '.cv-card.targeted .cv-sprite{filter:drop-shadow(0 0 5px #ffd96a) drop-shadow(0 0 2px #ffd96a);}' +
        '.cv-tgt{position:absolute;top:-10px;left:50%;transform:translateX(-50%);color:#ffd96a;font-size:12px;display:none;text-shadow:0 1px 2px #000;}' +
        '.cv-card.targeted .cv-tgt{display:block;}' +
        '.cv-sprite{min-height:58px;display:flex;align-items:flex-end;justify-content:center;}' +
        '.cv-charsprite{image-rendering:pixelated;background-repeat:no-repeat;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.55));}' +
        '.cv-info{background:rgba(6,8,16,0.6);border:1px solid rgba(120,160,200,0.25);border-radius:4px;padding:2px 6px;margin-top:1px;min-width:96px;text-align:center;}' +
        '.cv-name{font-size:10px;font-weight:bold;color:#f2d39a;margin-bottom:2px;text-shadow:0 1px 1px #000;}' +
        '.cv-bar{height:6px;background:#1a1a24;border:1px solid #000;border-radius:3px;margin:2px 0;overflow:hidden;}' +
        '.cv-bar span{display:block;height:100%;width:100%;}' +
        '.hp-fill{background:linear-gradient(#7bd66a,#3da13a);transition:width 140ms ease;} .hp-fill.low{background:linear-gradient(#e06a4a,#b03020);transition:width 140ms ease;}' +
        '.mp-fill{background:linear-gradient(#6ab0e0,#2a6ab0);transition:width 140ms ease;} .sp-fill{background:linear-gradient(#e0d06a,#b0902a);transition:width 140ms ease;}' +
        '.cv-mp,.cv-sp{height:4px;}' +
        '.tempo-fill{background:linear-gradient(#e8c46a,#b88a2a);} .tempo-fill.ready{background:linear-gradient(#ffe9a0,#e8b94a);box-shadow:0 0 4px #ffd96a;}' +
        '.cv-status{font-size:8px;letter-spacing:1px;color:#9ab0c4;min-height:9px;margin-top:1px;}' +
        '.cv-sprite{font-size:26px;text-align:center;min-height:30px;}' +
        '.cv-battler{max-width:100%;max-height:66px;image-rendering:auto;vertical-align:bottom;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.6));}' +
        // SYSTEM surveillance meter — a slim bar across the TOP of the battle.
        '.cv-system{flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:8px;padding:3px 10px;background:rgba(2,12,18,0.8);border-bottom:1px solid #18b8c8;}' +
        '.cv-sys-label{font-size:8px;letter-spacing:3px;color:#80d0e8;flex:0 0 auto;}' +
        '.cv-iv span{background:linear-gradient(#5fe0f0,#18b8c8);transition:width 200ms;} .cv-system .cv-bar{flex:1 1 auto;max-width:240px;margin:0;border-color:#0a3038;}' +
        '.cv-iv-near .cv-iv span{background:linear-gradient(#ff8060,#e02818);} .cv-iv-near .cv-surv,.cv-iv-near .cv-sys-label{color:#ff8a6a;}' +
        '.cv-surv{font-size:8px;color:#80d0e8;flex:0 0 auto;}' +
        // Bottom UI (message + menu) overlays the lower field so it always has
        // room on the cramped GBA screen instead of being squeezed by flex.
        '.cv-bottom{position:absolute;left:0;right:0;bottom:0;z-index:5;}' +
        '.cv-msg{min-height:22px;padding:5px 10px;font-size:11px;background:rgba(6,6,16,.92);border-top:1px solid #18b8c8;box-shadow:inset 0 1px 0 #002830;display:flex;align-items:center;}' +
        '.cv-menu{display:none;grid-template-columns:1fr 1fr;gap:2px;padding:5px 10px;background:rgba(10,24,48,.96);border-top:1px solid #18b8c8;max-height:120px;overflow-y:auto;align-content:start;}' +
        '.cv-menu.cv-menu-1col{grid-template-columns:1fr;}' +
        '.cv-opt{font-size:11px;padding:3px 6px;color:#c8d8e8;border-radius:2px;}' +
        '.cv-opt-dis{opacity:.4;}' +
        '.cv-opt.sel{background:rgba(24,184,200,0.18);color:#fff;}' +
        '.cv-opt em{float:right;font-style:normal;color:#8aa0b4;font-size:9px;}' +
        // --- JUICE: floating damage/heal numbers, hit-flash, screenshake ---
        '.cv-float{position:absolute;top:4px;left:50%;transform:translateX(-50%);font-size:13px;font-weight:bold;font-family:"Courier New",monospace;pointer-events:none;z-index:8;white-space:nowrap;text-shadow:0 1px 2px #000,0 0 3px #000;animation:cvFloat .9s ease-out forwards;}' +
        '.cv-float.dmg{color:#ff6a4a;} .cv-float.dmg.crit{color:#ffd040;font-size:18px;} .cv-float.dmg.super{color:#ffe060;font-size:15px;} .cv-float.dmg.resist{color:#9aa8b4;font-size:11px;}' +
        '.cv-float.dmg.poison{color:#c06ad8;} .cv-float.heal{color:#7bd66a;} .cv-float.miss{color:#cdddee;font-size:11px;font-style:italic;}' +
        '@keyframes cvFloat{0%{opacity:0;}15%{opacity:1;}100%{transform:translateX(-50%) translateY(-30px);opacity:0;}}' +
        '@keyframes cvHitFlash{0%{filter:brightness(2.6) saturate(.3) drop-shadow(0 0 4px #fff);}100%{filter:none;}}' +
        '.cv-sprite.cv-hitflash{animation:cvHitFlash .3s ease-out;}' +
        '@keyframes cvHealFlash{0%{filter:brightness(1.5) sepia(1) hue-rotate(55deg) saturate(2);}100%{filter:none;}}' +
        '.cv-sprite.cv-healflash{animation:cvHealFlash .34s ease-out;}' +
        '@keyframes cvShake{0%,100%{transform:translateX(0);}25%{transform:translateX(-3px);}75%{transform:translateX(3px);}}' +
        '@keyframes cvShakeBig{0%,100%{transform:translate(0,0);}20%{transform:translate(-5px,2px);}40%{transform:translate(5px,-2px);}60%{transform:translate(-4px,-1px);}80%{transform:translate(4px,1px);}}' +
        '.cv-field.cv-shake{animation:cvShake .26s ease;} .cv-field.cv-shake-big{animation:cvShakeBig .38s ease;}';
        var st = document.createElement('style'); st.id = 'cv-style'; st.textContent = css; document.head.appendChild(st);
    }

    root.GameCombatView = { start: start, isActive: isActive, consumeInput: consumeInput };
})(typeof window !== 'undefined' ? window : this);
