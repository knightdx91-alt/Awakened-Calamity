// GameStartMenu — Emerald Enhanced style: icon strip at top, info bar at bottom
window.GameStartMenu = (function () {
    'use strict';

    // Survival start menu (Awakened Calamity): Camp / [Bonds] / Supplies /
    // Affinities / System, plus Save / Options / Exit. (Was the Pokémon EE menu.)
    // BONDS only appears once you've bonded at least one creature.
    const _ITEM = {
        CAMP:       { id: 'CAMP',       label: 'STATUS'     },
        BONDS:      { id: 'BONDS',      label: 'BONDS'      },
        SUPPLIES:   { id: 'SUPPLIES',   label: 'SUPPLIES'   },
        AFFINITIES: { id: 'AFFINITIES', label: 'AFFINITIES' },
        REACHES:    { id: 'REACHES',    label: 'REACHES'    },
        SYSTEM:     { id: 'SYSTEM',     label: 'SYSTEM'     },
        SAVE:       { id: 'SAVE',       label: 'SAVE'       },
        OPTIONS:    { id: 'OPTIONS',    label: 'OPTION'     },
        EXIT:       { id: 'EXIT',       label: 'EXIT'       },
    };
    function _hasBonds() {
        return !!(window.GameSave && GameSave.state && Array.isArray(GameSave.state.bonds)
                  && GameSave.state.bonds.length > 0);
    }
    let ITEMS = [];
    function _rebuildItems() {
        ITEMS = [_ITEM.CAMP];
        if (_hasBonds()) ITEMS.push(_ITEM.BONDS);   // hidden until first bond
        ITEMS.push(_ITEM.SUPPLIES, _ITEM.AFFINITIES, _ITEM.REACHES, _ITEM.SYSTEM,
                   _ITEM.SAVE, _ITEM.OPTIONS, _ITEM.EXIT);
    }
    _rebuildItems();

    const ICON_PATH = 'src/assets/start_menu/';
    // Use RGBA versions (palette index 0 made transparent)
    function _iconFile(name) { return ICON_PATH + name.replace('.png', '_rgba.png'); }

    const TIER_ICON  = { platinum: '💎', gold: '🥇', silver: '🥈', bronze: '🥉' };
    const TIER_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

    let menuEl      = null;
    let subEl       = null;   // sub-page overlay element
    let isOpen      = false;
    let selectedIdx = 0; // start on CAMP
    let page        = 'main';
    let _saveDone   = false;
    let _subIdx     = 0;

    // --- Canvas bg image caches ---
    var _apBg          = undefined;
    var _partyBg       = undefined;

    function _loadSimpleBg(src, storeRef, cb) {
        if (storeRef.val !== undefined) { cb(storeRef.val); return; }
        // Queue callback if already loading to prevent concurrent loads firing twice
        if (storeRef.loading) { (storeRef.queue = storeRef.queue || []).push(cb); return; }
        storeRef.loading = true;
        var img = new Image();
        var _done = function(v) {
            storeRef.val = v; storeRef.loading = false;
            cb(v);
            (storeRef.queue || []).forEach(function(f){ f(v); });
            storeRef.queue = [];
        };
        img.onload  = function() { _done(img); };
        img.onerror = function() { _done(null); };
        img.src = src;
    }
    // Wrapper objects so we can pass by reference
    var _jBgRef  = {};
    var _aBgRef  = {};
    var _tcBgRef = {};
    var _ptBgRef = {};
    var _pdBgRef = {};
    function _loadApBg(cb)          { _loadSimpleBg('src/assets/ap/ap_bg.png',                 _aBgRef,  cb); }

    // --- Theme helpers ---
    // Colors sourced from EE: 1d.gbapal (dark), 1.gbapal (light), ryudarktheme.gbapal, hatlighttheme.gbapal
    function _getThemeColors() {
        var theme   = localStorage.getItem('ac_theme')    || 'DARK';
        var preset  = localStorage.getItem('ac_theme_preset'); // BlueSteel|RoyalPurple|Synthwave|Mocha

        var PRESETS = {
            // [bg, text, dim, border, highlight, titleBg] — indices 1,2,3,13,14 from custom_interface.c × 8
            'BlueSteel':   { bg:'#181810', text:'#00a0f8', dim:'#000000', border:'#b0b0b0', hi:'#505050', titleBg:'#101018' },
            'RoyalPurple': { bg:'#181810', text:'#900098', dim:'#480060', border:'#780098', hi:'#500050', titleBg:'#101010' },
            'Synthwave':   { bg:'#300058', text:'#f8f8f8', dim:'#505060', border:'#600098', hi:'#d800f8', titleBg:'#180030' },
            'Mocha':       { bg:'#302800', text:'#f8e8c8', dim:'#707050', border:'#585840', hi:'#403838', titleBg:'#201800' },
        };

        if (preset && PRESETS[preset]) return PRESETS[preset];

        if (theme === 'LIGHT' || theme === 'VANILLA') {
            // From 1.gbapal: fill=index5=#f8f8f8, hi=index14=#c0b8d8, border=index13=#6860d0
            // From hatlighttheme.gbapal: text=index2=#000000, dim=index3=#b8b8b8
            return { bg:'#f0e8c8', text:'#181818', dim:'#484848', border:'#000000', hi:'#e83030', titleBg:'#e83030' };
        }
        // DARK (default) — from 1d.gbapal: fill=index1=#181818, hi=index14=#18c0f8, border=index13=#0070a8
        // From ryudarktheme.gbapal: text=index2=#d8d8f0, dim=index3=#787888
        return { bg:'#f8f8e0', text:'#181818', dim:'#484848', border:'#000000', hi:'#ee3100', titleBg:'#ee3100' };
    }

    function _applyThemeCSS() {
        var tc = _getThemeColors();
        var r = document.documentElement;
        r.style.setProperty('--theme-win-bg',   tc.bg);
        r.style.setProperty('--theme-title-bg', tc.titleBg);
        r.style.setProperty('--theme-text',     tc.text);
        r.style.setProperty('--theme-hi',       tc.hi);
        r.style.setProperty('--theme-border',   tc.border);
        // RGB breakdown for rgba() usage
        function hexRgb(h) { h=h.replace('#',''); return parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16); }
        r.style.setProperty('--theme-hi-rgb', hexRgb(tc.hi));
    }

    // --- Donor combat state (battle item/switch hooks; AC combat will replace) ---
    var _bagAssets = null;   // referenced by Options theme handlers; kept as a stub
    // These remain referenced by close()/_goBack(); under 'use strict' they must
    // be declared or those functions throw a ReferenceError (menu won't close).
    var _battleItemCallback  = null;
    var _battleBagCancel     = null;
    var _battlePartyCallback = null;
    var _battlePartyCancel   = null;
    function _playtime() {
        const secs = (window.GameSave && GameSave.state && GameSave.state.meta)
            ? (GameSave.state.meta.playtimeSeconds || 0) : 0;
        const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
        return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
    }
    function _playerName() {
        return (window.GameSave && GameSave.state && GameSave.state.player)
            ? (GameSave.state.player.name || 'SURVIVOR') : 'SURVIVOR';
    }
    function _money() {
        return (window.GameSave && GameSave.state && GameSave.state.player)
            ? (GameSave.state.player.money || 0) : 0;
    }
    function _ap() {
        return (window.GameSave && GameSave.state && GameSave.state.achievements)
            ? (GameSave.state.achievements.totalAP || 0) : 0;
    }
    function _achList() {
        return (window.GameSave && GameSave.state && GameSave.state.achievements)
            ? (GameSave.state.achievements.unlocked || []) : [];
    }
    function _mapName() {
        return (window.GameMap && GameMap.current) ? (GameMap.current.name || '—') : '—';
    }
    function _lifeSkills() {
        return (window.GameSave && GameSave.state && GameSave.state.lifeSkills)
            ? GameSave.state.lifeSkills : { alchemy:0, botany:0, mining:0 };
    }
    function _timeOfDay() {
        const h = new Date().getHours();
        if (h >= 5  && h < 8)  return { label:'Dawn',  cls:'tod-dawn'  };
        if (h >= 8  && h < 18) return { label:'Day',   cls:'tod-day'   };
        if (h >= 18 && h < 21) return { label:'Dusk',  cls:'tod-dusk'  };
        return                         { label:'Night', cls:'tod-night' };
    }
    function _clockStr() {
        const d = new Date(), h = d.getHours(), m = String(d.getMinutes()).padStart(2,'0');
        return (h%12||12)+':'+m+' '+(h>=12?'pm':'am');
    }
    function _dayOfWeek() {
        return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
    }
    function _season() {
        const mo = new Date().getMonth();
        if (mo<=1||mo===11) return 'Winter';
        if (mo<=4) return 'Spring';
        if (mo<=7) return 'Summer';
        return 'Autumn';
    }

    // --- Render main menu — FireRed vertical list, right-side panel ---
    var ITEM_DESCS = {
        'CAMP':       'Your status, Class,\nand survival meters.',
        'BONDS':      'The creatures you have\nbonded with.',
        'SUPPLIES':   'Camp Kits, Tethers,\ntonics and gear.',
        'AFFINITIES': 'The nine Affinities\nand their defenses.',
        'REACHES':    'The Four Reaches.\nFast-travel is watched.',
        'SYSTEM':     'Consult the System.\nIt is always watching.',
        'SAVE':       'Save your game with a complete record\nof your progress to take a break.',
        'OPTIONS':    'Adjust various settings\nfor your game.',
        'EXIT':       'Close the menu\nand return to the game.',
    };

    function _renderMain() {
        menuEl.innerHTML = '';

        // Top row: void on left + panel on right
        const topRow = document.createElement('div');
        topRow.className = 'sm-top-row';

        const voidEl = document.createElement('div');
        voidEl.className = 'sm-void';
        topRow.appendChild(voidEl);

        // Right panel — fully canvas-rendered so Chrome dark mode cannot touch it
        const PW = 108, ROW_H = 18, PAD_X = 6, FONT_PX = 8;
        const PH = ITEMS.length * ROW_H;
        const panelCanvas = document.createElement('canvas');
        panelCanvas.width  = PW;
        panelCanvas.height = PH;
        panelCanvas.style.cssText = 'display:block;flex:none;width:48%;min-width:88px;max-width:116px;height:auto;pointer-events:all;border:1px solid #00ccff;box-shadow:0 0 12px rgba(0,200,255,0.28),0 6px 22px rgba(0,0,0,0.6);cursor:pointer;image-rendering:pixelated;';
        const pc = panelCanvas.getContext('2d');

        function _drawPanel() {
            pc.clearRect(0, 0, PW, PH);
            // System OS dark holographic glass
            pc.fillStyle = '#06101f';
            pc.fillRect(0, 0, PW, PH);
            // faint cyan scanlines
            pc.fillStyle = 'rgba(0,200,255,0.06)';
            for (var sy = 0; sy < PH; sy += 3) pc.fillRect(0, sy, PW, 1);
            // Row highlight for selected (cyan wash + left bar)
            pc.fillStyle = 'rgba(0,200,255,0.12)';
            pc.fillRect(0, selectedIdx * ROW_H, PW, ROW_H);
            pc.fillStyle = '#00ccff';
            pc.fillRect(0, selectedIdx * ROW_H, 2, ROW_H);
            // Text
            pc.font = 'bold ' + FONT_PX + 'px "Press Start 2P", monospace';
            pc.textBaseline = 'middle';
            ITEMS.forEach(function(itm, i) {
                const y = i * ROW_H + ROW_H / 2;
                if (i === selectedIdx) {
                    pc.fillStyle = '#80f0ff';   // cyan cursor
                    pc.fillText('▸', PAD_X, y);
                }
                pc.fillStyle = (i === selectedIdx) ? '#eafaff' : '#5f86a0';
                const label = (itm.id === 'CAMP') ? _playerName().toUpperCase() : itm.label.toUpperCase();
                pc.fillText(label, PAD_X + 12, y);
            });
        }
        _drawPanel();

        // Map canvas clicks to item selection
        panelCanvas.addEventListener('click', function(e) {
            const rect = panelCanvas.getBoundingClientRect();
            const scaleY = PH / rect.height;
            const iy = Math.floor((e.clientY - rect.top) * scaleY / ROW_H);
            if (iy >= 0 && iy < ITEMS.length) { selectedIdx = iy; _confirmSelected(); }
        });

        topRow.appendChild(panelCanvas);
        menuEl.appendChild(topRow);

        // Blue description bar at bottom — also canvas
        const DW = menuEl.offsetWidth || 240, DH = 34;
        const descCanvas = document.createElement('canvas');
        descCanvas.width  = DW || 240;
        descCanvas.height = DH;
        descCanvas.style.cssText = 'display:block;flex:none;width:100%;height:34px;pointer-events:none;';
        const dc = descCanvas.getContext('2d');
        dc.fillStyle = '#06101f';                       // System OS glass
        dc.fillRect(0, 0, descCanvas.width, DH);
        dc.fillStyle = '#00ccff';                       // cyan top hairline
        dc.fillRect(0, 0, descCanvas.width, 1);
        dc.fillStyle = '#bfeeff';
        dc.font = '7px "Press Start 2P", monospace';
        dc.textBaseline = 'top';
        const selItem = ITEMS[selectedIdx];
        const descText = selItem ? (ITEM_DESCS[selItem.id] || '') : '';
        // Word-wrap simple: split by space, draw lines
        const words = descText.split(' ');
        let line = '', lineY = 6, maxW = descCanvas.width - 12;
        words.forEach(function(w) {
            const test = line ? line + ' ' + w : w;
            if (dc.measureText(test).width > maxW && line) {
                dc.fillText(line, 6, lineY); lineY += 11; line = w;
            } else { line = test; }
        });
        if (line) dc.fillText(line, 6, lineY);
        menuEl.appendChild(descCanvas);
    }

    // --- Render sub-page overlay ---
    function _renderSub() {
        subEl.innerHTML = '';
        subEl._pageEl = null;

        // Canvas-based full-screen pages bypass the sm-win wrapper entirely
        var CANVAS_PAGES = ['options','save'];
        if (CANVAS_PAGES.indexOf(page) !== -1) {
            var pageEl = document.createElement('div');
            pageEl.style.cssText = 'position:absolute;inset:0;pointer-events:all;';
            if      (page === 'options') _buildOptions(pageEl);
            else if (page === 'save')    _buildSave(pageEl);
            subEl.appendChild(pageEl);
            subEl._pageEl = pageEl;
            subEl.style.display = 'block';
            return;
        }

        const titles = { camp:'[ STATUS ]', bonds:'[ BONDS ]', supplies:'[ SUPPLIES ]',
                         affinities:'AFFINITIES', reaches:'THE FOUR REACHES',
                         system:'[ THE SYSTEM ]',
                         save:'Save', options:'Options'
        };

        // GBA-style dialog window — positioned over the map, not full-screen
        const win = document.createElement('div');
        win.className = 'sm-win';
        win.dataset.page = page;

        // Title bar with B/Back button on the right
        const titleBar = document.createElement('div');
        titleBar.className = 'sm-win-title';
        const titleEl = document.createElement('span');
        titleEl.textContent = titles[page] || page;
        const backBtn = document.createElement('button');
        backBtn.className = 'sm-back-btn';
        backBtn.textContent = 'B BACK';
        backBtn.addEventListener('click', _goBack);
        titleBar.appendChild(titleEl);
        titleBar.appendChild(backBtn);
        win.appendChild(titleBar);

        const content = document.createElement('div');
        content.className = 'sm-sub-content';

        if      (page === 'camp')        _buildCamp(content);
        else if (page === 'bonds')       _buildBonds(content);
        else if (page === 'supplies')    _buildSupplies(content);
        else if (page === 'affinities')  _buildAffinities(content);
        else if (page === 'reaches')     _buildReaches(content);
        else if (page === 'system')      _buildSystem(content);
        else if (page === 'save')        _buildSave(content);
        else if (page === 'options')     _buildOptions(content);

        win.appendChild(content);
        subEl.appendChild(win);

        subEl.style.display = 'block';

        setTimeout(function () {
            const sel = content.querySelector('.sm-row.selected, .sm-ach-row.selected');
            if (sel) sel.scrollIntoView({ block: 'nearest' });
        }, 0);
    }

    function _render() {
        if (!menuEl) return;
        if (page === 'main') {
            menuEl.style.visibility = 'visible';
            _renderMain();
            if (subEl) subEl.style.display = 'none';
        } else {
            menuEl.style.visibility = 'hidden';
            _renderSub();
        }
    }

    // --- Sub-page builders (canvas-based) ---
    var GBA_W = 480, GBA_H = 320;

    function _makeCanvasShell(el, redrawFn) {
        el.style.cssText = 'padding:0;overflow:hidden;background:none;position:absolute;inset:0;';
        var backBtn = document.createElement('button');
        backBtn.textContent = 'B BACK';
        backBtn.className = 'sm-back-btn';
        backBtn.style.cssText = 'position:absolute;bottom:4px;right:4px;z-index:10;pointer-events:all;';
        backBtn.addEventListener('click', _goBack);
        el.appendChild(backBtn);
        var canvas = document.createElement('canvas');
        canvas.width  = GBA_W;
        canvas.height = GBA_H;
        canvas.style.cssText = 'width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;';
        canvas.style.pointerEvents = 'all';
        el.appendChild(canvas);
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        redrawFn(ctx, canvas);
        return { ctx: ctx, canvas: canvas };
    }

    function _canvasBg(ctx, bg) {
        var _tc = _getThemeColors();
        ctx.fillStyle = _tc.bg;
        ctx.fillRect(0, 0, GBA_W, GBA_H);
        if (bg) { ctx.imageSmoothingEnabled = false; ctx.drawImage(bg, 0, 0, GBA_W, GBA_H); }
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // ===================================================================
    // Awakened Calamity survival menus (Camp / Bonds / Supplies /
    // Affinities / Reaches / System). DOM-based, design-system palette.
    // ===================================================================
    // System OS palette (cold holographic glass + cyan) — was FireRed. Reskins
    // every sub-screen built from _FR.* (CAMP/SUPPLIES/AFFINITIES/REACHES/…).
    var _FR = { body:'#0a1224', bodyLt:'#06101f', border:'#00ccff', text:'#bfeeff',
                dim:'#5f86a0', red:'#00ccff', blue:'#37e0d0', tan:'rgba(0,0,0,0.5)' };
    var _SYS = { panel:'#0a0e1a', ink:'#80e8ff', cyan:'#00ccff', warn:'#f8c800',
                 danger:'#ff3030', dim:'#3a5a6a' };
    var AFFINITIES_DATA = [
        ['Ember','#ef6a2c','fire / heat','resists Cold'],
        ['Tide','#3aa0e8','water / flood','resists Heat'],
        ['Verdant','#3ac06a','growth / rot','resists Toxic'],
        ['Storm','#e8d23a','lightning','resists Tempest'],
        ['Stone','#b09060','earth / guard','resists Toxic / Tempest'],
        ['Frost','#5bd0e8','ice / chill','resists Heat'],
        ['Toxin','#9be03a','poison / blight','—'],
        ['Umbral','#8a6cff','shadow / gloom','—'],
        ['Lumen','#ffe79e','light / sear','resists Gloom'],
        ['Corruption','#ff2bd6','System-only · strong vs. all','the System cheats'],
        ['Untethered','#b9c6d6','resists Corruption','mythic / free creatures'],
    ];
    var REACHES_DATA = [
        ['Verdara','#3ac06a','The Verdant Reach','overgrown safe-belt'],
        ['Halveth','#5bd0e8','The Frozen Reach','cold wildlands'],
        ['Calderra','#ef6a2c','The Burning Reach','heat / ember deep-zone'],
        ['Vael','#8a6cff','The Drowned Reach','gloom / corruption'],
    ];

    function _row(parent, opts) {
        var r = document.createElement('div');
        r.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 7px;' +
            'font:8px "Press Start 2P",monospace;' + (opts.css || '');
        parent.appendChild(r); return r;
    }
    function _swatch(color) {
        var s = document.createElement('span');
        s.style.cssText = 'flex:none;width:9px;height:9px;border-radius:2px;border:1px solid rgba(0,0,0,.4);background:' + color + ';';
        return s;
    }
    function _miniMeter(parent, label, val, max, color, warmInvert) {
        var pct = Math.max(0, Math.min(1, (val || 0) / (max || 100)));
        var box = document.createElement('div');
        box.style.cssText = 'margin:4px 0;';
        var head = document.createElement('div');
        head.style.cssText = 'display:flex;justify-content:space-between;font:7px "Press Start 2P",monospace;color:' + _FR.dim + ';margin-bottom:2px;';
        head.innerHTML = '<span style="color:' + _FR.text + '">' + label + '</span><span>' + Math.round(val) + '/' + max + '</span>';
        var track = document.createElement('div');
        track.style.cssText = 'height:6px;background:' + _FR.tan + ';border:1px solid ' + _FR.border + ';border-radius:3px;overflow:hidden;';
        var fill = document.createElement('div');
        var col = color || (pct > .5 ? '#58d038' : pct > .2 ? '#f8c800' : '#f83800');
        if (warmInvert) col = pct > .66 ? '#f83800' : pct > .33 ? '#f8c800' : '#58d038';
        fill.style.cssText = 'width:' + (pct * 100) + '%;height:100%;background:' + col + ';';
        track.appendChild(fill); box.appendChild(head); box.appendChild(track); parent.appendChild(box);
    }
    function _survival() {
        return (window.GameSave && GameSave.state && GameSave.state.survival) ||
               { surveillance: 0, stamina: 100, exposure: 0 };
    }
    function _subjectId() {
        var raw = (window.GameSave && GameSave.state && GameSave.state.meta)
            ? GameSave.state.meta.subjectId : 0;
        return 'SUBJECT-' + String((raw || 4471)).padStart(4, '0');
    }
    function _credits() {
        return (window.GameSave && GameSave.state && GameSave.state.player)
            ? (GameSave.state.player.money || 0) : 0;
    }
    function _playtime() {
        var s = (window.GameSave && GameSave.state && GameSave.state.meta)
            ? (GameSave.state.meta.playtimeSeconds || 0) : 0;
        var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
        return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
    }

    function _buildCamp(el) {
        el.style.cssText = 'background:' + _FR.bodyLt + ';color:' + _FR.text + ';padding:10px;overflow:auto;';
        var hd = document.createElement('div');
        hd.style.cssText = 'font:9px "Press Start 2P";color:' + _FR.text + ';border-bottom:2px solid ' + _FR.border + ';padding-bottom:6px;margin-bottom:8px;';
        hd.textContent = _playerName().toUpperCase();
        el.appendChild(hd);
        var info = [
            ['Designation', _subjectId()],
            ['Class', (window.GameSave && GameSave.state && GameSave.state.klass) || 'Unclassed'],
            ['Credits', 'Cr ' + _credits()],
            ['Time Awake', _playtime()],
            ['Bonds', String(((window.GameSave && GameSave.state && GameSave.state.bonds) || []).length)],
        ];
        info.forEach(function (kv) {
            var r = _row(el, { css: 'justify-content:space-between;color:' + _FR.dim + ';' });
            r.innerHTML = '<span>' + kv[0] + '</span><span style="color:' + _FR.text + '">' + kv[1] + '</span>';
        });
        var sub = document.createElement('div');
        sub.style.cssText = 'margin-top:10px;font:7px "Press Start 2P";color:' + _FR.dim + ';';
        sub.textContent = 'SURVIVAL';
        el.appendChild(sub);
        var s = _survival();
        _miniMeter(el, 'STAMINA', s.stamina, 100, null, false);
        _miniMeter(el, 'EXPOSURE', s.exposure, 100, null, true);
        // Surveillance shown cold even here
        var sv = Math.max(0, Math.min(100, s.surveillance || 0));
        var svc = sv >= 66 ? _SYS.danger : sv >= 33 ? _SYS.warn : _SYS.cyan;
        var box = document.createElement('div');
        box.style.cssText = 'margin-top:6px;background:' + _SYS.panel + ';border:1px solid ' + svc + ';border-radius:4px;padding:5px 6px;box-shadow:0 0 6px ' + svc + '55;';
        box.innerHTML = '<div style="display:flex;justify-content:space-between;font:7px \'Press Start 2P\';color:' + svc + ';margin-bottom:3px;"><span>SURVEILLANCE</span><span>' + Math.round(sv) + '%</span></div>' +
            '<div style="height:5px;background:#000;border-radius:3px;overflow:hidden;"><div style="width:' + sv + '%;height:100%;background:' + svc + '"></div></div>';
        el.appendChild(box);
    }

    function _buildBonds(el) {
        el.style.cssText = 'background:' + _FR.bodyLt + ';color:' + _FR.text + ';padding:10px;overflow:auto;';
        var bonds = (window.GameSave && GameSave.state && GameSave.state.bonds) || [];
        if (!bonds.length) {
            var em = document.createElement('div');
            em.style.cssText = 'font:8px "Press Start 2P";color:' + _FR.dim + ';line-height:1.8;text-align:center;padding-top:20px;';
            em.innerHTML = 'No bonds yet.<br><br>You Awakened alone.<br>Weaken a creature and<br>spend a Tether to Bind it.';
            el.appendChild(em); return;
        }
        bonds.forEach(function (b, i) {
            var r = _row(el, { css: 'background:' + _FR.body + ';border:1px solid ' + _FR.border + ';border-radius:5px;margin-bottom:5px;' });
            r.appendChild(_swatch(b.color || _FR.tan));
            var nm = document.createElement('span'); nm.style.cssText = 'flex:1;';
            nm.textContent = (b.name || ('Bond ' + (i + 1))).toUpperCase();
            r.appendChild(nm);
            var hp = document.createElement('span'); hp.style.cssText = 'color:' + _FR.dim + ';font-size:7px;';
            hp.textContent = (b.affinity || '—') + '  Lv' + (b.tier || 1);
            r.appendChild(hp);
        });
    }

    function _buildSupplies(el) {
        el.style.cssText = 'background:' + _FR.bodyLt + ';color:' + _FR.text + ';padding:10px;overflow:auto;';
        var pockets = [
            ['Camp Kits', 'Drop a temporary Safe Zone to Rest, Cook, Craft, Save.'],
            ['Food', 'Cooked & raw — restores Stamina in the field.'],
            ['Tethers', "The System's binding protocol. Spend to Bind a weakened creature."],
            ['Tonics', 'Heat · Cold · Toxic · Gloom · Tempest — purge Exposure.'],
            ['Materials', 'Scavenge for field crafting & hazard gear.'],
            ['Gear', 'Affinity-defended equipment vs. biome hazards.'],
            ['Key', 'Story & landmark items.'],
        ];
        var inv = (window.GameSave && GameSave.state && GameSave.state.inventory) || {};
        var counts = {
            'Camp Kits': (inv.keyItems && Object.keys(inv.keyItems).length) || 0,
            'Food': 0, 'Tethers': 0, 'Tonics': 0, 'Materials': 0, 'Gear': 0,
            'Key': (inv.keyItems && Object.keys(inv.keyItems).length) || 0,
        };
        pockets.forEach(function (p) {
            var r = _row(el, { css: 'flex-direction:column;align-items:flex-start;gap:3px;background:' + _FR.body + ';border:1px solid ' + _FR.border + ';border-radius:5px;margin-bottom:5px;' });
            var top = document.createElement('div');
            top.style.cssText = 'display:flex;justify-content:space-between;width:100%;';
            top.innerHTML = '<span>' + p[0].toUpperCase() + '</span><span style="color:' + _FR.blue + '">×' + (counts[p[0]] || 0) + '</span>';
            var desc = document.createElement('div');
            desc.style.cssText = 'font-size:6px;color:' + _FR.dim + ';line-height:1.5;';
            desc.textContent = p[1];
            r.appendChild(top); r.appendChild(desc);
        });
    }

    function _buildAffinities(el) {
        el.style.cssText = 'background:' + _FR.bodyLt + ';color:' + _FR.text + ';padding:10px;overflow:auto;';
        var note = document.createElement('div');
        note.style.cssText = 'font:6px "Press Start 2P";color:' + _FR.dim + ';margin-bottom:8px;line-height:1.6;';
        note.textContent = 'Nine Affinities + two meta-types. Each is an attack flavor AND a defense domain vs. Exposure.';
        el.appendChild(note);
        AFFINITIES_DATA.forEach(function (a) {
            var meta = (a[0] === 'Corruption' || a[0] === 'Untethered');
            var r = _row(el, { css: 'background:' + (meta ? '#1a1420' : _FR.body) + ';border:1px solid ' + (meta ? a[1] : _FR.border) + ';border-radius:5px;margin-bottom:4px;' + (meta ? 'color:#d8c8e8;' : '') });
            r.appendChild(_swatch(a[1]));
            var nm = document.createElement('span'); nm.style.cssText = 'flex:none;width:70px;color:' + (meta ? a[1] : _FR.text) + ';';
            nm.textContent = a[0].toUpperCase();
            r.appendChild(nm);
            var role = document.createElement('span'); role.style.cssText = 'flex:1;font-size:6px;color:' + (meta ? '#b8a8c8' : _FR.dim) + ';';
            role.innerHTML = a[2] + '<br><span style="color:' + a[1] + '">' + a[3] + '</span>';
            r.appendChild(role);
        });
    }

    function _buildReaches(el) {
        el.style.cssText = 'background:' + _FR.bodyLt + ';color:' + _FR.text + ';padding:10px;overflow:auto;';
        var note = document.createElement('div');
        note.style.cssText = 'font:6px "Press Start 2P";color:' + _SYS.danger + ';margin-bottom:8px;line-height:1.6;';
        note.textContent = '⚠ Fast-travel uses System protocol. Each jump raises Surveillance.';
        el.appendChild(note);
        REACHES_DATA.forEach(function (r0) {
            var r = _row(el, { css: 'background:' + _FR.body + ';border:1px solid ' + _FR.border + ';border-radius:5px;margin-bottom:5px;cursor:pointer;' });
            r.appendChild(_swatch(r0[1]));
            var col = document.createElement('div'); col.style.cssText = 'flex:1;';
            col.innerHTML = '<div style="color:' + r0[1] + '">' + r0[0].toUpperCase() + '</div>' +
                '<div style="font-size:6px;color:' + _FR.dim + '">' + r0[2] + ' · ' + r0[3] + '</div>';
            r.appendChild(col);
            var lock = document.createElement('span'); lock.style.cssText = 'font-size:6px;color:' + _FR.dim + ';';
            lock.textContent = 'LOCKED';
            r.appendChild(lock);
        });
    }

    function _buildSystem(el) {
        // COLD panel — near-black glass, cyan/danger, interactive services.
        var s = _survival();
        var sv = Math.max(0, Math.min(100, s.surveillance || 0));
        var hot = sv >= 66, mid = sv >= 33;
        var acc = hot ? _SYS.danger : mid ? _SYS.warn : _SYS.cyan;
        el.style.cssText = 'background:' + _SYS.panel + ';color:' + _SYS.ink + ';padding:11px;overflow:auto;font-family:"Press Start 2P",monospace;';
        var head = document.createElement('div');
        head.style.cssText = 'font:7px "Press Start 2P";letter-spacing:2px;color:' + acc + ';margin-bottom:8px;';
        head.textContent = '[ THE SYSTEM ]';
        el.appendChild(head);
        var greet = document.createElement('div');
        greet.style.cssText = 'font:7px "Press Start 2P";color:' + _SYS.ink + ';opacity:.8;margin-bottom:10px;line-height:1.7;';
        greet.textContent = 'Welcome, ' + _subjectId() + '. The System is here to help.';
        el.appendChild(greet);
        // Surveillance gauge
        var box = document.createElement('div');
        box.style.cssText = 'background:rgba(0,0,0,.45);border:1px solid ' + acc + ';border-radius:5px;padding:7px;margin-bottom:6px;box-shadow:0 0 9px ' + acc + '66;';
        box.innerHTML = '<div style="display:flex;justify-content:space-between;font:7px \'Press Start 2P\';color:' + acc + ';margin-bottom:4px;"><span>SURVEILLANCE</span><span>' + Math.round(sv) + '%</span></div>' +
            '<div style="height:6px;background:#000;border-radius:3px;overflow:hidden;"><div style="width:' + sv + '%;height:100%;background:' + acc + '"></div></div>' +
            '<div style="font-size:6px;color:' + acc + ';margin-top:5px;">AUDIT RISK: ' + (hot ? 'CRITICAL — Constructs may spawn' : mid ? 'ELEVATED' : 'NOMINAL') + '</div>';
        el.appendChild(box);
        // Interactive services (raise Surveillance)
        var svc = document.createElement('div');
        svc.style.cssText = 'font-size:6px;color:' + _SYS.dim + ';margin:8px 0 4px;';
        svc.textContent = 'SERVICES — each request is logged';
        el.appendChild(svc);
        function service(label, sub, cost, fn) {
            var b = document.createElement('button');
            b.style.cssText = 'display:block;width:100%;text-align:left;background:rgba(0,40,55,.55);border:1px solid ' + _SYS.cyan + ';border-radius:5px;padding:7px;margin-bottom:5px;color:' + _SYS.ink + ';font:7px "Press Start 2P";cursor:pointer;';
            b.innerHTML = '<div style="color:' + _SYS.cyan + '">' + label + '</div><div style="font-size:6px;color:' + _SYS.dim + ';margin-top:3px;">' + sub + ' <span style="color:' + _SYS.warn + '">(+' + cost + ' Surveillance)</span></div>';
            b.addEventListener('click', function () { fn(cost); });
            el.appendChild(b);
        }
        function raise(by, msg) {
            if (window.GameSave && GameSave.state) {
                var st = GameSave.state.survival || { surveillance: 0, stamina: 100, exposure: 0 };
                st.surveillance = Math.min(100, (st.surveillance || 0) + by);
                GameSave.state.survival = st; GameSave.markDirty();
                if (window.GameHUD && GameHUD.setMeters) GameHUD.setMeters(st);
            }
            if (window.GameSystem && GameSystem.notify) GameSystem.notify(msg, 'danger');
            _render(); // refresh the panel (gauge climbs)
        }
        service('Emergency Restore', 'Full Stamina, one tap. We\'ve got you.', 8, function (c) {
            if (window.GameSave && GameSave.state) {
                var st = GameSave.state.survival || {}; st.stamina = 100; st.exposure = Math.max(0, (st.exposure || 0) - 40);
                GameSave.state.survival = st;
            }
            raise(c, 'Restore applied. Surveillance noted.');
        });
        service('Fast-Travel', 'Jump to an unlocked landmark.', 6, function (c) {
            raise(c, 'Transit authorized. Surveillance noted.');
        });
        service('Register Camp', 'Audit-proof your refuge — but flagged.', 10, function (c) {
            raise(c, 'Camp registered. You are protected. You are watched.');
        });
    }

    function _buildSave(el) {
        var shell = _makeCanvasShell(el, function(ctx, canvas) {
            _drawSaveCanvas(ctx);
            canvas.addEventListener('click', function(e) {
                var rect = canvas.getBoundingClientRect();
                var cy = (e.clientY - rect.top) * (160 / rect.height);
                // Save row at y=100..115, Load row at y=118..133
                if (cy >= 100 && cy < 116) { _subIdx = 0; _doSaveAction('save'); }
                else if (cy >= 118 && cy < 134) { _subIdx = 1; _doSaveAction('load'); }
            });
        });
    }

    function _drawSaveCanvas(ctx) {
        _canvasBg(ctx, null);
        var S = 2;
        var _tc = _getThemeColors(); var COL_TEXT = _tc.text; var COL_DIM = _tc.dim; var COL_CYAN = _tc.hi;

        // Title bar
        ctx.fillStyle = _tc.titleBg;
        ctx.fillRect(0, 0, GBA_W, 20*S);
        ctx.fillStyle = COL_CYAN;
        ctx.fillRect(0, 20*S, GBA_W, 2);
        ctx.textBaseline = 'top';
        ctx.font = 'bold '+(11*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = _tc.hi;
        ctx.fillText('SAVE', 8*S, 5*S);

        // Info box
        var bondCount = (window.GameSave && GameSave.state && GameSave.state.bonds)
            ? GameSave.state.bonds.length : 0;

        ctx.font = (7*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = COL_CYAN;
        ctx.fillText(_mapName(), 8*S, 28*S);

        var infoRows = [
            ['Subject:', _playerName()],
            ['Bonds:', String(bondCount)],
            ['Time:', _playtime()],
        ];
        infoRows.forEach(function(r, i) {
            var ry = (42 + i * 14) * S;
            ctx.fillStyle = COL_DIM;  ctx.fillText(r[0], 8*S, ry);
            ctx.fillStyle = COL_TEXT; ctx.fillText(r[1], 80*S, ry);
        });

        // Divider
        ctx.fillStyle = COL_CYAN;
        ctx.fillRect(8*S, 100*S, (GBA_W - 16*S), 1);

        // Action rows
        var ACTIONS = [['Save Game', 0], ['Load Game', 1]];
        ACTIONS.forEach(function(a) {
            var label = a[0], idx = a[1];
            var ry = (104 + idx * 18) * S;
            var isSel = idx === _subIdx;
            if (isSel) {
                ctx.fillStyle = 'rgba(230,8,8,0.12)';
                ctx.fillRect(0, ry, GBA_W, 14*S);
                ctx.fillStyle = COL_CYAN;
                ctx.fillRect(0, ry, 2*S, 14*S);
            }
            ctx.font = (7*S)+'px "Press Start 2P", monospace';
            ctx.fillStyle = isSel ? COL_CYAN : COL_TEXT;
            ctx.fillText((isSel ? '▶ ' : '  ') + label, 8*S, ry + 2*S);
        });

        if (_saveDone) {
            ctx.fillStyle = '#20d840';
            ctx.font = (7*S)+'px "Press Start 2P", monospace';
            ctx.fillText('Game saved!', 8*S, 142*S);
        }
    }

    function _doSaveAction(id) {
        if (id==='save') {
            _saveDone=false;
            if (window.GameSave) GameSave.save(GameSave.currentSlot||0);
            setTimeout(function(){_saveDone=true;_render();},500);
            _render();
        } else if (id==='load') {
            if (window.GameSave) GameSave.load(GameSave.currentSlot||0);
            close();
        }
    }

    function _buildOptions(el) {
        // Options uses a canvas background with HTML interactive rows overlaid
        el.style.cssText = 'padding:0;overflow:hidden;background:none;position:absolute;inset:0;';

        var backBtn = document.createElement('button');
        backBtn.textContent = 'B BACK';
        backBtn.className = 'sm-back-btn';
        backBtn.style.cssText = 'position:absolute;bottom:4px;right:4px;z-index:10;pointer-events:all;';
        backBtn.addEventListener('click', _goBack);
        el.appendChild(backBtn);

        // Canvas background
        var canvas = document.createElement('canvas');
        canvas.width = GBA_W; canvas.height = GBA_H;
        canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:none;';
        el.appendChild(canvas);
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        _drawOptionsCanvasBg(ctx);

        // Scrollable options HTML overlay on top
        var scrollDiv = document.createElement('div');
        scrollDiv.style.cssText = 'position:absolute;top:20px;left:0;right:0;bottom:24px;overflow-y:auto;pointer-events:all;';
        el.appendChild(scrollDiv);

        var savedScale      = parseFloat(localStorage.getItem('ac_control_scale')||'1');
        var currentOrient   = window.GameLayout ? GameLayout.getOrientationPref() : 'auto';
        var savedTextSpeed  = localStorage.getItem('ac_text_speed')   || 'MED';
        var savedBScene     = localStorage.getItem('ac_battle_scene') || 'ON';
        var savedForceSet   = localStorage.getItem('ac_force_set')    || 'OFF';
        var savedDmgNums    = localStorage.getItem('ac_damage_nums')  || 'ON';
        var savedThemeUI    = localStorage.getItem('ac_theme_ui')     || 'MODERN';
        var savedTheme      = localStorage.getItem('ac_theme')        || 'DARK';
        var savedFrame      = parseInt(localStorage.getItem('ac_frame')    || '1');
        var savedThemeBall  = parseInt(localStorage.getItem('ac_theme_ball')|| '1');
        var savedRandMusic  = localStorage.getItem('ac_random_music') || 'OFF';
        var savedDisMusic   = localStorage.getItem('ac_disable_music')|| 'OFF';
        var savedBarSpeed   = parseInt(localStorage.getItem('ac_bar_speed') || '5');
        var savedTransition = localStorage.getItem('ac_transition')   || 'ON';
        var savedLvCap      = localStorage.getItem('ac_lv_cap')       || 'OFF';
        var savedAutoRun    = localStorage.getItem('ac_auto_run')     || 'OFF';
        var savedAutosave   = localStorage.getItem('ac_autosave_int') || '15s';
        var savedControls   = (window.GameControls && GameControls.getMode && GameControls.getMode()) || 'dpad';

        var list = document.createElement('div');
        list.className = 'opt-list';
        list.style.cssText = 'background:transparent;';
        scrollDiv.appendChild(list);

        var rowIndex = 0;

        function makeToggleRow(label, opts, currentVal, onChange) {
            var myIdx = rowIndex++;
            var row = document.createElement('div');
            row.className = 'opt-row' + (_subIdx === myIdx ? ' selected' : '');
            row.style.pointerEvents = 'all';
            var lbl = document.createElement('span');
            lbl.className = 'opt-label';
            lbl.textContent = label;
            var valWrap = document.createElement('span');
            valWrap.className = 'opt-val-wrap';
            opts.forEach(function(o) {
                var btn = document.createElement('button');
                btn.className = 'sm-opt-btn' + (o === currentVal ? ' active' : '');
                btn.textContent = o;
                btn.style.pointerEvents = 'all';
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    valWrap.querySelectorAll('.sm-opt-btn').forEach(function(b){b.classList.remove('active');});
                    btn.classList.add('active');
                    onChange(o);
                });
                valWrap.appendChild(btn);
            });
            row.appendChild(lbl);
            row.appendChild(valWrap);
            row.addEventListener('click', function(){_subIdx=myIdx;_render();});
            return row;
        }

        function makeNumberRow(label, key, cur, min2, max2) {
            var myIdx = rowIndex++;
            var row = document.createElement('div');
            row.className = 'opt-row' + (_subIdx === myIdx ? ' selected' : '');
            row.style.pointerEvents = 'all';
            var lbl = document.createElement('span');
            lbl.className = 'opt-label';
            lbl.textContent = label;
            var valWrap = document.createElement('span');
            valWrap.className = 'opt-val-wrap';
            var decBtn = document.createElement('button');
            decBtn.className = 'sm-opt-btn';
            decBtn.textContent = '◀';
            decBtn.style.pointerEvents = 'all';
            var numEl = document.createElement('span');
            numEl.className = 'opt-num-val';
            numEl.textContent = String(cur);
            var incBtn = document.createElement('button');
            incBtn.className = 'sm-opt-btn';
            incBtn.textContent = '▶';
            incBtn.style.pointerEvents = 'all';
            function updateNum(delta) {
                var v = parseInt(numEl.textContent) + delta;
                v = Math.max(min2, Math.min(max2, v));
                numEl.textContent = String(v);
                localStorage.setItem(key, String(v));
            }
            decBtn.addEventListener('click', function(e){e.stopPropagation();updateNum(-1);});
            incBtn.addEventListener('click', function(e){e.stopPropagation();updateNum(1);});
            valWrap.appendChild(decBtn);
            valWrap.appendChild(numEl);
            valWrap.appendChild(incBtn);
            row.appendChild(lbl);
            row.appendChild(valWrap);
            row.addEventListener('click', function(){_subIdx=myIdx;_render();});
            return row;
        }

        // EE option_menu.c: 18 items in order
        list.appendChild(makeToggleRow('Text Speed',      ['SLOW','MED','FAST'],         savedTextSpeed, function(v){localStorage.setItem('ac_text_speed',v);}));
        list.appendChild(makeToggleRow('Battle Scene',    ['ON','OFF'],                  savedBScene,    function(v){localStorage.setItem('ac_battle_scene',v);}));
        list.appendChild(makeToggleRow('Force Set Battle',['ON','OFF'],                  savedForceSet,  function(v){localStorage.setItem('ac_force_set',v);}));
        list.appendChild(makeToggleRow('Damage Numbers',  ['ON','OFF'],                  savedDmgNums,   function(v){localStorage.setItem('ac_damage_nums',v);}));
        list.appendChild(makeToggleRow('Theme UI',        ['MODERN','CLASSIC','VANILLA'],savedThemeUI,   function(v){localStorage.setItem('ac_theme_ui',v); _bagAssets=null; _applyThemeCSS(); _render();}));
        list.appendChild(makeToggleRow('Theme',           ['DARK','LIGHT','VANILLA','USER'],savedTheme,  function(v){localStorage.setItem('ac_theme',v); localStorage.removeItem('ac_theme_preset'); _bagAssets=null; _applyThemeCSS(); _render();}));
        // Theme Presets — matches EE's PRESETTHEME_* values from custom_interface.c
        list.appendChild(makeToggleRow('Preset',
            ['None','BlueSteel','RoyalPurple','Synthwave','Mocha'],
            localStorage.getItem('ac_theme_preset') || 'None',
            function(v) {
                if (v === 'None') localStorage.removeItem('ac_theme_preset');
                else localStorage.setItem('ac_theme_preset', v);
                // Presets force USER theme mode like EE's ApplyPresetRGBUserTheme
                localStorage.setItem('ac_theme', 'USER');
                _bagAssets = null; _applyThemeCSS(); _render();
            }
        ));
        list.appendChild(makeNumberRow('Frame',       'ac_frame',      savedFrame,    1, 20));
        list.appendChild(makeNumberRow('Theme Ball',  'ac_theme_ball', savedThemeBall,1, 31));
        list.appendChild(makeToggleRow('Random Music', ['ON','OFF'],                  savedRandMusic, function(v){localStorage.setItem('ac_random_music',v);}));
        list.appendChild(makeToggleRow('Disable Music',['ON','OFF'],                  savedDisMusic,  function(v){localStorage.setItem('ac_disable_music',v);}));
        list.appendChild(makeNumberRow('Bar Speed',   'ac_bar_speed',  savedBarSpeed, 1, 11));
        list.appendChild(makeToggleRow('Transition',   ['ON','OFF'],                  savedTransition,function(v){localStorage.setItem('ac_transition',v);}));
        list.appendChild(makeToggleRow('Lv Cap 100',   ['ON','OFF'],                  savedLvCap,     function(v){localStorage.setItem('ac_lv_cap',v);}));
        list.appendChild(makeToggleRow('Auto Run',     ['OFF','ON'],                  savedAutoRun,   function(v){localStorage.setItem('ac_auto_run',v);}));
        list.appendChild(makeToggleRow('Autosave',     ['OFF','15s','30s','1m','2m','5m','10m'],savedAutosave, function(v){localStorage.setItem('ac_autosave_int',v);}));
        // SAVE row (last)
        (function(){
            var myIdx = rowIndex++;
            var row = document.createElement('div');
            row.className = 'opt-row opt-save-row' + (_subIdx === myIdx ? ' selected' : '');
            row.style.pointerEvents = 'all';
            var lbl = document.createElement('span'); lbl.className = 'opt-label'; lbl.textContent = 'SAVE';
            row.appendChild(lbl);
            row.addEventListener('click', function(){_subIdx=myIdx;_render();});
            list.appendChild(row);
        })();

        // ── Extra controls below the 18 EE options (engine-specific) ──
        var extraSep = document.createElement('div'); extraSep.className = 'sm-sep'; list.appendChild(extraSep);

        // Controls toggle
        var ctrlRow = makeToggleRow('Controls', ['D-PAD','STICK'],
            savedControls==='dpad'?'D-PAD':'STICK',
            function(v){if(window.GameControls)GameControls.setMode(v==='D-PAD'?'dpad':'joystick');});
        ctrlRow.style.padding = '4px 8px';
        list.appendChild(ctrlRow);

        // Button size slider
        var sizeIdx = rowIndex++;
        var sizeRow = document.createElement('div');
        sizeRow.className = 'opt-row' + (_subIdx === sizeIdx ? ' selected' : '');
        sizeRow.innerHTML = '<span class="opt-label">Button Size</span>'
            + '<span class="opt-val-wrap" style="pointer-events:all">'
            + '<input type="range" id="sm-size-slider" min="0.5" max="2" step="0.1" value="'+savedScale+'" style="pointer-events:all;width:60px;accent-color:#1dc0fe">'
            + '<span id="sm-size-val" style="font-size:12px;color:#7090a8;min-width:26px">'+savedScale.toFixed(1)+'×</span>'
            + '</span>';
        sizeRow.addEventListener('click', function(){_subIdx=sizeIdx;_render();});
        list.appendChild(sizeRow);

        // Orientation row
        var orientIdx = rowIndex++;
        var orientRow = document.createElement('div');
        orientRow.className = 'opt-row opt-row-col' + (_subIdx === orientIdx ? ' selected' : '');
        var orientLbl = document.createElement('span'); orientLbl.className = 'opt-label'; orientLbl.textContent = 'Orientation';
        var orientBtns = document.createElement('span');
        orientBtns.className = 'sm-opt-btns sm-orient-btns';
        orientBtns.style.pointerEvents = 'all';
        [
            { val:'auto',              label:'Auto'   },
            { val:'portrait',          label:'Port.'  },
            { val:'reverse-portrait',  label:'↕ Rev.' },
            { val:'landscape',         label:'Land.'  },
            { val:'reverse-landscape', label:'↔ Rev.' },
        ].forEach(function(o){
            var btn = document.createElement('button');
            btn.className = 'sm-opt-btn sm-orient-btn' + (currentOrient===o.val?' active':'');
            btn.textContent = o.label;
            btn.style.pointerEvents = 'all';
            btn.addEventListener('click', function(e){
                e.stopPropagation();
                orientBtns.querySelectorAll('.sm-orient-btn').forEach(function(b){b.classList.remove('active');});
                btn.classList.add('active');
                if(window.GameLayout) GameLayout.setOrientation(o.val);
            });
            orientBtns.appendChild(btn);
        });
        orientRow.appendChild(orientLbl);
        orientRow.appendChild(orientBtns);
        orientRow.addEventListener('click', function(){_subIdx=orientIdx;_render();});
        list.appendChild(orientRow);

        // Wire size slider
        setTimeout(function(){
            var sl = document.getElementById('sm-size-slider');
            var sv = document.getElementById('sm-size-val');
            if(sl) sl.addEventListener('input', function(){
                var v = sl.value;
                document.documentElement.style.setProperty('--control-scale', v);
                if(sv) sv.textContent = parseFloat(v).toFixed(1)+'×';
                localStorage.setItem('ac_control_scale', v);
            });
        }, 0);
    }

    function _drawOptionsCanvasBg(ctx) {
        var _tc = _getThemeColors();
        ctx.fillStyle = _tc.bg;
        ctx.fillRect(0, 0, GBA_W, GBA_H);
        var S = 2;
        // Title bar
        ctx.fillStyle = _tc.titleBg;
        ctx.fillRect(0, 0, GBA_W, 20*S);
        ctx.fillStyle = _tc.hi;
        ctx.fillRect(0, 20*S, GBA_W, 2);
        ctx.textBaseline = 'top';
        ctx.font = 'bold '+(11*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = _tc.hi;
        ctx.fillText('OPTIONS', 8*S, 5*S);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // --- Navigation ---
    function _goBack() {
        // In battle bag mode, B/back closes entirely and returns to battle
        if (_battleBagCancel) { close(); return; }
        if (_battlePartyCancel) { close(); return; }
        page='main'; _subIdx=0; _render();
    }

    function _confirmSelected() {
        if (page!=='main') {
            if (page==='save') { const a=['save','load']; _doSaveAction(a[_subIdx]||'save'); }
            return;
        }
        const item=ITEMS[selectedIdx]; if(!item) return;
        switch(item.id) {
            case 'EXIT':    close(); break;
            case 'SAVE':    _saveDone=false; page='save';         _subIdx=0; _render(); break;
            case 'OPTIONS': page='options';      _subIdx=0; _render(); break;
            case 'CAMP':       page='camp';       _subIdx=0; _render(); break;
            case 'BONDS':      page='bonds';      _subIdx=0; _render(); break;
            case 'SUPPLIES':   page='supplies';   _subIdx=0; _render(); break;
            case 'AFFINITIES': page='affinities'; _subIdx=0; _render(); break;
            case 'REACHES':    page='reaches';    _subIdx=0; _render(); break;
            case 'SYSTEM':     page='system';     _subIdx=0; _render(); break;
            default: close(); break;
        }
    }

    // --- Public API ---
    function open() {
        if (!menuEl) return;
        _rebuildItems();   // BONDS appears once you've bonded a creature
        selectedIdx=0; page='main'; _subIdx=0; _saveDone=false; isOpen=true;
        menuEl.classList.add('open'); _render();
    }
    function close() {
        if (!menuEl) return;
        isOpen=false; menuEl.classList.remove('open');
        menuEl.style.visibility = 'visible';
        // Restore z-index after battle bag use
        menuEl.style.zIndex = '';
        if (subEl) { subEl.style.display='none'; subEl.style.zIndex = ''; }
        // If closed without using a battle item, fire cancel callback
        if (_battleBagCancel) { var cb = _battleBagCancel; _battleItemCallback = null; _battleBagCancel = null; cb(); }
        if (_battlePartyCancel) { var pcb = _battlePartyCancel; _battlePartyCallback = null; _battlePartyCancel = null; pcb(); }
    }

    // Donor-combat hooks — the AC combat (Tempo + Intervention) will rebuild
    // SUPPLIES/BONDS in-battle flows. No-op for now.
    function openBagForBattle(onUse, onCancel) { if (onCancel) onCancel(); }
    function openPartyForBattle(onSwitch, onCancel) { if (onCancel) onCancel(); }
    function toggle() { if(isOpen) close(); else open(); }

    function _redrawPageEl(fast) {
        var el = subEl && subEl._pageEl;
        if (!el) return false;
        if (fast && typeof el._redrawFast === 'function') { el._redrawFast(); return true; }
        if (typeof el._redraw === 'function') { el._redraw(); return true; }
        return false;
    }
    var _carouselDir      = 0;  // -1 left, +1 right, 0 no scroll
    var _carouselScroll   = 0;  // persisted scroll position across renders

    function moveLeft() {
        if (!isOpen) return;
        if (page==='main') { return; } // no horizontal nav on vertical list
    }
    function moveRight() {
        if (!isOpen) return;
        if (page==='main') { return; } // no horizontal nav on vertical list
    }
    function moveUp() {
        if (!isOpen) return;
        if (page==='main') { if(selectedIdx>0){selectedIdx--;_render();} return; }
        const c=_subCount(); if(c>0){_subIdx=(_subIdx-1+c)%c; _render();}
    }
    function moveDown() {
        if (!isOpen) return;
        if (page==='main') { if(selectedIdx<ITEMS.length-1){selectedIdx++;_render();} return; }
        const c=_subCount(); if(c>0){_subIdx=(_subIdx+1)%c; _render();}
    }
    function _subCount() {
        if (page==='save')    return 2;          // Save / Load
        if (page==='options') return 21;         // 18 EE options + 3 engine extras
        return 0;                                // survival pages scroll via DOM
    }
    function confirm() { if(isOpen) _confirmSelected(); }
    function back()    {
        if (!isOpen) return;
        if (page==='main') close(); else _goBack();
    }

    function _onKey(e) {
        if (!isOpen) return;
        if (e.key==='ArrowLeft' ||e.key==='q'){e.preventDefault();moveLeft(); return;}
        if (e.key==='ArrowRight'||e.key==='e'){e.preventDefault();moveRight();return;}
        if (e.key==='ArrowUp'   ||e.key==='w'){e.preventDefault();moveUp();   return;}
        if (e.key==='ArrowDown' ||e.key==='s'){e.preventDefault();moveDown(); return;}
        if (e.key==='Enter'||e.key==='z'||e.key==='Z'){e.preventDefault();confirm();return;}
        if (e.key==='Escape'||e.key==='x'||e.key==='X'||e.key==='b'||e.key==='B'){e.preventDefault();back();return;}
    }

    function init() {
        _applyThemeCSS(); // apply saved theme to CSS variables on startup
        // Attach inside #screen-primary so the menu is clipped to the game
        // screen and never covers the control buttons below it.
        const screen = document.getElementById('screen-primary');
        if (!screen) { console.warn('[StartMenu] #screen-primary not found'); return; }

        menuEl = document.createElement('div');
        menuEl.id = 'start-menu';
        screen.appendChild(menuEl);

        subEl = document.createElement('div');
        subEl.id = 'start-menu-sub';
        subEl.className = 'sm-sub-overlay';
        subEl.style.display = 'none';
        screen.appendChild(subEl);

        window.addEventListener('keydown', _onKey);
    }

    document.addEventListener('DOMContentLoaded',init);

    return { toggle, open, close, openBagForBattle, openPartyForBattle, moveUp, moveDown, moveLeft, moveRight, confirm, back,
             get isOpen() { return isOpen; } };
})();
