// GameTitle — the boot title screen.
//
// Shown when the game opens (not when an explicit ?map= override is used for
// editor playtesting). Offers CONTINUE when a save exists, and NEW GAME always.
// Returns the choice ('continue' | 'new') via the onChoose callback.
//
// Presentation layer only (DOM overlay).
window.GameTitle = (function () {
    'use strict';

    var _active = false, _root = null, _onChoose = null;

    function isActive() { return _active; }

    function show(opts) {
        if (_active) return;
        opts = opts || {};
        _active = true;
        _onChoose = opts.onChoose || function () {};
        _lastMeta = opts.meta || null;
        _build(!!opts.hasSave, opts.meta || null);
    }

    function _fmtPlaytime(s) {
        s = s | 0;
        var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
        return h + 'h ' + m + 'm';
    }

    function _build(hasSave, meta) {
        _root = document.createElement('div');
        _root.id = 'title-root';
        var contLine = '';
        if (hasSave && meta) {
            contLine = '<div class="tt-cont-meta">' +
                (meta.playerName || 'Survivor') + ' · ' + (meta.currentMapName || '—') +
                ' · ' + _fmtPlaytime(meta.playtimeSeconds) + '</div>';
        }
        _root.innerHTML = _css() +
            '<button class="tt-gear" id="tt-gear" title="Options">&#9881;</button>' +
            '<div class="tt-wrap">' +
                '<div class="tt-logo">AWAKENED<span class="tt-logo2">CALAMITY</span></div>' +
                '<div class="tt-tag">The System helps you. That is the horror.</div>' +
                '<div class="tt-menu">' +
                    (hasSave ? '<button class="tt-btn tt-continue">CONTINUE' + contLine + '</button>' : '') +
                    '<button class="tt-btn tt-new">NEW GAME</button>' +
                '</div>' +
                '<div class="tt-foot">SYSTEM v1 · Drowned Reach</div>' +
            '</div>';
        document.body.appendChild(_root);

        var cont = _root.querySelector('.tt-continue');
        if (cont) cont.addEventListener('click', function () { _pick('continue'); });
        _root.querySelector('.tt-new').addEventListener('click', function () {
            if (hasSave) { _confirmNew(); } else { _pick('new'); }
        });
        _root.querySelector('#tt-gear').addEventListener('click', _openOptions);
    }

    // Gear → options overlay (currently: delete save game; wipes BOTH stores).
    function _openOptions() {
        if (window.GameAudio) GameAudio.playSE('Cursor1');
        var hasSave = !!(window.GameSave && GameSave.hasAnySave());
        var ov = document.createElement('div');
        ov.className = 'tt-opt';
        ov.innerHTML =
            '<div class="tt-opt-box">' +
                '<div class="tt-opt-h">OPTIONS</div>' +
                '<button class="tt-opt-del"' + (hasSave ? '' : ' disabled') + '>DELETE SAVE GAME</button>' +
                '<div class="tt-opt-note">Erases your save from this browser (local storage + backup). Cannot be undone.</div>' +
                '<button class="tt-opt-close">CLOSE</button>' +
            '</div>';
        _root.appendChild(ov);
        var close = function () { if (ov.parentNode) ov.parentNode.removeChild(ov); };
        ov.querySelector('.tt-opt-close').addEventListener('click', function () { if (window.GameAudio) GameAudio.playSE('Cancel1'); close(); });
        ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
        var del = ov.querySelector('.tt-opt-del');
        if (hasSave) del.addEventListener('click', function () { _confirmDelete(ov, del); });
    }

    function _confirmDelete(ov, del) {
        if (del.dataset.armed === '1') {
            del.dataset.armed = '0';
            var done = function () {
                if (window.GameAudio) GameAudio.playSE('Decision1');
                if (ov.parentNode) ov.parentNode.removeChild(ov);
                // Rebuild the title — Continue is now gone.
                var keep = _onChoose; _teardown();
                show({ hasSave: false, meta: null, onChoose: keep });
            };
            if (window.GameSave && GameSave.wipeAllSaves) {
                var p = GameSave.wipeAllSaves();
                if (p && p.then) p.then(done); else done();
            } else { done(); }
        } else {
            del.dataset.armed = '1';
            del.textContent = 'CONFIRM DELETE?';
            del.classList.add('tt-opt-armed');
        }
    }

    // New Game over an existing save → confirm (it will overwrite).
    function _confirmNew() {
        var menu = _root.querySelector('.tt-menu');
        menu.innerHTML =
            '<div class="tt-warn">Start a NEW game?<br><span>Your existing save will be overwritten.</span></div>' +
            '<button class="tt-btn tt-yes">YES — START OVER</button>' +
            '<button class="tt-btn tt-no">CANCEL</button>';
        menu.querySelector('.tt-yes').addEventListener('click', function () { _pick('new'); });
        menu.querySelector('.tt-no').addEventListener('click', function () {
            if (window.GameAudio) GameAudio.playSE('Cancel1');
            _teardown(); show({ hasSave: true, meta: _lastMeta, onChoose: _onChoose }); // rebuild
        });
    }

    var _lastMeta = null;
    function _pick(choice) {
        if (window.GameAudio) GameAudio.playSE('Decision1');
        var cb = _onChoose;
        _teardown();
        if (cb) cb(choice);
    }

    function _teardown() {
        _active = false;
        if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
        _root = null;
    }

    function _css() {
        return '<style>' +
        '#title-root{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;' +
            'background:radial-gradient(circle at 50% 30%,#0d1326,#050509 85%);font-family:monospace;color:#c8d8e8;}' +
        '#title-root .tt-wrap{text-align:center;width:min(92vw,520px);padding:20px;}' +
        '#title-root .tt-logo{font-size:40px;font-weight:bold;letter-spacing:6px;color:#80f0ff;line-height:1.05;' +
            'text-shadow:0 0 16px rgba(0,204,255,.55);}' +
        '#title-root .tt-logo2{display:block;font-size:40px;color:#e60808;letter-spacing:6px;' +
            'text-shadow:0 0 16px rgba(230,8,8,.5);}' +
        '#title-root .tt-tag{margin:14px 0 30px;font-size:12px;color:#6b7a8d;letter-spacing:1px;}' +
        '#title-root .tt-menu{display:flex;flex-direction:column;gap:12px;align-items:center;}' +
        '#title-root .tt-btn{width:min(80vw,300px);background:#11131f;border:1px solid #18b8c8;color:#80f0ff;' +
            'font-family:monospace;font-size:17px;letter-spacing:3px;padding:13px;border-radius:5px;cursor:pointer;transition:all .1s;}' +
        '#title-root .tt-btn:hover{background:#00ccff;color:#02060f;box-shadow:0 0 14px rgba(0,204,255,.5);}' +
        '#title-root .tt-cont-meta{font-size:10px;letter-spacing:1px;color:#6b7a8d;margin-top:5px;}' +
        '#title-root .tt-btn:hover .tt-cont-meta{color:#024;}' +
        '#title-root .tt-new{border-color:#e60808;color:#ff8a8a;}' +
        '#title-root .tt-new:hover{background:#e60808;color:#fff;box-shadow:0 0 14px rgba(230,8,8,.5);}' +
        '#title-root .tt-warn{font-size:13px;color:#f8d000;margin-bottom:6px;line-height:1.5;}' +
        '#title-root .tt-warn span{font-size:11px;color:#6b7a8d;}' +
        '#title-root .tt-yes{border-color:#e60808;color:#ff8a8a;}' +
        '#title-root .tt-yes:hover{background:#e60808;color:#fff;}' +
        '#title-root .tt-foot{margin-top:34px;font-size:10px;color:#4a5a6d;letter-spacing:2px;}' +
        '#title-root .tt-gear{position:absolute;top:12px;right:12px;width:38px;height:38px;font-size:20px;line-height:1;' +
            'background:#11131f;border:1px solid #2a3a4a;color:#7ee0ec;border-radius:8px;cursor:pointer;}' +
        '#title-root .tt-gear:hover{border-color:#18b8c8;color:#80f0ff;box-shadow:0 0 10px rgba(0,204,255,.4);}' +
        '#title-root .tt-opt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(2,6,15,.8);}' +
        '#title-root .tt-opt-box{width:min(88vw,360px);background:#02060f;border:1px solid #18b8c8;border-radius:8px;padding:18px;text-align:center;}' +
        '#title-root .tt-opt-h{font-size:14px;letter-spacing:3px;color:#80f0ff;margin-bottom:14px;}' +
        '#title-root .tt-opt-del{width:100%;background:#11131f;border:1px solid #e60808;color:#ff8a8a;font-family:monospace;font-size:13px;letter-spacing:2px;padding:11px;border-radius:5px;cursor:pointer;}' +
        '#title-root .tt-opt-del:hover{background:#e60808;color:#fff;}' +
        '#title-root .tt-opt-del:disabled{opacity:.35;cursor:not-allowed;border-color:#4a5a6d;color:#6b7a8d;}' +
        '#title-root .tt-opt-del.tt-opt-armed{background:#e60808;color:#fff;animation:ttPulse .7s ease-in-out infinite;}' +
        '@keyframes ttPulse{0%,100%{box-shadow:0 0 0 rgba(230,8,8,.6);}50%{box-shadow:0 0 12px rgba(230,8,8,.8);}}' +
        '#title-root .tt-opt-note{font-size:10px;color:#6b7a8d;line-height:1.6;margin:10px 0 14px;}' +
        '#title-root .tt-opt-close{width:100%;background:#11131f;border:1px solid #4a5a6d;color:#9fb0c0;font-family:monospace;font-size:12px;letter-spacing:2px;padding:9px;border-radius:5px;cursor:pointer;}' +
        '#title-root .tt-opt-close:hover{border-color:#9fb0c0;}' +
        '</style>';
    }

    return { show: show, isActive: isActive };
})();
