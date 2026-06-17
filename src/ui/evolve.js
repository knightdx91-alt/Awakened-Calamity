// GameEvolvePopup — the System "evolution offer" that pops up automatically
// when the player meets an evolution's requirements (e.g. reaching Lv10).
//
// Evolution is framed as the System re-classifying you: a modal interrupts play,
// presents the eligible branch(es), and you choose to ascend or defer. Deferral
// is remembered for the current level so it doesn't nag every step; it re-offers
// when you level again. Presentation only — logic lives in GameClasses (pure).
window.GameEvolvePopup = (function () {
    'use strict';

    var _active = false, _root = null, _db = null, _loading = false;

    function isActive() { return _active; }

    function _ensureDb(cb) {
        if (_db) { cb(); return; }
        if (_loading) return;
        _loading = true;
        var b = '?b=' + (window.__BUILD__ || '0');
        Promise.all([
            fetch('data/systems/classes.json' + b, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
            fetch('data/systems/skills.json' + b, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
        ]).then(function (res) { _db = { classes: res[0] || {}, skills: res[1] || {} }; _loading = false; cb(); });
    }

    function _eligible() {
        var st = window.GameSave && GameSave.state;
        if (!st || !st.player || !st.player.class || !window.GameClasses) return [];
        var clsId = st.player.class.id;
        var ctx = GameClasses.ctxFromState(st);
        return GameClasses.evolveOptions(clsId, ctx, _db).filter(function (o) { return o.eligible; });
    }

    // Call after combat / level changes. Shows the offer if newly eligible and
    // not already deferred at this level.
    function check() {
        if (_active) return;
        var st = window.GameSave && GameSave.state;
        if (!st || !st.player || !st.player.class) return;
        _ensureDb(function () {
            if (_active) return;
            var opts = _eligible();
            if (!opts.length) return;
            var level = (st.progress && st.progress.level) || st.player.class.level || 1;
            // Defer is remembered per-level: only suppress while still at that level.
            if (st.player.class.evoDeferredAt === level) return;
            _show(opts, level);
        });
    }

    function _show(opts, level) {
        _active = true;
        var st = GameSave.state, clsId = st.player.class.id;
        var fromName = (_db.classes[clsId] && _db.classes[clsId].name) || clsId;
        _root = document.createElement('div');
        _root.id = 'evo-root';
        _root.innerHTML = _css() +
            '<div class="evo-panel">' +
                '<div class="evo-sys">THE SYSTEM</div>' +
                '<div class="evo-title">EVOLUTION AVAILABLE</div>' +
                '<div class="evo-body">Subject <b>' + (st.player.name || '—') + '</b> has met the threshold to re-classify from <b>' + fromName + '</b>. Select an ascension:</div>' +
                '<div class="evo-list" id="evo-list"></div>' +
                '<button class="evo-later" id="evo-later">NOT YET</button>' +
            '</div>';
        document.body.appendChild(_root);

        var list = _root.querySelector('#evo-list');
        opts.forEach(function (o) {
            var t = _db.classes[o.id] || {};
            var b = document.createElement('button');
            b.className = 'evo-opt';
            b.innerHTML = '<span class="evo-opt-name">→ ' + o.name + '</span>' +
                '<span class="evo-opt-sub">' + (t.tier || '') + (t.signature ? ' · ' + t.signature : '') + '</span>';
            b.addEventListener('click', function () { _doEvolve(o.id); });
            list.appendChild(b);
        });
        _root.querySelector('#evo-later').addEventListener('click', function () {
            st.player.class.evoDeferredAt = level;   // suppress until next level
            if (window.GameAudio) GameAudio.playSE('Cancel1');
            _teardown();
        });
    }

    function _doEvolve(targetId) {
        var st = GameSave.state, clsId = st.player.class.id;
        if (window.GameClasses && GameClasses.evolve(st, clsId, targetId, _db)) {
            st.player.class.evoDeferredAt = null;
            if (window.GameSave && GameSave.markDirty) GameSave.markDirty();
            if (window.GameSave && GameSave.autosave) GameSave.autosave();
            if (window.GameAudio) GameAudio.playME('Fanfare1');
            if (window.GameSystem && GameSystem.notify) {
                var nm = (_db.classes[targetId] && _db.classes[targetId].name) || targetId;
                GameSystem.notify('You are now classified: ' + nm + '.', 'danger');
            }
        }
        _teardown();
    }

    function _teardown() {
        _active = false;
        if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
        _root = null;
    }

    function _css() {
        return '<style>' +
        '#evo-root{position:fixed;inset:0;z-index:9100;display:flex;align-items:center;justify-content:center;' +
            'background:rgba(2,6,15,.82);font-family:monospace;color:#c8d8e8;}' +
        '#evo-root .evo-panel{width:min(92vw,420px);background:#02060f;border:1px solid #18b8c8;border-radius:8px;' +
            'box-shadow:0 0 26px rgba(0,204,255,.35);padding:18px;}' +
        '#evo-root .evo-sys{font-size:10px;letter-spacing:3px;color:#00ccff;text-align:center;}' +
        '#evo-root .evo-title{font-size:18px;letter-spacing:2px;color:#80f0ff;text-align:center;margin:6px 0 12px;text-shadow:0 0 10px rgba(0,204,255,.5);}' +
        '#evo-root .evo-body{font-size:11px;color:#9fb0c0;line-height:1.6;margin-bottom:12px;}' +
        '#evo-root .evo-body b{color:#80f0ff;}' +
        '#evo-root .evo-list{display:flex;flex-direction:column;gap:8px;}' +
        '#evo-root .evo-opt{text-align:left;background:#11131f;border:1px solid #18b8c8;border-radius:5px;padding:10px;cursor:pointer;color:#c8d8e8;font-family:monospace;}' +
        '#evo-root .evo-opt:hover{background:#00ccff;color:#02060f;}' +
        '#evo-root .evo-opt-name{display:block;font-size:14px;color:#80f0ff;}' +
        '#evo-root .evo-opt:hover .evo-opt-name{color:#02060f;}' +
        '#evo-root .evo-opt-sub{display:block;font-size:9px;color:#6b7a8d;margin-top:2px;text-transform:capitalize;}' +
        '#evo-root .evo-later{display:block;margin:14px auto 0;background:none;border:1px solid #4a5a6d;color:#6b7a8d;' +
            'font-family:monospace;font-size:11px;letter-spacing:2px;padding:8px 22px;border-radius:5px;cursor:pointer;}' +
        '#evo-root .evo-later:hover{border-color:#9fb0c0;color:#9fb0c0;}' +
        '</style>';
    }

    return { check: check, isActive: isActive };
})();
