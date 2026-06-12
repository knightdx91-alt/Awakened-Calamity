// GameStartMenu — Emerald Enhanced style: icon strip at top, info bar at bottom
window.GameStartMenu = (function () {
    'use strict';

    // Survival start menu (Awakened Calamity): Camp / [Bonds] / Supplies /
    // Affinities / System, plus Save / Options / Exit. (Was the Pokémon EE menu.)
    // BONDS only appears once you've bonded at least one creature.
    const _ITEM = {
        CAMP:       { id: 'CAMP',       label: 'CAMP'       },
        BONDS:      { id: 'BONDS',      label: 'BONDS'      },
        SUPPLIES:   { id: 'SUPPLIES',   label: 'SUPPLIES'   },
        AFFINITIES: { id: 'AFFINITIES', label: 'AFFINITIES' },
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
        ITEMS.push(_ITEM.SUPPLIES, _ITEM.AFFINITIES, _ITEM.SYSTEM,
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
    var _journalBg     = undefined; // null = tried + failed, undefined = not loaded yet
    var _apBg          = undefined;
    var _trainerCardBg = undefined;
    var _partyBg       = undefined;
    var _pokedexBg     = undefined;

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
    function _loadJournalBg(cb)     { _loadSimpleBg('src/assets/journal/journal_bg.png',      _jBgRef,  cb); }
    function _loadApBg(cb)          { _loadSimpleBg('src/assets/ap/ap_bg.png',                 _aBgRef,  cb); }
    function _loadTrainerCardBg(cb) { _loadSimpleBg('src/assets/trainer_card/trainer_card_bg.png', _tcBgRef, cb); }
    function _loadPartyBg(cb)       { _loadSimpleBg('src/assets/party/party_bg.png',           _ptBgRef, cb); }
    function _loadPokedexBg(cb)     { _loadSimpleBg('src/assets/pokedex/pokedex_bg.png',        _pdBgRef, cb); }

    // --- Theme helpers ---
    // Colors sourced from EE: 1d.gbapal (dark), 1.gbapal (light), ryudarktheme.gbapal, hatlighttheme.gbapal
    function _getThemeColors() {
        var theme   = localStorage.getItem('pokemon_theme')    || 'DARK';
        var preset  = localStorage.getItem('pokemon_theme_preset'); // BlueSteel|RoyalPurple|Synthwave|Mocha

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

    function _bagBgPath() {
        var ui    = (localStorage.getItem('pokemon_theme_ui')  || 'CLASSIC').toLowerCase();
        var theme = (localStorage.getItem('pokemon_theme')     || 'DARK').toLowerCase();
        // light/vanilla → light palette; anything else → dark
        var palKey = (theme === 'light' || theme === 'vanilla') ? 'light' : 'dark';
        // ui: modern|classic|vanilla
        if (ui !== 'modern' && ui !== 'vanilla') ui = 'classic';
        return 'src/assets/bag/bag_bg_' + ui + '_' + palKey + '.png';
    }

    // --- Bag state ---
    var _bagPocket   = 0;
    var _bagAssets   = null; // { bg, icons: [{unsel,sel}×8] }
    var _battleItemCallback  = null; // set when bag is opened from battle
    var _battleBagCancel     = null; // called when bag is closed without using an item
    var _battlePartyCallback = null; // set when party is opened from battle (switch)
    var _battlePartyCancel   = null; // called when party is closed without switching
    var _bagItemIconCache = {}; // name → Image|null

    function _itemIconPath(item) {
        if (!item) return null;
        var name = (item.name || '').toLowerCase()
            .replace(/[éè]/g,'e').replace(/[^a-z0-9]+/g,'_').replace(/_+$/,'');
        // Direct matches and common mappings
        var MAP = {
            'poke_ball':'poke_ball','pok_ball':'poke_ball',
            'great_ball':'great_ball','ultra_ball':'ultra_ball','master_ball':'master_ball',
            'potion':'potion','super_potion':'super_potion','hyper_potion':'hyper_potion',
            'max_potion':'max_potion','full_restore':'full_restore',
            'antidote':'antidote','burn_heal':'burn_heal','ice_heal':'ice_heal',
            'awakening':'awakening','parlyz_heal':'parlyz_heal','full_heal':'full_heal',
            'revive':'revive','max_revive':'max_revive',
            'nugget':'nugget','big_nugget':'big_nugget',
            'bicycle':'bicycle','old_rod':'old_rod','good_rod':'good_rod','super_rod':'super_rod',
            'oran_berry':'oran_berry','sitrus_berry':'sitrus_berry','lum_berry':'lum_berry',
            'leppa_berry':'leppa_berry','rawst_berry':'rawst_berry',
        };
        // TM/HM check
        if (/^tm\d/.test(name)) return 'src/assets/bag/item_icons/tm01_rgba.png';
        if (/^hm\d/.test(name)) return 'src/assets/bag/item_icons/tm01_rgba.png';
        var key = MAP[name] || name;
        return 'src/assets/bag/item_icons/' + key + '_rgba.png';
    }

    function _loadItemIcon(item, cb) {
        var path = _itemIconPath(item);
        if (!path) { cb(null); return; }
        if (_bagItemIconCache[path] !== undefined) { cb(_bagItemIconCache[path]); return; }
        var img = new Image();
        img.onload = function() { _bagItemIconCache[path] = img; cb(img); };
        img.onerror = function() { _bagItemIconCache[path] = null; cb(null); };
        img.src = path;
    }
    function _loadBagAssets(cb) {
        if (_bagAssets) { cb(_bagAssets); return; }
        var assets = { bg: null, icons: [], bagFrames: [] };
        var pending = 1 + 16 + 6; // bg + 8 unsel + 8 sel + 6 bag frames
        function done() { if (--pending === 0) { _bagAssets = assets; cb(assets); } }
        var bg = new Image();
        bg.onload = function() { assets.bg = bg; done(); };
        bg.onerror = function() { done(); };
        bg.src = 'src/assets/bag/bag_bg_ee.png'; // assembled from EE submodule tiles + male palette
        for (var i = 0; i < 8; i++) {
            (function(idx) {
                var icon = { unsel: null, sel: null };
                assets.icons.push(icon);
                var u = new Image();
                u.onload = function() { icon.unsel = u; done(); };
                u.onerror = function() { done(); };
                u.src = 'src/assets/bag/pocket_icon_' + idx + '_unsel.png';
                var s = new Image();
                s.onload = function() { icon.sel = s; done(); };
                s.onerror = function() { done(); };
                s.src = 'src/assets/bag/pocket_icon_' + idx + '_sel.png';
            })(i);
        }
        for (var f = 0; f < 6; f++) {
            (function(fi) {
                var bf = new Image();
                bf.onload = function() { assets.bagFrames[fi] = bf; done(); };
                bf.onerror = function() { assets.bagFrames[fi] = null; done(); };
                bf.src = 'src/assets/bag/bag_frame_' + fi + '_rgba.png';
            })(f);
        }
    }

    // --- Data helpers ---
    function _playtime() {
        const secs = (window.GameSave && GameSave.state && GameSave.state.meta)
            ? (GameSave.state.meta.playtimeSeconds || 0) : 0;
        const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
        return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
    }
    function _playerName() {
        return (window.GameSave && GameSave.state && GameSave.state.player)
            ? (GameSave.state.player.name || 'TRAINER') : 'TRAINER';
    }
    function _money() {
        return (window.GameSave && GameSave.state && GameSave.state.player)
            ? (GameSave.state.player.money || 0) : 0;
    }
    function _badges() {
        return (window.GameSave && GameSave.state && GameSave.state.meta)
            ? (GameSave.state.meta.badgeCount || 0) : 0;
    }
    function _ap() {
        return (window.GameSave && GameSave.state && GameSave.state.achievements)
            ? (GameSave.state.achievements.totalAP || 0) : 0;
    }
    function _achList() {
        return (window.GameSave && GameSave.state && GameSave.state.achievements)
            ? (GameSave.state.achievements.unlocked || []) : [];
    }
    function _trainerId() {
        return (window.GameSave && GameSave.state && GameSave.state.meta)
            ? String(GameSave.state.meta.trainerId || 0).padStart(6,'0') : '000000';
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
        'CAMP':       'Your camp, status,\nand survival meters.',
        'BONDS':      'The creatures you have\nbonded with.',
        'SUPPLIES':   'Open your supplies\nand use what you carry.',
        'AFFINITIES': 'Review your Affinities,\nfactions, and record.',
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
        panelCanvas.style.cssText = 'display:block;flex:none;width:48%;min-width:88px;max-width:116px;height:auto;pointer-events:all;border-left:3px solid #62737b;border-top:3px solid #62737b;border-bottom:3px solid #62737b;box-shadow:inset 0 0 0 1px #ffffff;cursor:pointer;image-rendering:pixelated;';
        const pc = panelCanvas.getContext('2d');

        function _drawPanel() {
            pc.clearRect(0, 0, PW, PH);
            // White background
            pc.fillStyle = '#f0f0d8';   // --fr-body-lt
            pc.fillRect(0, 0, PW, PH);
            // Row highlight for selected
            pc.fillStyle = 'rgba(230,8,8,0.13)';   // --fr-red tint
            pc.fillRect(0, selectedIdx * ROW_H, PW, ROW_H);
            // Text
            pc.font = 'bold ' + FONT_PX + 'px "Press Start 2P", monospace';
            pc.textBaseline = 'middle';
            ITEMS.forEach(function(itm, i) {
                const y = i * ROW_H + ROW_H / 2;
                if (i === selectedIdx) {
                    pc.fillStyle = '#e60808';   // --fr-red cursor
                    pc.fillText('▶', PAD_X, y);
                }
                pc.fillStyle = '#181818';   // --fr-text
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
        dc.fillStyle = '#2870c0';
        dc.fillRect(0, 0, descCanvas.width, DH);
        dc.fillStyle = '#ffffff';
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
        var CANVAS_PAGES = ['bag','journal','achievements','trainer_card','options','pokemon','pokedex','pokedex_entry','pokenav','save'];
        if (CANVAS_PAGES.indexOf(page) !== -1) {
            var pageEl = document.createElement('div');
            pageEl.style.cssText = 'position:absolute;inset:0;pointer-events:all;';
            if      (page === 'bag')          _buildBag(pageEl);
            else if (page === 'journal')      _buildJournal(pageEl);
            else if (page === 'achievements') _buildAchievements(pageEl);
            else if (page === 'trainer_card') _buildTrainerCard(pageEl);
            else if (page === 'options')      _buildOptions(pageEl);
            else if (page === 'pokemon')      _buildParty(pageEl);
            else if (page === 'pokedex')      _buildPokedex(pageEl);
            else if (page === 'pokedex_entry')_buildPokedexEntry(pageEl);
            else if (page === 'pokenav')      _buildPokenav(pageEl);
            else if (page === 'save')         _buildSave(pageEl);
            subEl.appendChild(pageEl);
            subEl._pageEl = pageEl;
            subEl.style.display = 'block';
            return;
        }

        const titles = { journal:'Journal', trainer_card:'Trainer Card',
                         achievements:'Achievement Atlas', pokenav:'Pokénav',
                         save:'Save', options:'Options', pokemon:'Pokémon',
                         pokedex:'Pokédex', pokedex_entry:'Pokédex' };

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

        if      (page === 'trainer_card')  _buildTrainerCard(content);
        else if (page === 'journal')       _buildJournal(content);
        else if (page === 'achievements')  _buildAchievements(content);
        else if (page === 'pokenav')       _buildPokenav(content);
        else if (page === 'save')          _buildSave(content);
        else if (page === 'options')       _buildOptions(content);
        else if (page === 'pokemon')       _buildParty(content);
        else if (page === 'pokedex')       _buildPokedex(content);
        else if (page === 'pokedex_entry') _buildPokedexEntry(content);

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

    function _buildTrainerCard(el) {
        _makeCanvasShell(el, function(ctx) {
            _loadTrainerCardBg(function(bg) {
                _canvasBg(ctx, bg);
                var S = 2;
                var _tc = _getThemeColors(); var COL_TEXT = _tc.text; var COL_DIM = _tc.dim; var COL_CYAN = _tc.hi;
                ctx.textBaseline = 'top';

                var ls = _lifeSkills();
                var rows = [
                    { key:'Name',       val:_playerName() },
                    { key:'Trainer ID', val:_trainerId() },
                    { key:'Money',      val:'₱'+_money().toLocaleString() },
                    { key:'Location',   val:_mapName() },
                    null,
                    { key:'Badges',     val:_badges()+' / 8' },
                    { key:'Ach Points', val:_ap()+' AP  ('+_achList().length+' earned)' },
                    { key:'Play Time',  val:_playtime() },
                    null,
                    { key:'Botany',     val:'Lv '+(ls.botany||0) },
                    { key:'Mining',     val:'Lv '+(ls.mining||0) },
                    { key:'Alchemy',    val:'Lv '+(ls.alchemy||0) },
                ];

                ctx.font = 'bold '+(11*S)+'px "Press Start 2P", monospace';
                ctx.fillStyle = COL_CYAN;
                ctx.fillText('TRAINER CARD', 16*S, 8*S);

                ctx.font = (7*S)+'px "Press Start 2P", monospace';
                var y = 28*S;
                rows.forEach(function(r) {
                    if (!r) { y += 8*S; return; }
                    ctx.fillStyle = COL_DIM;
                    ctx.fillText(r.key, 16*S, y);
                    ctx.fillStyle = COL_TEXT;
                    ctx.fillText(r.val, 130*S, y);
                    y += 14*S;
                });

                // Player avatar: standing-down frame from data/sprites/player.png
                var avatarImg = new Image();
                avatarImg.onload = function() {
                    // Frame 0 (standing down) is at srcX=0, 16×32 — scale up 4× for card
                    var aw = 16*4*S/2, ah = 32*4*S/2; // 64×128 at S=2 canvas → 64×128px
                    var ax = (240 - 16*4)*S - 8*S;    // right edge with margin
                    var ay = 20*S;
                    // Draw silhouette backdrop
                    ctx.fillStyle = 'rgba(230,8,8,0.07)';
                    ctx.fillRect(ax - 4*S, ay - 4*S, aw + 8*S, ah + 8*S);
                    ctx.strokeStyle = '#e60808';
                    ctx.lineWidth = S;
                    ctx.strokeRect(ax - 4*S, ay - 4*S, aw + 8*S, ah + 8*S);
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(avatarImg, 0, 0, 16, 32, ax, ay, aw, ah);
                };
                avatarImg.src = 'data/sprites/player.png';
            });
        });
    }

    // Journal state
    var _journalTab  = 0;  // 0=Factions, 1=Ach.Atlas, 2=Powers, 3=Quests
    var _journalPage = 0;  // sub-page within Factions (L/R)
    var _achTier = 0;      // 0=all,1=plat,2=gold,3=silver,4=bronze
    var _achOffset = 0;    // scroll offset in flat ach list
    var _powersPage = 0;   // 0=Platinum,1=Gold,2=Silver,3=Copper

    var JOURNAL_TABS = ['Factions', 'Ach. Atlas', 'Powers', 'Quests'];

    // EE journal.c: 6 stat sub-pages navigated with L/R buttons (within Factions tab)
    const JOURNAL_PAGES = [
        {
            name: 'General Stats',
            stats: function() {
                const st = window.GameSave && GameSave.state;
                const gs = st && st.gameStats || {};
                const dex = st && st.pokedex || {};
                const ach = st && st.achievements || {};
                return [
                    ['Prestige Level',     st && st.meta && st.meta.ngPlusCount || 0],
                    ['Achievements',       (ach.unlocked || []).length],
                    ['Dex Seen',           (dex.seen || []).length],
                    ['Dex Caught',         (dex.caught || []).length],
                    ['Legendaries Caught', gs.legendariesCaught || 0],
                    ['Steps Taken',        gs.steps || 0],
                    ['Healed Party',       gs.healed || 0],
                ];
            }
        },
        {
            name: 'Life Skills',
            stats: function() {
                const ls = _lifeSkills();
                return [
                    ['Botany Lv',    ls.botany || 0],
                    ['Botany EXP',   ls.botanyExp || 0],
                    ['Mining Lv',    ls.mining || 0],
                    ['Mining EXP',   ls.miningExp || 0],
                    ['Alchemy Lv',   ls.alchemy || 0],
                    ['Alchemy EXP',  ls.alchemyExp || 0],
                    ['Harvest Lv',   ls.harvest || 0],
                ];
            }
        },
        {
            name: 'Battle Stats',
            stats: function() {
                const gs = (window.GameSave && GameSave.state && GameSave.state.gameStats) || {};
                return [
                    ['Total Battles',    gs.totalBattles || 0],
                    ['Battles Won',      gs.battlesWon || 0],
                    ['Battles Lost',     gs.battlesLost || 0],
                    ['Total Captures',   gs.captures || 0],
                    ['Knockouts',        gs.knockouts || 0],
                    ['Gym Leaders Fought', gs.gymLeadersFought || 0],
                    ['Title Defense Wins', gs.titleDefenseWins || 0],
                ];
            }
        },
        {
            name: 'Training Stats',
            stats: function() {
                const gs = (window.GameSave && GameSave.state && GameSave.state.gameStats) || {};
                return [
                    ['EXP Earned',       gs.expEarned || 0],
                    ['Pokemon Evolved',  gs.evolved || 0],
                    ['Eggs Hatched',     gs.eggsHatched || 0],
                    ['Ribbons Received', gs.ribbons || 0],
                    ['Contests Entered', gs.contestsEntered || 0],
                    ['Contests Won',     gs.contestsWon || 0],
                ];
            }
        },
        {
            name: 'Financial Stats',
            stats: function() {
                const st = window.GameSave && GameSave.state;
                const gs = st && st.gameStats || {};
                return [
                    ['Money',            '₽' + (_money()).toLocaleString()],
                    ['Bank Balance',     '₽' + (gs.bankBalance || 0).toLocaleString()],
                    ['Net Worth',        '₽' + (gs.netWorth || 0).toLocaleString()],
                    ['Properties Owned', gs.propertiesOwned || 0],
                    ['Days Interest',    gs.daysInterest || 0],
                ];
            }
        },
        {
            name: 'Social Stats',
            stats: function() {
                const gs = (window.GameSave && GameSave.state && GameSave.state.gameStats) || {};
                return [
                    ['Pokeblocks Made',  gs.pokeblocksM || 0],
                    ['Pokeblocks Used',  gs.pokeblocksU || 0],
                    ['NPCs Talked To',   gs.npcsTalked || 0],
                    ['Signs Read',       gs.signsRead || 0],
                ];
            }
        },
    ];

    function _buildJournal(el) {
        var shell = _makeCanvasShell(el, function(ctx, canvas) {
            _loadJournalBg(function(bg) { _drawJournalCanvas(ctx, bg); });
        });
        var ctx = shell.ctx, canvas = shell.canvas;
        el._redraw = function() { _loadJournalBg(function(bg) { _drawJournalCanvas(ctx, bg); }); };

        // Tab clicks
        canvas.addEventListener('click', function(e) {
            var rect = canvas.getBoundingClientRect();
            var cx = (e.clientX - rect.left) / rect.width  * GBA_W;
            var cy = (e.clientY - rect.top)  / rect.height * GBA_H;
            // Tab row y=0..18 GBA, each tab ~60px wide
            if (cy < 18) {
                var t = Math.floor(cx / 60);
                if (t >= 0 && t < 4) { _journalTab = t; _journalPage = 0; _achTier = 0; _powersPage = 0; el._redraw(); }
                return;
            }
            // Factions sub-page: tap left/right halves of sub-nav row (y=18..30)
            if (_journalTab === 0 && cy >= 18 && cy < 30) {
                if (cx < 120) { _journalPage = (_journalPage - 1 + JOURNAL_PAGES.length) % JOURNAL_PAGES.length; el._redraw(); }
                else          { _journalPage = (_journalPage + 1) % JOURNAL_PAGES.length; el._redraw(); }
            }
        });
    }

    function _drawJournalCanvas(ctx, bg) {
        var S = 2;
        var CYAN    = '#e60808';
        var TEXT    = '#181818';
        var DIM     = '#484848';
        var BG      = '#d5d5bd';
        var TITLEBG = '#62737b';

        // Hard reset canvas state before every draw
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, GBA_W, GBA_H);
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, GBA_W, GBA_H);
        ctx.textBaseline = 'top';

        // ── 4 main tabs (y=0..17 GBA) ───────────────────────────────────────
        ctx.font = (7*S) + 'px "Press Start 2P", monospace';
        var tabW = 60;
        JOURNAL_TABS.forEach(function(label, i) {
            var tx = i * tabW * S, tw = tabW * S, ty = 0, th = 17 * S;
            var sel = (i === _journalTab);
            if (sel) {
                ctx.fillStyle = TITLEBG;
                ctx.fillRect(tx, ty, tw, th);
                ctx.strokeStyle = CYAN;
                ctx.lineWidth = S;
                ctx.strokeRect(tx + 1, ty + 1, tw - 2, th - 2);
                ctx.fillStyle = CYAN;
            } else {
                ctx.fillStyle = DIM;
            }
            var lw = ctx.measureText(label).width;
            ctx.fillText(label, tx + (tw - lw) / 2, ty + 5*S);
        });
        // separator line
        ctx.fillStyle = CYAN;
        ctx.fillRect(0, 17*S, GBA_W, S);

        // ── Tab content ──────────────────────────────────────────────────────
        if (_journalTab === 0) {
            _drawJournalFactions(ctx, S, CYAN, TEXT, DIM, BG, TITLEBG);
        } else if (_journalTab === 1) {
            _drawJournalAchAtlas(ctx, S, CYAN, TEXT, DIM);
        } else if (_journalTab === 2) {
            _drawJournalPowers(ctx, S, CYAN, TEXT, DIM, BG, TITLEBG);
        } else if (_journalTab === 3) {
            _drawJournalQuests(ctx, S, CYAN, TEXT, DIM);
        }

        // ── Bottom bar (y=112..159 GBA) ──────────────────────────────────────
        ctx.fillStyle = TITLEBG;
        ctx.fillRect(0, 112*S, GBA_W, 48*S);
        ctx.fillStyle = CYAN;
        ctx.fillRect(0, 112*S, GBA_W, S);

        ctx.font = (7*S) + 'px "Press Start 2P", monospace';
        ctx.textBaseline = 'top';
        // Row 1: Name  ID: XXXXX  Money
        ctx.fillStyle = TEXT;
        ctx.fillText(_playerName(), 4*S, 114*S);
        ctx.fillText('ID: ' + _trainerId(), 82*S, 114*S);
        var moneyStr = '₱' + _money().toLocaleString();
        var mw = ctx.measureText(moneyStr).width;
        ctx.fillText(moneyStr, GBA_W - mw - 4*S, 114*S);
        // Row 2: party dots left + Stamina right
        var st = window.GameSave && GameSave.state;
        var party = st && st.party || [];
        for (var pi = 0; pi < 6; pi++) {
            var px = (4 + pi * 10) * S;
            var hasMon = pi < party.length;
            ctx.fillStyle = hasMon ? '#2a7030' : '#888899';
            ctx.fillRect(px, 128*S, 8*S, 8*S);
        }
        ctx.fillStyle = TEXT;
        ctx.fillText('Stamina: 100', 82*S, 128*S);
    }

    function _drawJournalFactions(ctx, S, CYAN, TEXT, DIM, BG, TITLEBG) {
        var page = JOURNAL_PAGES[_journalPage];

        // Sub-page nav row (y=18..29 GBA)
        ctx.fillStyle = TITLEBG;
        ctx.fillRect(0, 18*S, GBA_W, 11*S);
        ctx.font = (7*S) + 'px "Press Start 2P", monospace';
        ctx.textBaseline = 'top';
        ctx.fillStyle = CYAN;
        ctx.fillText('< (L)', 4*S, 19*S);
        var nameW = ctx.measureText(page.name).width;
        ctx.fillStyle = TEXT;
        ctx.fillText(page.name, (GBA_W/2 - nameW/2), 19*S);
        ctx.fillStyle = CYAN;
        var rStr = '(R) >';
        ctx.fillText(rStr, GBA_W - ctx.measureText(rStr).width - 4*S, 19*S);
        ctx.fillStyle = CYAN;
        ctx.fillRect(0, 29*S, GBA_W, S);

        // Stats in 2-column layout (y=30..111 GBA, 4 rows visible)
        var stats = page.stats();
        ctx.font = (7*S) + 'px "Press Start 2P", monospace';
        var ROW_H = 20, COL_MID = 120;
        for (var i = 0; i < stats.length; i++) {
            var col  = i % 2;
            var row  = Math.floor(i / 2);
            var ry   = (32 + row * ROW_H) * S;
            if (ry > 110*S) break;
            var colX = col * COL_MID * S;
            // Background stripe on even rows
            if (row % 2 === 0) {
                ctx.fillStyle = 'rgba(98,115,123,0.18)';
                ctx.fillRect(colX, ry - S, COL_MID*S, ROW_H*S);
            }
            ctx.fillStyle = DIM;
            ctx.fillText(String(stats[i][0]), colX + 4*S, ry);
            ctx.fillStyle = TEXT;
            var val = String(stats[i][1]);
            var vw = ctx.measureText(val).width;
            ctx.fillText(val, colX + (COL_MID - 4)*S - vw, ry);
            // Column divider
            ctx.fillStyle = 'rgba(230,8,8,0.12)';
            ctx.fillRect(COL_MID*S - S, 30*S, S, 82*S);
        }
    }

    function _drawJournalAchAtlas(ctx, S, CYAN, TEXT, DIM) {
        // AP counter top-right
        var ap = _ap();
        var allForAP = window.GameAchievements ? GameAchievements.getAll() : [];
        var maxAP = allForAP.reduce(function(s,a){ return s + (a.apReward||0); }, 0);
        ctx.font = (7*S) + 'px "Press Start 2P", monospace';
        ctx.textBaseline = 'top';
        var apStr = ap + ' / ' + maxAP + ' AP';
        var apW = ctx.measureText(apStr).width;
        ctx.fillStyle = CYAN;
        ctx.fillText(apStr, GBA_W - apW - 4*S, 19*S);

        // Tier filter tabs
        var TIERS = ['All', 'Plat', 'Gold', 'Silv', 'Brnz'];
        var tw = 48 * S;
        TIERS.forEach(function(t, i) {
            var sel = i === _achTier;
            ctx.fillStyle = sel ? CYAN : DIM;
            var lw = ctx.measureText(t).width;
            ctx.fillText(t, 4*S + i * tw + (tw - lw)/2, 19*S);
        });
        ctx.fillStyle = CYAN;
        ctx.fillRect(0, 29*S, GBA_W, S);

        // Achievement list — use full objects from GameAchievements
        var allAchs = window.GameAchievements ? GameAchievements.getAll() : [];
        var TIER_NAMES = [null,'platinum','gold','silver','bronze'];
        var filtered = _achTier === 0 ? allAchs : allAchs.filter(function(a){ return a.tier === TIER_NAMES[_achTier]; });
        var LIST_ROWS = 5;
        // Keep _achOffset in sync with _subIdx
        if (_subIdx < _achOffset) _achOffset = _subIdx;
        if (_subIdx >= _achOffset + LIST_ROWS) _achOffset = _subIdx - LIST_ROWS + 1;
        _achOffset = Math.max(0, Math.min(_achOffset, Math.max(0, filtered.length - LIST_ROWS)));
        var listY = 31;
        for (var j = 0; j < LIST_ROWS; j++) {
            var idx = _achOffset + j;
            if (idx >= filtered.length) break;
            var ach = filtered[idx];
            var sel2 = (idx === _subIdx);
            var ry2 = (listY + j * 14) * S;
            if (sel2) { ctx.fillStyle = 'rgba(230,8,8,0.12)'; ctx.fillRect(0, ry2 - S, GBA_W, 14*S); }
            ctx.fillStyle = ach.unlocked ? TEXT : DIM;
            ctx.font = (7*S) + 'px "Press Start 2P", monospace';
            ctx.fillText((ach.unlocked ? '[+]' : '[X]') + ' ' + (ach.name||''), 4*S, ry2);
            var apVal = (ach.apReward || 0) + 'AP';
            var avw = ctx.measureText(apVal).width;
            ctx.fillText(apVal, GBA_W - avw - 4*S, ry2);
        }
        // Scroll indicators
        if (_achOffset > 0) { ctx.fillStyle = CYAN; ctx.font=(7*S)+'px "Press Start 2P", monospace'; ctx.fillText('▲', GBA_W/2-4, (listY-2)*S); }
        if (_achOffset + LIST_ROWS < filtered.length) { ctx.fillStyle = CYAN; ctx.font=(7*S)+'px "Press Start 2P", monospace'; ctx.fillText('▼', GBA_W/2-4, (listY+LIST_ROWS*14)*S); }

        // Selected ach description
        var selAch = filtered[_subIdx];
        if (selAch) {
            ctx.fillStyle = 'rgba(98,115,123,0.22)';
            ctx.fillRect(0, 102*S, GBA_W, 10*S);
            ctx.fillStyle = CYAN;
            ctx.fillRect(0, 102*S, GBA_W, S);
            ctx.fillStyle = selAch.unlocked ? TEXT : DIM;
            ctx.font = (7*S) + 'px "Press Start 2P", monospace';
            ctx.fillText((selAch.name||'') + (selAch.unlocked ? ' [EARNED]' : ' [LOCKED]'), 4*S, 103*S);
            ctx.fillStyle = DIM;
            ctx.fillText((selAch.desc||''), 4*S, 103*S + 9*S);
        }
    }

    function _drawJournalPowers(ctx, S, CYAN, TEXT, DIM, BG, TITLEBG) {
        var TIERS = ['Platinum', 'Gold', 'Silver', 'Copper'];
        var ap = _ap();

        // Tier tabs + AP counter
        ctx.font = (7*S) + 'px "Press Start 2P", monospace';
        ctx.textBaseline = 'top';
        var tw = 55 * S;
        TIERS.forEach(function(t, i) {
            var sel = (i === _powersPage);
            ctx.fillStyle = sel ? CYAN : DIM;
            var lw = ctx.measureText(t).width;
            ctx.fillText(t, 4*S + i * tw + (tw - lw)/2, 19*S);
        });
        var apStr = ap + ' AP';
        ctx.fillStyle = CYAN;
        ctx.fillText(apStr, GBA_W - ctx.measureText(apStr).width - 4*S, 19*S);
        ctx.fillStyle = CYAN;
        ctx.fillRect(0, 29*S, GBA_W, S);

        // Column headers
        ctx.fillStyle = DIM;
        ctx.fillText('Powers', 20*S, 32*S);
        ctx.fillText('Cost', GBA_W - ctx.measureText('Cost').width - 4*S, 32*S);
        ctx.fillStyle = CYAN;
        ctx.fillRect(0, 40*S, GBA_W, S);

        // Power list (placeholder)
        var TIER_COSTS = [51, 30, 15, 5];
        var TIER_POWERS = [
            ['Sprint Boost','Global Repel','Trainer Repel','Double EV Gain'],
            ['Exp Share All','Lucky Egg Boost','Pickup Up','Pickup Boost'],
            ['Repel Boost','Amulet Boost','Potion Boost','Berry Boost'],
            ['Map Reveal','Fast Text','Auto Run','Extended HMs'],
        ];
        var powers = TIER_POWERS[_powersPage] || [];
        var cost   = TIER_COSTS[_powersPage];
        powers.forEach(function(p, i) {
            var ry = (44 + i * 14) * S;
            // pink = locked (not enough AP), grey = available
            ctx.fillStyle = ap >= cost ? DIM : '#ff80b0';
            ctx.fillText(p, 8*S, ry);
            ctx.fillStyle = DIM;
            var cStr = cost + 'AP';
            ctx.fillText(cStr, GBA_W - ctx.measureText(cStr).width - 4*S, ry);
        });

        // Description placeholder
        ctx.fillStyle = CYAN;
        ctx.fillRect(0, 102*S, GBA_W, S);
        ctx.fillStyle = DIM;
        ctx.font = (7*S) + 'px "Press Start 2P", monospace';
        ctx.fillText('Select a power to view its description.', 4*S, 104*S);
    }

    function _drawJournalQuests(ctx, S, CYAN, TEXT, DIM) {
        ctx.font = (7*S) + 'px "Press Start 2P", monospace';
        ctx.textBaseline = 'top';

        // Header
        ctx.fillStyle = TEXT;
        ctx.fillText('Select a Quest', 4*S, 20*S);
        ctx.fillStyle = CYAN;
        ctx.fillText('Current', GBA_W - ctx.measureText('Current').width - 4*S, 20*S);
        ctx.fillStyle = CYAN;
        ctx.fillRect(0, 29*S, GBA_W, S);

        var st = window.GameSave && GameSave.state;
        var quests = (st && st.quests) || {};
        var QUEST_LIST = [
            { name: 'Corporate Life',    key: 'corporateLife'  },
            { name: 'Weather Theorem',   key: 'weatherTheorem' },
            { name: 'Fiery Enterprise',  key: 'fieryEnterprise'},
            { name: 'Sail the High Seas',key: 'highSeas'       },
            { name: 'Delivery System',   key: 'delivery'       },
            { name: 'Faction Daily Quest', key: 'factionDaily' },
        ];

        QUEST_LIST.forEach(function(q, i) {
            var ry = (32 + i * 13) * S;
            var val = quests[q.key] || 0;
            var sel = (i === _subIdx);
            if (sel) { ctx.fillStyle='rgba(230,8,8,0.12)'; ctx.fillRect(0,ry-S,GBA_W,13*S); }
            ctx.fillStyle = sel ? CYAN : TEXT;
            ctx.fillText(q.name, 8*S, ry);
            ctx.fillStyle = TEXT;
            var vs = String(val);
            ctx.fillText(vs, GBA_W - ctx.measureText(vs).width - 4*S, ry);
        });

        // Description box
        ctx.fillStyle = CYAN;
        ctx.fillRect(0, 102*S, GBA_W, S);
        ctx.fillStyle = DIM;
        ctx.fillText('Select a quest to view progress.', 4*S, 104*S);
    }

    function _buildAchievements(el) {
        var shell = _makeCanvasShell(el, function(ctx, canvas) {
            _loadApBg(function(bg) {
                _drawAchievementsCanvas(ctx, bg);
            });

            // Tier tab buttons overlaid on canvas
            var TIERS = ['All', 'Plat', 'Gold', 'Silv', 'Brnz'];
            var tabsEl = document.createElement('div');
            tabsEl.style.cssText = 'position:absolute;top:2px;left:2px;display:flex;gap:2px;z-index:10;pointer-events:all;';
            TIERS.forEach(function(t, i) {
                var btn = document.createElement('button');
                btn.className = 'sm-back-btn' + (_achTier === i ? ' active' : '');
                btn.textContent = t;
                btn.style.cssText = 'pointer-events:all;padding:2px 4px;font-size:10px;' + (_achTier === i ? 'color:#e60808;font-weight:bold;' : '');
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    _achTier = i; _achOffset = 0; _subIdx = 0; _render();
                });
                tabsEl.appendChild(btn);
            });
            el.appendChild(tabsEl);

            // Click on canvas list rows
            canvas.addEventListener('click', function(e) {
                var rect = canvas.getBoundingClientRect();
                var cy = (e.clientY - rect.top) * (160 / rect.height);
                // List rows start at y=26, each 14px tall, 6 visible
                if (cy >= 26 && cy < 26 + 6 * 14) {
                    var row = Math.floor((cy - 26) / 14);
                    var clickedIdx = _achOffset + row;
                    var all2 = window.GameAchievements ? GameAchievements.getAll() : [];
                    var tierKeys2 = [null, 'platinum', 'gold', 'silver', 'bronze'];
                    var filtered2 = _achTier === 0 ? all2 : all2.filter(function(a){return a.tier===tierKeys2[_achTier];});
                    if (clickedIdx >= 0 && clickedIdx < filtered2.length) {
                        _subIdx = clickedIdx; _render();
                    }
                }
            });
        });
    }

    function _drawAchievementsCanvas(ctx, bg) {
        _canvasBg(ctx, bg);
        var S = 2;
        var _tc = _getThemeColors(); var COL_TEXT = _tc.text; var COL_DIM = _tc.dim; var COL_CYAN = _tc.hi;

        var all = window.GameAchievements ? GameAchievements.getAll() : [];
        var totalAP = all.reduce(function(s, a) { return s + (a.unlocked ? a.apReward : 0); }, 0);
        var maxAP   = all.reduce(function(s, a) { return s + a.apReward; }, 0);
        var unlockCount = all.filter(function(a) { return a.unlocked; }).length;

        // Title bar
        ctx.fillStyle = _tc.titleBg;
        ctx.fillRect(0, 0, GBA_W, 20*S);
        ctx.fillStyle = COL_CYAN;
        ctx.fillRect(0, 20*S, GBA_W, 2);

        ctx.textBaseline = 'top';
        ctx.font = 'bold '+(11*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = _tc.hi;
        ctx.fillText('ACHIEVEMENT ATLAS', 8*S, 6*S);

        // Total AP right-aligned
        ctx.font = (7*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = COL_CYAN;
        var apStr = totalAP + ' / ' + maxAP + ' AP';
        var apW = ctx.measureText(apStr).width;
        ctx.fillText(apStr, GBA_W - apW - 4*S, 7*S);

        // Filter list
        var tierKeys = [null, 'platinum', 'gold', 'silver', 'bronze'];
        var filtered = _achTier === 0 ? all : all.filter(function(a){return a.tier===tierKeys[_achTier];});

        var LIST_ROWS = 6;
        if (_subIdx < _achOffset) _achOffset = _subIdx;
        if (_subIdx >= _achOffset + LIST_ROWS) _achOffset = _subIdx - LIST_ROWS + 1;
        _achOffset = Math.max(0, Math.min(_achOffset, Math.max(0, filtered.length - LIST_ROWS)));

        ctx.font = (7*S)+'px "Press Start 2P", monospace';
        var listY = 26;
        if (!filtered.length) {
            ctx.fillStyle = COL_DIM;
            ctx.fillText('No achievements in this tier.', 8*S, listY*S);
        } else {
            var visible = filtered.slice(_achOffset, _achOffset + LIST_ROWS);
            visible.forEach(function(a, vi) {
                var absIdx = _achOffset + vi;
                var y = (listY + vi * 14) * S;
                if (absIdx === _subIdx) {
                    ctx.fillStyle = 'rgba(230,8,8,0.12)';
                    ctx.fillRect(0, y, GBA_W, 14*S);
                    ctx.fillStyle = COL_CYAN;
                    ctx.fillRect(0, y, 2*S, 14*S);
                }
                var icon = a.unlocked ? (a.tier === 'platinum' ? 'P' : a.tier === 'gold' ? 'G' : a.tier === 'silver' ? 'S' : 'B') : 'X';
                ctx.fillStyle = a.unlocked ? COL_CYAN : '#888888';
                ctx.fillText('[' + icon + ']', 4*S, y + 3*S);
                ctx.fillStyle = a.unlocked ? COL_TEXT : COL_DIM;
                var nameStr = a.name || '';
                if (nameStr.length > 22) nameStr = nameStr.slice(0, 21) + '…';
                ctx.fillText(nameStr, 24*S, y + 3*S);
                ctx.fillStyle = COL_DIM;
                var apVal = (a.unlocked ? '+' : '') + a.apReward + 'AP';
                var avw = ctx.measureText(apVal).width;
                ctx.fillText(apVal, GBA_W - avw - 4*S, y + 3*S);
            });
        }

        // Scroll indicators
        if (_achOffset > 0) { ctx.fillStyle = COL_CYAN; ctx.font=(7*S)+'px "Press Start 2P", monospace'; ctx.fillText('▲', GBA_W/2 - 4, (listY - 1)*S); }
        if (_achOffset + LIST_ROWS < filtered.length) { ctx.fillStyle = COL_CYAN; ctx.font=(7*S)+'px "Press Start 2P", monospace'; ctx.fillText('▼', GBA_W/2 - 4, (listY + LIST_ROWS*14)*S); }

        // Desc box at bottom (y=112)
        ctx.fillStyle = _tc.titleBg;
        ctx.fillRect(0, 112*S, GBA_W, 48*S);
        ctx.fillStyle = COL_CYAN;
        ctx.fillRect(0, 112*S, GBA_W, 2);

        ctx.font = (7*S)+'px "Press Start 2P", monospace';
        var selAch = filtered[_subIdx];
        if (selAch) {
            ctx.fillStyle = COL_CYAN;
            var title = selAch.name + (selAch.unlocked ? ' [EARNED]' : ' [LOCKED]');
            ctx.fillText(title, 4*S, 115*S);
            ctx.fillStyle = COL_TEXT;
            var desc = selAch.desc || '';
            var words = desc.split(' '), line = '', ly = 126*S;
            ctx.font = (7*S)+'px "Press Start 2P", monospace';
            for (var w = 0; w < words.length; w++) {
                var test = line ? line + ' ' + words[w] : words[w];
                if (ctx.measureText(test).width > (GBA_W - 8*S) && line) {
                    ctx.fillText(line, 4*S, ly); line = words[w]; ly += 11*S;
                    if (ly > 154*S) break;
                } else { line = test; }
            }
            if (line) ctx.fillText(line, 4*S, ly);
            ctx.fillStyle = COL_DIM;
            ctx.font = (7*S)+'px "Press Start 2P", monospace';
            var meta = (selAch.tier||'').toUpperCase() + '  ' + selAch.apReward + ' AP';
            ctx.fillText(meta, 4*S, 148*S);
        } else {
            ctx.fillStyle = COL_DIM;
            ctx.fillText(unlockCount + ' / ' + all.length + ' earned  ·  ' + totalAP + ' / ' + maxAP + ' AP', 4*S, 120*S);
        }
    }

    // ── Bag pocket data helper ──────────────────────────────────────────────
    // Inventory is stored as {itemKey: quantity} dicts.
    // Item display names are derived from the key.
    var ITEM_NAMES = {
        potion:'Potion', super_potion:'Super Potion', hyper_potion:'Hyper Potion',
        max_potion:'Max Potion', full_restore:'Full Restore', antidote:'Antidote',
        burn_heal:'Burn Heal', awakening:'Awakening', parlyz_heal:'Parlyz Heal',
        ice_heal:'Ice Heal', full_heal:'Full Heal', revive:'Revive',
        poke_ball:'Poké Ball', great_ball:'Great Ball', ultra_ball:'Ultra Ball',
        master_ball:'Master Ball', safari_ball:'Safari Ball',
        nugget:'Nugget', big_nugget:'Big Nugget', pearl:'Pearl', big_pearl:'Big Pearl',
        bicycle:'Bicycle', town_map:'Town Map', super_rod:'Super Rod',
        oran_berry:'Oran Berry', sitrus_berry:'Sitrus Berry', lum_berry:'Lum Berry',
    };
    function _itemName(key) {
        return ITEM_NAMES[key] || key.split('_').map(function(w){return w[0].toUpperCase()+w.slice(1);}).join(' ');
    }
    function _dictToList(dict) {
        if (!dict || typeof dict !== 'object' || Array.isArray(dict)) return [];
        return Object.entries(dict)
            .filter(function(e){ return e[1] > 0; })
            .map(function(e){ return { itemId: e[0], name: _itemName(e[0]), quantity: e[1], desc: '' }; });
    }
    function _getBagPockets() {
        const inv = (window.GameSave && GameSave.state && GameSave.state.inventory)
            ? GameSave.state.inventory : {};
        function pick(key) {
            return _dictToList(inv[key]);
        }
        // EE pocket order — gPocketNamesStringsTable in source/emerald-enhanced/src/strings.c
        return [
            { label: 'Items',       items: pick('items')      },
            { label: 'Medicine',    items: pick('medicine')   },
            { label: 'Valuables',   items: pick('valuables')  },
            { label: 'Poké Balls',  items: pick('pokeBalls')  },
            { label: 'TMs & HMs',   items: pick('tms')        },
            { label: 'Berries',     items: pick('berries')    },
            { label: 'Key Items',   items: pick('keyItems')   },
            { label: 'Mega Stones', items: pick('megaStones') },
        ];
    }

    // ── Canvas bag renderer — 2× GBA resolution (480×320) ──────────────────────
    // EE bag layout (GBA 240×160):
    //   Left panel x=0..111: pocket name row (y=0..7), pocket icons (y=8..15),
    //     big bag sprite (y=16..79), item icon box (y=84..111), description (y=116..159)
    //   Right panel x=112..239: item list box with cyan border
    var BAG_W = 480, BAG_H = 320, BAG_S = 2;
    function _drawBagCanvas(ctx, assets, itemIcon) {
        var POCKETS = _getBagPockets();
        var pocket  = POCKETS[_bagPocket] || POCKETS[0];
        var items   = pocket.items;
        var S = BAG_S;
        var NP = POCKETS.length;

        // EE bag is a light screen — dark text like the original
        var TEXT   = '#383838';
        var DIM    = '#383838';
        var RED    = '#e04828';   // pill arrow red
        var SEL_BG = 'rgba(0,0,0,0.07)';

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, BAG_W, BAG_H);

        // ── EE bag background (assembled from submodule tiles + palette) ─────
        if (assets && assets.bg) {
            ctx.drawImage(assets.bg, 0, 0, BAG_W, BAG_H);
        } else {
            ctx.fillStyle = '#4880f8';
            ctx.fillRect(0, 0, BAG_W, BAG_H);
        }

        // ── Selected pocket icon in the gold circle at top-left ──────────────
        var selIcon = assets && assets.icons && assets.icons[_bagPocket];
        if (selIcon && selIcon.sel) {
            ctx.drawImage(selIcon.sel, 6*S, 11*S, 10*S, 10*S);
        }

        // ── Red ◄ ► arrows at the pill ends (like EE) ────────────────────────
        function pillArrow(x, dir) {
            ctx.fillStyle = RED;
            ctx.beginPath();
            if (dir < 0) {
                ctx.moveTo(x + 6*S, 11*S); ctx.lineTo(x, 15.5*S); ctx.lineTo(x + 6*S, 20*S);
            } else {
                ctx.moveTo(x, 11*S); ctx.lineTo(x + 6*S, 15.5*S); ctx.lineTo(x, 20*S);
            }
            ctx.closePath(); ctx.fill();
        }
        pillArrow(16*S, -1);
        pillArrow(98*S, +1);

        // ── Pocket name centered in the pill (pill interior x=22..98) ────────
        // Text sits directly on the cream pill baked into the EE background.
        // EE's font1 is a small proportional sans — use plain sans-serif.
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#484848';
        ctx.font = (8*S) + 'px Arial, "Helvetica Neue", sans-serif';
        var labelW = ctx.measureText(pocket.label).width;
        ctx.fillText(pocket.label, (60*S) - labelW/2, 12*S);

        // ── Pocket icon row directly under the pill ──────────────────────────
        var iconRowY = 25*S;
        var iconStartX = 24*S;
        for (var i = 0; i < NP; i++) {
            var ix = iconStartX + i * 9*S;
            var icon = assets && assets.icons && assets.icons[i];
            if (icon) {
                var img = (i === _bagPocket) ? icon.sel : icon.unsel;
                if (img) ctx.drawImage(img, ix, iconRowY, 8*S, 8*S);
            }
        }

        // ── Big bag sprite, center-left ──────────────────────────────────────
        var bagFrame = assets && assets.bagFrames && assets.bagFrames[Math.min(_bagPocket, 5)];
        if (bagFrame) {
            ctx.drawImage(bagFrame, 36*S, 38*S, 64*S, 64*S);
        }

        var selItem = items[_subIdx];
        var isClosePack = (!selItem || _subIdx >= items.length);

        // ── Item icon box (white box interior x=5..34, y=71..96) ─────────────
        if (isClosePack) {
            // EE shows a big grey return arrow for Close Pack
            ctx.fillStyle = '#a0a0a8';
            ctx.font = (18*S) + 'px sans-serif';
            ctx.textBaseline = 'top';
            ctx.fillText('↵', 11*S, 72*S);
        } else if (itemIcon) {
            ctx.drawImage(itemIcon, 9*S, 73*S, 22*S, 22*S);
        }

        // ── Description text in the white bottom-left box ────────────────────
        var desc = isClosePack ? 'Return to the field.' : (selItem.desc || selItem.description || '');
        ctx.fillStyle = TEXT;
        ctx.font = (7*S) + 'px "Press Start 2P", monospace';
        ctx.textBaseline = 'top';
        var words = desc.split(' '), line = '', lx = 7*S, ly = 107*S, maxW = 94*S, lineH = 10*S;
        for (var w = 0; w < words.length; w++) {
            var test = line ? line + ' ' + words[w] : words[w];
            if (ctx.measureText(test).width > maxW && line) {
                ctx.fillText(line, lx, ly); line = words[w]; ly += lineH;
                if (ly > 150*S) break;
            } else { line = test; }
        }
        if (line && ly <= 150*S) ctx.fillText(line, lx, ly);

        // ── Item list inside the bg's right panel (x≈108..236, y≈4..156) ─────
        var MAX_VIS = 9;
        var totalRows = items.length + 1; // +1 for Cancel
        var scroll = Math.max(0, Math.min(_subIdx - Math.floor(MAX_VIS/2), totalRows - MAX_VIS));
        if (scroll < 0) scroll = 0;

        ctx.font = (7*S) + 'px "Press Start 2P", monospace';
        ctx.textBaseline = 'top';

        function drawCursor(cx, cy, h) {
            ctx.fillStyle = TEXT; // EE cursor is dark
            ctx.beginPath();
            ctx.moveTo(cx,        cy + 1);
            ctx.lineTo(cx + 5*S,  cy + Math.floor(h/2));
            ctx.lineTo(cx,        cy + h - 1);
            ctx.closePath();
            ctx.fill();
        }

        for (var j = 0; j < MAX_VIS; j++) {
            var idx = scroll + j;
            if (idx > items.length) break;
            var row_y = (8 + j * 16) * S;
            var sel = (idx === _subIdx);

            if (sel) {
                ctx.fillStyle = SEL_BG;
                ctx.fillRect(112*S, row_y - 1*S, 122*S, 15*S);
                drawCursor(113*S, row_y, 13*S);
            }

            if (idx < items.length) {
                var item = items[idx];
                ctx.fillStyle = TEXT;
                ctx.fillText(item.name || item.itemId || '?', 122*S, row_y);
                // EE qty format: lowercase x, number right-aligned
                ctx.fillText('x', 204*S, row_y);
                var qn = String(item.quantity || 1);
                ctx.fillText(qn, 230*S - ctx.measureText(qn).width, row_y);
            } else {
                // EE's cancel entry
                ctx.fillStyle = TEXT;
                ctx.fillText('Close Pack', 122*S, row_y);
            }
        }

        // Scroll arrows
        if (scroll > 0) {
            ctx.fillStyle = RED;
            ctx.beginPath(); ctx.moveTo(168*S, 7*S); ctx.lineTo(172*S, 3*S); ctx.lineTo(176*S, 7*S); ctx.closePath(); ctx.fill();
        }
        if (scroll + MAX_VIS < totalRows) {
            ctx.fillStyle = RED;
            ctx.beginPath(); ctx.moveTo(168*S, 152*S); ctx.lineTo(172*S, 156*S); ctx.lineTo(176*S, 152*S); ctx.closePath(); ctx.fill();
        }
    }

    function _buildBag(el) {
        el.style.cssText = 'padding:0;overflow:hidden;background:none;position:absolute;inset:0;';

        var backBtn = document.createElement('button');
        backBtn.textContent = 'B BACK';
        backBtn.className = 'sm-back-btn';
        backBtn.style.cssText = 'position:absolute;bottom:4px;right:4px;z-index:10;pointer-events:all;';
        backBtn.addEventListener('click', _goBack);
        el.appendChild(backBtn);

        var canvas = document.createElement('canvas');
        canvas.width  = BAG_W;
        canvas.height = BAG_H;
        canvas.style.cssText = 'width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;';
        canvas.style.pointerEvents = 'all';
        el.appendChild(canvas);

        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Touch/click: pocket tabs and item list
        canvas.addEventListener('click', function(e) {
            var rect = canvas.getBoundingClientRect();
            var cx = (e.clientX - rect.left) * (240 / rect.width);
            var cy = (e.clientY - rect.top)  * (160 / rect.height);

            var NP = _getBagPockets().length;

            // Red ◄ ► arrows at the pill ends (wrap like EE)
            if (cy >= 8 && cy < 24 && cx >= 14 && cx < 30) {
                _bagPocket = (_bagPocket - 1 + NP) % NP; _subIdx = 0; _render(); return;
            }
            if (cy >= 8 && cy < 24 && cx >= 92 && cx < 108) {
                _bagPocket = (_bagPocket + 1) % NP; _subIdx = 0; _render(); return;
            }
            // Pocket icon row under the pill: y=25..33, 9px spacing from x=24
            if (cy >= 24 && cy < 35 && cx >= 22 && cx < 22 + NP * 9) {
                var p = Math.floor((cx - 22) / 9);
                if (p >= 0 && p < NP) { _bagPocket = p; _subIdx = 0; _render(); return; }
            }
            // Item list: x=108..236, y=8..152
            if (cx >= 108 && cy >= 8 && cy < 152) {
                var row = Math.floor((cy - 8) / 16);
                var POCKETS = _getBagPockets();
                var items = (POCKETS[_bagPocket] || POCKETS[0]).items;
                var MAX_VIS = 9;
                var scroll = Math.max(0, Math.min(_subIdx - Math.floor(MAX_VIS/2), items.length + 1 - MAX_VIS));
                if (scroll < 0) scroll = 0;
                var itemIdx = scroll + row;
                if (itemIdx >= 0 && itemIdx < items.length) {
                    _subIdx = itemIdx; _render();
                } else if (itemIdx === items.length) {
                    // Tapped Close Pack row — confirm it
                    _subIdx = itemIdx; _confirmSelected();
                }
            }
        });

        el._redraw = function() {
            var POCKETS = _getBagPockets();
            var pocket = POCKETS[_bagPocket] || POCKETS[0];
            var selItem = pocket.items[_subIdx] || null;
            _loadBagAssets(function(a) {
                _loadItemIcon(selItem, function(iconImg) {
                    _drawBagCanvas(ctx, a, iconImg);
                });
            });
        };
        el._redraw();
    }

    // --- Party viewer ---
    var _speciesDb = null;
    function _getSpeciesDb(cb) {
        if (_speciesDb) { cb(_speciesDb); return; }
        fetch('data/pokemon/base_stats.json')
            .then(function(r){ return r.ok ? r.json() : null; })
            .then(function(d){ _speciesDb = d || {}; cb(_speciesDb); })
            .catch(function(){ _speciesDb = {}; cb({}); });
    }

    // num→name map from pokedex + icon image cache
    var _pokedexNumMap = null; // { 4: 'charmander', ... }
    var _monIconCache  = {};   // name → Image|null

    function _getPokedexNumMap(cb) {
        if (_pokedexNumMap) { cb(_pokedexNumMap); return; }
        fetch('data/pokemon/pokedex.json')
            .then(function(r){ return r.ok ? r.json() : {}; })
            .then(function(d){
                _pokedexNumMap = {};
                for (var key in d) {
                    var num = d[key].num;
                    if (num) _pokedexNumMap[num] = key.toLowerCase();
                }
                cb(_pokedexNumMap);
            })
            .catch(function(){ _pokedexNumMap = {}; cb({}); });
    }

    function _speciesName(speciesId, map) {
        if (!speciesId) return null;
        // String speciesId (new format) — use directly
        if (typeof speciesId === 'string') return speciesId.toLowerCase();
        // Numeric speciesId (legacy) — look up via num map
        return map[speciesId] || null;
    }

    function _loadMonIcon(speciesId, cb) {
        _getPokedexNumMap(function(map) {
            var name = _speciesName(speciesId, map);
            if (!name) { cb(null); return; }
            var path = 'data/sprites/pokemon/icons/' + name + '.png';
            if (_monIconCache[path] !== undefined) { cb(_monIconCache[path]); return; }
            var img = new Image();
            img.onload  = function() { _monIconCache[path] = img; cb(img); };
            img.onerror = function() { _monIconCache[path] = null; cb(null); };
            img.src = path;
        });
    }

    // Party action sub-menu state
    var _partyActionMon  = null; // mon object being actioned
    var _partyActionIdx  = -1;   // filled[] index
    var _partyActionSel  = 0;    // cursor row in action menu
    var _partyActionOpen = false;
    var _battlePartyCallback = null; // set when party is opened from battle
    var _battlePartyCancel   = null;

    function _getParty() {
        var party = (window.GameSave && GameSave.state && GameSave.state.party) || [];
        if (!party.some(Boolean)) {
            var base = (window.GameSave && GameSave.DEFAULT_POKEMON) ? GameSave.DEFAULT_POKEMON() : {};
            party = [Object.assign({}, base, {
                speciesId: 'charizard', nickname: 'CHARIZARD', level: 50,
                currentHp: 153, maxHp: 153, nature: 'adamant',
                moves: ['flamethrower', 'air_slash', 'dragon_claw', 'earthquake'],
                ivs: { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 },
                evs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 },
            }), null, null, null, null, null];
        }
        return party;
    }

    var PARTY_W = 480, PARTY_H = 320, PARTY_S = 2;

    // ── Pixel-exact FireRed party-screen assets (generated by
    //    tools/gen_party_assets.py from source/pokefirered). ──
    var PARTY_ASSET_DIR = 'src/assets/party/';
    var PARTY_IMG_NAMES = [
        'party_bg', 'main_norm', 'main_sel', 'main_action',
        'main_fainted', 'main_fainted_sel',
        'wide_norm', 'wide_sel', 'wide_action', 'wide_fainted',
        'wide_fainted_sel', 'wide_empty', 'cancel_norm', 'cancel_sel',
        'ball_closed', 'ball_open', 'hold_item', 'hold_mail', 'msg_frame',
        'font_small', 'font_normal',
        'status_psn', 'status_par', 'status_slp', 'status_frz',
        'status_brn', 'status_fnt'
    ];
    var _partyAssets = null;       // { img:{name:Image}, meta:{...} } once loaded
    var _partyAssetsLoading = false;
    var _partyAssetQueue = [];

    function _loadPartyAssets(cb) {
        if (_partyAssets) { cb(_partyAssets); return; }
        _partyAssetQueue.push(cb);
        if (_partyAssetsLoading) return;
        _partyAssetsLoading = true;
        var imgs = {}, pending = PARTY_IMG_NAMES.length + 1;
        var meta = null;
        function done() {
            if (--pending > 0) return;
            _partyAssets = { img: imgs, meta: meta || {} };
            _partyAssetsLoading = false;
            var q = _partyAssetQueue; _partyAssetQueue = [];
            q.forEach(function(f) { f(_partyAssets); });
        }
        PARTY_IMG_NAMES.forEach(function(name) {
            var img = new Image();
            img.onload = function() { imgs[name] = img; done(); };
            img.onerror = function() { imgs[name] = null; done(); };
            img.src = PARTY_ASSET_DIR + name + '.png';
        });
        fetch(PARTY_ASSET_DIR + 'party_meta.json')
            .then(function(r) { return r.json(); })
            .then(function(j) { meta = j; done(); })
            .catch(function() { done(); });
    }

    // Tint a font sheet (red px → fg, blue px → shadow) into a cached canvas.
    var _fontTintCache = {};
    function _tintFont(fontImg, fg, shadow) {
        if (!fontImg) return null;
        var key = fontImg.src + '|' + fg + '|' + shadow;
        if (_fontTintCache[key]) return _fontTintCache[key];
        var c = document.createElement('canvas');
        c.width = fontImg.width; c.height = fontImg.height;
        var x = c.getContext('2d');
        x.imageSmoothingEnabled = false;
        x.drawImage(fontImg, 0, 0);
        var d = x.getImageData(0, 0, c.width, c.height);
        var fgc = _hexToRgb(fg), shc = _hexToRgb(shadow);
        for (var i = 0; i < d.data.length; i += 4) {
            if (d.data[i+3] === 0) continue;
            var r = d.data[i], g = d.data[i+1], b = d.data[i+2];
            if (r > 200 && g < 80 && b < 80) {        // red marker → fg
                d.data[i] = fgc[0]; d.data[i+1] = fgc[1]; d.data[i+2] = fgc[2];
            } else if (b > 200 && r < 80 && g < 80) { // blue marker → shadow
                d.data[i] = shc[0]; d.data[i+1] = shc[1]; d.data[i+2] = shc[2];
            } else {
                d.data[i+3] = 0;
            }
        }
        x.putImageData(d, 0, 0);
        _fontTintCache[key] = c;
        return c;
    }
    function _hexToRgb(h) {
        h = h.replace('#', '');
        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    }

    // Glyph cell layout: font_small = 8×16 cells, 16 per row; font_normal = 16×16.
    function _glyphCell(fontKind, gid) {
        if (fontKind === 'small') return { sx: (gid % 16) * 8, sy: ((gid / 16) | 0) * 16, w: 8, h: 16 };
        return { sx: (gid % 16) * 16, sy: ((gid / 16) | 0) * 16, w: 16, h: 16 };
    }

    // Measure a string's pixel width in the given FR font.
    function _measureText(meta, fontKind, text) {
        var widths = fontKind === 'small' ? meta.smallWidths : meta.normalWidths;
        var cm = meta.charmap, w = 0;
        for (var i = 0; i < text.length; i++) {
            var gid = cm[text[i]];
            if (gid === undefined) { w += 6; continue; }
            w += widths[gid] || 6;
        }
        return w;
    }

    // Draw FR text at GBA-pixel (gx,gy), scaled by S, using a pre-tinted sheet.
    function _drawFRText(ctx, tintedSheet, meta, fontKind, text, gx, gy, S) {
        if (!tintedSheet) return gx;
        var widths = fontKind === 'small' ? meta.smallWidths : meta.normalWidths;
        var cm = meta.charmap;
        var cellH = 16;
        for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            var gid = cm[ch];
            if (gid === undefined) { gx += 6; continue; }
            var cell = _glyphCell(fontKind, gid);
            ctx.drawImage(tintedSheet, cell.sx, cell.sy, cell.w, cellH,
                gx * S, gy * S, cell.w * S, cellH * S);
            gx += widths[gid] || 6;
        }
        return gx;
    }

    // Right-align an int into a fixed-width field padded with spaces (FR style).
    function _intRightAlign(n, width) {
        var s = '' + n;
        while (s.length < width) s = ' ' + s;
        return s;
    }

    function _buildParty(el) {
        _partyActionOpen = false;
        el.style.cssText = 'padding:0;overflow:hidden;background:none;position:absolute;inset:0;';

        var backBtn = document.createElement('button');
        backBtn.textContent = 'B BACK'; backBtn.className = 'sm-back-btn';
        backBtn.style.cssText = 'position:absolute;bottom:4px;right:4px;z-index:10;pointer-events:all;';
        backBtn.addEventListener('click', _goBack);
        el.appendChild(backBtn);

        var canvas = document.createElement('canvas');
        canvas.width  = PARTY_W; canvas.height = PARTY_H;
        canvas.style.cssText = 'width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;';
        canvas.style.pointerEvents = 'all';
        el.appendChild(canvas);
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        var _iconImgs = [];

        // Strip the top-left corner colour (GBA transparent index) from a sprite image.
        // Returns a canvas element usable with drawImage.
        function _stripBg(img) {
            if (!img) return null;
            var oc = document.createElement('canvas');
            oc.width = img.width; oc.height = img.height;
            var ox = oc.getContext('2d');
            ox.imageSmoothingEnabled = false;
            ox.drawImage(img, 0, 0);
            var d = ox.getImageData(0, 0, oc.width, oc.height);
            // Sample top-left pixel as the transparent colour
            var tr = d.data[0], tg = d.data[1], tb = d.data[2];
            // Only strip if the corner is actually opaque (not already transparent)
            if (d.data[3] > 0) {
                for (var i = 0; i < d.data.length; i += 4) {
                    if (d.data[i] === tr && d.data[i+1] === tg && d.data[i+2] === tb) {
                        d.data[i+3] = 0;
                    }
                }
                ox.putImageData(d, 0, 0);
            }
            return oc;
        }

        // Fast redraw — reuses already-loaded mon icons + cached party assets.
        function redraw() {
            _loadPartyAssets(function(assets) { _drawPartyCanvas(ctx, assets, _iconImgs); });
        }

        function loadIconsAndDraw() {
            var party = _getParty();
            var filled = party.filter(Boolean);
            _iconImgs = new Array(filled.length).fill(null);
            if (!filled.length) { redraw(); return; }
            var pending = filled.length;
            function done() { if (--pending === 0) redraw(); }
            filled.forEach(function(mon, i) {
                _loadMonIcon(mon.speciesId, function(img) { _iconImgs[i] = _stripBg(img); done(); });
            });
        }

        el._redraw = loadIconsAndDraw;
        // Expose fast redraw for action-menu state changes (no image reload needed)
        el._redrawFast = redraw;
        loadIconsAndDraw();

        canvas.addEventListener('click', function(e) {
            var rect = canvas.getBoundingClientRect();
            // Map to GBA coords
            var gx = (e.clientX - rect.left) * (PARTY_W / rect.width)  / PARTY_S;
            var gy = (e.clientY - rect.top)  * (PARTY_H / rect.height) / PARTY_S;
            var filled = _getParty().filter(Boolean);

            // Action menu open — handle its clicks
            if (_partyActionOpen) {
                // Menu is drawn at ax=130, ay=48, rowH=14, rows with 3px top padding
                var ax = 130, ay = 51, aw = 102, rowH = 14;
                var opts = _battlePartyCallback ? ['Switch', 'Cancel'] : ['Details', 'Item', 'Cancel'];
                for (var oi = 0; oi < opts.length; oi++) {
                    var ry = ay + oi * rowH;
                    if (gx >= ax && gx < ax+aw && gy >= ry && gy < ry+rowH) {
                        if (opts[oi] === 'Cancel') {
                            _partyActionOpen = false; redraw();
                        } else if (opts[oi] === 'Switch') {
                            var _pCb2 = _battlePartyCallback;
                            var _pMon2 = _partyActionMon;
                            _battlePartyCallback = null; _battlePartyCancel = null;
                            close();
                            if (_pCb2) _pCb2(_pMon2);
                        } else if (opts[oi] === 'Details') {
                            _partyActionOpen = false;
                            _openPartySummary(_partyActionMon, _partyActionIdx, filled, loadIconsAndDraw);
                        }
                        return;
                    }
                }
                _partyActionOpen = false; redraw(); return;
            }

            // Lead box (slot 0): GBA x=8..87, y=24..79
            if (gx >= 8 && gx < 88 && gy >= 24 && gy < 80 && filled[0]) {
                _subIdx = 0;
                _partyActionMon = filled[0]; _partyActionIdx = 0;
                _partyActionOpen = true; _partyActionSel = 0; redraw(); return;
            }
            // Slots 1-5 right column: GBA x=96..239, rows at y=8/32/56/80/104
            for (var si = 1; si < 6; si++) {
                var sy = 8 + (si - 1) * 24;
                if (gx >= 96 && gx < 240 && gy >= sy && gy < sy+24 && filled[si]) {
                    _subIdx = si;
                    _partyActionMon = filled[si]; _partyActionIdx = si;
                    _partyActionOpen = true; _partyActionSel = 0; redraw(); return;
                }
            }
            // Cancel button: GBA x>=180, y>=132
            if (gx >= 180 && gy >= 132) { _goBack(); }
        });
    }

    function _openPartySummary(mon, idx, filled, returnCb) {
        var subEl = document.getElementById('start-menu-sub');
        if (!subEl) return;
        // Remove any existing summary overlay
        var existing = subEl.querySelector('.party-summary-overlay');
        if (existing) existing.remove();
        var win = document.createElement('div');
        win.className = 'sm-win party-summary-overlay';
        win.style.cssText = 'position:absolute;left:3.3%;top:5%;width:90%;height:90%;pointer-events:all;overflow:hidden;z-index:20;';
        subEl.appendChild(win);

        var S = 2;
        var canvas = document.createElement('canvas');
        canvas.width = GBA_W * S; canvas.height = GBA_H * S;
        canvas.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;display:block;';
        win.appendChild(canvas);
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        var TABS = ['Pokémon Info', 'Pokémon Skills', 'Battle Moves', 'Contest Moves'];
        var _tab = 0;
        var _frontImg = null;

        var TYPE_COLORS_SUM = {
            Normal:'#a8a878',Fire:'#f08030',Water:'#6890f0',Electric:'#f8d030',
            Grass:'#78c850',Ice:'#98d8d8',Fighting:'#c03028',Poison:'#a040a0',
            Ground:'#e0c068',Flying:'#a890f0',Psychic:'#f85888',Bug:'#a8b820',
            Rock:'#b8a038',Ghost:'#705898',Dragon:'#7038f8',Dark:'#705848',Steel:'#b8b8d0'
        };

        function _monDisplayName(m) {
            if (m.nickname) return m.nickname;
            if (typeof m.speciesId === 'string') return m.speciesId.toUpperCase();
            return '???';
        }

        // Load front sprite
        _getPokedexNumMap(function(map) {
            var name = _speciesName(mon.speciesId, map);
            if (!name) { drawSummary(); return; }
            var img = new Image();
            img.onload = function() { _frontImg = img; drawSummary(); };
            img.onerror = function() { drawSummary(); };
            img.src = 'data/sprites/pokemon/front/' + name + '.png';
        });

        function drawSummary() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = false;

            // Right panel purple bg (EE ref)
            ctx.fillStyle = '#7858b0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Header bar (purple gradient)
            var hdrGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
            hdrGrad.addColorStop(0, '#8848b8'); hdrGrad.addColorStop(0.6, '#c878e8'); hdrGrad.addColorStop(1, '#e8a8f8');
            ctx.fillStyle = hdrGrad;
            ctx.fillRect(0, 0, canvas.width, 14*S);

            // Tab title (small sans-serif, EE style)
            ctx.font = 'bold '+(7*S)+'px Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textBaseline = 'middle';
            ctx.fillText(TABS[_tab], 6*S, 7*S);

            // 4 tab dots
            for (var ti = 0; ti < 4; ti++) {
                ctx.fillStyle = ti === _tab ? '#ffffff' : 'rgba(255,255,255,0.4)';
                ctx.beginPath(); ctx.arc((GBA_W/2 - 14 + ti*10)*S, 7*S, 2*S, 0, Math.PI*2); ctx.fill();
            }

            // "A Cancel" right
            ctx.font = (7*S)+'px Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'right';
            ctx.fillText('A Cancel', (GBA_W-4)*S, 7*S);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            // Left panel (teal, EE ref)
            ctx.fillStyle = '#88b098';
            ctx.fillRect(0, 14*S, 88*S, 134*S);
            ctx.fillStyle = '#a0c8b0';
            ctx.fillRect(87*S, 14*S, S, 134*S);

            // Dex number + gender
            ctx.font = (7*S)+'px Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textBaseline = 'top';
            var _dexNum = (typeof mon.speciesId === 'number') ? mon.speciesId :
                ((_pokedexNumMap && Object.keys(_pokedexNumMap).find(function(k){ return _pokedexNumMap[k] === (mon.speciesId||'').toLowerCase(); })) || '???');
            ctx.fillText('No.' + String(_dexNum).padStart(3,'0'), 4*S, 16*S);
            if (mon.gender) {
                ctx.fillStyle = mon.gender === 'M' ? '#80b8ff' : '#f87898';
                ctx.fillText(mon.gender === 'M' ? '♂' : '♀', 50*S, 16*S);
            }

            // Front sprite
            if (_frontImg) {
                ctx.drawImage(_frontImg, Math.round((44-32)*S), 24*S, 64*S, 64*S);
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                ctx.beginPath(); ctx.arc(44*S, 56*S, 28*S, 0, Math.PI*2); ctx.fill();
            }

            // Species name + nickname
            ctx.font = (8*S)+'px Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            var speciesStr = (typeof mon.speciesId === 'string') ? mon.speciesId : ('No.'+_dexNum);
            ctx.fillText(speciesStr, 4*S, 92*S);
            ctx.fillStyle = '#c0e8d0';
            ctx.fillText('/' + _monDisplayName(mon), 4*S, 103*S);

            // Pokeball + lv + gender (bottom of left panel)
            var pbx = 10*S, pby = 120*S;
            ctx.fillStyle = '#e82020'; ctx.beginPath(); ctx.arc(pbx, pby, 5*S, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.arc(pbx, pby, 5*S, 0, Math.PI); ctx.fill();
            ctx.strokeStyle = '#181818'; ctx.lineWidth = S;
            ctx.beginPath(); ctx.arc(pbx, pby, 5*S, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(pbx-5*S, pby); ctx.lineTo(pbx+5*S, pby); ctx.stroke();
            ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.arc(pbx, pby, 1.5*S, 0, Math.PI*2); ctx.fill();
            ctx.font = (8*S)+'px Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('lv' + (mon.level||1), 18*S, 116*S);
            if (mon.gender) {
                ctx.fillStyle = mon.gender === 'M' ? '#80b8ff' : '#f87898';
                ctx.fillText(mon.gender === 'M' ? '♂' : '♀', 56*S, 116*S);
            }

            // Right panel section helper (olive header bar, EE style)
            function secHdr(label, gy) {
                ctx.fillStyle = '#909830';
                ctx.fillRect(88*S, gy*S, (GBA_W-88)*S, 10*S);
                ctx.font = 'bold '+(7*S)+'px Arial, sans-serif';
                ctx.fillStyle = '#f8f8e0';
                ctx.fillText(label, 94*S, (gy+1)*S);
            }

            var rx = 94, rowH = 12;
            ctx.textBaseline = 'top';

            if (_tab === 0) {
                secHdr('PROFILE', 14);
                ctx.font = (8*S)+'px Arial, sans-serif';
                // OT and ID on same row (EE ref3)
                ctx.fillStyle = '#d0d8c0'; ctx.fillText('OT/', rx*S, 27*S);
                ctx.fillStyle = '#f8f8f8'; ctx.fillText(mon.otName||'Player', (rx+16)*S, 27*S);
                ctx.fillStyle = '#d0d8c0'; ctx.fillText('ID No.', (rx+70)*S, 27*S);
                ctx.fillStyle = '#f8f8f8'; ctx.fillText(String(mon.otId||'00000').padStart(5,'0'), (rx+100)*S, 27*S);

                // Type
                var types = Array.isArray(mon.type) ? mon.type : [mon.type||'Normal'];
                ctx.fillStyle = '#d0d8c0'; ctx.fillText('Type/', rx*S, 41*S);
                types.forEach(function(t, ti) {
                    var tx2 = (rx+26+ti*34)*S;
                    ctx.fillStyle = TYPE_COLORS_SUM[t] || '#a8a878';
                    ctx.fillRect(tx2, 41*S, 30*S, 9*S);
                    ctx.font = (7*S)+'px Arial, sans-serif';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(t.toUpperCase(), tx2+2, 42*S);
                    ctx.font = (8*S)+'px Arial, sans-serif';
                });

                secHdr('ABILITY', 53);
                ctx.font = (8*S)+'px Arial, sans-serif';
                ctx.fillStyle = '#f8f8f8'; ctx.fillText(mon.ability||'Run Away', rx*S, 65*S);
                ctx.fillStyle = '#d8e8d0'; ctx.fillText('Makes escaping easier.', rx*S, 77*S);

                secHdr('TRAINER MEMO', 89);
                ctx.font = (8*S)+'px Arial, sans-serif';
                ctx.fillStyle = '#e8b030'; ctx.fillText((mon.nature||'Hardy') + ' nature,', rx*S, 101*S);
                ctx.fillStyle = '#f8f8f8'; ctx.fillText('met at lv ' + (mon.metLevel||mon.level||1) + ',', rx*S, 113*S);
                ctx.fillStyle = '#e8b030'; ctx.fillText(mon.metLocation||'Littleroot Town.', rx*S, 125*S);

            } else if (_tab === 1) {
                // ITEM + RIBBON headers
                var hw = Math.floor((GBA_W-88)/2);
                ctx.fillStyle = '#909830'; ctx.fillRect(88*S, 14*S, hw*S, 10*S);
                ctx.fillStyle = '#706820'; ctx.fillRect((88+hw)*S, 14*S, (GBA_W-88-hw)*S, 10*S);
                ctx.font = 'bold '+(7*S)+'px Arial, sans-serif';
                ctx.fillStyle = '#f8f8e0';
                ctx.fillText('ITEM', rx*S, 15*S);
                ctx.fillText('RIBBON', (rx+76)*S, 15*S);
                // Item/ribbon value boxes
                ctx.fillStyle = '#e8f0e8';
                ctx.fillRect(88*S, 24*S, (hw-2)*S, 11*S);
                ctx.fillRect((88+hw+2)*S, 24*S, (GBA_W-88-hw-4)*S, 11*S);
                ctx.font = (8*S)+'px Arial, sans-serif';
                ctx.fillStyle = '#181818';
                ctx.fillText(mon.heldItem||'None', rx*S, 25*S);
                ctx.fillText('None', (rx+76)*S, 25*S);

                secHdr('STATS', 37);
                ctx.font = (8*S)+'px Arial, sans-serif';
                // HP row with current/max
                ctx.fillStyle = '#d0d8c0'; ctx.fillText('HP', rx*S, 49*S);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#f8f8f8'; ctx.fillText(String(mon.currentHp||0)+'/', (rx+46)*S, 49*S);
                ctx.fillText(String(mon.maxHp||0), (rx+60)*S, 49*S);
                ctx.textAlign = 'left';
                // Stat pairs
                var statPairs = [
                    ['Attack', mon.atk||0, 'Sp. Atk', mon.spAtk||0],
                    ['Defense', mon.def||0, 'Sp. Def', mon.spDef||0],
                    ['Speed', mon.speed||0, null, null],
                ];
                var sry = 61;
                statPairs.forEach(function(sp) {
                    ctx.fillStyle = '#d0d8c0'; ctx.fillText(sp[0], rx*S, sry*S);
                    ctx.textAlign = 'right';
                    ctx.fillStyle = sp[1] >= 100 ? '#40d870' : sp[1] < 50 ? '#f04040' : '#f8f8f8';
                    ctx.fillText(String(sp[1]), (rx+58)*S, sry*S);
                    if (sp[2]) {
                        ctx.textAlign = 'left';
                        ctx.fillStyle = '#d0d8c0'; ctx.fillText(sp[2], (rx+64)*S, sry*S);
                        ctx.textAlign = 'right';
                        ctx.fillStyle = sp[3] >= 100 ? '#40d870' : sp[3] < 50 ? '#f04040' : '#f8f8f8';
                        ctx.fillText(String(sp[3]), (rx+128)*S, sry*S);
                    }
                    ctx.textAlign = 'left';
                    sry += rowH;
                });

                secHdr('EXP. POINTS', sry + 2);
                sry += 14;
                ctx.font = (8*S)+'px Arial, sans-serif';
                ctx.fillStyle = '#d0d8c0'; ctx.fillText('Exp. Points', rx*S, sry*S);
                ctx.textAlign = 'right'; ctx.fillStyle = '#f8f8f8';
                ctx.fillText(String(mon.exp||0), (GBA_W-4)*S, sry*S); ctx.textAlign = 'left';
                sry += rowH;
                ctx.fillStyle = '#d0d8c0'; ctx.fillText('Next Lv.', rx*S, sry*S);
                ctx.textAlign = 'right'; ctx.fillStyle = '#f8f8f8';
                ctx.fillText(String(Math.max(0,(mon.expToNext||1000)-(mon.exp||0))), (GBA_W-4)*S, sry*S);
                ctx.textAlign = 'left';
                sry += rowH + 2;
                // EXP bar
                ctx.fillStyle = '#484830'; ctx.fillRect(88*S, sry*S, (GBA_W-88)*S, 4*S);
                var expPct = Math.min(1, (mon.exp||0)/Math.max(1,(mon.expToNext||1000)));
                ctx.fillStyle = '#3888f0'; ctx.fillRect(88*S, sry*S, Math.round(expPct*(GBA_W-88))*S, 4*S);
                ctx.font = (6*S)+'px Arial, sans-serif'; ctx.fillStyle = '#f8f8e0';
                ctx.fillText('EXP', (88+2)*S, sry*S);

            } else if (_tab === 2 || _tab === 3) {
                var moves = (mon.moves||[]).slice(0,4);
                var mry = 16;
                for (var mi = 0; mi < 4; mi++) {
                    var mv = moves[mi] || null;
                    ctx.fillStyle = '#604880'; ctx.fillRect(89*S, mry*S, (GBA_W-90)*S, 30*S);
                    ctx.fillStyle = mv ? '#9878c8' : '#7858a8'; ctx.fillRect(90*S, (mry+1)*S, (GBA_W-92)*S, 28*S);
                    if (!mv) {
                        ctx.font = (8*S)+'px Arial, sans-serif'; ctx.fillStyle = '#b8a8d8';
                        ctx.fillText('—', rx*S, (mry+10)*S);
                    } else {
                        var mtype = (typeof mv === 'object') ? (mv.type||'Normal') : 'Normal';
                        var mname = (typeof mv === 'string') ? mv : (mv.name||'???');
                        ctx.fillStyle = TYPE_COLORS_SUM[mtype] || '#a8a878';
                        ctx.fillRect(rx*S, (mry+2)*S, 30*S, 9*S);
                        ctx.font = (7*S)+'px Arial, sans-serif'; ctx.fillStyle = '#ffffff';
                        ctx.fillText(mtype.slice(0,5).toUpperCase(), (rx+1)*S, (mry+3)*S);
                        ctx.font = (8*S)+'px Arial, sans-serif'; ctx.fillStyle = '#f8f8f8';
                        ctx.fillText(mname, (rx+34)*S, (mry+3)*S);
                        var ppStr = (typeof mv === 'object') ? ('PP '+(mv.pp||'?')+'/'+(mv.maxPp||'?')) : '';
                        if (ppStr) { ctx.font = (7*S)+'px Arial, sans-serif'; ctx.fillStyle = '#d0c8e8'; ctx.fillText(ppStr, (rx+34)*S, (mry+15)*S); }
                    }
                    mry += 33;
                }
            }

            // Bottom hint bar
            ctx.fillStyle = '#4a3870';
            ctx.fillRect(0, 148*S, canvas.width, 12*S);
            ctx.font = (7*S)+'px Arial, sans-serif';
            ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle';
            ctx.fillText('B: Back   L/R: Change page', 8*S, 154*S);
            ctx.textBaseline = 'top';
        }

        // Tab navigation via click
        canvas.addEventListener('click', function(e) {
            var rect = canvas.getBoundingClientRect();
            var gx = (e.clientX - rect.left) * (GBA_W / rect.width);
            if (gx < 30) { _tab = (_tab - 1 + 4) % 4; drawSummary(); }
            else if (gx > GBA_W - 30) { _tab = (_tab + 1) % 4; drawSummary(); }
        });

        // Expose tab navigation so L/R can be wired if needed
        win._tabLeft  = function() { _tab = (_tab - 1 + 4) % 4; drawSummary(); };
        win._tabRight = function() { _tab = (_tab + 1) % 4; drawSummary(); };

        var backBtn = document.createElement('button');
        backBtn.textContent = 'B BACK'; backBtn.className = 'sm-back-btn';
        backBtn.style.cssText = 'position:absolute;bottom:4px;right:4px;z-index:10;pointer-events:all;';
        backBtn.addEventListener('click', function() {
            win.remove();
            if (returnCb) returnCb();
        });
        win.appendChild(backBtn);
    }

    // ── FireRed party screen — pixel-exact renderer ──
    // Layout constants from source/pokefirered (PARTY_LAYOUT_SINGLE).
    // Info-rect offsets are relative to each slot box's origin; sprite coords
    // are absolute screen centres.
    var PT_LEAD_BOX  = { x: 8, y: 24, w: 80, h: 56 };
    var PT_WIDE_YS   = [8, 32, 56, 80, 104];
    var PT_RECTS_LEFT = {
        nick: [24, 11], lvl: [32, 20], gen: [64, 20],
        hpCur: [38, 36], hpMax: [53, 36], hpBar: [24, 35]
    };
    var PT_RECTS_RIGHT = {
        nick: [22, 3], lvl: [32, 12], gen: [64, 12],
        hpCur: [102, 12], hpMax: [117, 12], hpBar: [88, 10]
    };
    // [iconCx,iconCy, heldCx,heldCy, statusCx,statusCy, ballCx,ballCy]
    var PT_SPRITES = [
        [16, 40, 20, 50, 56, 52, 16, 34],     // lead
        [104, 18, 108, 28, 144, 27, 102, 25], // slot 1
        [104, 42, 108, 52, 144, 51, 102, 49], // slot 2
        [104, 66, 108, 76, 144, 75, 102, 73], // slot 3
        [104, 90, 108, 100, 144, 99, 102, 97],// slot 4
        [104, 114, 108, 124, 144, 123, 102, 121] // slot 5
    ];

    function _drawPartyCanvas(ctx, assets, iconImgs) {
        var S = PARTY_S; // 2
        var img = assets.img || {}, meta = assets.meta || {};
        var colors = meta.colors || {};
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, PARTY_W, PARTY_H);

        if (img.party_bg) ctx.drawImage(img.party_bg, 0, 0, PARTY_W, PARTY_H);

        var party  = _getParty();
        var filled = party.filter(Boolean);

        // Pre-tinted fonts for the colour sets the screen uses.
        var boxC  = colors.boxText  || { fg: '#ffffff', shadow: '#737373' };
        var msgC  = colors.msgText  || { fg: '#626262', shadow: '#d5d5cd' };
        var canC  = colors.cancelText || { fg: '#d5d5cd', shadow: '#626262' };
        var genM  = colors.genderM  || { fg: '#41cdff', shadow: '#006294' };
        var genF  = colors.genderF  || { fg: '#ff9c94', shadow: '#9c4139' };
        var fSmallBox = _tintFont(img.font_small, boxC.fg, boxC.shadow);
        var fSmallCan = _tintFont(img.font_small, canC.fg, canC.shadow);
        var fSmallM   = _tintFont(img.font_small, genM.fg, genM.shadow);
        var fSmallF   = _tintFont(img.font_small, genF.fg, genF.shadow);
        var fNormMsg  = _tintFont(img.font_normal, msgC.fg, msgC.shadow);

        function drawImg(im, gx, gy, w, h) {
            if (!im) return;
            ctx.drawImage(im, gx * S, gy * S, (w || im.width) * S, (h || im.height) * S);
        }

        // Colored HP fill over the box's baked trough (2px tall, max 47 wide).
        function drawHpFill(gx, gy, pct) {
            var hp = pct > 0.5 ? (colors.hpGreen || ['#73ffac', '#5ad583'])
                   : pct > 0.2 ? (colors.hpYellow || ['#ffe639', '#cdac08'])
                   :              (colors.hpRed || ['#ff7331', '#c53900']);
            var w = Math.max(0, Math.min(47, Math.round(pct * 48)));
            if (w <= 0) return;
            ctx.fillStyle = hp[0]; ctx.fillRect(gx * S, gy * S, w * S, S);
            ctx.fillStyle = hp[1]; ctx.fillRect(gx * S, (gy + 1) * S, w * S, S);
        }

        // Draw a mon's text + sprites. box origin (ox,oy); rects relative;
        // spr = absolute sprite-centre array.
        function drawMonInfo(mon, ox, oy, rects, spr, iconImg) {
            if (!mon) return;
            var hpPct = mon.maxHp > 0 ? Math.max(0, Math.min(1, (mon.currentHp || 0) / mon.maxHp)) : 0;

            if (iconImg)        drawImg(iconImg,        spr[0] - 16, spr[1] - 16, 32, 32);
            if (img.ball_closed) drawImg(img.ball_closed, spr[6] - 16, spr[7] - 16, 32, 32);

            var name = mon.nickname || (typeof mon.speciesId === 'string' ? mon.speciesId.toUpperCase() : '???');
            _drawFRText(ctx, fSmallBox, meta, 'small', name, ox + rects.nick[0], oy + rects.nick[1], S);
            _drawFRText(ctx, fSmallBox, meta, 'small', '\x01' + (mon.level || 1), ox + rects.lvl[0], oy + rects.lvl[1], S);
            if (mon.gender === 'M')      _drawFRText(ctx, fSmallM, meta, 'small', '♂', ox + rects.gen[0], oy + rects.gen[1], S);
            else if (mon.gender === 'F') _drawFRText(ctx, fSmallF, meta, 'small', '♀', ox + rects.gen[0], oy + rects.gen[1], S);

            drawHpFill(ox + rects.hpBar[0], oy + rects.hpBar[1] + 1, hpPct);
            _drawFRText(ctx, fSmallBox, meta, 'small', _intRightAlign(mon.currentHp || 0, 3) + '/', ox + rects.hpCur[0], oy + rects.hpCur[1], S);
            _drawFRText(ctx, fSmallBox, meta, 'small', _intRightAlign(mon.maxHp || 0, 3),          ox + rects.hpMax[0], oy + rects.hpMax[1], S);

            var stKey = null;
            if (hpPct <= 0) stKey = 'status_fnt';
            else if (mon.statusCondition) stKey = 'status_' + String(mon.statusCondition).toLowerCase();
            if (stKey && img[stKey]) drawImg(img[stKey], spr[4] - 16, spr[5] - 4, 32, 8);
            if (mon.heldItem && img.hold_item) drawImg(img.hold_item, spr[2] - 4, spr[3] - 4, 8, 8);
        }

        // Pick the box graphic for a slot given its state.
        function boxKey(prefix, mon, isSel, isAction) {
            var fainted = mon && (mon.maxHp > 0 ? (mon.currentHp || 0) <= 0 : false);
            if (isAction) return prefix + '_action';
            if (fainted)  return prefix + (isSel ? '_fainted_sel' : '_fainted');
            return prefix + (isSel ? '_sel' : '_norm');
        }

        // ── Lead box (slot 0) ──
        var leadSel = (_subIdx === 0);
        var leadAction = _partyActionOpen && _partyActionIdx === 0;
        drawImg(img[boxKey('main', filled[0], leadSel, leadAction)], PT_LEAD_BOX.x, PT_LEAD_BOX.y);
        if (filled[0]) drawMonInfo(filled[0], PT_LEAD_BOX.x, PT_LEAD_BOX.y, PT_RECTS_LEFT, PT_SPRITES[0], iconImgs[0]);

        // ── Wide slots (1–5) ──
        for (var i = 1; i < 6; i++) {
            var oy = PT_WIDE_YS[i - 1];
            var mon = filled[i] || null;
            if (!mon) { drawImg(img.wide_empty, 96, oy); continue; }
            var sel = (_subIdx === i);
            var act = _partyActionOpen && _partyActionIdx === i;
            drawImg(img[boxKey('wide', mon, sel, act)], 96, oy);
            drawMonInfo(mon, 96, oy, PT_RECTS_RIGHT, PT_SPRITES[i], iconImgs[i]);
        }

        // ── Message box (type7 frame) ──
        var fill = (colors.msgFrameFill) || '#ffffff';
        _draw9Slice(ctx, img.msg_frame, 0, 128, 184, 32, fill, S);

        if (_partyActionOpen && _partyActionMon) {
            var aName = _partyActionMon.nickname ||
                (typeof _partyActionMon.speciesId === 'string' ? _partyActionMon.speciesId.toUpperCase() : '???');
            _drawFRText(ctx, fNormMsg, meta, 'normal', 'Do what with', 10, 132, S);
            _drawFRText(ctx, fNormMsg, meta, 'normal', aName + '?', 10, 146, S);
            _drawPartyActionMenu(ctx, img, meta, fSmallBox, fill);
        } else {
            _drawFRText(ctx, fNormMsg, meta, 'normal', 'Choose a POKéMON.', 12, 139, S);
        }

        // ── Cancel button ──
        var cancelSel = (_subIdx >= filled.length);
        drawImg(cancelSel ? img.cancel_sel : img.cancel_norm, 184, 136);
        drawImg(cancelSel && img.ball_open ? img.ball_open : img.ball_closed, 198 - 16, 148 - 16, 32, 32);
        var cw = _measureText(meta, 'small', 'CANCEL');
        var cx = 192 + 3 + Math.floor((48 - cw) / 2);
        _drawFRText(ctx, fSmallCan, meta, 'small', 'CANCEL', cx, 140, S);
    }

    // 9-slice draw of a 24×24 (3×3 tiles of 8px) frame, with solid interior fill.
    function _draw9Slice(ctx, frame, gx, gy, gw, gh, fillColor, S) {
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fillRect((gx + 8) * S, (gy + 8) * S, (gw - 16) * S, (gh - 16) * S);
        }
        if (!frame) return;
        var c = 8;
        // corners
        ctx.drawImage(frame, 0, 0, c, c, gx * S, gy * S, c * S, c * S);
        ctx.drawImage(frame, 16, 0, c, c, (gx + gw - c) * S, gy * S, c * S, c * S);
        ctx.drawImage(frame, 0, 16, c, c, gx * S, (gy + gh - c) * S, c * S, c * S);
        ctx.drawImage(frame, 16, 16, c, c, (gx + gw - c) * S, (gy + gh - c) * S, c * S, c * S);
        // edges (stretched)
        ctx.drawImage(frame, 8, 0, c, c, (gx + c) * S, gy * S, (gw - 2 * c) * S, c * S);
        ctx.drawImage(frame, 8, 16, c, c, (gx + c) * S, (gy + gh - c) * S, (gw - 2 * c) * S, c * S);
        ctx.drawImage(frame, 0, 8, c, c, gx * S, (gy + c) * S, c * S, (gh - 2 * c) * S);
        ctx.drawImage(frame, 16, 8, c, c, (gx + gw - c) * S, (gy + c) * S, c * S, (gh - 2 * c) * S);
    }

    // Action menu popup (Summary / Switch / Item / Cancel) in a type7 frame.
    function _drawPartyActionMenu(ctx, img, meta, fontSmall, fillColor) {
        var S = PARTY_S;
        var opts = _battlePartyCallback ? ['SWITCH', 'CANCEL'] : ['SUMMARY', 'ITEM', 'CANCEL'];
        var rowH = 16, padX = 14, padY = 8;
        var aw = 80, ah = padY * 2 + opts.length * rowH;
        var ax = 240 - aw, ay = 128 - ah;
        _draw9Slice(ctx, img.msg_frame, ax, ay, aw, ah, fillColor, S);
        for (var i = 0; i < opts.length; i++) {
            var ry = ay + padY + i * rowH;
            if (i === _partyActionSel) {
                _drawFRText(ctx, fontSmall, meta, 'small', '▶', ax + 4, ry + 2, S);
            }
            _drawFRText(ctx, fontSmall, meta, 'small', opts[i], ax + padX, ry + 2, S);
        }
    }

    // --- Pokédex ---
    var _dexDb   = null;   // full pokedex.json
    var _dexList = null;   // array of entries sorted by num
    var _dexEntry = null;  // currently viewed entry

    var TYPE_COLORS = {
        Normal:'#a8a878',Fire:'#f08030',Water:'#6890f0',Electric:'#f8d030',
        Grass:'#78c850',Ice:'#98d8d8',Fighting:'#c03028',Poison:'#a040a0',
        Ground:'#e0c068',Flying:'#a890f0',Psychic:'#f85888',Bug:'#a8b820',
        Rock:'#b8a038',Ghost:'#705898',Dragon:'#7038f8',Dark:'#705848',
        Steel:'#b8b8d0',
    };

    function _loadDex(cb) {
        if (_dexDb) { cb(_dexDb); return; }
        fetch('data/pokemon/pokedex.json')
            .then(function(r){ return r.ok ? r.json() : {}; })
            .then(function(d){
                _dexDb = d;
                _dexList = Object.values(d).sort(function(a,b){ return a.num - b.num; });
                cb(_dexDb);
            })
            .catch(function(){ _dexDb = {}; _dexList = []; cb({}); });
    }

    function _buildPokedex(el) {
        if (!_dexList) {
            _makeCanvasShell(el, function(ctx) {
                _canvasBg(ctx, null);
                ctx.textBaseline = 'top';
                ctx.font = '16px "Press Start 2P", monospace';
                ctx.fillStyle = '#b4b4b4';
                ctx.fillText('Loading Pokedex...', 20, 60);
            });
            _loadDex(function(){ _render(); });
            return;
        }

        var shell = _makeCanvasShell(el, function(ctx, canvas) {
            _loadPokedexBg(function(bg) {
                _drawPokedexCanvas(ctx, bg);
            });
            canvas.addEventListener('click', function(e) {
                var rect = canvas.getBoundingClientRect();
                var cy = (e.clientY - rect.top) * (160 / rect.height);
                // rows start at y=24, 14px each, 9 visible
                if (cy >= 24 && cy < 24 + 9*14 && _dexList) {
                    var WIN = 9;
                    var start = Math.max(0, _subIdx - Math.floor(WIN/2));
                    var row = Math.floor((cy - 24) / 14);
                    var clickedIdx = start + row;
                    if (clickedIdx >= 0 && clickedIdx < _dexList.length) {
                        _subIdx = clickedIdx;
                        var _clkSaved = window.GameSave && GameSave.state && GameSave.state.pokedex;
                        var _clkSeen  = new Set((_clkSaved && _clkSaved.seen) || []);
                        if (_clkSeen.has(_dexList[clickedIdx].num)) {
                            _dexEntry = _dexList[clickedIdx];
                            page = 'pokedex_entry'; _subIdx = 0;
                        }
                        _render();
                    }
                }
            });
        });
    }

    function _drawPokedexCanvas(ctx, bg) {
        _canvasBg(ctx, bg);
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
        ctx.fillText('POKEDEX', 8*S, 5*S);

        if (!_dexList || !_dexList.length) {
            ctx.fillStyle = COL_DIM;
            ctx.font = (7*S)+'px "Press Start 2P", monospace';
            ctx.fillText('No data loaded.', 8*S, 40*S);
            return;
        }

        var saved = window.GameSave && GameSave.state && GameSave.state.pokedex;
        var seen   = new Set((saved && saved.seen)   || []);
        var caught = new Set((saved && saved.caught) || []);

        var WIN = 9;
        var start = Math.max(0, _subIdx - Math.floor(WIN/2));
        if (start + WIN > _dexList.length) start = Math.max(0, _dexList.length - WIN);
        var end = Math.min(_dexList.length, start + WIN);

        ctx.font = (7*S)+'px "Press Start 2P", monospace';
        ctx.textBaseline = 'middle';
        for (var relI = 0; relI < end - start; relI++) {
            var absI = start + relI;
            var entry = _dexList[absI];
            var rowTop = (24 + relI * 14) * S;
            var rowMid = rowTop + 7*S;
            var isSel = absI === _subIdx;
            var hasSeen = seen.has(entry.num);
            var hasCaught = caught.has(entry.num);

            if (isSel) {
                ctx.fillStyle = 'rgba(230,8,8,0.12)';
                ctx.fillRect(0, rowTop, GBA_W, 14*S);
                ctx.fillStyle = COL_CYAN;
                ctx.fillRect(0, rowTop, 2*S, 14*S);
            }

            // Arrow
            ctx.fillStyle = isSel ? COL_CYAN : 'transparent';
            ctx.fillText('▶', 2*S, rowMid);

            // Dex num
            ctx.fillStyle = '#ffffff';
            ctx.fillText(String(entry.num).padStart(3,'0'), 10*S, rowMid);

            // Caught dot
            if (hasCaught) {
                ctx.fillStyle = COL_CYAN;
                ctx.fillText('●', 218*S, rowMid);
            } else if (hasSeen) {
                ctx.fillStyle = '#888899';
                ctx.fillText('○', 218*S, rowMid);
            }

            // Name — white if seen, ??? if not
            ctx.fillStyle = '#ffffff';
            ctx.fillText(hasSeen ? entry.name : '???', 36*S, rowMid);

            // Type tags (seen only)
            if (hasSeen && entry.types) {
                var tx = 110*S;
                for (var ti = 0; ti < Math.min(2, entry.types.length); ti++) {
                    var tname = entry.types[ti];
                    var tcol = TYPE_COLORS[tname] || '#888888';
                    var tw = ctx.measureText(tname).width + 4*S;
                    ctx.fillStyle = tcol;
                    ctx.fillRect(tx, rowTop + 2*S, tw, 10*S);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(tname, tx + 2*S, rowMid);
                    tx += tw + 2*S;
                }
            }
        }

        // Scroll hint
        ctx.fillStyle = _tc.titleBg;
        ctx.fillRect(0, 153*S, GBA_W, 7*S);
        ctx.fillStyle = COL_CYAN;
        ctx.fillRect(0, 153*S, GBA_W, 1);
        ctx.font = (7*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = COL_DIM;
        ctx.fillText((_subIdx+1) + ' / ' + _dexList.length, 4*S, 154*S);
        if (start > 0) { ctx.fillStyle = COL_CYAN; ctx.font=(7*S)+'px "Press Start 2P", monospace'; ctx.fillText('▲', GBA_W-12*S, 22*S); }
        if (end < _dexList.length) { ctx.fillStyle = COL_CYAN; ctx.font=(7*S)+'px "Press Start 2P", monospace'; ctx.fillText('▼', GBA_W-12*S, 150*S); }
    }

    function _buildPokedexEntry(el) {
        var entry = _dexEntry;
        if (!entry) return;

        var keyName = _dexDb ? (Object.keys(_dexDb).find(function(k){ return _dexDb[k] === entry; }) || entry.name.toLowerCase()) : entry.name.toLowerCase();

        var shell = _makeCanvasShell(el, function(ctx, canvas) {
            _drawPokedexEntryCanvas(ctx, entry, keyName, null);

            // Load front sprite as image for drawing
            var spriteImg = new Image();
            spriteImg.onload = function() { _drawPokedexEntryCanvas(ctx, entry, keyName, spriteImg); };
            spriteImg.onerror = function() { /* no sprite */ };
            spriteImg.src = 'data/sprites/pokemon/front/' + keyName + '.png';

            // Tab buttons
            var tabsEl = document.createElement('div');
            tabsEl.style.cssText = 'position:absolute;top:72px;left:96px;display:flex;gap:2px;z-index:10;pointer-events:all;';
            ['Info','Stats','Moves'].forEach(function(t, i) {
                var btn = document.createElement('button');
                btn.className = 'sm-back-btn' + (_subIdx === i ? ' active' : '');
                btn.textContent = t;
                btn.style.cssText = 'pointer-events:all;padding:2px 6px;font-size:10px;' + (_subIdx === i ? 'color:#e60808;font-weight:bold;' : '');
                btn.addEventListener('click', function(e) { e.stopPropagation(); _subIdx = i; _render(); });
                tabsEl.appendChild(btn);
            });
            el.appendChild(tabsEl);
        });
    }

    function _drawPokedexEntryCanvas(ctx, entry, keyName, spriteImg) {
        _canvasBg(ctx, null);
        var S = 2;
        var _tc = _getThemeColors(); var COL_TEXT = _tc.text; var COL_DIM = _tc.dim; var COL_CYAN = _tc.hi;

        ctx.textBaseline = 'top';

        // Title bar
        ctx.fillStyle = _tc.titleBg;
        ctx.fillRect(0, 0, GBA_W, 20*S);
        ctx.fillStyle = COL_CYAN;
        ctx.fillRect(0, 20*S, GBA_W, 2);
        ctx.font = 'bold '+(11*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = _tc.hi;
        ctx.fillText('POKEDEX', 8*S, 5*S);

        // Sprite area (left): 0..79, y=22..87 (GBA px: 0..79px, 22..87px)
        if (spriteImg) {
            ctx.drawImage(spriteImg, 0, 22*S, 80*S, 66*S);
        } else {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 22*S, 80*S, 66*S);
            ctx.fillStyle = COL_DIM;
            ctx.font = (7*S)+'px "Press Start 2P", monospace';
            ctx.fillText('No sprite', 4*S, 50*S);
        }

        // Info right side: x=82..239, y=22
        ctx.font = 'bold '+(11*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = COL_TEXT;
        ctx.fillText(entry.name, 84*S, 24*S);
        ctx.font = (7*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = COL_DIM;
        ctx.fillText('#' + String(entry.num).padStart(3,'0'), 84*S, 34*S);
        ctx.fillText(entry.category || '', 84*S, 44*S);

        // Types
        if (entry.types) {
            var tx = 84*S;
            entry.types.forEach(function(t) {
                var tcol = TYPE_COLORS[t] || '#888888';
                var tw = ctx.measureText(t).width + 4*S;
                ctx.fillStyle = tcol;
                ctx.fillRect(tx, 55*S, tw, 10*S);
                ctx.fillStyle = '#ffffff';
                ctx.font = (7*S)+'px "Press Start 2P", monospace';
                ctx.fillText(t, tx + 2*S, 56*S);
                tx += tw + 2*S;
            });
        }

        // Tabs row area at y=74 (buttons overlaid via HTML, just draw separator)
        ctx.fillStyle = _tc.titleBg;
        ctx.fillRect(80*S, 68*S, GBA_W - 80*S, 22*S);
        ctx.fillStyle = COL_CYAN;
        ctx.fillRect(80*S, 90*S, GBA_W - 80*S, 2);

        // Body below y=92
        var bodyY = 92;

        if (_subIdx === 0) {
            // Info tab
            var h = entry.height_m || 0, w = entry.weight_kg || 0;
            var ft = Math.floor(h / 0.3048), inch = Math.round((h / 0.3048 - ft) * 12);
            var lbs = Math.round(w * 2.205 * 10) / 10;
            var rows = [
                ['Height',     h + 'm (' + ft + '\'' + inch + '")'],
                ['Weight',     w + 'kg (' + lbs + ' lbs)'],
                ['Catch Rate', String(entry.catch_rate || 0)],
                ['Exp Rate',   (entry.exp_rate||'').replace('EXP_RATE_','').toLowerCase().replace(/_/g,' ')],
                ['Egg Groups', (entry.egg_groups||[]).join(', ')],
            ];
            ctx.font = (7*S)+'px "Press Start 2P", monospace';
            rows.forEach(function(r, i) {
                var ry = (bodyY + i * 12) * S;
                ctx.fillStyle = COL_DIM;  ctx.fillText(r[0], 4*S, ry);
                ctx.fillStyle = COL_TEXT; ctx.fillText(r[1], 80*S, ry);
            });
            // Dex entry text wrapped
            var desc = entry.entry || '';
            var words = desc.split(' '), line = '', ly = (bodyY + rows.length * 12 + 4) * S;
            ctx.font = (7*S)+'px "Press Start 2P", monospace';
            ctx.fillStyle = COL_DIM;
            for (var wi = 0; wi < words.length; wi++) {
                var test2 = line ? line + ' ' + words[wi] : words[wi];
                if (ctx.measureText(test2).width > (GBA_W - 8*S) && line) {
                    ctx.fillText(line, 4*S, ly); line = words[wi]; ly += 10*S;
                    if (ly > 154*S) break;
                } else { line = test2; }
            }
            if (line && ly <= 154*S) ctx.fillText(line, 4*S, ly);

            // Evolutions
            if (entry.evolutions && entry.evolutions.length) {
                var evoY = Math.min(ly + 14*S, 138*S);
                ctx.fillStyle = COL_CYAN;
                ctx.font = (7*S)+'px "Press Start 2P", monospace';
                ctx.fillText('Evolves into:', 4*S, evoY);
                entry.evolutions.slice(0, 2).forEach(function(evo, ei) {
                    var method = (evo.method||'').replace('EVO_','').replace(/_/g,' ').toLowerCase();
                    ctx.fillStyle = COL_TEXT;
                    ctx.fillText(evo.into.toUpperCase() + ' — ' + method + (evo.param ? ' '+evo.param : ''), 4*S, evoY + (ei+1)*10*S);
                });
            }

        } else if (_subIdx === 1) {
            // Stats tab
            var stats = entry.stats || {};
            var STAT_NAMES = [['hp','HP'],['atk','Attack'],['def','Defense'],['spa','Sp.Atk'],['spd','Sp.Def'],['spe','Speed']];
            var STAT_COLORS2 = {hp:'#f04040',atk:'#f08030',def:'#f8d030',spa:'#6890f0',spd:'#78c850',spe:'#f85888'};
            var total = 0;
            STAT_NAMES.forEach(function(kv, i) {
                var k = kv[0], label = kv[1];
                var val = stats[k] || 0;
                total += val;
                var ry = (bodyY + i * 10) * S;
                var pct = Math.min(1, val / 255);
                ctx.font = (7*S)+'px "Press Start 2P", monospace';
                ctx.fillStyle = COL_DIM;  ctx.fillText(label, 4*S, ry);
                ctx.fillStyle = COL_TEXT; ctx.fillText(String(val), 60*S, ry);
                // bar
                ctx.fillStyle = '#1a1a2e'; ctx.fillRect(80*S, ry, 150*S, 7*S);
                ctx.fillStyle = STAT_COLORS2[k]; ctx.fillRect(80*S, ry, Math.round(pct * 150)*S, 7*S);
            });
            ctx.fillStyle = COL_CYAN;
            ctx.font = (7*S)+'px "Press Start 2P", monospace';
            ctx.fillText('Total: ' + total, 4*S, (bodyY + STAT_NAMES.length * 10 + 4)*S);

        } else {
            // Moves tab
            ctx.font = (7*S)+'px "Press Start 2P", monospace';
            ctx.fillStyle = COL_DIM;
            ctx.fillText('Loading moves...', 4*S, bodyY*S);
            var fullEntry2 = _dexDb ? _dexDb[keyName] : null;
            var learnset2 = fullEntry2 && fullEntry2.learnset;
            if (learnset2) {
                ctx.clearRect(0, bodyY*S, GBA_W, (160 - bodyY)*S);
                ctx.fillStyle = _tc.bg; ctx.fillRect(0, bodyY*S, GBA_W, (160 - bodyY)*S);
                var lvl2 = learnset2.level_up || [];
                lvl2.slice(0, 10).forEach(function(m, i) {
                    var ry = (bodyY + i * 10) * S;
                    ctx.fillStyle = COL_DIM;  ctx.fillText('Lv.'+m[0], 4*S, ry);
                    ctx.fillStyle = COL_TEXT;
                    var mname = m[1].replace('MOVE_','').replace(/_/g,' ').toLowerCase().replace(/\b\w/g, function(c){return c.toUpperCase();});
                    ctx.fillText(mname, 40*S, ry);
                });
            }
        }
    }

    // --- Pokénav Map tab ---
    var _pokenavMapWin = null;

    function _openPokenavMap() {
        if (_pokenavMapWin) return;
        var screen = document.getElementById('screen-primary');
        if (!screen) return;

        var win = document.createElement('div');
        win.style.cssText = 'position:absolute;inset:0;z-index:200;background:#f8f8e0;display:flex;flex-direction:column;font-family:monospace;';
        _pokenavMapWin = win;
        screen.appendChild(win);

        var canvas = document.createElement('canvas');
        canvas.width  = 480; canvas.height = 320;
        canvas.style.cssText = 'width:100%;height:100%;display:block;image-rendering:pixelated;';
        win.appendChild(canvas);

        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        function draw() {
            var S = 2;
            var st   = window.GameSave && GameSave.state;
            var region  = (window.GameMap && GameMap.region) || (st && st.currentLocation && st.currentLocation.region) || 'kanto';
            var mapName = (window.GameMap && GameMap.current && GameMap.current.name) || '—';

            // Background gradient
            var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, '#060c14');
            grad.addColorStop(1, '#0a1820');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Title bar
            ctx.fillStyle = '#ee3100';
            ctx.fillRect(0, 0, canvas.width, 20*S);
            ctx.fillStyle = '#ee3100';
            ctx.fillRect(0, 20*S, canvas.width, 2);
            ctx.textBaseline = 'top'; ctx.fillStyle = '#ee3100';
            ctx.font = 'bold '+(11*S)+'px "Press Start 2P", monospace';
            ctx.fillText('POKENAV — MAP', 8*S, 5*S);

            // Region name
            ctx.font = 'bold '+(11*S)+'px "Press Start 2P", monospace'; ctx.fillStyle = '#ffffff';
            ctx.fillText(region.charAt(0).toUpperCase()+region.slice(1)+' Region', 8*S, 30*S);

            // Map area visualization — draw a simple schematic grid
            var REGIONS_INFO = {
                kanto:     { color:'#3a6a3a', label:'KANTO' },
                hoenn:     { color:'#2a4a6a', label:'HOENN' },
                johto:     { color:'#5a3a2a', label:'JOHTO' },
                heartgold: { color:'#5a3a2a', label:'JOHTO' },
                sinnoh:    { color:'#2a2a5a', label:'SINNOH' },
            };
            var ri = REGIONS_INFO[region] || REGIONS_INFO.kanto;

            // Draw region box
            var bx=8, by=50, bw=140, bh=80;
            ctx.fillStyle = ri.color+'44';
            ctx.fillRect(bx*S, by*S, bw*S, bh*S);
            ctx.strokeStyle = '#e60808'; ctx.lineWidth = 2;
            ctx.strokeRect(bx*S, by*S, bw*S, bh*S);

            // Region label
            ctx.font = 'bold '+(11*S)+'px "Press Start 2P", monospace'; ctx.fillStyle = '#ee3100';
            ctx.fillText(ri.label, (bx+4)*S, (by+4)*S);

            // Player position indicator — pulsing dot in center
            var px = (bx + bw/2), py = (by + bh/2);
            ctx.fillStyle = '#ffff40';
            ctx.beginPath();
            ctx.arc(px*S, py*S, 5*S, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = S;
            ctx.stroke();

            // Current map name below dot
            ctx.font = (7*S)+'px "Press Start 2P", monospace'; ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(mapName, px*S, (py+8)*S);
            ctx.textAlign = 'left';

            // Visited maps count
            var visited = st && st.visitedMaps ? (st.visitedMaps instanceof Set ? st.visitedMaps.size : st.visitedMaps.length) : 0;
            ctx.font = (7*S)+'px "Press Start 2P", monospace'; ctx.fillStyle = '#181818';
            ctx.fillText('Maps visited: '+visited, 8*S, 140*S);

            // Coordinates
            if (window.GameMap) {
                // We don't store player coords in save, but we can read from the game
                var cLoc = st && st.currentLocation;
                if (cLoc) ctx.fillText('Area: '+cLoc.region+'  '+cLoc.mapName, 8*S, 152*S);
            }

            // Bottom bar
            ctx.fillStyle = '#ee3100'; ctx.fillRect(0, 148*S, canvas.width, 12*S);
            ctx.fillStyle = '#ee3100'; ctx.fillRect(0, 148*S, canvas.width, 1);
            ctx.font = (7*S)+'px "Press Start 2P", monospace'; ctx.fillStyle = '#6090a8';
            ctx.fillText('B: Back', 8*S, 150*S);
        }

        draw();

        var backBtn = document.createElement('button');
        backBtn.className = 'sm-back-btn';
        backBtn.textContent = 'B BACK';
        backBtn.style.cssText = 'position:absolute;bottom:4px;right:4px;z-index:10;pointer-events:all;';
        backBtn.addEventListener('click', function() {
            win.remove();
            _pokenavMapWin = null;
        });
        win.appendChild(backBtn);

        // B key to close
        function _onKey(e) {
            if (e.key === 'Escape' || e.key === 'x' || e.key === 'X' || e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                win.remove(); _pokenavMapWin = null;
                document.removeEventListener('keydown', _onKey);
            }
        }
        document.addEventListener('keydown', _onKey);
    }

    function _buildPokenav(el) {
        var shell = _makeCanvasShell(el, function(ctx, canvas) {
            _drawPokenavCanvas(ctx);
            canvas.addEventListener('click', function(e) {
                var rect = canvas.getBoundingClientRect();
                var cy = (e.clientY - rect.top) * (160 / rect.height);
                var OPTIONS = ['Map','Condition','Ribbons','Match Call','Close'];
                // rows at y=40+i*18, height 16px
                for (var i = 0; i < OPTIONS.length; i++) {
                    var ry = 40 + i * 18;
                    if (cy >= ry && cy < ry + 16) {
                        _subIdx = i;
                        if (i === 4) _goBack();
                        else _render();
                        return;
                    }
                }
            });
        });
    }

    function _drawPokenavCanvas(ctx) {
        _canvasBg(ctx, null);
        var S = 2;
        var _tc = _getThemeColors(); var COL_TEXT = _tc.text; var COL_DIM = _tc.dim; var COL_CYAN = _tc.hi;

        // Title bar
        ctx.fillStyle = _tc.titleBg;
        ctx.fillRect(0, 0, GBA_W, 36*S);
        ctx.fillStyle = COL_CYAN;
        ctx.fillRect(0, 36*S, GBA_W, 2);

        ctx.textBaseline = 'top';
        ctx.font = 'bold '+(11*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = COL_CYAN;
        ctx.fillText('POKENAV', 8*S, 8*S);
        ctx.font = (7*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = _tc.hi;
        ctx.fillText('Navigation System', 8*S, 24*S);

        // Menu options
        var OPTIONS = [
            { label:'Map',        hint:'View the region map' },
            { label:'Condition',  hint:'Check Pokemon condition' },
            { label:'Ribbons',    hint:'View collected ribbons' },
            { label:'Match Call', hint:'Call registered trainers' },
            { label:'Close',      hint:'Close the Pokenav' },
        ];

        ctx.font = (7*S)+'px "Press Start 2P", monospace';
        OPTIONS.forEach(function(opt, i) {
            var ry = (40 + i * 18) * S;
            var isSel = i === _subIdx;
            if (isSel) {
                ctx.fillStyle = 'rgba(230,8,8,0.12)';
                ctx.fillRect(0, ry, GBA_W, 16*S);
                ctx.fillStyle = COL_CYAN;
                ctx.fillRect(0, ry, 2*S, 16*S);
            }
            ctx.fillStyle = isSel ? COL_CYAN : COL_TEXT;
            ctx.fillText((isSel ? '▶ ' : '  ') + opt.label, 4*S, ry + 3*S);
        });

        // Help bar at bottom
        ctx.fillStyle = _tc.titleBg;
        ctx.fillRect(0, 148*S, GBA_W, 12*S);
        ctx.fillStyle = COL_CYAN;
        ctx.fillRect(0, 148*S, GBA_W, 1);
        ctx.font = (7*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = COL_DIM;
        var curHint = OPTIONS[_subIdx] ? OPTIONS[_subIdx].hint : '';
        ctx.fillText(curHint, 4*S, 150*S);
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
        var dexCount = (window.GameSave && GameSave.state && GameSave.state.pokedex)
            ? (GameSave.state.pokedex.caught || []).length : 0;

        ctx.font = (7*S)+'px "Press Start 2P", monospace';
        ctx.fillStyle = COL_CYAN;
        ctx.fillText(_mapName(), 8*S, 28*S);

        var infoRows = [
            ['Player:', _playerName()],
            ['Badges:', String(_badges())],
            ['Pokedex:', String(dexCount)],
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

        var savedScale      = parseFloat(localStorage.getItem('pokemon_control_scale')||'1');
        var currentOrient   = window.GameLayout ? GameLayout.getOrientationPref() : 'auto';
        var savedTextSpeed  = localStorage.getItem('pokemon_text_speed')   || 'MED';
        var savedBScene     = localStorage.getItem('pokemon_battle_scene') || 'ON';
        var savedForceSet   = localStorage.getItem('pokemon_force_set')    || 'OFF';
        var savedDmgNums    = localStorage.getItem('pokemon_damage_nums')  || 'ON';
        var savedThemeUI    = localStorage.getItem('pokemon_theme_ui')     || 'MODERN';
        var savedTheme      = localStorage.getItem('pokemon_theme')        || 'DARK';
        var savedFrame      = parseInt(localStorage.getItem('pokemon_frame')    || '1');
        var savedThemeBall  = parseInt(localStorage.getItem('pokemon_theme_ball')|| '1');
        var savedRandMusic  = localStorage.getItem('pokemon_random_music') || 'OFF';
        var savedDisMusic   = localStorage.getItem('pokemon_disable_music')|| 'OFF';
        var savedBarSpeed   = parseInt(localStorage.getItem('pokemon_bar_speed') || '5');
        var savedTransition = localStorage.getItem('pokemon_transition')   || 'ON';
        var savedLvCap      = localStorage.getItem('pokemon_lv_cap')       || 'OFF';
        var savedAutoRun    = localStorage.getItem('pokemon_auto_run')     || 'OFF';
        var savedTrSlide    = localStorage.getItem('pokemon_trainer_slide')|| 'ON';
        var savedAutosave   = localStorage.getItem('pokemon_autosave_int') || '15s';
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
        list.appendChild(makeToggleRow('Text Speed',      ['SLOW','MED','FAST'],         savedTextSpeed, function(v){localStorage.setItem('pokemon_text_speed',v);}));
        list.appendChild(makeToggleRow('Battle Scene',    ['ON','OFF'],                  savedBScene,    function(v){localStorage.setItem('pokemon_battle_scene',v);}));
        list.appendChild(makeToggleRow('Force Set Battle',['ON','OFF'],                  savedForceSet,  function(v){localStorage.setItem('pokemon_force_set',v);}));
        list.appendChild(makeToggleRow('Damage Numbers',  ['ON','OFF'],                  savedDmgNums,   function(v){localStorage.setItem('pokemon_damage_nums',v);}));
        list.appendChild(makeToggleRow('Theme UI',        ['MODERN','CLASSIC','VANILLA'],savedThemeUI,   function(v){localStorage.setItem('pokemon_theme_ui',v); _bagAssets=null; _applyThemeCSS(); _render();}));
        list.appendChild(makeToggleRow('Theme',           ['DARK','LIGHT','VANILLA','USER'],savedTheme,  function(v){localStorage.setItem('pokemon_theme',v); localStorage.removeItem('pokemon_theme_preset'); _bagAssets=null; _applyThemeCSS(); _render();}));
        // Theme Presets — matches EE's PRESETTHEME_* values from custom_interface.c
        list.appendChild(makeToggleRow('Preset',
            ['None','BlueSteel','RoyalPurple','Synthwave','Mocha'],
            localStorage.getItem('pokemon_theme_preset') || 'None',
            function(v) {
                if (v === 'None') localStorage.removeItem('pokemon_theme_preset');
                else localStorage.setItem('pokemon_theme_preset', v);
                // Presets force USER theme mode like EE's ApplyPresetRGBUserTheme
                localStorage.setItem('pokemon_theme', 'USER');
                _bagAssets = null; _applyThemeCSS(); _render();
            }
        ));
        list.appendChild(makeNumberRow('Frame',       'pokemon_frame',      savedFrame,    1, 20));
        list.appendChild(makeNumberRow('Theme Ball',  'pokemon_theme_ball', savedThemeBall,1, 31));
        list.appendChild(makeToggleRow('Random Music', ['ON','OFF'],                  savedRandMusic, function(v){localStorage.setItem('pokemon_random_music',v);}));
        list.appendChild(makeToggleRow('Disable Music',['ON','OFF'],                  savedDisMusic,  function(v){localStorage.setItem('pokemon_disable_music',v);}));
        list.appendChild(makeNumberRow('Bar Speed',   'pokemon_bar_speed',  savedBarSpeed, 1, 11));
        list.appendChild(makeToggleRow('Transition',   ['ON','OFF'],                  savedTransition,function(v){localStorage.setItem('pokemon_transition',v);}));
        list.appendChild(makeToggleRow('Lv Cap 100',   ['ON','OFF'],                  savedLvCap,     function(v){localStorage.setItem('pokemon_lv_cap',v);}));
        list.appendChild(makeToggleRow('Auto Run',     ['OFF','ON'],                  savedAutoRun,   function(v){localStorage.setItem('pokemon_auto_run',v);}));
        list.appendChild(makeToggleRow('Trainer Slide',['ON','OFF'],                  savedTrSlide,   function(v){localStorage.setItem('pokemon_trainer_slide',v);}));
        list.appendChild(makeToggleRow('Autosave',     ['OFF','15s','30s','1m','2m','5m','10m'],savedAutosave, function(v){localStorage.setItem('pokemon_autosave_int',v);}));
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
                localStorage.setItem('pokemon_control_scale', v);
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
        if (page==='pokedex_entry') { page='pokedex'; _render(); return; }
        // In battle bag mode, B/back closes entirely and returns to battle
        if (_battleBagCancel) { close(); return; }
        if (_battlePartyCancel) { close(); return; }
        page='main'; _subIdx=0; _render();
    }

    function _confirmSelected() {
        if (page!=='main') {
            if (page==='save') { const a=['save','load']; _doSaveAction(a[_subIdx]||'save'); }
            else if (page==='journal') { /* A does nothing in journal — navigate with L/R and up/down */ }
            else if (page==='pokenav') {
                if (_subIdx === 4) { _goBack(); }
                else if (_subIdx === 0) { _openPokenavMap(); }
            }
            else if (page==='pokedex' && _dexList && _dexList[_subIdx]) {
                var _deSaved = window.GameSave && GameSave.state && GameSave.state.pokedex;
                var _deSeen  = new Set((_deSaved && _deSaved.seen) || []);
                if (!_deSeen.has(_dexList[_subIdx].num)) return; // unseen — block entry
                _dexEntry = _dexList[_subIdx];
                page = 'pokedex_entry'; _subIdx = 0; _render();
            } else if (page==='bag') {
                var _bPockets = _getBagPockets();
                var _bPocket  = _bPockets[_bagPocket] || _bPockets[0];
                var _bItem    = _bPocket && _bPocket.items[_subIdx];
                // Close Pack selected (index past last item), or no item at index
                if (!_bItem || _subIdx >= _bPocket.items.length) {
                    if (_battleBagCancel) close(); else _goBack();
                    return;
                }
                if (_battleItemCallback && _bItem.quantity > 0) {
                    var _bCb = _battleItemCallback;
                    _battleItemCallback = null; _battleBagCancel = null;
                    close();
                    _bCb(_bItem);
                }
                return;
            } else if (page==='pokemon') {
                var _pFilled = _getParty().filter(Boolean);
                if (_partyActionOpen) {
                    var opts = _battlePartyCallback ? ['Switch', 'Cancel'] : ['Details', 'Item', 'Cancel'];
                    var _pOpt  = opts[_partyActionSel] || 'Cancel';
                    if (_pOpt === 'Cancel') {
                        _partyActionOpen = false; _redrawPageEl(true);
                    } else if (_pOpt === 'Switch') {
                        var _pCb = _battlePartyCallback;
                        var _pMon = _partyActionMon;
                        _battlePartyCallback = null; _battlePartyCancel = null;
                        close();
                        if (_pCb) _pCb(_pMon);
                    } else if (_pOpt === 'Details') {
                        _partyActionOpen = false;
                        _openPartySummary(_partyActionMon, _partyActionIdx, _pFilled, function(){ _redrawPageEl(); });
                    }
                } else if (_subIdx >= _pFilled.length) {
                    // CANCEL row selected
                    _goBack();
                } else if (_pFilled[_subIdx]) {
                    _partyActionMon  = _pFilled[_subIdx];
                    _partyActionIdx  = _subIdx;
                    _partyActionSel  = 0;
                    _partyActionOpen = true;
                    _redrawPageEl(true);
                }
            }
            return;
        }
        const item=ITEMS[selectedIdx]; if(!item) return;
        switch(item.id) {
            case 'EXIT':    close(); break;
            case 'SAVE':    _saveDone=false; page='save';         _subIdx=0; _render(); break;
            case 'OPTIONS': page='options';      _subIdx=0; _render(); break;
            case 'JOURNAL': page='journal'; _journalPage=0; _subIdx=0; _render(); break;
            case 'POKENAV': page='pokenav';      _subIdx=0; _render(); break;
            case 'CAMP':    page='trainer_card'; _subIdx=0; _render(); break;
            case 'BONDS':   page='pokemon';       _subIdx=0; _render(); break;
            case 'SUPPLIES':page='bag';           _subIdx=0; _render(); break;
            case 'AFFINITIES': page='journal'; _journalPage=0; _subIdx=0; _render(); break;
            case 'SYSTEM':
                if (window.GameSystem && GameSystem.notify) {
                    GameSystem.notify('The System is always watching. Surveillance noted.', 'danger');
                }
                close();
                break;
            // legacy ids (kept for any external callers)
            case 'PLAYER':  page='trainer_card'; _subIdx=0; _render(); break;
            case 'BAG':     page='bag';           _subIdx=0; _render(); break;
            case 'POKEMON': page='pokemon';       _subIdx=0; _render(); break;
            case 'POKEDEX': page='pokedex';       _subIdx=0; _render(); break;
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

    function openBagForBattle(onUse, onCancel) {
        if (!menuEl) { if (onCancel) onCancel(); return; }
        _battleItemCallback = onUse;
        _battleBagCancel    = onCancel || null;
        selectedIdx = 0; page = 'bag'; _bagPocket = 0; _subIdx = 0; isOpen = true;
        // Lift above battle overlay (z-index 80) so it's visible
        menuEl.style.zIndex = '90';
        if (subEl) subEl.style.zIndex = '90';
        menuEl.classList.add('open'); _render();
    }
    function openPartyForBattle(onSwitch, onCancel) {
        if (!menuEl) { if (onCancel) onCancel(); return; }
        _battlePartyCallback = onSwitch  || null;
        _battlePartyCancel   = onCancel  || null;
        selectedIdx = 0; page = 'pokemon'; _subIdx = 0; _partyActionOpen = false; isOpen = true;
        menuEl.style.zIndex = '90';
        if (subEl) subEl.style.zIndex = '90';
        menuEl.classList.add('open'); _render();
    }
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
        if (page==='journal') { _journalTab=(_journalTab-1+4)%4; _journalPage=0; _achTier=0; _powersPage=0; if(!_redrawPageEl()) _render(); return; }
        if (page==='bag') { _bagPocket=(_bagPocket-1+8)%8; _subIdx=0; if(!_redrawPageEl()) _render(); return; }
    }
    function moveRight() {
        if (!isOpen) return;
        if (page==='main') { return; } // no horizontal nav on vertical list
        if (page==='journal') { _journalTab=(_journalTab+1)%4; _journalPage=0; _achTier=0; _powersPage=0; if(!_redrawPageEl()) _render(); return; }
        if (page==='bag') { _bagPocket=(_bagPocket+1)%8; _subIdx=0; if(!_redrawPageEl()) _render(); return; }
    }
    function moveUp() {
        if (!isOpen) return;
        if (page==='main') { if(selectedIdx>0){selectedIdx--;_render();} return; }
        if (page==='pokemon' && _partyActionOpen) {
            var _pOptLen = _battlePartyCallback ? 2 : 3;
            _partyActionSel = (_partyActionSel - 1 + _pOptLen) % _pOptLen; _redrawPageEl(true); return;
        }
        const c=_subCount(); if(c>0){_subIdx=(_subIdx-1+c)%c; if(page==='journal'||page==='pokemon'){_redrawPageEl(true);}else{_render();}}
    }
    function moveDown() {
        if (!isOpen) return;
        if (page==='main') { if(selectedIdx<ITEMS.length-1){selectedIdx++;_render();} return; }
        if (page==='pokemon' && _partyActionOpen) {
            var _pOptLen2 = _battlePartyCallback ? 2 : 3;
            _partyActionSel = (_partyActionSel + 1) % _pOptLen2; _redrawPageEl(true); return;
        }
        const c=_subCount(); if(c>0){_subIdx=(_subIdx+1)%c; if(page==='journal'||page==='pokemon'){_redrawPageEl(true);}else{_render();}}
    }
    function _subCount() {
        if (page==='journal') {
            if (_journalTab === 1) { // Ach. Atlas — scroll list
                var all = window.GameAchievements ? GameAchievements.getAll() : [];
                var tierKeys = [null,'platinum','gold','silver','bronze'];
                return _achTier === 0 ? all.length : all.filter(function(a){return a.tier===tierKeys[_achTier];}).length;
            }
            if (_journalTab === 2) { // Powers — scroll list
                if (!window.GameAchievements) return 0;
                var tierName = ['platinum','gold','silver','copper'][_powersPage] || 'platinum';
                return GameAchievements.getAll().filter(function(a){return a.tier===tierName;}).length;
            }
            if (_journalTab === 3) return 0; // Quests (no scroll yet)
            return 0; // Factions uses L/R
        }
        if (page==='save')    return 2;
        if (page==='pokenav') return 5;  // Map, Condition, Ribbons, Match Call, Close
        if (page==='options') return 21; // 18 EE options + 3 engine extras
        if (page==='bag')     return _getBagPockets()[_bagPocket].items.length + 1; // +1 for Close Pack
        if (page==='pokemon') {
            const party = window.GameSave && GameSave.state && GameSave.state.party;
            return (party ? party.filter(Boolean).length || 1 : 1) + 1; // +1 for CANCEL
        }
        if (page==='pokedex') return _dexList ? _dexList.length : 0;
        if (page==='pokedex_entry') return 3; // tabs: Info / Stats / Moves
        if (page==='achievements') {
            const all = window.GameAchievements ? GameAchievements.getAll() : [];
            const tierKeys = [null, 'platinum', 'gold', 'silver', 'bronze'];
            return _achTier === 0 ? all.length : all.filter(function(a){return a.tier===tierKeys[_achTier];}).length;
        }
        return 0;
    }
    function confirm() { if(isOpen) _confirmSelected(); }
    function back()    {
        if (!isOpen) return;
        if (page==='pokemon' && _partyActionOpen) { _partyActionOpen=false; _redrawPageEl(true); return; }
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
