// GameStartMenu — Emerald Enhanced style: icon strip at top, info bar at bottom
window.GameStartMenu = (function () {
    'use strict';

    // Survival start menu (Awakened Calamity): Camp / [Bonds] / Supplies /
    // Affinities / System, plus Save / Options / Exit. (Was the Pokémon EE menu.)
    // BONDS only appears once you've bonded at least one creature.
    const _ITEM = {
        CAMP:       { id: 'CAMP',       label: 'STATUS'     },
        JOURNAL:    { id: 'JOURNAL',    label: 'JOURNAL'    },
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
        ITEMS = [_ITEM.CAMP, _ITEM.JOURNAL];
        if (_hasBonds()) ITEMS.push(_ITEM.BONDS);   // hidden until first bond
        // SYSTEM is intentionally NOT in the pause menu — the System is only
        // reachable in town, via the floating crystal hub (opens GameSystemShop).
        ITEMS.push(_ITEM.SUPPLIES, _ITEM.AFFINITIES, _ITEM.REACHES,
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
            // Light System OS variant (pale glass) — still cyan-accented.
            return { bg:'#dfeefb', text:'#0a2030', dim:'#4a6678', border:'#0090c0', hi:'#0090c0', titleBg:'#bfe0f0' };
        }
        // DARK (default) = The System OS — cold holographic glass + cyan.
        return { bg:'#06101f', text:'#bfeeff', dim:'#5f86a0', border:'#00ccff', hi:'#00ccff', titleBg:'#0a1224' };
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
            // SysPanel corner brackets (cyan L-shapes)
            pc.fillStyle = '#00ccff';
            var bl = 6;
            function _cbr(cx, cy, dx, dy) {
                pc.fillRect(dx > 0 ? cx : cx - bl, dy > 0 ? cy : cy - 2, bl, 2);
                pc.fillRect(dx > 0 ? cx : cx - 2, dy > 0 ? cy : cy - bl, 2, bl);
            }
            _cbr(0, 0, 1, 1); _cbr(PW, 0, -1, 1); _cbr(0, PH, 1, -1); _cbr(PW, PH, -1, -1);
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

        const titles = { camp:'[ STATUS ]', journal:'[ JOURNAL ]', bonds:'[ BONDS ]', supplies:'[ SUPPLIES ]',
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
        _addBrackets(win);

        const content = document.createElement('div');
        content.className = 'sm-sub-content';

        _subRows = [];   // selectable rows for this page (rebuilt every render)
        if      (page === 'camp')        _buildCamp(content);
        else if (page === 'journal')     _buildJournal(content);
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
            const sel = content.querySelector('.sm-row.selected, .sm-ach-row.selected, .sm-selrow.selected');
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

    // SysPanel cyan corner brackets — 4 L-shapes inset into a positioned element.
    function _addBrackets(el) {
        var corners = [
            { top: '2px', left: '2px', bt: 1, bl: 1 },
            { top: '2px', right: '2px', bt: 1, br: 1 },
            { bottom: '2px', left: '2px', bb: 1, bl: 1 },
            { bottom: '2px', right: '2px', bb: 1, br: 1 },
        ];
        corners.forEach(function (c) {
            var s = document.createElement('span');
            var css = 'position:absolute;width:7px;height:7px;pointer-events:none;z-index:11;';
            if (c.top) css += 'top:' + c.top + ';'; if (c.bottom) css += 'bottom:' + c.bottom + ';';
            if (c.left) css += 'left:' + c.left + ';'; if (c.right) css += 'right:' + c.right + ';';
            if (c.bt) css += 'border-top:2px solid #00ccff;'; if (c.bb) css += 'border-bottom:2px solid #00ccff;';
            if (c.bl) css += 'border-left:2px solid #00ccff;'; if (c.br) css += 'border-right:2px solid #00ccff;';
            s.style.cssText = css;
            el.appendChild(s);
        });
    }
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
    // --- Selectable-row framework for the survival sub-pages -------------------
    // Register a built row as selectable; highlights it when it's the cursor row
    // and wires click → select + activate. onSelect runs on A / click.
    var _subRows = [];
    var _supPocket = null;   // SUPPLIES drill: null = pocket list, else pocket key
    var _gearMode = 'equip'; // GEAR screen mode: 'equip' | 'upgrade' | 'craft' (the Forge)
    function _sel(rowEl, onSelect) {
        var idx = _subRows.length;
        _subRows.push({ onSelect: onSelect });
        rowEl.classList.add('sm-selrow');
        rowEl.style.cursor = 'pointer';
        if (idx === _subIdx) {
            rowEl.classList.add('selected');
            rowEl.style.outline = '2px solid ' + _FR.blue;
            rowEl.style.outlineOffset = '-1px';
        }
        rowEl.addEventListener('click', function () { _subIdx = idx; _render(); _runSel(); });
        return rowEl;
    }
    function _runSel() {
        var row = _subRows[_subIdx];
        if (row && row.onSelect) row.onSelect();
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
        var p = window.GameSave && GameSave.state && GameSave.state.player;
        if (p && p.designation) return p.designation;   // randomly generated at creation
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

    // Lazy-load class + progression data so STATUS can show class name, level,
    // XP-to-next, and skills. Cached; re-renders the camp page once available.
    var _clsData = null, _progData = null, _skillsData = null, _clsLoading = false;
    var _pendingEvolve = null;   // two-click confirm for evolving
    function _ensureClassData() {
        if (_clsData && _progData && _skillsData) return;
        if (_clsLoading) return;
        _clsLoading = true;
        var b = '?b=' + (window.__BUILD__ || '0');
        Promise.all([
            fetch('data/systems/classes.json' + b, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
            fetch('data/systems/progression.json' + b, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
            fetch('data/systems/skills.json' + b, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
        ]).then(function (res) {
            _clsData = res[0] || {}; _progData = res[1] || null; _skillsData = res[2] || {}; _clsLoading = false;
            if (page === 'camp' || page === 'save') _render();   // refresh with real class data
        });
    }
    function _classDb() { return { classes: _clsData || {}, skills: _skillsData || {} }; }
    function _prettySkill(id) {
        return String(id || '').replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); });
    }

    function _buildCamp(el) {
        el.style.cssText = 'background:' + _FR.bodyLt + ';color:' + _FR.text + ';padding:10px;overflow:auto;';
        _ensureClassData();
        var p = (window.GameSave && GameSave.state && GameSave.state.player) || {};
        var prog = (window.GameSave && GameSave.state && GameSave.state.progress) || null;
        var clsId = (p.class && p.class.id) || null;
        var cls = (_clsData && clsId && _clsData[clsId]) || null;
        var clsName = cls ? cls.name : (clsId ? _prettySkill(clsId) : 'Unclassed');
        var level = prog ? prog.level : ((p.class && p.class.level) || 1);

        var hd = document.createElement('div');
        hd.style.cssText = 'font:9px "Press Start 2P";color:' + _FR.text + ';border-bottom:2px solid ' + _FR.border + ';padding-bottom:6px;margin-bottom:8px;';
        hd.textContent = _playerName().toUpperCase();
        el.appendChild(hd);
        var info = [
            ['Designation', _subjectId()],
            ['Class', clsName + '  Lv' + level],
            ['Affinity', _prettySkill(p.affinity || '—')],
            ['Credits', 'Cr ' + _credits()],
            ['Time Awake', _playtime()],
            ['Bonds', String(((window.GameSave && GameSave.state && GameSave.state.bonds) || []).length)],
        ];
        info.forEach(function (kv) {
            var r = _row(el, { css: 'justify-content:space-between;color:' + _FR.dim + ';' });
            r.innerHTML = '<span>' + kv[0] + '</span><span style="color:' + _FR.text + '">' + kv[1] + '</span>';
        });

        // XP-to-next bar (needs progression tuning data).
        if (prog && _progData && window.GameProgression) {
            var need = GameProgression.xpToNext(prog.level, prog.tier || 'basic', _progData);
            var pct = need > 0 ? Math.max(0, Math.min(100, Math.round((prog.xp / need) * 100))) : 0;
            var xr = document.createElement('div');
            xr.style.cssText = 'margin-top:6px;';
            xr.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:7px;color:' + _FR.dim + ';margin-bottom:2px;"><span>XP</span><span>' + prog.xp + ' / ' + need + '</span></div>' +
                '<div style="height:5px;background:#000;border-radius:3px;overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:' + _FR.blue + '"></div></div>';
            el.appendChild(xr);
            if (prog.attrPoints > 0) {
                var ap = _row(el, { css: 'justify-content:space-between;color:' + _FR.dim + ';margin-top:4px;' });
                ap.innerHTML = '<span>Attribute Points</span><span style="color:' + _SYS.warn + '">+' + prog.attrPoints + '</span>';
            }
        }

        // Skills the class has granted / the player has learned.
        var skills = (p.skills && p.skills.length) ? p.skills : (cls && cls.grantsSkills) || [];
        if (skills.length) {
            var sk = document.createElement('div');
            sk.style.cssText = 'margin-top:10px;font:7px "Press Start 2P";color:' + _FR.dim + ';';
            sk.textContent = 'SKILLS';
            el.appendChild(sk);
            var sl = document.createElement('div');
            sl.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;';
            skills.forEach(function (id) {
                var chip = document.createElement('span');
                chip.style.cssText = 'font-size:7px;background:' + _FR.body + ';border:1px solid ' + _FR.border + ';border-radius:4px;padding:3px 5px;color:' + _FR.text + ';';
                chip.textContent = _prettySkill(id);
                sl.appendChild(chip);
            });
            el.appendChild(sl);
        }

        // RELICS — per-run rewards carried this descent (only during an active run).
        var run = GameSave.state && GameSave.state.run;
        var relicIds = (run && run.active && run.relics) || [];
        if (relicIds.length) {
            var rdb = window._relicsDb;
            var rh = document.createElement('div');
            rh.style.cssText = 'margin-top:10px;font:7px "Press Start 2P";color:' + _SYS.cyan + ';';
            rh.textContent = 'RELICS (this descent)';
            el.appendChild(rh);
            var rl = document.createElement('div');
            rl.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-top:5px;';
            relicIds.forEach(function (id) {
                var def = rdb && window.GameRelics ? GameRelics.get(rdb, id) : null;
                var row = document.createElement('div');
                row.style.cssText = 'font-size:7px;background:' + _FR.body + ';border:1px solid ' + _SYS.cyan + ';border-radius:4px;padding:4px 6px;color:' + _FR.text + ';';
                row.innerHTML = '<b style="color:' + _SYS.cyan + '">' + (def ? def.name : id) + '</b>' + (def ? ' — ' + def.desc : '');
                rl.appendChild(row);
            });
            el.appendChild(rl);
        }

        // Attributes + allocation (spend banked points).
        if (prog) {
            var attrList = (_progData && _progData.attributes) || Object.keys(prog.attributes || {});
            var eff = (_progData && _progData.attrEffects) || {};
            if (attrList.length) {
                var ah = document.createElement('div');
                ah.style.cssText = 'margin-top:10px;display:flex;justify-content:space-between;align-items:center;font:7px "Press Start 2P";color:' + _FR.dim + ';';
                ah.innerHTML = '<span>ATTRIBUTES</span>' + (prog.attrPoints > 0 ? '<span style="color:' + _SYS.warn + '">' + prog.attrPoints + ' pts</span>' : '');
                el.appendChild(ah);
                attrList.forEach(function (attr) {
                    var r = _row(el, { css: 'justify-content:space-between;align-items:center;color:' + _FR.dim + ';' });
                    var hint = '';
                    if (eff[attr]) {
                        var parts = [];
                        for (var st in eff[attr]) { if (st === '_note') continue; parts.push('+' + eff[attr][st] + ' ' + st.toUpperCase()); }
                        if (parts.length) hint = ' <span style="color:' + _FR.dim + ';font-size:6px;">(' + parts.join(' ') + '/pt)</span>';
                    }
                    var left = document.createElement('span');
                    left.style.cssText = 'flex:1;';
                    left.innerHTML = _prettySkill(attr) + hint;
                    var val = document.createElement('span');
                    val.style.cssText = 'color:' + _FR.text + ';min-width:22px;text-align:right;';
                    val.textContent = String((prog.attributes && prog.attributes[attr]) || 0);
                    r.appendChild(left); r.appendChild(val);
                    if (prog.attrPoints > 0) {
                        var plus = document.createElement('button');
                        plus.textContent = '+';
                        plus.style.cssText = 'margin-left:8px;width:20px;height:18px;font:8px "Press Start 2P";cursor:pointer;background:' + _SYS.cyan + ';color:#02060f;border:none;border-radius:3px;';
                        plus.addEventListener('click', function () {
                            if (window.GameProgression && GameProgression.spendPoint(prog, attr, _progData)) {
                                if (window.GameSave && GameSave.markDirty) GameSave.markDirty();
                                _render();
                            }
                        });
                        r.appendChild(plus);
                    }
                });
            }
        }

        // Class growth happens elsewhere: EVOLVE is an automatic System pop-up on
        // reaching requirements (GameEvolvePopup); SPECIALIZE and CHANGE CLASS are
        // System Shop services (the SYSTEM panel). STATUS is display-only.
        if (cls && p.class && p.class.spec) {
            var sr = _row(el, { css: 'justify-content:space-between;color:' + _FR.dim + ';margin-top:6px;' });
            sr.innerHTML = '<span>Specialization</span><span style="color:' + _FR.text + '">' + _prettySkill(p.class.spec) + '</span>';
        }

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

    var _questDb = null, _questLoading = false;
    function _ensureQuests() {
        if (_questDb || _questLoading) return;
        _questLoading = true;
        fetch('data/systems/quests.json?b=' + (window.__BUILD__ || '0'), { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : {}; })
            .then(function (j) { _questDb = {}; for (var k in j) if (k !== '_meta') _questDb[k] = j[k]; _questLoading = false; if (page === 'journal') _render(); })
            .catch(function () { _questDb = {}; _questLoading = false; });
    }
    function _buildJournal(el) {
        el.style.cssText = 'background:' + _FR.bodyLt + ';color:' + _FR.text + ';padding:10px;overflow:auto;';
        _ensureQuests();
        var qs = (window.GameSave && GameSave.state && GameSave.state.quests) || {};
        var db = _questDb || {};
        var active = window.GameQuests ? GameQuests.list(qs, db, 'active') : [];
        var done = window.GameQuests ? GameQuests.list(qs, db, 'done') : [];
        if (!active.length && !done.length) {
            var em = document.createElement('div');
            em.style.cssText = 'font:8px "Press Start 2P";color:' + _FR.dim + ';line-height:1.8;text-align:center;padding-top:20px;';
            em.innerHTML = 'No active directives.<br><br>The System has nothing<br>for you… yet.';
            el.appendChild(em); return;
        }
        if (active.length) {
            var ah = document.createElement('div');
            ah.style.cssText = 'font:7px "Press Start 2P";color:' + _SYS.cyan + ';margin-bottom:6px;';
            ah.textContent = 'ACTIVE';
            el.appendChild(ah);
            active.forEach(function (q) {
                var r = _row(el, { css: 'flex-direction:column;align-items:flex-start;gap:3px;background:' + _FR.body + ';border:1px solid ' + _FR.border + ';border-radius:5px;margin-bottom:5px;' });
                var nm = document.createElement('div'); nm.style.cssText = 'color:' + _FR.text + ';'; nm.textContent = q.name.toUpperCase();
                var ob = document.createElement('div'); ob.style.cssText = 'font-size:6px;color:' + _FR.dim + ';line-height:1.5;'; ob.textContent = '▸ ' + (q.objective || '');
                r.appendChild(nm); r.appendChild(ob);
                _sel(r, function () { if (window.GameSystem && GameSystem.notify) GameSystem.notify(q.name + ' — ' + (q.summary || q.objective || ''), 'info'); });
            });
        }
        if (done.length) {
            var dh = document.createElement('div');
            dh.style.cssText = 'font:7px "Press Start 2P";color:' + _FR.dim + ';margin:8px 0 6px;';
            dh.textContent = 'COMPLETED';
            el.appendChild(dh);
            done.forEach(function (q) {
                var r = _row(el, { css: 'background:' + _FR.body + ';border:1px solid ' + _FR.border + ';border-radius:5px;margin-bottom:4px;opacity:.6;' });
                var nm = document.createElement('span'); nm.style.cssText = 'flex:1;color:' + _FR.dim + ';text-decoration:line-through;'; nm.textContent = q.name.toUpperCase();
                r.appendChild(nm);
            });
        }
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
            _sel(r, function () {
                if (window.GameSystem && GameSystem.notify)
                    GameSystem.notify((b.name || ('Bond ' + (i + 1))) + ' — ' + (b.affinity || 'no affinity') + ', Lv' + (b.tier || 1) + '.', 'info');
            });
        });
    }

    // Pockets: [display, pocketKey, desc, RTP IconSet index, usable?]
    var _POCKETS = [
        ['Camp Kits', 'campKits', 'Drop a temporary Safe Zone to Rest, Cook, Craft, Save.', 272, false],
        ['Food', 'food', 'Cooked & raw — restores Stamina in the field.', 291, true],
        ['Tethers', 'tethers', "The System's binding protocol. Spend to Bind a weakened creature.", 182, false],
        ['Tonics', 'tonics', 'Heat · Cold · Toxic · Gloom · Tempest — purge Exposure.', 192, true],
        ['Items', 'items', 'General consumables.', 176, true],
        ['Materials', 'materials', 'Scavenge for field crafting & hazard gear.', 300, false],
        ['Gear', 'gear', 'EQUIPMENT — equip weapons, armor & relics (one relic max).', 161, false],
        ['Key', 'keyItems', 'Story & landmark items.', 242, false],
    ];
    function _pocketCount(inv, key) {
        var p = inv[key]; if (!p) return 0;
        if (Array.isArray(p)) return p.length;          // gear = list of instances
        var n = 0; for (var k in p) n += (p[k] | 0); return n;
    }
    function _ensureItems() {
        if (window.GameItems && !GameItems.ready()) {
            GameItems.load().then(function () { if (page === 'supplies') _render(); });
        }
    }
    function _buildSupplies(el) {
        el.style.cssText = 'background:' + _FR.bodyLt + ';color:' + _FR.text + ';padding:10px;overflow:auto;';
        _ensureItems();
        var inv = (window.GameSave && GameSave.state && GameSave.state.inventory) || {};
        if (_supPocket) { _buildPocket(el, inv, _supPocket); return; }
        // Pocket list — select one to open it.
        _POCKETS.forEach(function (p) {
            var r = _row(el, { css: 'flex-direction:column;align-items:flex-start;gap:3px;background:' + _FR.body + ';border:1px solid ' + _FR.border + ';border-radius:5px;margin-bottom:5px;' });
            var top = document.createElement('div');
            top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;';
            var left = document.createElement('span');
            left.style.cssText = 'display:flex;align-items:center;gap:6px;';
            var ic = document.createElement('canvas'); ic.width = ic.height = 24;
            ic.style.cssText = 'width:18px;height:18px;flex:none;';
            (function (cv, idx) { if (window.GameIcons) GameIcons.load().then(function () { GameIcons.draw(cv.getContext('2d'), idx, 0, 0, 24); }); })(ic, p[3]);
            var nm = document.createElement('span'); nm.textContent = p[0].toUpperCase();
            left.appendChild(ic); left.appendChild(nm);
            var cnt = document.createElement('span'); cnt.style.color = _FR.blue; cnt.textContent = '×' + _pocketCount(inv, p[1]);
            top.appendChild(left); top.appendChild(cnt);
            var desc = document.createElement('div');
            desc.style.cssText = 'font-size:6px;color:' + _FR.dim + ';line-height:1.5;';
            desc.textContent = p[2];
            r.appendChild(top); r.appendChild(desc);
            _sel(r, (function (key) { return function () { _supPocket = key; _subIdx = 0; _render(); }; })(p[1]));
        });
    }
    // Resolve a gear/relic def (name/desc/icon/slot/rarity) by id from the equipment
    // pools (gear.json / relics.json), falling back to the item DB.
    function _gearDef(id) {
        var g = window._gearDb && (window._gearDb.gear || []).filter(function (x) { return x.id === id; })[0]; if (g) return g;
        var r = window._relicsDb && (window._relicsDb.relics || []).filter(function (x) { return x.id === id; })[0]; if (r) return r;
        return (window.GameItems && GameItems.get(id)) || null;
    }
    // Stat line for an EQUIPMENT INSTANCE ({id,ilvl}) — flat stats shown ilvl-scaled.
    function _gearStatLine(item) {
        var dbs = { gear: window._gearDb, relics: window._relicsDb };
        var s = (window.GameEquip && GameEquip.effectiveStats(item, dbs)) || {}, parts = [];
        var lab = { atk: 'ATK', def: 'DEF', hp: 'HP', speed: 'SPD' };
        for (var k in lab) if (s[k]) parts.push('+' + s[k] + ' ' + lab[k]);
        var pct = { atkMult: 'ATK', hpMult: 'HP', defMult: 'DEF', spdMult: 'SPD' };
        for (var m in pct) if (s[m]) parts.push((s[m] > 0 ? '+' : '') + Math.round(s[m] * 100) + '% ' + pct[m]);
        var ot = { crit: 'crit', evade: 'evade', lifesteal: 'lifesteal', thorns: 'thorns', defBonus: 'ward' };
        for (var o in ot) if (s[o]) parts.push((typeof s[o] === 'number' && s[o] < 1 && s[o] > -1 ? (s[o] > 0 ? '+' : '') + Math.round(s[o] * 100) + '% ' : '+' + s[o] + ' ') + ot[o]);
        return parts.join('  ');
    }
    var _EQ_SLOTS = [['weapon', 'WEAPON'], ['body', 'BODY'], ['accessory', 'ACCESSORY'], ['hazard', 'HAZARD']];
    function _matName(id) {
        var m = window._lootDb && (window._lootDb.materials || []).filter(function (x) { return x.id === id; })[0];
        return m ? m.name : String(id).replace(/_/g, ' ');
    }
    function _gearRow(el, item, slotLabel, extra, onSel) {
        var id = window.GameEquip.idOf(item), def = id ? _gearDef(id) : null, relic = def && def.rarity === 'relic';
        var r = _row(el, { css: 'flex-direction:column;align-items:flex-start;gap:2px;background:' + _FR.body + ';border:1px solid ' + (relic ? '#d8b24a' : _FR.border) + ';border-radius:5px;margin-bottom:4px;' });
        var top = document.createElement('div'); top.style.cssText = 'display:flex;align-items:center;gap:6px;width:100%;';
        if (slotLabel) { var sn = document.createElement('span'); sn.style.cssText = 'color:' + _FR.dim + ';width:60px;flex:none;font-size:7px;'; sn.textContent = slotLabel; top.appendChild(sn); }
        var nm = document.createElement('span'); nm.style.cssText = 'flex:1;color:' + (relic ? '#e8c860' : _FR.text) + ';';
        nm.textContent = def ? (relic ? '✦ ' : '') + def.name : '— empty —';
        top.appendChild(nm);
        if (item) { var il = document.createElement('span'); il.style.cssText = 'color:' + _FR.blue + ';font-size:7px;'; il.textContent = 'i' + window.GameEquip.ilvlOf(item); top.appendChild(il); }
        r.appendChild(top);
        if (def) { var d = document.createElement('div'); d.style.cssText = 'font-size:6px;color:' + (slotLabel ? _FR.blue : _FR.dim) + ';'; d.textContent = (slotLabel ? '' : (def.slot ? '[' + def.slot + ']  ' : '')) + _gearStatLine(item); r.appendChild(d); }
        if (extra) { var ex = document.createElement('div'); ex.style.cssText = 'font-size:6px;color:#caa94a;'; ex.textContent = extra; r.appendChild(ex); }
        if (onSel) _sel(r, onSel);
        return r;
    }
    // GEAR pocket = EQUIPMENT + the FORGE. Tabs: EQUIP (wear/remove), UPGRADE (spend
    // materials to raise a piece's ilvl), CRAFT (forge gear from materials).
    function _buildGear(el, inv) {
        var ps = (window.GameSave && GameSave.state && GameSave.state.player) || {};
        var hd = document.createElement('div');
        hd.style.cssText = 'font:8px "Press Start 2P";color:' + _FR.text + ';border-bottom:2px solid ' + _FR.border + ';padding-bottom:5px;margin-bottom:7px;';
        hd.textContent = _gearMode === 'upgrade' ? '⚒ FORGE — UPGRADE' : _gearMode === 'craft' ? '⚒ FORGE — CRAFT' : 'EQUIPMENT';
        el.appendChild(hd);
        if (!window.GameEquip || !window._gearDb) {
            var w = document.createElement('div'); w.style.cssText = 'font:7px "Press Start 2P";color:' + _FR.dim + ';';
            w.textContent = 'Loading gear…'; el.appendChild(w); return;
        }
        // mode tabs (shown in equip mode)
        if (_gearMode === 'equip') {
            var tabs = document.createElement('div'); tabs.style.cssText = 'display:flex;gap:6px;margin-bottom:7px;';
            el.appendChild(tabs);
            var mkTab = function (label, mode) {
                var r = _row(tabs, { css: 'flex:1;justify-content:center;background:' + _FR.body + ';border:1px solid ' + _FR.border + ';border-radius:5px;font-size:7px;padding:5px;' });
                r.textContent = label; _sel(r, function () { _gearMode = mode; _subIdx = 0; _render(); });
            };
            mkTab('⚒ UPGRADE', 'upgrade'); mkTab('⚒ CRAFT', 'craft');
        }
        var eq = ps.equipment || {};
        var bag = Array.isArray(inv.gear) ? inv.gear : [];

        if (_gearMode === 'upgrade') { _buildForgeUpgrade(el, ps, inv, eq, bag); return; }
        if (_gearMode === 'craft') { _buildForgeCraft(el, ps, inv); return; }

        // EQUIP mode
        _EQ_SLOTS.forEach(function (sl) { var it = eq[sl[0]]; _gearRow(el, it, sl[1], null, it ? function () { _unequipSlot(sl[0]); } : null); });
        var sub = document.createElement('div');
        sub.style.cssText = 'font:7px "Press Start 2P";color:' + _FR.dim + ';margin:8px 0 5px;border-top:1px solid ' + _FR.border + ';padding-top:6px;';
        sub.textContent = bag.length ? 'BAG — select to equip' : 'BAG — empty';
        el.appendChild(sub);
        bag.forEach(function (item, idx) { _gearRow(el, item, null, null, function () { _equipItem(idx); }); });
    }
    function _matBar(el, inv) {
        var line = document.createElement('div'); line.style.cssText = 'font-size:6px;color:' + _FR.dim + ';margin-bottom:6px;';
        var mats = (inv.materials) || {}, parts = [];
        for (var k in mats) if ((mats[k] | 0) > 0) parts.push(_matName(k) + ' ×' + mats[k]);
        line.textContent = 'Materials: ' + (parts.length ? parts.join('  ·  ') : 'none') + '   ·   ' + ((window.GameSave.state.player.money | 0)) + ' Cr';
        el.appendChild(line);
    }
    // UPGRADE: spend the slot material + Cr to raise a piece's ilvl by 1.
    function _buildForgeUpgrade(el, ps, inv, eq, bag) {
        _matBar(el, inv);
        var items = [];   // {item, where:'eq'|'bag', slot, idx}
        _EQ_SLOTS.forEach(function (sl) { if (eq[sl[0]]) items.push({ item: eq[sl[0]], where: 'eq', slot: sl[0] }); });
        bag.forEach(function (it, i) { items.push({ item: it, where: 'bag', idx: i }); });
        if (!items.length) { var em = document.createElement('div'); em.style.cssText = 'font:7px "Press Start 2P";color:' + _FR.dim + ';text-align:center;padding-top:10px;'; em.textContent = 'No gear to upgrade.'; el.appendChild(em); return; }
        items.forEach(function (ent) {
            var def = _gearDef(window.GameEquip.idOf(ent.item)); var slot = def ? def.slot : 'accessory';
            var cost = window.GameCrafting.upgradeCost(slot, window.GameEquip.ilvlOf(ent.item), window._craftDb);
            var afford = window.GameCrafting.canPay(inv, ps.money | 0, cost);
            _gearRow(el, ent.item, ent.where === 'eq' ? 'WORN' : null,
                (afford ? '→ i' + (window.GameEquip.ilvlOf(ent.item) + 1) + ':  ' : '✗ need:  ') + window.GameCrafting.costLine(cost, _matName),
                afford ? function () { _upgradeGear(ent); } : null);
        });
    }
    function _upgradeGear(ent) {
        var st = window.GameSave && GameSave.state; var ps = st.player, inv = st.inventory;
        var def = _gearDef(window.GameEquip.idOf(ent.item)); var slot = def ? def.slot : 'accessory';
        var cost = window.GameCrafting.upgradeCost(slot, window.GameEquip.ilvlOf(ent.item), window._craftDb);
        if (!window.GameCrafting.pay(inv, ps, cost)) return;
        ent.item.ilvl = window.GameEquip.ilvlOf(ent.item) + 1;     // mutate the instance in place
        if (window.GameSave.markDirty) GameSave.markDirty();
        if (window.GameAudio) GameAudio.playSE('Equip1');
        _render();
    }
    // CRAFT: forge gear from materials. Crafting is a SKILL — each recipe shows its
    // discipline + your level, the SUCCESS chance and the CRIT (higher-tier) chance.
    function _buildForgeCraft(el, ps, inv) {
        _matBar(el, inv);
        var cfg = window._craftDb || {};
        // proficiency summary
        var pf = document.createElement('div'); pf.style.cssText = 'font-size:6px;color:' + _FR.blue + ';margin-bottom:6px;';
        var discs = (cfg.proficiency && cfg.proficiency.disciplines) || [];
        pf.textContent = discs.map(function (d) { return d.slice(0, 5) + ' L' + window.GameCrafting.profOf(ps, d); }).join('  ·  ');
        el.appendChild(pf);
        // forge result banner (set after a craft)
        if (_forgeMsg) { var fm = document.createElement('div'); fm.style.cssText = 'font:7px "Press Start 2P";color:' + (_forgeCrit ? '#e8c860' : _FR.text) + ';text-align:center;margin-bottom:6px;'; fm.textContent = _forgeMsg; el.appendChild(fm); }
        var recipes = cfg.recipes || [];
        recipes.forEach(function (rec) {
            var def = _gearDef(rec.id); if (!def) return;
            var cost = window.GameCrafting.recipeCost(rec);
            var afford = window.GameCrafting.canPay(inv, ps.money | 0, cost);
            var lvl = window.GameCrafting.profOf(ps, rec.discipline || 'smithing');
            var sC = Math.round(window.GameCrafting.successChance(lvl, rec.tier || 1, cfg) * 100);
            var cC = Math.round(window.GameCrafting.critChance(lvl, rec.tier || 1, cfg) * 100);
            var info = (afford ? '' : '✗ ') + window.GameCrafting.costLine(cost, _matName)
                + '   |  ' + sC + '% craft · ' + cC + '%★' + (rec.critUpgrade ? ' →' + (_gearDef(rec.critUpgrade) || {}).name : '');
            _gearRow(el, { id: rec.id, ilvl: 1 }, null, info, afford ? function () { _craftGear(rec); } : null);
        });
    }
    var _forgeMsg = null, _forgeCrit = false;
    function _craftGear(rec) {
        var st = window.GameSave && GameSave.state; var ps = st.player, inv = st.inventory;
        var cfg = window._craftDb || {};
        var cost = window.GameCrafting.recipeCost(rec);
        if (!window.GameCrafting.pay(inv, ps, cost)) return;        // materials + Cr spent
        var out = window.GameCrafting.attemptCraft(ps, rec, cfg, Math.random);
        var prof = window.GameCrafting.gainProficiency(ps, out.discipline, out.success, cfg);
        _forgeCrit = !!out.crit;
        if (out.success) {
            if (!Array.isArray(inv.gear)) inv.gear = [];
            inv.gear.push({ id: out.resultId, ilvl: out.resultIlvl });
            var nm = (_gearDef(out.resultId) || {}).name || out.resultId;
            _forgeMsg = (out.crit ? '★ MASTERWORK! ' : 'Forged ') + nm + (out.resultIlvl > 1 ? ' (i' + out.resultIlvl + ')' : '')
                + (prof.leveled ? '   ⤴ ' + out.discipline + ' L' + prof.level : '');
            if (window.GameAudio) GameAudio.playSE(out.crit ? 'Saint3' : 'Equip1');
        } else {
            window.GameCrafting.refundMaterials(inv, cost, (cfg.proficiency && cfg.proficiency.refundOnFail) || 0.5);
            _forgeMsg = 'The craft failed — some materials salvaged.' + (prof.leveled ? '  ⤴ ' + out.discipline + ' L' + prof.level : '');
            if (window.GameAudio) GameAudio.playSE('Buzzer1');
        }
        if (window.GameSave.markDirty) GameSave.markDirty();
        _render();
    }
    function _equipItem(idx) {
        var st = window.GameSave && GameSave.state; if (!st || !window.GameEquip) return;
        var ps = st.player || (st.player = {}); var inv = st.inventory || (st.inventory = {});
        if (!Array.isArray(inv.gear)) inv.gear = [];
        var item = inv.gear[idx]; if (!item) return;
        var res = GameEquip.equip(ps, item, { gear: window._gearDb, relics: window._relicsDb });
        if (!res.slot) return;
        inv.gear.splice(idx, 1);                                  // remove equipped instance from bag
        (res.freed || []).forEach(function (fi) { if (fi) inv.gear.push(fi); }); // freed back to bag
        if (window.GameSave.markDirty) GameSave.markDirty();
        if (window.GameAudio) GameAudio.playSE('Equip1');
        _subIdx = 0; _render();
    }
    function _unequipSlot(slot) {
        var st = window.GameSave && GameSave.state; if (!st || !window.GameEquip) return;
        var ps = st.player || (st.player = {}); var inv = st.inventory || (st.inventory = {});
        if (!Array.isArray(inv.gear)) inv.gear = [];
        var item = GameEquip.unequip(ps, slot);
        if (item) inv.gear.push(item);
        if (window.GameSave.markDirty) GameSave.markDirty();
        _subIdx = 0; _render();
    }
    function _buildPocket(el, inv, key) {
        if (key === 'gear') { _buildGear(el, inv); return; }
        var meta = _POCKETS.filter(function (p) { return p[1] === key; })[0] || ['Pocket', key, '', 176, false];
        var hd = document.createElement('div');
        hd.style.cssText = 'font:8px "Press Start 2P";color:' + _FR.text + ';border-bottom:2px solid ' + _FR.border + ';padding-bottom:5px;margin-bottom:7px;';
        hd.textContent = meta[0].toUpperCase();
        el.appendChild(hd);
        var pocket = inv[key] || {};
        var ids = Object.keys(pocket).filter(function (k) { return (pocket[k] | 0) > 0; });
        if (!ids.length) {
            var em = document.createElement('div');
            em.style.cssText = 'font:8px "Press Start 2P";color:' + _FR.dim + ';text-align:center;padding-top:16px;';
            em.textContent = 'Empty.';
            el.appendChild(em); return;
        }
        ids.forEach(function (id) {
            var def = (window.GameItems && GameItems.get(id)) || null;
            var r = _row(el, { css: 'flex-direction:column;align-items:flex-start;gap:2px;background:' + _FR.body + ';border:1px solid ' + _FR.border + ';border-radius:5px;margin-bottom:4px;' });
            var top = document.createElement('div'); top.style.cssText = 'display:flex;align-items:center;gap:6px;width:100%;';
            var ic = document.createElement('canvas'); ic.width = ic.height = 24; ic.style.cssText = 'width:16px;height:16px;flex:none;';
            (function (cv, idx) { if (idx != null && window.GameIcons) GameIcons.load().then(function () { GameIcons.draw(cv.getContext('2d'), idx, 0, 0, 24); }); })(ic, def ? def.icon : null);
            var nm = document.createElement('span'); nm.style.cssText = 'flex:1;';
            nm.textContent = (def ? def.name : _prettySkill(id)).toUpperCase();
            var cnt = document.createElement('span'); cnt.style.color = _FR.blue; cnt.textContent = '×' + (pocket[id] | 0);
            top.appendChild(ic); top.appendChild(nm); top.appendChild(cnt);
            r.appendChild(top);
            if (def && def.desc) {
                var d = document.createElement('div'); d.style.cssText = 'font-size:6px;color:' + _FR.dim + ';line-height:1.5;';
                d.textContent = def.desc; r.appendChild(d);
            }
            _sel(r, function () { _useItem(key, id); });
        });
    }
    // Use one item from a pocket, applying its database `use` effect.
    function _useItem(key, id) {
        var st = window.GameSave && GameSave.state; if (!st) return;
        var def = window.GameItems && GameItems.get(id);
        var surv = st.survival || (st.survival = { surveillance: 0, stamina: 100, exposure: 0 });
        var usable = !!(window.GameItems && GameItems.fieldUsable(id));
        var msg, nm = def ? def.name : _prettySkill(id);
        if (usable) {
            var u = def.use;
            if (u.type === 'stamina') { surv.stamina = Math.min(100, (surv.stamina || 0) + (u.amount || 0)); msg = nm + ' — Stamina restored.'; }
            else if (u.type === 'exposure') { surv.exposure = Math.max(0, (surv.exposure || 0) - (u.amount || 0)); msg = nm + ' — Exposure purged.'; }
            else if (u.type === 'cure') { msg = nm + ' — ailment cured.'; }
            else { msg = 'Used ' + nm + '.'; }
            var pk = st.inventory[key]; pk[id] = (pk[id] | 0) - 1; if (pk[id] <= 0) delete pk[id];
            if (GameSave.markDirty) GameSave.markDirty();
            if (window.GameHUD && GameHUD.setMeters) GameHUD.setMeters(surv);
            if (window.GameAudio) GameAudio.playSE('Heal1');
            if (_subIdx > 0) _subIdx--;   // keep cursor in range after removal
        } else {
            // Non-field items explain where they're actually used.
            if (def && def.battle) msg = nm + ' is spent in battle.';
            else if (def && def.field) msg = nm + ' is deployed out in the field, not here.';
            else if (def && def.gear) msg = nm + ' equips once the gear system lands.';
            else msg = "Can't use " + nm + ' from here.';
            if (window.GameAudio) GameAudio.playSE('Buzzer1');
        }
        if (window.GameSystem && GameSystem.notify) GameSystem.notify(msg, usable ? 'info' : 'warning');
        _render();
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
            _sel(r, function () {
                if (window.GameSystem && GameSystem.notify) GameSystem.notify(a[0].toUpperCase() + ' — ' + a[2] + ' / ' + a[3], 'info');
            });
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
            _sel(r, function () {
                if (window.GameSystem && GameSystem.notify) GameSystem.notify(r0[0].toUpperCase() + ' is not yet unlocked. Reach it on foot first.', 'warning');
            });
        });
    }

    var _sysSub = null;   // System Shop sub-screen: null | 'specialize' | 'change'
    function _buildSystem(el) {
        _ensureClassData();
        // System Shop sub-screens (specialize / change class) get their own page.
        if (_sysSub === 'specialize') { _sysSpecialize(el); return; }
        if (_sysSub === 'change')     { _sysChangeClass(el); return; }
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
        service('Specialize Class', 'Focus your current Classification.', 5, function () {
            _sysSub = 'specialize'; _render();
        });
        service('Reclassify', 'Acquire or switch Classification.', 0, function () {
            _sysSub = 'change'; _render();
        });
    }

    // Shared chrome for a System Shop sub-screen: cold header + BACK button.
    function _sysShell(el, title) {
        el.style.cssText = 'background:' + _SYS.panel + ';color:' + _SYS.ink + ';padding:11px;overflow:auto;font-family:"Press Start 2P",monospace;';
        var back = document.createElement('button');
        back.textContent = '‹ BACK';
        back.style.cssText = 'font:7px "Press Start 2P";background:none;border:none;color:' + _SYS.dim + ';cursor:pointer;margin-bottom:8px;';
        back.addEventListener('click', function () { _sysSub = null; _render(); });
        el.appendChild(back);
        var h = document.createElement('div');
        h.style.cssText = 'font:7px "Press Start 2P";letter-spacing:2px;color:' + _SYS.cyan + ';margin-bottom:10px;';
        h.textContent = title;
        el.appendChild(h);
    }
    function _sysRaise(by, msg) {
        if (window.GameSave && GameSave.state) {
            var st = GameSave.state.survival || { surveillance: 0, stamina: 100, exposure: 0 };
            st.surveillance = Math.min(100, (st.surveillance || 0) + by);
            GameSave.state.survival = st; GameSave.markDirty();
            if (window.GameHUD && GameHUD.setMeters) GameHUD.setMeters(st);
        }
        if (msg && window.GameSystem && GameSystem.notify) GameSystem.notify(msg, 'danger');
    }

    function _sysSpecialize(el) {
        _sysShell(el, '[ SPECIALIZE ]');
        var p = (window.GameSave && GameSave.state && GameSave.state.player) || {};
        var clsId = p.class && p.class.id;
        var db = _classDb();
        if (!window.GameClasses || !clsId) { el.appendChild(_sysMsg('No Classification on record.')); return; }
        if (p.class.spec) { el.appendChild(_sysMsg('Focus locked: ' + _prettySkill(p.class.spec) + '. Reclassify to change paths.')); return; }
        var ctx = GameClasses.ctxFromState(GameSave.state);
        var specs = GameClasses.specOptions(clsId, ctx, db);
        if (!specs.length) { el.appendChild(_sysMsg('This Classification offers no specializations.')); return; }
        el.appendChild(_sysMsg('Choose one focus — permanent. (+5 Surveillance)'));
        specs.forEach(function (sp) {
            var b = _sysBtn(el, sp.name + (sp.grantsSkill ? '  +' + _prettySkill(sp.grantsSkill) : ''),
                sp.eligible ? 'Available' : ('Requires Lv' + sp.unlockAtLevel), sp.eligible);
            if (sp.eligible) b.addEventListener('click', function () {
                if (GameClasses.chooseSpec(GameSave.state, clsId, sp.id, db)) {
                    if (window.GameAudio) GameAudio.playME('Fanfare2');
                    _sysRaise(5, 'Specialization registered: ' + sp.name + '.');
                    _sysSub = null; _render();
                }
            });
        });
    }

    function _sysChangeClass(el) {
        _sysShell(el, '[ RECLASSIFY ]');
        var p = (window.GameSave && GameSave.state && GameSave.state.player) || {};
        var db = _classDb();
        if (!window.GameClasses || !p.class) { el.appendChild(_sysMsg('No Classification on record.')); return; }
        var owned = p.ownedClasses || (p.ownedClasses = [p.class.id]);
        var NEW_COST = 500, SURV = 15;

        // Switch among owned classes (free, lateral).
        el.appendChild(_sysMsg('Switch Classification (owned — free):'));
        owned.forEach(function (id) {
            var cl = (_clsData && _clsData[id]);
            var isCur = id === p.class.id;
            var b = _sysBtn(el, (cl ? cl.name : _prettySkill(id)) + (isCur ? '  ◄ current' : ''),
                isCur ? '' : 'Switch (free)', !isCur);
            if (!isCur) b.addEventListener('click', function () {
                if (GameClasses.changeClass(GameSave.state, id, db)) {
                    if (window.GameAudio) GameAudio.playSE('Decision1');
                    GameSave.markDirty(); _render();
                }
            });
        });

        // Acquire a NEW Basic class (costs credits + Surveillance).
        el.appendChild(_sysMsg('Acquire new Classification — Cr ' + NEW_COST + ' (+' + SURV + ' Surveillance):'));
        var credits = _credits();
        var basics = GameClasses.classesOfTier('basic', db).filter(function (c) { return owned.indexOf(c.id) < 0; });
        basics.forEach(function (c) {
            var afford = credits >= NEW_COST;
            var b = _sysBtn(el, c.name, c.lifestyle + ' · ' + (afford ? 'Cr ' + NEW_COST : 'insufficient Cr'), afford);
            if (afford) b.addEventListener('click', function () {
                if (GameSave.state.player) GameSave.state.player.money = Math.max(0, (GameSave.state.player.money || 0) - NEW_COST);
                if (GameClasses.changeClass(GameSave.state, c.id, db)) {
                    if (window.GameAudio) GameAudio.playME('Fanfare1');
                    _sysRaise(SURV, 'Reclassified: ' + c.name + '. The System has re-catalogued you.');
                    _sysSub = null; _render();
                }
            });
        });
    }

    function _sysMsg(t) {
        var d = document.createElement('div');
        d.style.cssText = 'font:7px "Press Start 2P";color:' + _SYS.dim + ';line-height:1.7;margin:6px 0;';
        d.textContent = t; return d;
    }
    function _sysBtn(el, label, sub, enabled) {
        var b = document.createElement('button');
        b.disabled = !enabled;
        b.style.cssText = 'display:block;width:100%;text-align:left;background:rgba(0,40,55,' + (enabled ? '.55' : '.2') + ');border:1px solid ' + (enabled ? _SYS.cyan : _SYS.dim) + ';border-radius:5px;padding:7px;margin-bottom:5px;color:' + (enabled ? _SYS.ink : _SYS.dim) + ';font:7px "Press Start 2P";cursor:' + (enabled ? 'pointer' : 'not-allowed') + ';';
        b.innerHTML = '<div style="color:' + (enabled ? _SYS.cyan : _SYS.dim) + '">' + label + '</div>' + (sub ? '<div style="font-size:6px;color:' + _SYS.dim + ';margin-top:3px;">' + sub + '</div>' : '');
        el.appendChild(b); return b;
    }

    function _buildSave(el) {
        _ensureClassData();   // so the slot summary can show the real class name
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

        // Info box — basic character summary (Class + Level, not Bonds).
        var _p = (window.GameSave && GameSave.state && GameSave.state.player) || {};
        var _prog = (window.GameSave && GameSave.state && GameSave.state.progress) || null;
        var _clsId = _p.class && _p.class.id;
        var _clsName = (_clsData && _clsId && _clsData[_clsId] && _clsData[_clsId].name) || (_clsId ? _prettySkill(_clsId) : 'Unclassed');
        var _lvl = _prog ? _prog.level : ((_p.class && _p.class.level) || 1);

        ctx.font = (7*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = COL_CYAN;
        ctx.fillText(_mapName(), 8*S, 28*S);

        var infoRows = [
            ['Subject:', _playerName()],
            ['Class:', _clsName],
            ['Level:', String(_lvl)],
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
                ctx.fillStyle = 'rgba(0,200,255,0.12)';
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
        // System OS options — legacy Pokémon/GBA battle + theme-picker rows removed
        // (System OS is the only UI look). Kept: display, audio, controls, saving.
        list.appendChild(makeToggleRow('Text Speed',   ['SLOW','MED','FAST'],          savedTextSpeed, function(v){localStorage.setItem('ac_text_speed',v);}));
        list.appendChild(makeToggleRow('Transition',   ['ON','OFF'],                   savedTransition,function(v){localStorage.setItem('ac_transition',v);}));
        list.appendChild(makeToggleRow('Auto Run',     ['OFF','ON'],                   savedAutoRun,   function(v){localStorage.setItem('ac_auto_run',v);}));
        list.appendChild(makeToggleRow('Random Music', ['ON','OFF'],                   savedRandMusic, function(v){localStorage.setItem('ac_random_music',v);}));
        list.appendChild(makeToggleRow('Disable Music',['ON','OFF'],                   savedDisMusic,  function(v){localStorage.setItem('ac_disable_music',v);}));
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
        if (page==='system' && _sysSub) { _sysSub=null; _render(); return; }  // sub-screen → services
        if (page==='supplies' && _supPocket==='gear' && _gearMode!=='equip') { _gearMode='equip'; _forgeMsg=null; _subIdx=0; _render(); return; }  // forge tab → equip
        if (page==='supplies' && _supPocket) { _supPocket=null; _gearMode='equip'; _subIdx=0; _render(); return; }  // pocket → pocket list
        _sysSub=null; _supPocket=null;
        page='main'; _subIdx=0; _render();
    }

    function _confirmSelected() {
        if (page!=='main') {
            if (page==='save') { const a=['save','load']; _doSaveAction(a[_subIdx]||'save'); return; }
            if (_subRows.length) { _runSel(); }   // activate the selected survival-page row
            return;
        }
        const item=ITEMS[selectedIdx]; if(!item) return;
        switch(item.id) {
            case 'EXIT':    close(); break;
            case 'SAVE':    _saveDone=false; page='save';         _subIdx=0; _render(); break;
            case 'OPTIONS': page='options';      _subIdx=0; _render(); break;
            case 'CAMP':       page='camp';       _subIdx=0; _render(); break;
            case 'JOURNAL':    page='journal';    _subIdx=0; _render(); break;
            case 'BONDS':      page='bonds';      _subIdx=0; _render(); break;
            case 'SUPPLIES':   page='supplies';   _subIdx=0; _supPocket=null; _render(); break;
            case 'AFFINITIES': page='affinities'; _subIdx=0; _render(); break;
            case 'REACHES':    page='reaches';    _subIdx=0; _render(); break;
            case 'SYSTEM':     page='system';     _subIdx=0; _sysSub=null; _render(); break;
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
    // Open straight to the FORGE (SUPPLIES → GEAR → UPGRADE) — used by the Dawnhearth
    // Forge station's `forge` event command. mode: 'upgrade' (default) | 'craft' | 'equip'.
    function openForge(mode) {
        if (!menuEl) return;
        _rebuildItems();
        selectedIdx = 0; _saveDone = false; isOpen = true;
        page = 'supplies'; _supPocket = 'gear'; _gearMode = mode || 'upgrade'; _subIdx = 0;
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
        const c=_subCount(); if(c>0){_subIdx=(_subIdx-1+c)%c; _render();} else _scrollSub(-1);
    }
    function moveDown() {
        if (!isOpen) return;
        if (page==='main') { if(selectedIdx<ITEMS.length-1){selectedIdx++;_render();} return; }
        const c=_subCount(); if(c>0){_subIdx=(_subIdx+1)%c; _render();} else _scrollSub(1);
    }
    // Survival sub-pages (camp/supplies/bonds/affinities/reaches/system) have no
    // discrete item cursor — up/down scroll their content panel instead.
    function _scrollSub(dir) {
        var c = subEl && subEl.querySelector('.sm-sub-content');
        if (c) c.scrollBy({ top: dir * 48, behavior: 'smooth' });
    }
    function _subCount() {
        if (page==='save')    return 2;          // Save / Load
        if (page==='options') return 21;         // 18 EE options + 3 engine extras
        return _subRows.length;                  // survival pages: selectable rows (0 = scroll)
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

    return { toggle, open, close, openForge, openBagForBattle, openPartyForBattle, moveUp, moveDown, moveLeft, moveRight, confirm, back,
             get isOpen() { return isOpen; } };
})();
