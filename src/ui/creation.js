// GamePlayerCreation — the Awakening (character creation) slice.
//
// Shown once, on a fresh game (no player name yet). The System "awakens" the
// player: choose a name, an appearance (an RTP charset character), and a
// starting Affinity. On confirm we write to GameSave, crop the chosen charset
// character into a single-character sheet for the overworld renderer, and drop
// into the world.
//
// Presentation layer only (DOM overlay). The chosen data lives in GameSave
// (portable) + localStorage `ac_player_sprite` (renderer hint).
window.GamePlayerCreation = (function () {
    'use strict';

    var _active = false;
    var _root = null;
    var _onDone = null;

    // Appearance options — RTP Actor charset characters. Each Actor sheet packs
    // 8 characters in a 12x8 grid (each character = 3 walk cols x 4 dir rows,
    // 32px frames). We offer the 8 from Actor1.
    var SHEET = 'rtp/Actor1.png';
    var SHEET_FRAME = 32;
    var OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) {
        return { sheet: SHEET, char: i };
    });

    // Affinities — labels, a System-toned blurb, and a tint (design tokens).
    var AFFINITIES = [
        { id: 'ember',      label: 'Ember',      tint: '#f8682c', blurb: 'Heat and ruin. Burns through what endures.' },
        { id: 'tide',       label: 'Tide',       tint: '#2ea0e0', blurb: 'Water and pressure. Patient, drowning force.' },
        { id: 'verdant',    label: 'Verdant',    tint: '#6fd06f', blurb: 'Growth and rot. Life that overruns.' },
        { id: 'storm',      label: 'Storm',      tint: '#e0d040', blurb: 'Charge and speed. Strikes before warning.' },
        { id: 'stone',      label: 'Stone',      tint: '#b8a07c', blurb: 'Mass and endurance. The world made stubborn.' },
        { id: 'frost',      label: 'Frost',      tint: '#9fe0ec', blurb: 'Cold and stillness. Slows, then stops.' },
        { id: 'toxin',      label: 'Toxin',      tint: '#a8d048', blurb: 'Poison and decay. Wins by waiting.' },
        { id: 'umbral',     label: 'Umbral',     tint: '#8a78c0', blurb: 'Shadow and the unseen. Strikes the unaware.' },
        { id: 'lumen',      label: 'Lumen',      tint: '#f4e9a0', blurb: 'Light and revelation. Nothing stays hidden.' },
        { id: 'corruption', label: 'Corruption', tint: '#c050a0', blurb: 'The Calamity itself. Power with a price.' },
        { id: 'untethered', label: 'Untethered', tint: '#80e8ff', blurb: 'No alignment. The System cannot classify you.' }
    ];

    var _name = '';
    var _appIdx = 0;
    var _affId = null;
    var _classId = null;
    var _classes = null;     // loaded data/systems/classes.json (basic tier only)
    var _classOrder = [];    // ids in display order

    function isActive() { return _active; }

    // ----- the System voice intro lines -----
    var INTRO = [
        'SYSTEM ONLINE.',
        'A new soul has awakened in the Drowned Reach.',
        'Cataloguing… please provide your designation.'
    ];

    function start(onDone) {
        if (_active) return;
        _active = true;
        _onDone = onDone || function () {};
        _name = ''; _appIdx = 0; _affId = null; _classId = null;
        _build();
    }

    function _build() {
        _root = document.createElement('div');
        _root.id = 'pc-root';
        _root.innerHTML = _css() + _markup();
        document.body.appendChild(_root);

        // Wire elements.
        var nameInput = _root.querySelector('#pc-name');
        nameInput.addEventListener('input', function () { _name = nameInput.value; _refresh(); });

        _root.querySelector('#pc-app-prev').addEventListener('click', function () { _cycleApp(-1); });
        _root.querySelector('#pc-app-next').addEventListener('click', function () { _cycleApp(1); });

        var affWrap = _root.querySelector('#pc-aff');
        AFFINITIES.forEach(function (a) {
            var b = document.createElement('button');
            b.className = 'pc-aff-chip';
            b.textContent = a.label;
            b.style.setProperty('--tint', a.tint);
            b.dataset.aff = a.id;
            b.addEventListener('click', function () {
                _affId = a.id;
                if (window.GameAudio) GameAudio.playSE('Cursor1');
                _refresh();
            });
            affWrap.appendChild(b);
        });

        _loadClasses();

        _root.querySelector('#pc-confirm').addEventListener('click', _confirm);

        // Allow Enter to confirm when valid.
        _root.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && _isValid()) _confirm();
        });

        _drawPreview();
        _refresh();
        setTimeout(function () { nameInput.focus(); }, 50);
    }

    // Lifestyle → small tag color, so the class grid reads at a glance.
    var LIFE_TINT = {
        combat: '#e07050', craft: '#d0a040', support: '#5fd06f', survival: '#8fb060',
        tamer: '#c89050', social: '#5fb0e0', espionage: '#9070c0', scholar: '#70c0c0',
        gathering: '#b0a070'
    };

    function _loadClasses() {
        var base = 'data/systems/';
        fetch(base + 'classes.json' + '?b=' + (window.__BUILD__ || '0'), { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) {
                if (!j) return;
                _classes = {};
                Object.keys(j).forEach(function (k) {
                    if (k === '_meta') return;
                    if (j[k] && j[k].tier === 'basic') { _classes[k] = j[k]; _classOrder.push(k); }
                });
                _buildClassChips();
            })
            .catch(function () {});
    }

    function _buildClassChips() {
        var wrap = _root && _root.querySelector('#pc-class');
        if (!wrap) return;
        wrap.innerHTML = '';
        _classOrder.forEach(function (id) {
            var cl = _classes[id];
            var b = document.createElement('button');
            b.className = 'pc-class-chip';
            b.dataset.cls = id;
            b.style.setProperty('--tint', LIFE_TINT[cl.lifestyle] || '#80e8ff');
            b.innerHTML = '<span class="pc-class-name">' + (cl.name || id) + '</span>' +
                '<span class="pc-class-life">' + (cl.lifestyle || '') + '</span>';
            b.addEventListener('click', function () {
                _classId = id;
                if (window.GameAudio) GameAudio.playSE('Cursor1');
                _refresh();
            });
            wrap.appendChild(b);
        });
        _refresh();
    }

    function _statBars(sp) {
        if (!sp) return '';
        // Normalize against rough maxima for a readable bar.
        var MAX = { hp: 120, atk: 30, def: 30, speed: 80 };
        var rows = [['HP', 'hp'], ['ATK', 'atk'], ['DEF', 'def'], ['SPD', 'speed']];
        return rows.map(function (r) {
            var v = sp[r[1]] || 0, pct = Math.max(4, Math.min(100, Math.round(v / MAX[r[1]] * 100)));
            return '<div class="pc-stat"><span class="pc-stat-l">' + r[0] + '</span>' +
                '<span class="pc-stat-bar"><i style="width:' + pct + '%"></i></span>' +
                '<span class="pc-stat-v">' + v + '</span></div>';
        }).join('');
    }

    function _cycleApp(d) {
        _appIdx = (_appIdx + d + OPTIONS.length) % OPTIONS.length;
        if (window.GameAudio) GameAudio.playSE('Cursor1');
        _drawPreview();
    }

    // Draw the down-facing standing frame of the selected character, scaled up.
    function _drawPreview() {
        var cv = _root.querySelector('#pc-preview');
        var ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, cv.width, cv.height);
        var opt = OPTIONS[_appIdx];
        var img = new Image();
        img.onload = function () {
            var f = SHEET_FRAME;
            var blockCol = (opt.char % 4) * 3;
            var blockRow = Math.floor(opt.char / 4) * 4;
            // down-facing standing = middle walk column, first dir row
            var sx = (blockCol + 1) * f, sy = (blockRow + 0) * f;
            ctx.drawImage(img, sx, sy, f, f, 0, 0, cv.width, cv.height);
        };
        img.src = 'data/sprites/' + opt.sheet + '?b=' + (window.__BUILD__ || '0');
        var lbl = _root.querySelector('#pc-app-label');
        if (lbl) lbl.textContent = (_appIdx + 1) + ' / ' + OPTIONS.length;
    }

    function _isValid() { return _name.trim().length > 0 && !!_affId && !!_classId; }

    function _refresh() {
        // highlight selected affinity
        Array.prototype.forEach.call(_root.querySelectorAll('.pc-aff-chip'), function (b) {
            b.classList.toggle('sel', b.dataset.aff === _affId);
        });
        var aff = AFFINITIES.filter(function (a) { return a.id === _affId; })[0];
        var blurb = _root.querySelector('#pc-aff-blurb');
        blurb.textContent = aff ? aff.blurb : 'Select an Affinity. The System will classify you accordingly.';
        blurb.style.color = aff ? aff.tint : '';

        // highlight selected class + render its detail
        Array.prototype.forEach.call(_root.querySelectorAll('.pc-class-chip'), function (b) {
            b.classList.toggle('sel', b.dataset.cls === _classId);
        });
        var det = _root.querySelector('#pc-class-detail');
        if (det) {
            var cl = _classes && _classId && _classes[_classId];
            if (cl) {
                det.innerHTML =
                    '<div class="pc-class-title">' + (cl.name || _classId) +
                        ' <span class="pc-class-sub">' + (cl.lifestyle || '') + ' · ' + (cl.affinityLean || '') + '</span></div>' +
                    '<div class="pc-class-sig">' + (cl.signature || '') + '</div>' +
                    '<div class="pc-class-stats">' + _statBars(cl.statProfile) + '</div>' +
                    '<div class="pc-class-skills"><b>Starting skills:</b> ' + ((cl.grantsSkills || []).join(', ') || '—') + '</div>';
            } else {
                det.innerHTML = '<div class="pc-class-sub">Choose a starting Class — your lifestyle, stats, and first skills. (You can grow, specialize, or change it later.)</div>';
            }
        }

        var btn = _root.querySelector('#pc-confirm');
        btn.disabled = !_isValid();
    }

    // Crop the chosen character's 3x4 block into a standalone single-character
    // sheet (96x128) the overworld renderer understands, and persist as a data URL.
    function _writeSprite(cb) {
        var opt = OPTIONS[_appIdx];
        var f = SHEET_FRAME;
        var img = new Image();
        img.onload = function () {
            var cv = document.createElement('canvas');
            cv.width = f * 3; cv.height = f * 4;
            var ctx = cv.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            var blockCol = (opt.char % 4) * 3;
            var blockRow = Math.floor(opt.char / 4) * 4;
            ctx.drawImage(img, blockCol * f, blockRow * f, f * 3, f * 4, 0, 0, f * 3, f * 4);
            var dataUrl;
            try { dataUrl = cv.toDataURL('image/png'); } catch (e) { dataUrl = null; }
            if (dataUrl) {
                try {
                    localStorage.setItem('ac_player_sprite', JSON.stringify({
                        dataUrl: dataUrl, frame_w: f, frame_h: f, cols: 3, rows: 4
                    }));
                } catch (e) {}
            }
            cb();
        };
        img.onerror = function () { cb(); };
        img.src = 'data/sprites/' + opt.sheet + '?b=' + (window.__BUILD__ || '0');
    }

    function _confirm() {
        if (!_isValid()) return;
        var opt = OPTIONS[_appIdx];
        _writeSprite(function () {
            // Persist into the portable save state.
            if (window.GameSave && GameSave.state && GameSave.state.player) {
                var p = GameSave.state.player;
                p.name = _name.trim();
                p.appearance = { sheet: opt.sheet, char: opt.char };
                p.affinity = _affId;
                var cl = _classes && _classId && _classes[_classId];
                p.class = { id: _classId, level: 1, xp: 0 };
                p.skills = (cl && cl.grantsSkills ? cl.grantsSkills.slice() : []);
                if (GameSave.state.meta) GameSave.state.meta.playerName = p.name;
                if (window.GameSave.markDirty) GameSave.markDirty();
                try { GameSave.save(GameSave.currentSlot != null ? GameSave.currentSlot : 0); } catch (e) {}
            }
            // Refresh the overworld sprite from the new localStorage hint.
            if (window.GameRenderer && GameRenderer.reloadPlayer) GameRenderer.reloadPlayer();
            // Fanfare + close.
            if (window.GameAudio) GameAudio.playME('Fanfare1');
            _teardown();
        });
    }

    function _teardown() {
        _active = false;
        if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
        _root = null;
        var done = _onDone; _onDone = null;
        if (done) done();
    }

    function _markup() {
        var intro = INTRO.map(function (l) { return '<div class="pc-intro-line">' + l + '</div>'; }).join('');
        return '' +
        '<div class="pc-panel">' +
            '<div class="pc-title">THE AWAKENING</div>' +
            '<div class="pc-intro">' + intro + '</div>' +
            '<div class="pc-grid">' +
                '<div class="pc-col pc-col-app">' +
                    '<div class="pc-label">APPEARANCE</div>' +
                    '<div class="pc-app-row">' +
                        '<button id="pc-app-prev" class="pc-arrow">&#9664;</button>' +
                        '<canvas id="pc-preview" width="128" height="128"></canvas>' +
                        '<button id="pc-app-next" class="pc-arrow">&#9654;</button>' +
                    '</div>' +
                    '<div id="pc-app-label" class="pc-sub">1 / ' + OPTIONS.length + '</div>' +
                    '<div class="pc-label" style="margin-top:14px">DESIGNATION</div>' +
                    '<input id="pc-name" class="pc-name" maxlength="16" placeholder="enter name" autocomplete="off" />' +
                '</div>' +
                '<div class="pc-col pc-col-aff">' +
                    '<div class="pc-label">AFFINITY</div>' +
                    '<div id="pc-aff" class="pc-aff"></div>' +
                    '<div id="pc-aff-blurb" class="pc-aff-blurb">Select an Affinity. The System will classify you accordingly.</div>' +
                '</div>' +
            '</div>' +
            '<div class="pc-label" style="margin-top:14px">CLASS</div>' +
            '<div id="pc-class" class="pc-class"><div class="pc-sub" style="text-align:left">Loading classes…</div></div>' +
            '<div id="pc-class-detail" class="pc-class-detail"></div>' +
            '<button id="pc-confirm" class="pc-confirm" disabled>AWAKEN</button>' +
        '</div>';
    }

    function _css() {
        return '<style>' +
        '#pc-root{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;' +
            'background:radial-gradient(circle at 50% 35%,#0d1326,#07070d 80%);font-family:monospace;color:#c8d8e8;}' +
        '#pc-root .pc-panel{width:min(94vw,640px);max-height:94vh;overflow:auto;background:#02060f;' +
            'border:1px solid #18b8c8;border-radius:8px;box-shadow:0 0 24px rgba(0,204,255,.25);padding:18px 20px;}' +
        '#pc-root .pc-title{text-align:center;font-size:22px;letter-spacing:4px;color:#80f0ff;' +
            'text-shadow:0 0 8px rgba(0,204,255,.6);margin-bottom:8px;}' +
        '#pc-root .pc-intro{border-left:2px solid #00ccff;padding:6px 10px;margin-bottom:16px;background:rgba(0,204,255,.05);}' +
        '#pc-root .pc-intro-line{font-size:12px;color:#7ee0ec;line-height:1.5;}' +
        '#pc-root .pc-grid{display:flex;gap:18px;flex-wrap:wrap;}' +
        '#pc-root .pc-col{flex:1;min-width:240px;}' +
        '#pc-root .pc-label{font-size:11px;letter-spacing:2px;color:#6b7a8d;margin-bottom:6px;}' +
        '#pc-root .pc-sub{font-size:11px;color:#6b7a8d;text-align:center;margin-top:4px;}' +
        '#pc-root .pc-app-row{display:flex;align-items:center;justify-content:center;gap:10px;}' +
        '#pc-root #pc-preview{width:128px;height:128px;image-rendering:pixelated;background:#060610;' +
            'border:1px solid #1a2230;border-radius:4px;}' +
        '#pc-root .pc-arrow{background:#11131f;color:#7ee0ec;border:1px solid #18b8c8;border-radius:4px;' +
            'width:34px;height:48px;font-size:16px;cursor:pointer;}' +
        '#pc-root .pc-arrow:hover{background:#18b8c8;color:#02060f;}' +
        '#pc-root .pc-name{width:100%;box-sizing:border-box;background:#060610;border:1px solid #18b8c8;' +
            'color:#80f0ff;font-family:monospace;font-size:16px;padding:8px 10px;border-radius:4px;letter-spacing:2px;}' +
        '#pc-root .pc-name:focus{outline:none;box-shadow:0 0 8px rgba(0,204,255,.4);}' +
        '#pc-root .pc-aff{display:grid;grid-template-columns:1fr 1fr;gap:6px;}' +
        '#pc-root .pc-aff-chip{--tint:#80e8ff;background:#11131f;border:1px solid #1a2230;color:#c8d8e8;' +
            'font-family:monospace;font-size:12px;padding:7px 4px;border-radius:4px;cursor:pointer;transition:all .1s;}' +
        '#pc-root .pc-aff-chip:hover{border-color:var(--tint);color:var(--tint);}' +
        '#pc-root .pc-aff-chip.sel{background:var(--tint);color:#02060f;border-color:var(--tint);font-weight:bold;}' +
        '#pc-root .pc-aff-blurb{margin-top:10px;font-size:11px;line-height:1.5;min-height:34px;color:#6b7a8d;}' +
        '#pc-root .pc-class{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px;max-height:150px;overflow:auto;padding:2px;}' +
        '#pc-root .pc-class-chip{--tint:#80e8ff;display:flex;flex-direction:column;gap:1px;background:#11131f;border:1px solid #1a2230;' +
            'color:#c8d8e8;font-family:monospace;padding:6px 4px;border-radius:4px;cursor:pointer;transition:all .1s;text-align:left;}' +
        '#pc-root .pc-class-chip:hover{border-color:var(--tint);}' +
        '#pc-root .pc-class-chip.sel{border-color:var(--tint);box-shadow:0 0 8px var(--tint) inset;}' +
        '#pc-root .pc-class-name{font-size:12px;color:#e0eaf2;}' +
        '#pc-root .pc-class-chip.sel .pc-class-name{color:var(--tint);font-weight:bold;}' +
        '#pc-root .pc-class-life{font-size:9px;letter-spacing:1px;color:var(--tint);opacity:.8;text-transform:uppercase;}' +
        '#pc-root .pc-class-detail{margin-top:8px;min-height:96px;background:#060610;border:1px solid #1a2230;border-radius:4px;padding:8px 10px;}' +
        '#pc-root .pc-class-title{font-size:14px;color:#80f0ff;}' +
        '#pc-root .pc-class-sub{font-size:10px;color:#6b7a8d;letter-spacing:1px;text-transform:uppercase;}' +
        '#pc-root .pc-class-sig{font-size:11px;color:#9fb0c0;margin:4px 0 6px;line-height:1.4;}' +
        '#pc-root .pc-class-stats{display:flex;flex-direction:column;gap:3px;margin-bottom:6px;}' +
        '#pc-root .pc-stat{display:flex;align-items:center;gap:6px;font-size:10px;}' +
        '#pc-root .pc-stat-l{width:30px;color:#6b7a8d;}' +
        '#pc-root .pc-stat-bar{flex:1;height:7px;background:#11131f;border:1px solid #1a2230;border-radius:3px;overflow:hidden;}' +
        '#pc-root .pc-stat-bar i{display:block;height:100%;background:linear-gradient(90deg,#18b8c8,#80f0ff);}' +
        '#pc-root .pc-stat-v{width:28px;text-align:right;color:#9fb0c0;}' +
        '#pc-root .pc-class-skills{font-size:10px;color:#7e9aab;line-height:1.4;}' +
        '#pc-root .pc-class-skills b{color:#6b7a8d;}' +
        '#pc-root .pc-confirm{display:block;margin:18px auto 4px;background:#11131f;border:1px solid #18b8c8;' +
            'color:#80f0ff;font-family:monospace;font-size:16px;letter-spacing:4px;padding:10px 36px;border-radius:4px;cursor:pointer;}' +
        '#pc-root .pc-confirm:not(:disabled):hover{background:#00ccff;color:#02060f;box-shadow:0 0 12px rgba(0,204,255,.5);}' +
        '#pc-root .pc-confirm:disabled{opacity:.35;cursor:not-allowed;}' +
        '</style>';
    }

    return { start: start, isActive: isActive };
})();
