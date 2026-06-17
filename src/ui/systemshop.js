// GameSystemShop — the System's hub interface, opened from the floating crystal
// found in towns (NOT the pause menu; the System is only reachable in town).
//
// Sells/serves "many things": survival SUPPLIES, System SERVICES, and CLASSES
// (specialize your focus, reclassify / buy a new Classification). Every request
// raises Surveillance — the System helps you, and that's the horror.
//
// Presentation only; class logic lives in GameClasses (pure).
window.GameSystemShop = (function () {
    'use strict';

    var _active = false, _root = null, _onClose = null, _db = null, _loading = false;

    function isActive() { return _active; }

    function _ensureDb(cb) {
        if (_db) { cb(); return; }
        if (_loading) { return; }
        _loading = true;
        var b = '?b=' + (window.__BUILD__ || '0');
        Promise.all([
            fetch('data/systems/classes.json' + b, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
            fetch('data/systems/skills.json' + b, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
            (window.GameItems ? GameItems.load() : Promise.resolve({}))
        ]).then(function (res) { _db = { classes: res[0] || {}, skills: res[1] || {} }; _loading = false; cb(); });
    }

    // open(onClose) — onClose fires when the player leaves the shop (lets an
    // event 'system' command continue afterward).
    function open(onClose) {
        if (_active) { if (onClose) onClose(); return; }
        _active = true; _onClose = onClose || null;
        _sub = 'root';
        _ensureDb(function () { _mount(); });
    }

    // ---- state helpers ----
    function _st() { return (window.GameSave && GameSave.state) || null; }
    function _surv() { var s = _st(); return (s && s.survival) || { surveillance: 0, stamina: 100, exposure: 0 }; }
    function _credits() { var s = _st(); return (s && s.player && s.player.money) || 0; }
    function _spend(n) { var s = _st(); if (s && s.player) s.player.money = Math.max(0, (s.player.money || 0) - n); }
    function _raise(by, msg) {
        var s = _st(); if (!s) return;
        var st = s.survival || { surveillance: 0, stamina: 100, exposure: 0 };
        st.surveillance = Math.min(100, (st.surveillance || 0) + by);
        s.survival = st; if (GameSave.markDirty) GameSave.markDirty();
        if (window.GameHUD && GameHUD.setMeters) GameHUD.setMeters(st);
        if (msg && window.GameSystem && GameSystem.notify) GameSystem.notify(msg, 'danger');
    }
    function _pretty(id) { return String(id || '').replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); }); }

    var _sub = 'root';   // root | supplies | services | classes | specialize | reclassify

    function _mount() {
        if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
        _root = document.createElement('div');
        _root.id = 'sh-root';
        _root.innerHTML = _css() + '<div class="sh-panel"><div class="sh-head"></div><div class="sh-scroll" id="sh-scroll"></div><div class="sh-foot" id="sh-foot"></div></div>';
        document.body.appendChild(_root);
        _render();
    }

    function _render() {
        if (!_root) return;
        var sv = Math.max(0, Math.min(100, _surv().surveillance || 0));
        var hot = sv >= 66, mid = sv >= 33, acc = hot ? '#ff3030' : mid ? '#f8d000' : '#00ccff';
        var head = _root.querySelector('.sh-head');
        head.innerHTML =
            '<div class="sh-title" style="color:' + acc + '">THE SYSTEM</div>' +
            '<div class="sh-cr">Cr ' + _credits() + '</div>' +
            '<div class="sh-surv"><div class="sh-surv-l" style="color:' + acc + '">SURVEILLANCE ' + Math.round(sv) + '%</div>' +
                '<div class="sh-bar"><i style="width:' + sv + '%;background:' + acc + '"></i></div></div>';

        var s = _root.querySelector('#sh-scroll'); s.innerHTML = '';
        if (_sub === 'root') _renderRoot(s);
        else if (_sub === 'supplies') _renderSupplies(s);
        else if (_sub === 'services') _renderServices(s);
        else if (_sub === 'classes') _renderClasses(s);
        else if (_sub === 'specialize') _renderSpecialize(s);
        else if (_sub === 'reclassify') _renderReclassify(s);

        var foot = _root.querySelector('#sh-foot');
        foot.innerHTML = '';
        var btn = document.createElement('button');
        btn.className = 'sh-foot-btn';
        btn.textContent = (_sub === 'root') ? 'LEAVE' : '‹ BACK';
        btn.addEventListener('click', function () {
            if (_sub === 'root') { _close(); }
            else { _sub = (_sub === 'specialize' || _sub === 'reclassify') ? 'classes' : 'root'; _render(); }
        });
        foot.appendChild(btn);
    }

    function _navBtn(host, label, sub, to) {
        var b = document.createElement('button'); b.className = 'sh-item';
        b.innerHTML = '<span class="sh-item-n">' + label + '</span><span class="sh-item-s">' + sub + '</span>';
        b.addEventListener('click', function () { _sub = to; if (window.GameAudio) GameAudio.playSE('Cursor1'); _render(); });
        host.appendChild(b); return b;
    }
    function _buyBtn(host, label, sub, enabled, fn) {
        var b = document.createElement('button'); b.className = 'sh-item' + (enabled ? '' : ' sh-dis'); b.disabled = !enabled;
        b.innerHTML = '<span class="sh-item-n">' + label + '</span><span class="sh-item-s">' + sub + '</span>';
        if (enabled) b.addEventListener('click', fn);
        host.appendChild(b); return b;
    }

    function _renderRoot(host) {
        _navBtn(host, 'SUPPLIES', 'Field gear, tonics, rations', 'supplies');
        _navBtn(host, 'SERVICES', 'Restore · Fast-Travel · Register', 'services');
        _navBtn(host, 'CLASSES', 'Specialize · Reclassify', 'classes');
    }

    // ---- SUPPLIES (sourced from the item database) ----
    function _renderSupplies(host) {
        var credits = _credits();
        var goods = (window.GameItems && GameItems.shopItems && GameItems.shopItems()) || [];
        if (!goods.length) { host.appendChild(_msg('No stock available.')); return; }
        goods.forEach(function (g) {
            var cost = g.value || 0, surv = Math.max(1, Math.round(cost / 80)), afford = credits >= cost;
            _buyBtn(host, g.name + '  — Cr ' + cost, (g.desc || '') + ' (+' + surv + ' Surv)', afford, function () {
                var s = _st(); if (!s) return;
                s.inventory = s.inventory || {}; s.inventory[g.pocket] = s.inventory[g.pocket] || {};
                s.inventory[g.pocket][g.id] = (s.inventory[g.pocket][g.id] || 0) + 1;
                _spend(cost); _raise(surv, g.name + ' acquired.');
                if (window.GameAudio) GameAudio.playSE('Coin'); _render();
            });
        });
    }

    // ---- SERVICES ----
    function _renderServices(host) {
        _buyBtn(host, 'Full Restore', 'Restore HP, MP, Stamina; purge Exposure. (+8 Surv)', true, function () {
            var s = _st(); if (s) { var st = s.survival || {}; st.hp = 100; st.mana = 100; st.stamina = 100; st.exposure = Math.max(0, (st.exposure || 0) - 40); s.survival = st; if (window.GameHUD && GameHUD.setMeters) GameHUD.setMeters(st); }
            _raise(8, 'Restore applied. Surveillance noted.'); if (window.GameAudio) GameAudio.playSE('Heal1'); _render();
        });
        _buyBtn(host, 'Fast-Travel', 'Jump to an unlocked landmark. (+6 Surv)', true, function () {
            _raise(6, 'Transit authorized. Surveillance noted.'); _render();
        });
        _buyBtn(host, 'Register Camp', 'Audit-proof your refuge — but flagged. (+10 Surv)', true, function () {
            _raise(10, 'Camp registered. You are protected. You are watched.'); _render();
        });
    }

    // ---- CLASSES ----
    function _renderClasses(host) {
        _navBtn(host, 'SPECIALIZE', 'Lock a focus for your Class', 'specialize');
        _navBtn(host, 'RECLASSIFY', 'Switch or acquire a Classification', 'reclassify');
    }
    function _renderSpecialize(host) {
        var s = _st(); var clsId = s && s.player && s.player.class && s.player.class.id;
        if (!window.GameClasses || !clsId) { host.appendChild(_msg('No Classification on record.')); return; }
        if (s.player.class.spec) { host.appendChild(_msg('Focus locked: ' + _pretty(s.player.class.spec) + '.')); return; }
        var specs = GameClasses.specOptions(clsId, GameClasses.ctxFromState(s), _db);
        if (!specs.length) { host.appendChild(_msg('This Classification offers no specializations.')); return; }
        host.appendChild(_msg('Choose one focus — permanent. (+5 Surveillance)'));
        specs.forEach(function (sp) {
            _buyBtn(host, sp.name + (sp.grantsSkill ? '  +' + _pretty(sp.grantsSkill) : ''), sp.eligible ? 'Available' : ('Requires Lv' + sp.unlockAtLevel), sp.eligible, function () {
                if (GameClasses.chooseSpec(s, clsId, sp.id, _db)) { _raise(5, 'Specialization registered: ' + sp.name + '.'); if (window.GameAudio) GameAudio.playME('Fanfare2'); _sub = 'classes'; _render(); }
            });
        });
    }
    function _renderReclassify(host) {
        var s = _st(); if (!window.GameClasses || !s || !s.player || !s.player.class) { host.appendChild(_msg('No Classification on record.')); return; }
        var owned = s.player.ownedClasses || (s.player.ownedClasses = [s.player.class.id]);
        var NEW_COST = 500, SURV = 15, credits = _credits();
        host.appendChild(_msg('Switch Classification (owned — free):'));
        owned.forEach(function (id) {
            var cl = _db.classes[id], cur = id === s.player.class.id;
            _buyBtn(host, (cl ? cl.name : _pretty(id)) + (cur ? '  ◄ current' : ''), cur ? 'active' : 'Switch (free)', !cur, function () {
                if (GameClasses.changeClass(s, id, _db)) { if (window.GameAudio) GameAudio.playSE('Decision1'); if (GameSave.markDirty) GameSave.markDirty(); _render(); }
            });
        });
        host.appendChild(_msg('Acquire new Classification — Cr ' + NEW_COST + ' (+' + SURV + ' Surv):'));
        GameClasses.classesOfTier('basic', _db).filter(function (c) { return owned.indexOf(c.id) < 0; }).forEach(function (c) {
            var afford = credits >= NEW_COST;
            _buyBtn(host, c.name, c.lifestyle + ' · ' + (afford ? 'Cr ' + NEW_COST : 'insufficient Cr'), afford, function () {
                _spend(NEW_COST);
                if (GameClasses.changeClass(s, c.id, _db)) { _raise(SURV, 'Reclassified: ' + c.name + '. The System has re-catalogued you.'); if (window.GameAudio) GameAudio.playME('Fanfare1'); _sub = 'classes'; _render(); }
            });
        });
    }

    function _msg(t) { var d = document.createElement('div'); d.className = 'sh-msg'; d.textContent = t; return d; }

    function _close() {
        _active = false;
        if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
        _root = null;
        var cb = _onClose; _onClose = null;
        if (window.GameAudio) GameAudio.playSE('Cancel1');
        if (cb) cb();
    }

    function _css() {
        return '<style>' +
        '#sh-root{position:fixed;inset:0;z-index:9050;display:flex;align-items:center;justify-content:center;background:rgba(2,6,15,.86);font-family:"Press Start 2P",monospace;}' +
        '#sh-root .sh-panel{width:min(94vw,440px);max-height:92vh;display:flex;flex-direction:column;background:#02060f;border:1px solid #18b8c8;border-radius:8px;box-shadow:0 0 26px rgba(0,204,255,.3);}' +
        '#sh-root .sh-head{padding:12px 12px 8px;border-bottom:1px solid #11313d;position:relative;}' +
        '#sh-root .sh-title{font-size:11px;letter-spacing:3px;}' +
        '#sh-root .sh-cr{position:absolute;top:12px;right:12px;font-size:8px;color:#f8d000;}' +
        '#sh-root .sh-surv{margin-top:9px;}' +
        '#sh-root .sh-surv-l{font-size:7px;margin-bottom:3px;}' +
        '#sh-root .sh-bar{height:6px;background:#000;border-radius:3px;overflow:hidden;}' +
        '#sh-root .sh-bar i{display:block;height:100%;}' +
        '#sh-root .sh-scroll{padding:10px 12px;overflow:auto;flex:1;}' +
        '#sh-root .sh-item{display:flex;flex-direction:column;gap:3px;width:100%;text-align:left;background:rgba(0,40,55,.55);border:1px solid #18b8c8;border-radius:5px;padding:9px;margin-bottom:6px;cursor:pointer;color:#c8d8e8;font-family:inherit;}' +
        '#sh-root .sh-item:hover{background:rgba(0,80,110,.6);}' +
        '#sh-root .sh-item.sh-dis{opacity:.4;cursor:not-allowed;border-color:#33505c;}' +
        '#sh-root .sh-item-n{font-size:9px;color:#80f0ff;}' +
        '#sh-root .sh-item-s{font-size:6px;color:#6b7a8d;line-height:1.5;}' +
        '#sh-root .sh-msg{font-size:7px;color:#6b7a8d;line-height:1.7;margin:6px 0;}' +
        '#sh-root .sh-foot{padding:10px 12px;border-top:1px solid #11313d;}' +
        '#sh-root .sh-foot-btn{width:100%;background:#11131f;border:1px solid #18b8c8;color:#80f0ff;font-family:inherit;font-size:9px;letter-spacing:2px;padding:9px;border-radius:5px;cursor:pointer;}' +
        '#sh-root .sh-foot-btn:hover{background:#00ccff;color:#02060f;}' +
        '</style>';
    }

    return { open: open, isActive: isActive };
})();
