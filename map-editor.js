/* Map Editor — RPG Maker MZ-style metatile editor.
 *
 * Tileset tabs (one per sheet) + an Auto/Tiles toggle, two paint layers
 * (Ground + Overlay), autotile-on-paint, and a tileset GROUP per layer:
 * each layer can hold tiles from multiple sheets at once (RM A–E model).
 * Cells store GLOBAL ids = sheet.offset + localId; switching the picker to
 * another sheet never repaints the map (existing ids keep their sheet).
 *
 * Layout format (matches data/layouts/*.json):
 *   { id, width, height, tileset, metatiles:[gid...], collision:[0|1...],
 *     tileset_group:[{name,offset,count}],   // sheets behind the global ids
 *     terrain:[names...]              // author-time autotile source (engine ignores)
 *     overlay_tileset, overlay_group, overlay:[gid... | -1] }
 *   Single-sheet maps (group of 1, offset 0) stay engine-compatible (gid==local).
 * Map format (matches data/maps/<region>/*.json):
 *   { id, name, region, layout, parent, ..., connections, npcs, warps, triggers, signs }
 */
(function () {
  'use strict';

  var DT = 16;                 // DISPLAY metatile px (on-screen cell, tileset-independent)
  var META_PER_ROW = 16;       // fallback metatiles-per-row
  var $ = function (id) { return document.getElementById(id); };

  // ── Per-layer record. A layer holds a GROUP of tileset sheets (RM-style):
  // each sheet gets an offset into a shared global id-space, and cells store
  // global ids. Switching the picker to another sheet does NOT touch the map —
  // existing cells keep their ids and render from their own sheet.
  //   sheet = { name, img, meta, autotile, offset, count }
  //   data[i] = global id (offset + localId), or -1 for empty (overlay).
  // name/img/meta/autotile mirror the ACTIVE sheet for the palette code.
  function newLayer(fill) {
    return { sheets: [], active: 0, name: null, img: null, meta: null, autotile: null,
             data: null, collision: null, terrain: null, fill: fill, baseFill: fill };
  }

  var state = {
    // Three tile layers (RPG Maker XP): ground (1), overlay (2), upper (3).
    layers: { ground: newLayer(1), overlay: newLayer(-1), upper: newLayer(-1) },
    active: 'ground',
    width: 20, height: 18,
    warps: [],
    selectedTile: 1,             // top-left id of the B-tab stamp
    stamp: { w: 1, h: 1, ids: [1] },   // multi-tile stamp from B tab
    selectedTerrain: '',         // autotile terrain (Auto mode)
    autoMode: false,             // true = paint autotiles, false = raw tiles
    tool: 'pencil',              // pencil | rect | ellipse | fill | pick
    mode: 'map',                 // map | collide | warp | region
    region: null,                // Uint8Array(w*h) of region IDs (0 = none)
    regionId: 1,                 // currently painted region number (1..63)
    shadow: null,                // Uint8Array(w*h); 4-bit quarter mask (TL1 TR2 BL4 BR8)
    sel: null,                   // {x0,y0,x1,y1} selection rect (Select tool)
    clipboard: null,             // { w, h, ids:[gid...] } copied active-layer block
    events: [],                  // map events: {id,name,x,y,sprite,dir,trigger,through}
    selectedEvent: null,         // currently-edited event object
    eraser: false,
    showGrid: true,
    zoom: 2,
    orient: 0,                   // 0..3 -> 0/90/180/270 deg whole-editor rotation
    // ── RPG-Maker tab model ──
    rmSets: [],                  // loaded from data/tilesets/_rm_sets.json
    activeSet: null,             // current set object {id,name,tile,tabs}
    setTabs: [],                 // [{label, sheet, role}] for the active set
    tabMode: 'mv'                // 'mv' = A-E tabs (one sheet) | 'xp' = single stacked sheet
  };

  // RM tab roles in display order. A2 = ground autotile (terrain brush).
  var RM_ROLE_ORDER = ['A1', 'A2', 'A3', 'A4', 'A5', 'B', 'C', 'D', 'E'];

  // Orientation modes that MATCH THE GAME (styles.css .orient-*). Index = state.orient.
  // `deg` is the applied CSS rotation (used to inverse-rotate pointer coords);
  // `cls` is the body class that drives #rotor's transform.
  var ORIENT_MODES = [
    { id: 'portrait',         label: 'Portrait',          deg: 0,    cls: '' },
    { id: 'landscape',        label: 'Landscape',         deg: -90,  cls: 'ed-landscape' },
    { id: 'reverse-portrait', label: 'Reverse Portrait',  deg: 180,  cls: 'ed-reverse-portrait' },
    { id: 'reverse-landscape',label: 'Reverse Landscape', deg: 90,   cls: 'ed-reverse-landscape' }
  ];
  var ORIENT_CLASSES = ['ed-landscape', 'ed-reverse-portrait', 'ed-reverse-landscape'];

  // ── Map tree model (manual hierarchy, RM-style) ──
  // name -> { region, parent (name|null), local (true until saved to repo) }
  var TREE_KEY = 'ac_map_tree_v1';
  var treeModel = {};
  var treeExpanded = {};       // name -> false when collapsed (default expanded)
  var currentNode = null;      // tree node currently loaded in the editor

  // Map a screen point to a (rotated) canvas's own untransformed content
  // coordinates. The editor may be CSS-rotated about the viewport centre; since
  // that transform is rigid, inverse-rotating the offset from the canvas's
  // on-screen bounding-box centre recovers local coords regardless of pivot.
  function screenToLocal(canvas, clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    var dx = clientX - (r.left + r.width / 2);
    var dy = clientY - (r.top + r.height / 2);
    var a = -ORIENT_MODES[state.orient].deg * Math.PI / 180;
    var ca = Math.cos(a), sa = Math.sin(a);
    return { x: (dx * ca - dy * sa) + canvas.width / 2,
             y: (dx * sa + dy * ca) + canvas.height / 2 };
  }

  function L() { return state.layers[state.active]; }
  function srcTile(o) { o = o || L(); return (o.meta && o.meta.tile) || 16; }
  function perRow(o)  { o = o || L(); return (o.meta && o.meta.metatiles_per_row) || META_PER_ROW; }

  // ── Tileset-group helpers ──
  function aSheet(layer) { layer = layer || L(); return layer.sheets[layer.active] || null; }
  function syncActive(layer) {           // mirror active sheet onto layer.* for palette code
    var s = aSheet(layer);
    layer.name = s ? s.name : null; layer.img = s ? s.img : null;
    layer.meta = s ? s.meta : null; layer.autotile = s ? s.autotile : null;
  }
  function sheetCount(sheet) {
    if (sheet.meta && sheet.meta.total_metatiles) return sheet.meta.total_metatiles;
    if (!sheet.img) return 0;
    var st = (sheet.meta && sheet.meta.tile) || 16;
    return Math.floor((sheet.img.width / st) * (sheet.img.height / st));
  }
  function sheetOfGid(layer, gid) {
    for (var i = 0; i < layer.sheets.length; i++) {
      var s = layer.sheets[i];
      if (gid >= s.offset && gid < s.offset + s.count) return s;
    }
    return layer.sheets[0] || null;
  }
  function autotileSheet(layer) {
    for (var i = 0; i < layer.sheets.length; i++) if (layer.sheets[i].autotile) return layer.sheets[i];
    return null;
  }
  // The GLOBAL id of the active set's A2 ground tile (grass) — the default fill
  // for a blank map. Prefers the set's A2 sheet (autotile grass fill if baked,
  // else tile 0), then any autotile sheet, then the first sheet.
  function sheetInLayer(layer, name) {
    for (var i = 0; i < layer.sheets.length; i++) if (layer.sheets[i].name === name) return layer.sheets[i];
    return null;
  }
  function groundFillGid(layer) {
    var a2name = state.activeSet && state.activeSet.tabs && state.activeSet.tabs.A2;
    var s = a2name ? sheetInLayer(layer, a2name) : null;
    if (!s) s = autotileSheet(layer);
    if (s && s.autotile && s.autotile.fills) {
      var baseKey = (s.autotile.priority && s.autotile.priority[0]) || 'grass';
      return (s.autotile.fills[baseKey] != null) ? s.offset + s.autotile.fills[baseKey] : s.offset;
    }
    if (s) return s.offset;                 // A2 raw sheet: tile 0 = grass
    return layer.sheets[0] ? layer.sheets[0].offset : 0;
  }

  // ── Tileset loading (into the ACTIVE layer) ──
  function loadTilesetList() {
    return fetch('data/tilesets/_index.json')
      .then(function (r) { return r.json(); })
      .then(function (names) {
        state._tilesetNames = names;
        var sel = $('tilesetSel');
        sel.innerHTML = '';
        names.forEach(function (n) {
          var o = document.createElement('option');
          o.value = n; o.textContent = n;
          sel.appendChild(o);
        });
        var pref = names.indexOf('ac_ground') >= 0 ? 'ac_ground' : names[0];
        sel.value = pref;
        return loadTileset(pref);
      });
  }

  // Load one tileset sheet (png + json + optional autotile.json).
  function loadSheetData(name) {
    return Promise.all([
      fetch('data/tilesets/' + name + '.json').then(function (r) { return r.json(); }),
      new Promise(function (res, rej) {
        var img = new Image();
        img.onload = function () { res(img); };
        img.onerror = rej;
        img.src = 'data/tilesets/' + name + '.png';
      }),
      fetch('data/tilesets/' + name + '.autotile.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
    ]).then(function (parts) {
      var sheet = { name: name, meta: parts[0], img: parts[1],
        autotile: (parts[2] && parts[2].terrains) ? parts[2] : null, offset: 0, count: 0 };
      sheet.count = sheetCount(sheet);
      return sheet;
    });
  }

  // Ensure `name` is in the layer's group and make it the active picker sheet.
  // A new sheet is appended with offset = current end of the group, so existing
  // cell ids stay valid (the map is untouched).
  function useTileset(layer, name) {
    for (var i = 0; i < layer.sheets.length; i++) {
      if (layer.sheets[i].name === name) { layer.active = i; syncActive(layer); return Promise.resolve(layer); }
    }
    return loadSheetData(name).then(function (sheet) {
      var off = 0; layer.sheets.forEach(function (s) { off += s.count; });
      sheet.offset = off;
      layer.sheets.push(sheet);
      layer.active = layer.sheets.length - 1;
      syncActive(layer);
      return layer;
    });
  }

  function loadTileset(name) {
    return useTileset(L(), name).then(function () {
      state.autoMode = state.active === 'ground' && !!L().autotile;
      $('tilesetSel').value = name;
      updateTilesetStatus();
      buildTilesetTabs();
      rebuildAutoPalette();
      refreshPaletteTabs();
      drawPalette();
      drawMap();
      updateSelSwatch();
      setStampFromPalette(0, 0, 0, 0);
    });
  }

  function updateTilesetStatus() {
    var layer = L();
    $('statTileset').textContent = 'Tileset: ' + (layer.name || '—') +
      ' (' + (totalMetatiles(layer) || '?') + ')';
    $('statLayer').textContent = 'Layer: ' + state.active;
  }

  function totalMetatiles(layer) {
    var s = aSheet(layer || L());
    return s ? s.count : 0;
  }

  // ── Autotiler (author-time edge blob, ground layer) ──
  function recomputeTerrainCell(x, y) {
    var layer = state.layers.ground;
    var asheet = autotileSheet(layer);
    if (!asheet) return;
    var auto = asheet.autotile, off = asheet.offset;
    var i = idx(x, y);
    var name = layer.terrain[i];
    if (!name) {                                  // base cell -> default fill (grass)
      layer.data[i] = layer.baseFill; layer.collision[i] = 0;
      return;
    }
    var info = auto.terrains[name];
    if (!info) return;
    var prio = auto.priority || null;
    var baseKey = (prio && prio[0]) || 'grass';
    var prioOf = function (t) {
      if (!prio) return 0;
      var p = prio.indexOf(t || baseKey);
      return p < 0 ? 0 : p;
    };
    var myP = prioOf(name);
    var terrAt = function (nx, ny) {
      return inBounds(nx, ny) ? (layer.terrain[idx(nx, ny)] || baseKey) : baseKey;
    };
    var same = function (nx, ny) {
      var t = terrAt(nx, ny);
      return t === name || (prio && prioOf(t) > myP);
    };
    if (auto.scheme === 'wang8_lut' && (info.luts || info.lut)) {
      var m8 = (same(x, y - 1) ? 1 : 0) | (same(x + 1, y - 1) ? 2 : 0) |
               (same(x + 1, y) ? 4 : 0) | (same(x + 1, y + 1) ? 8 : 0) |
               (same(x, y + 1) ? 16 : 0) | (same(x - 1, y + 1) ? 32 : 0) |
               (same(x - 1, y) ? 64 : 0) | (same(x - 1, y - 1) ? 128 : 0);
      var lut = info.lut;
      if (info.luts) {
        var bName = baseKey, bP = -1;
        for (var dy = -1; dy <= 1; dy++)
          for (var dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            var t2 = terrAt(x + dx, y + dy), p2 = prioOf(t2);
            if (t2 !== name && p2 < myP && p2 > bP && info.luts[t2]) { bP = p2; bName = t2; }
          }
        lut = info.luts[bName] || info.luts[baseKey] || info.lut;
      }
      layer.data[i] = off + lut[m8];
    } else {
      var mask = (same(x, y - 1) ? 1 : 0) | (same(x + 1, y) ? 2 : 0) |
                 (same(x, y + 1) ? 4 : 0) | (same(x - 1, y) ? 8 : 0);
      layer.data[i] = off + info.base_index + mask;
    }
    layer.collision[i] = info.collision ? 1 : 0;
  }

  function recomputeTerrainAround(x, y) {
    for (var dy = -1; dy <= 1; dy++)
      for (var dx = -1; dx <= 1; dx++) recomputeTerrainCell(x + dx, y + dy);
  }

  // ── Palette: A (autotiles) + B (raw tiles) ──
  var paletteCanvas = $('paletteCanvas');
  var pctx = paletteCanvas.getContext('2d');
  var PAL_SCALE = 2;
  var PAL_COLS = 8;

  // ── RPG-Maker tileset SETS (data/tilesets/_rm_sets.json) ──
  // A "set" groups sheets into RM A1-A5/B/C/D/E roles. Selecting a set loads all
  // its sheets into the active layer's group (offsets), so cells store global ids
  // and tabs just switch which sheet the picker shows. MV mode = A-E tabs (one
  // sheet at a time); XP mode = one tall scrolling palette stacking every sheet.
  function loadRmSets() {
    return fetch('data/tilesets/_rm_sets.json')
      .then(function (r) { return r.ok ? r.json() : { sets: [] }; })
      .then(function (d) { state.rmSets = d.sets || []; })
      .catch(function () { state.rmSets = []; });
  }

  // Tabs present in the active set, in RM role order. A2 maps to the baked
  // *_ground autotile sheet (terrain brush); other roles map to raw sheets.
  function computeSetTabs(set) {
    var tabs = [];
    RM_ROLE_ORDER.forEach(function (role) {
      var sheet = set.tabs[role];
      if (sheet && (state._tilesetNames || []).indexOf(sheet) >= 0) tabs.push({ label: role, sheet: sheet, role: role });
    });
    return tabs;
  }

  // Load a whole set into the active layer's group; activate the first tab.
  function loadSet(setId, keepData) {
    var set = state.rmSets.filter(function (s) { return s.id === setId; })[0];
    if (!set) return Promise.resolve();
    state.activeSet = set;
    state.setTabs = computeSetTabs(set);
    var layer = L();
    // append every set sheet to the group that isn't already present
    var chain = Promise.resolve();
    state.setTabs.forEach(function (t) {
      chain = chain.then(function () {
        var have = layer.sheets.some(function (s) { return s.name === t.sheet; });
        if (have) return null;
        return loadSheetData(t.sheet).then(function (sheet) {
          var off = 0; layer.sheets.forEach(function (s) { off += s.count; });
          sheet.offset = off; layer.sheets.push(sheet);
        }).catch(function () { /* missing sheet: skip */ });
      });
    });
    return chain.then(function () {
      // activate the A2 (ground/autotile) tab if present, else first tab
      var first = state.setTabs.filter(function (t) { return t.role === 'A2'; })[0] || state.setTabs[0];
      $('rmSetSel').value = set.id;
      // erase/fill on the ground should use THIS set's grass (existing cells untouched)
      if (state.layers.ground.data) state.layers.ground.baseFill = groundFillGid(state.layers.ground);
      if (first) return activateTab(first.sheet);
      syncActive(layer); afterTilesetChange();
    });
  }

  // Switch the picker to a sheet already in the group (a tab click).
  function activateTab(sheetName) {
    var layer = L();
    for (var i = 0; i < layer.sheets.length; i++) {
      if (layer.sheets[i].name === sheetName) { layer.active = i; syncActive(layer); break; }
    }
    afterTilesetChange();
    setStampFromPalette(0, 0, 0, 0);
    return Promise.resolve();
  }

  // Shared refresh after the active sheet/set/layer changes.
  function afterTilesetChange() {
    state.autoMode = state.active === 'ground' && !!L().autotile;
    if (L().name) $('tilesetSel').value = L().name;
    updateTilesetStatus();
    buildTilesetTabs();
    rebuildAutoPalette();
    refreshPaletteTabs();
    drawPalette();
    updateSelSwatch();
    drawMap();
  }

  // Build the RM A-E tab chips for the active set (MV mode) and the set dropdown.
  function buildTilesetTabs() {
    var setSel = $('rmSetSel');
    if (setSel && !setSel._built) {
      setSel.innerHTML = '';
      state.rmSets.forEach(function (s) {
        var o = document.createElement('option'); o.value = s.id; o.textContent = s.name; setSel.appendChild(o);
      });
      setSel._built = true;
    }
    var strip = $('palTabs'); strip.innerHTML = '';
    if (state.tabMode === 'xp') { strip.style.display = 'none'; return; }
    strip.style.display = 'flex';
    var cur = L().name;
    state.setTabs.forEach(function (t) {
      var tab = document.createElement('div');
      tab.className = 'pal-tab' + (t.sheet === cur ? ' active' : '');
      tab.textContent = t.label;
      tab.title = t.sheet + (t.role === 'A2' ? ' (ground autotiles)' : '');
      tab.addEventListener('click', function () { if (t.sheet !== L().name) activateTab(t.sheet); });
      strip.appendChild(tab);
    });
  }

  // Autotiles only paint the ground layer; the toggle is hidden otherwise.
  function isAutoPaint() { return state.autoMode && state.active === 'ground' && !!L().autotile; }

  function refreshPaletteTabs() {
    var hasAuto = !!L().autotile && state.active === 'ground';
    var tg = $('autoToggle');
    tg.style.display = hasAuto ? '' : 'none';
    if (!hasAuto) state.autoMode = false;
    tg.classList.toggle('active', state.autoMode);
    tg.textContent = state.autoMode ? '🌱 Auto' : '▦ Tiles';
    applyPaletteTabVisibility();
  }

  function applyPaletteTabVisibility() {
    var auto = isAutoPaint();
    $('autoPalette').classList.toggle('show', auto);
    paletteCanvas.style.display = auto ? 'none' : 'block';
  }

  function setAutoMode(v) {
    state.autoMode = v && !!L().autotile && state.active === 'ground';
    refreshPaletteTabs();
  }

  function rebuildAutoPalette() {
    var wrap = $('autoPalette');
    wrap.innerHTML = '';
    var layer = L();
    if (!layer.autotile) return;
    var keys = Object.keys(layer.autotile.terrains);
    // erase swatch first
    keys.unshift('');
    keys.forEach(function (k) {
      var sw = document.createElement('div');
      sw.className = 'auto-swatch' + (k === state.selectedTerrain ? ' active' : '');
      var c = document.createElement('canvas');
      c.width = c.height = 32;
      var cx = c.getContext('2d'); cx.imageSmoothingEnabled = false;
      if (k === '') {
        cx.fillStyle = '#ddd'; cx.fillRect(0, 0, 32, 32);
        cx.strokeStyle = '#c33'; cx.lineWidth = 2;
        cx.beginPath(); cx.moveTo(6, 6); cx.lineTo(26, 26); cx.moveTo(26, 6); cx.lineTo(6, 26); cx.stroke();
      } else {
        var info = layer.autotile.terrains[k];
        var fillId = (layer.autotile.fills && layer.autotile.fills[k] != null)
          ? layer.autotile.fills[k]
          : (info.lut ? info.lut[255] : (info.base_index || 0));
        blitLocal(cx, aSheet(layer), fillId, 0, 0, 32);
      }
      var label = document.createElement('span');
      label.textContent = k === '' ? '(erase)' : k;
      sw.appendChild(c); sw.appendChild(label);
      sw.addEventListener('click', function () {
        state.selectedTerrain = k;
        document.querySelectorAll('.auto-swatch').forEach(function (s) { s.classList.remove('active'); });
        sw.classList.add('active');
      });
      wrap.appendChild(sw);
    });
    if (keys.indexOf(state.selectedTerrain) < 0) state.selectedTerrain = keys[1] || '';
  }

  // XP mode flat tile list: every tile of every sheet in the active set, stacked
  // (skips the *_ground autotile sheet's raw tiles to avoid duplicating A2-raw).
  // Each entry maps a palette cell -> a GLOBAL id in the active layer's group.
  function buildXpView() {
    var layer = L();
    var tiles = [];
    var seen = {};
    state.setTabs.forEach(function (t) {
      if (t.role === 'A2') return;            // ground autotile handled by the Auto palette
      var sheet = layer.sheets.filter(function (s) { return s.name === t.sheet; })[0];
      if (!sheet || seen[t.sheet]) return;
      seen[t.sheet] = 1;
      for (var i = 0; i < sheet.count; i++) tiles.push({ sheet: sheet, local: i, gid: sheet.offset + i });
    });
    state.xpView = { tiles: tiles };
    return state.xpView;
  }

  function drawPalette() {
    if (state.tabMode === 'xp') return drawPaletteXP();
    var layer = L();
    if (!layer.img) return;
    var n = totalMetatiles(layer);
    var rows = Math.ceil(n / PAL_COLS);
    var cw = PAL_COLS * DT * PAL_SCALE;
    var ch = rows * DT * PAL_SCALE;
    paletteCanvas.width = cw; paletteCanvas.height = ch;
    pctx.imageSmoothingEnabled = false;
    pctx.clearRect(0, 0, cw, ch);
    var sheet = aSheet(layer);
    for (var i = 0; i < n; i++) {
      var dc = i % PAL_COLS, dr = (i / PAL_COLS) | 0;
      blitLocal(pctx, sheet, i, dc * DT * PAL_SCALE, dr * DT * PAL_SCALE, DT * PAL_SCALE);
    }
    // highlight current stamp rectangle (only if the selection is in this sheet)
    var s = state.stamp, top = state.selectedTile - (sheet ? sheet.offset : 0);
    if (top >= 0 && top < n) {
      var sc = top % PAL_COLS, sr = (top / PAL_COLS) | 0;
      pctx.strokeStyle = '#ff3030'; pctx.lineWidth = 2;
      pctx.strokeRect(sc * DT * PAL_SCALE + 1, sr * DT * PAL_SCALE + 1,
        s.w * DT * PAL_SCALE - 2, s.h * DT * PAL_SCALE - 2);
    }
    $('paletteCount').textContent = n + ' tiles';
  }

  // XP single tall palette: all set sheets stacked in one PAL_COLS-wide column.
  function drawPaletteXP() {
    var view = buildXpView();
    var n = view.tiles.length;
    var rows = Math.ceil(n / PAL_COLS) || 1;
    var cw = PAL_COLS * DT * PAL_SCALE, ch = rows * DT * PAL_SCALE;
    paletteCanvas.width = cw; paletteCanvas.height = ch;
    pctx.imageSmoothingEnabled = false;
    pctx.clearRect(0, 0, cw, ch);
    for (var i = 0; i < n; i++) {
      var dc = i % PAL_COLS, dr = (i / PAL_COLS) | 0, t = view.tiles[i];
      blitLocal(pctx, t.sheet, t.local, dc * DT * PAL_SCALE, dr * DT * PAL_SCALE, DT * PAL_SCALE);
    }
    // highlight: find the cell whose gid == selectedTile
    var s = state.stamp;
    for (var k = 0; k < n; k++) {
      if (view.tiles[k].gid === state.selectedTile) {
        var sc = k % PAL_COLS, sr = (k / PAL_COLS) | 0;
        pctx.strokeStyle = '#ff3030'; pctx.lineWidth = 2;
        pctx.strokeRect(sc * DT * PAL_SCALE + 1, sr * DT * PAL_SCALE + 1,
          s.w * DT * PAL_SCALE - 2, s.h * DT * PAL_SCALE - 2);
        break;
      }
    }
    $('paletteCount').textContent = n + ' tiles (all sheets)';
  }

  // blit a LOCAL id from a specific sheet (palette/swatch)
  function blitLocal(c, sheet, local, dx, dy, dsize) {
    if (!sheet || !sheet.img || local < 0) return;
    var st = (sheet.meta && sheet.meta.tile) || 16;
    var pr = (sheet.meta && sheet.meta.metatiles_per_row) || META_PER_ROW;
    var col = local % pr, row = (local / pr) | 0;
    c.drawImage(sheet.img, col * st, row * st, st, st, dx, dy, dsize, dsize);
  }
  // blit a GLOBAL id, resolving which sheet of the layer it belongs to (map)
  function blitGid(c, layer, gid, dx, dy, dsize) {
    if (gid < 0) return;
    var sheet = sheetOfGid(layer, gid);
    if (sheet) blitLocal(c, sheet, gid - sheet.offset, dx, dy, dsize);
  }

  // Palette drag-select (multi-tile stamp)
  var palDrag = null;
  function palCellFromEvent(e) {
    var p = screenToLocal(paletteCanvas, e.clientX, e.clientY);
    return { cx: Math.max(0, Math.floor(p.x / (DT * PAL_SCALE))),
             cy: Math.max(0, Math.floor(p.y / (DT * PAL_SCALE))) };
  }
  paletteCanvas.addEventListener('mousedown', function (e) {
    palDrag = palCellFromEvent(e);
    setStampFromPalette(palDrag.cx, palDrag.cy, palDrag.cx, palDrag.cy);
  });
  paletteCanvas.addEventListener('mousemove', function (e) {
    if (!palDrag) return;
    var p = palCellFromEvent(e);
    setStampFromPalette(palDrag.cx, palDrag.cy, p.cx, p.cy);
  });
  window.addEventListener('mouseup', function () { palDrag = null; });

  function setStampFromPalette(cx0, cy0, cx1, cy1) {
    var x0 = Math.min(cx0, cx1), x1 = Math.max(cx0, cx1);
    var y0 = Math.min(cy0, cy1), y1 = Math.max(cy0, cy1);
    var w = x1 - x0 + 1, h = y1 - y0 + 1, ids = [];
    if (state.tabMode === 'xp') {
      var view = state.xpView || buildXpView(), n0 = view.tiles.length;
      var gidAt = function (cx, cy) {
        var k = cy * PAL_COLS + cx;
        return (k >= 0 && k < n0) ? view.tiles[k].gid : (view.tiles[0] ? view.tiles[0].gid : 0);
      };
      for (var yy = y0; yy <= y1; yy++)
        for (var xx = x0; xx <= x1; xx++) ids.push(gidAt(xx, yy));
      state.stamp = { w: w, h: h, ids: ids };
      state.selectedTile = gidAt(x0, y0);
      state.eraser = false; $('eraserBtn').classList.remove('active');
      $('selId').textContent = state.selectedTile + (w * h > 1 ? (' (' + w + '×' + h + ')') : '');
      $('selBehavior').textContent = '';
      updateSelSwatch(); drawPalette();
      return;
    }
    var sheet = aSheet(L()); if (!sheet) return;
    var off = sheet.offset, n = sheet.count;
    for (var y = y0; y <= y1; y++)
      for (var x = x0; x <= x1; x++) {
        var local = y * PAL_COLS + x;
        ids.push(off + ((local >= 0 && local < n) ? local : 0));   // GLOBAL ids
      }
    state.stamp = { w: w, h: h, ids: ids };
    var topLocal = y0 * PAL_COLS + x0;
    state.selectedTile = off + ((topLocal >= 0 && topLocal < n) ? topLocal : 0);
    state.eraser = false; $('eraserBtn').classList.remove('active');
    $('selId').textContent = state.selectedTile + (w * h > 1 ? (' (' + w + '×' + h + ')') : '');
    var beh = sheet.meta && sheet.meta.behaviors ? sheet.meta.behaviors[topLocal] : null;
    $('selBehavior').textContent = beh != null ? ('behavior ' + beh) : '';
    updateSelSwatch();
    drawPalette();
  }

  $('paletteJump').addEventListener('change', function () {
    var id = parseInt(this.value, 10);
    if (!isNaN(id) && id >= 0 && id < totalMetatiles()) {
      setStampFromPalette(id % PAL_COLS, (id / PAL_COLS) | 0, id % PAL_COLS, (id / PAL_COLS) | 0);
      $('paletteWrap').scrollTop = ((id / PAL_COLS) | 0) * DT * PAL_SCALE - 60;
    }
  });

  function updateSelSwatch() {
    var sc = $('selSwatch').getContext('2d');
    sc.imageSmoothingEnabled = false;
    sc.clearRect(0, 0, 16, 16);
    blitGid(sc, L(), state.selectedTile, 0, 0, 16);
  }

  // ── Map model ──
  function newMap(w, h, keep) {
    var prev = keep ? state.layers : null;
    var pw = keep ? state.width : 0, ph = keep ? state.height : 0;
    state.width = w; state.height = h;
    ['ground', 'overlay', 'upper'].forEach(function (key) {
      var layer = state.layers[key];
      // Ground default fill = the set's A2 GROUND tile (grass), as a GLOBAL id.
      // (Not sheets[0] — A1/water sorts first in the tab order, so that would
      // wrongly default the map to water.)
      var fill = layer.fill;
      if (key === 'ground') fill = groundFillGid(layer);
      layer.baseFill = fill;
      var nd = new Int32Array(w * h);
      var nc = new Uint8Array(w * h);
      var nt = new Array(w * h);
      for (var i = 0; i < w * h; i++) { nd[i] = fill; nt[i] = ''; }
      if (keep && prev[key].data) {
        var od = prev[key].data, oc = prev[key].collision, ot = prev[key].terrain;
        for (var y = 0; y < Math.min(h, ph); y++)
          for (var x = 0; x < Math.min(w, pw); x++) {
            nd[y * w + x] = od[y * pw + x];
            if (oc) nc[y * w + x] = oc[y * pw + x];
            if (ot) nt[y * w + x] = ot[y * pw + x] || '';
          }
      }
      layer.data = nd; layer.collision = nc; layer.terrain = nt;
    });
    // Region-ID + shadow layers (preserve overlapping cells on resize).
    var nr = new Uint8Array(w * h), nsh = new Uint8Array(w * h);
    if (keep) {
      for (var ry = 0; ry < Math.min(h, ph); ry++)
        for (var rx = 0; rx < Math.min(w, pw); rx++) {
          if (state.region) nr[ry * w + rx] = state.region[ry * pw + rx];
          if (state.shadow) nsh[ry * w + rx] = state.shadow[ry * pw + rx];
        }
    }
    state.region = nr; state.shadow = nsh;
    if (!keep) { state.warps = []; state.events = []; state.selectedEvent = null; }
    $('statSize').textContent = w + ' × ' + h;
    drawMap();
    renderWarpList();
  }

  function idx(x, y) { return y * state.width + x; }
  function inBounds(x, y) { return x >= 0 && y >= 0 && x < state.width && y < state.height; }

  // Distinct translucent colour per region id (HSL spread, like RM's palette).
  function regionColor(id) {
    var h = (id * 47) % 360;
    return 'hsla(' + h + ',75%,50%,0.5)';
  }

  // ── Map rendering ──
  var mapCanvas = $('mapCanvas');
  var mctx = mapCanvas.getContext('2d');
  function cell() { return DT * state.zoom; }

  function drawLayer(key, alpha) {
    var layer = state.layers[key];
    if (!layer.sheets.length || !layer.data) return;
    var cs = cell();
    mctx.globalAlpha = alpha;
    for (var y = 0; y < state.height; y++)
      for (var x = 0; x < state.width; x++) {
        var v = layer.data[idx(x, y)];
        if (v >= 0) blitGid(mctx, layer, v, x * cs, y * cs, cs);
      }
    mctx.globalAlpha = 1;
  }

  function drawMap() {
    var cs = cell();
    mapCanvas.width = state.width * cs;
    mapCanvas.height = state.height * cs;
    mctx.imageSmoothingEnabled = false;
    mctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    // Layers draw bottom→top (ground, overlay, upper). Dim the non-active ones like RM.
    drawLayer('ground', state.active === 'ground' ? 1 : 0.4);
    drawLayer('overlay', state.active === 'overlay' ? 1 : 0.4);
    drawLayer('upper', state.active === 'upper' ? 1 : 0.4);

    // Shadows (RM shadow pen): translucent black quarter-cells, drawn over tiles.
    if (state.shadow) {
      mctx.fillStyle = 'rgba(0,0,0,0.35)';
      var hc = cs / 2;
      for (var sy = 0; sy < state.height; sy++)
        for (var sx = 0; sx < state.width; sx++) {
          var m = state.shadow[idx(sx, sy)]; if (!m) continue;
          if (m & 1) mctx.fillRect(sx * cs,      sy * cs,      hc, hc);
          if (m & 2) mctx.fillRect(sx * cs + hc, sy * cs,      hc, hc);
          if (m & 4) mctx.fillRect(sx * cs,      sy * cs + hc, hc, hc);
          if (m & 8) mctx.fillRect(sx * cs + hc, sy * cs + hc, hc, hc);
        }
    }

    if (state.mode === 'collide') {
      var col = state.layers.ground.collision;
      for (var yy = 0; yy < state.height; yy++)
        for (var xx = 0; xx < state.width; xx++)
          if (col[idx(xx, yy)]) {
            mctx.fillStyle = 'rgba(230,40,40,0.45)';
            mctx.fillRect(xx * cs, yy * cs, cs, cs);
          }
    }
    if (state.mode === 'region' && state.region) {
      mctx.font = Math.floor(cs * 0.5) + 'px sans-serif';
      mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
      for (var rj = 0; rj < state.height; rj++)
        for (var ri = 0; ri < state.width; ri++) {
          var rid = state.region[idx(ri, rj)];
          if (!rid) continue;
          mctx.fillStyle = regionColor(rid);
          mctx.fillRect(ri * cs, rj * cs, cs, cs);
          mctx.fillStyle = '#fff';
          mctx.fillText(String(rid), ri * cs + cs / 2, rj * cs + cs / 2);
        }
    }
    if (state.showGrid) {
      mctx.strokeStyle = 'rgba(0,0,0,0.18)'; mctx.lineWidth = 1;
      for (var gx = 0; gx <= state.width; gx++) {
        mctx.beginPath(); mctx.moveTo(gx * cs + 0.5, 0);
        mctx.lineTo(gx * cs + 0.5, mapCanvas.height); mctx.stroke();
      }
      for (var gy = 0; gy <= state.height; gy++) {
        mctx.beginPath(); mctx.moveTo(0, gy * cs + 0.5);
        mctx.lineTo(mapCanvas.width, gy * cs + 0.5); mctx.stroke();
      }
    }
    state.warps.forEach(function (wp) {
      mctx.strokeStyle = '#ffb000'; mctx.lineWidth = 2;
      mctx.strokeRect(wp.x * cs + 1, wp.y * cs + 1, cs - 2, cs - 2);
      mctx.fillStyle = 'rgba(255,176,0,0.28)';
      mctx.fillRect(wp.x * cs, wp.y * cs, cs, cs);
    });
    if (state.sel) {
      var s = state.sel;
      var sx = s.x0 * cs, sy = s.y0 * cs, sw = (s.x1 - s.x0 + 1) * cs, sh = (s.y1 - s.y0 + 1) * cs;
      mctx.fillStyle = 'rgba(58,123,213,0.22)';
      mctx.fillRect(sx, sy, sw, sh);
      mctx.strokeStyle = '#3a7bd5'; mctx.lineWidth = 2;
      mctx.setLineDash([6, 4]); mctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2); mctx.setLineDash([]);
    }
    if (state.events && state.events.length) drawEvents();
  }

  // ── Undo / Redo (snapshot history) ──
  // Snapshot the editable arrays (all layers' data/collision/terrain + warps +
  // size). Push before each user gesture; restore on undo/redo.
  var undoStack = [], redoStack = [], UNDO_MAX = 60;
  var LAYER_KEYS = ['ground', 'overlay', 'upper'];
  function snapshot() {
    var s = { width: state.width, height: state.height, layers: {},
              warps: JSON.parse(JSON.stringify(state.warps)),
              events: JSON.parse(JSON.stringify(state.events)),
              region: state.region ? Uint8Array.from(state.region) : null,
              shadow: state.shadow ? Uint8Array.from(state.shadow) : null };
    LAYER_KEYS.forEach(function (k) {
      var L = state.layers[k];
      s.layers[k] = {
        data: L.data ? Int32Array.from(L.data) : null,
        collision: L.collision ? Uint8Array.from(L.collision) : null,
        terrain: L.terrain ? L.terrain.slice() : null
      };
    });
    return s;
  }
  function restore(s) {
    state.width = s.width; state.height = s.height;
    $('mapW').value = s.width; $('mapH').value = s.height;
    $('statSize').textContent = s.width + ' × ' + s.height;
    LAYER_KEYS.forEach(function (k) {
      var L = state.layers[k], d = s.layers[k]; if (!d) return;
      if (d.data) L.data = Int32Array.from(d.data);
      if (d.collision) L.collision = Uint8Array.from(d.collision);
      if (d.terrain) L.terrain = d.terrain.slice();
    });
    state.warps = JSON.parse(JSON.stringify(s.warps));
    if (s.events) { state.events = JSON.parse(JSON.stringify(s.events)); state.selectedEvent = null; }
    if (s.region) state.region = Uint8Array.from(s.region);
    if (s.shadow) state.shadow = Uint8Array.from(s.shadow);
    drawMap(); renderWarpList();
    if (state.mode === 'event') renderEventPanel();
  }
  function pushUndo() {
    undoStack.push(snapshot());
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    redoStack.length = 0;
  }
  function doUndo() { if (!undoStack.length) { toast('Nothing to undo.'); return; } redoStack.push(snapshot()); restore(undoStack.pop()); }
  function doRedo() { if (!redoStack.length) { toast('Nothing to redo.'); return; } undoStack.push(snapshot()); restore(redoStack.pop()); }

  // ── Painting ──
  var painting = false, rectStart = null;

  function eventCell(e) {
    var p = screenToLocal(mapCanvas, e.clientX, e.clientY);
    var cs = cell();
    return { x: Math.floor(p.x / cs), y: Math.floor(p.y / cs) };
  }

  // Which quarter of a tile the pointer is over (shadow pen). bit: TL1 TR2 BL4 BR8.
  var SHADOW_BITS = { TL: 1, TR: 2, BL: 4, BR: 8 };
  var _shadowAdd = true;
  function eventQuarter(e) {
    var p = screenToLocal(mapCanvas, e.clientX, e.clientY);
    var cs = cell();
    var tx = Math.floor(p.x / cs), ty = Math.floor(p.y / cs);
    var fx = p.x / cs - tx, fy = p.y / cs - ty;
    var bit = (fx < 0.5 ? (fy < 0.5 ? 1 : 4) : (fy < 0.5 ? 2 : 8));
    return { x: tx, y: ty, bit: bit };
  }
  function applyShadow(q) {
    if (!inBounds(q.x, q.y) || !state.shadow) return;
    var i = idx(q.x, q.y);
    if (_shadowAdd) state.shadow[i] |= q.bit; else state.shadow[i] &= ~q.bit;
  }

  // Stamp the current B-tab block (or eraser) with top-left at (ax,ay).
  function stampAt(ax, ay) {
    var layer = L();
    var s = state.stamp;
    for (var dy = 0; dy < s.h; dy++)
      for (var dx = 0; dx < s.w; dx++) {
        var x = ax + dx, y = ay + dy;
        if (!inBounds(x, y)) continue;
        layer.data[idx(x, y)] = state.eraser ? layer.baseFill : s.ids[dy * s.w + dx];
        if (state.active === 'ground') layer.terrain[idx(x, y)] = '';
      }
  }

  function paintTerrain(x, y) {
    var layer = state.layers.ground;
    layer.terrain[idx(x, y)] = state.selectedTerrain;
    recomputeTerrainAround(x, y);
  }

  function applyAt(x, y) {
    if (!inBounds(x, y)) return;
    if (state.mode === 'warp') return;
    if (state.mode === 'region') {
      state.region[idx(x, y)] = state.eraser ? 0 : state.regionId;
      return;
    }
    if (state.mode === 'collide') {
      var c = state.layers.ground.collision;
      c[idx(x, y)] = c[idx(x, y)] ? 0 : 1;
      return;
    }
    if (state.tool === 'pick') {
      var v = L().data[idx(x, y)];
      if (v >= 0) selectGid(v);
      return;
    }
    if (isAutoPaint() && !state.eraser) { paintTerrain(x, y); return; }
    stampAt(x, y);
  }

  // Eyedropper: select the picked global id, switching the active sheet if needed.
  function selectGid(gid) {
    var layer = L();
    var sheet = sheetOfGid(layer, gid); if (!sheet) return;
    var sidx = layer.sheets.indexOf(sheet);
    if (sidx >= 0 && sidx !== layer.active) {
      layer.active = sidx; syncActive(layer);
      $('tilesetSel').value = layer.name;
      updateTilesetStatus(); buildTilesetTabs(); rebuildAutoPalette(); refreshPaletteTabs();
    }
    var local = gid - sheet.offset;
    drawPalette();
    setStampFromPalette(local % PAL_COLS, (local / PAL_COLS) | 0, local % PAL_COLS, (local / PAL_COLS) | 0);
  }

  function floodFill(x, y) {
    var layer = L();
    var target = layer.data[idx(x, y)];
    var repl = state.eraser ? layer.baseFill : state.stamp.ids[0];
    if (target === repl) return;
    var stack = [[x, y]];
    while (stack.length) {
      var p = stack.pop(), px = p[0], py = p[1];
      if (!inBounds(px, py) || layer.data[idx(px, py)] !== target) continue;
      layer.data[idx(px, py)] = repl;
      if (state.active === 'ground') layer.terrain[idx(px, py)] = '';
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  }

  // tile the stamp / single id over a rectangular or elliptical region
  function fillRegion(x0, y0, x1, y1, ellipse) {
    var layer = L();
    var auto = isAutoPaint() && !state.eraser;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var rx = (x1 - x0) / 2 + 0.5, ry = (y1 - y0) / 2 + 0.5;
    for (var y = y0; y <= y1; y++)
      for (var x = x0; x <= x1; x++) {
        if (!inBounds(x, y)) continue;
        if (ellipse) {
          var nx = (x - cx) / rx, ny = (y - cy) / ry;
          if (nx * nx + ny * ny > 1) continue;
        }
        if (state.mode === 'region') { state.region[idx(x, y)] = state.eraser ? 0 : state.regionId; continue; }
        if (state.mode === 'collide') { layer.collision[idx(x, y)] = state.eraser ? 0 : 1; continue; }
        if (auto) { layer.terrain[idx(x, y)] = state.selectedTerrain; continue; }
        // tile the stamp block by relative position
        var s = state.stamp;
        var id = state.eraser ? layer.baseFill : s.ids[((y - y0) % s.h) * s.w + ((x - x0) % s.w)];
        layer.data[idx(x, y)] = id;
        if (state.active === 'ground') layer.terrain[idx(x, y)] = '';
      }
    if (auto) for (var ry2 = y0 - 1; ry2 <= y1 + 1; ry2++)
      for (var rx2 = x0 - 1; rx2 <= x1 + 1; rx2++) recomputeTerrainCell(rx2, ry2);
  }

  mapCanvas.addEventListener('mousedown', function (e) {
    var p = eventCell(e);
    if (!inBounds(p.x, p.y)) return;
    if (state.tool === 'pick' && state.mode === 'map') { applyAt(p.x, p.y); return; } // pick doesn't mutate
    if (state.tool === 'select') { rectStart = p; state.sel = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; drawMap(); return; }
    if (state.mode === 'event') { eventClick(p.x, p.y); return; }
    pushUndo();                                          // record state before any edit gesture
    if (state.mode === 'shadow') {
      var q0 = eventQuarter(e);
      // toggle the clicked quarter; remember the direction for drag painting
      var had = (state.shadow[idx(q0.x, q0.y)] & q0.bit) !== 0;
      _shadowAdd = state.eraser ? false : !had;
      painting = true; applyShadow(q0); drawMap(); return;
    }
    if (state.mode === 'warp') { addWarp(p.x, p.y); return; }
    if (state.tool === 'fill' && state.mode === 'map') { floodFill(p.x, p.y); drawMap(); return; }
    if (state.tool === 'rect' || state.tool === 'ellipse') { rectStart = p; return; }
    if (state.tool === 'pick') { applyAt(p.x, p.y); return; }
    painting = true; applyAt(p.x, p.y); drawMap();
  });

  mapCanvas.addEventListener('mousemove', function (e) {
    var p = eventCell(e);
    $('statCoord').textContent = 'x: ' + p.x + '  y: ' + p.y;
    if (inBounds(p.x, p.y)) {
      var layer = L();
      $('statTile').textContent = 'tile #' + layer.data[idx(p.x, p.y)] +
        (state.layers.ground.collision[idx(p.x, p.y)] ? '  (blocked)' : '');
    }
    if (state.tool === 'select' && rectStart) {
      state.sel = { x0: Math.min(rectStart.x, p.x), y0: Math.min(rectStart.y, p.y),
                    x1: Math.max(rectStart.x, p.x), y1: Math.max(rectStart.y, p.y) };
      drawMap();
    }
    if (painting && state.mode === 'shadow') { applyShadow(eventQuarter(e)); drawMap(); return; }
    if (painting && inBounds(p.x, p.y)) { applyAt(p.x, p.y); drawMap(); }
  });

  window.addEventListener('mouseup', function (e) {
    if (state.tool === 'select' && rectStart) {
      var ps = eventCell(e);
      state.sel = { x0: Math.min(rectStart.x, ps.x), y0: Math.min(rectStart.y, ps.y),
                    x1: Math.max(rectStart.x, ps.x), y1: Math.max(rectStart.y, ps.y) };
      rectStart = null; drawMap();
    } else if ((state.tool === 'rect' || state.tool === 'ellipse') && rectStart) {
      var p = eventCell(e);
      var x0 = Math.min(rectStart.x, p.x), x1 = Math.max(rectStart.x, p.x);
      var y0 = Math.min(rectStart.y, p.y), y1 = Math.max(rectStart.y, p.y);
      fillRegion(x0, y0, x1, y1, state.tool === 'ellipse');
      rectStart = null; drawMap();
    }
    painting = false;
  });

  // ── Selection clipboard (Copy / Cut / Paste / Delete) on the active layer ──
  function clampSel() {
    if (!state.sel) return null;
    var s = state.sel;
    return { x0: Math.max(0, s.x0), y0: Math.max(0, s.y0),
             x1: Math.min(state.width - 1, s.x1), y1: Math.min(state.height - 1, s.y1) };
  }
  function copySelection() {
    var s = clampSel(); if (!s) { toast('Select a box first (Select tool).'); return; }
    var layer = L(), w = s.x1 - s.x0 + 1, h = s.y1 - s.y0 + 1, ids = [];
    for (var y = s.y0; y <= s.y1; y++)
      for (var x = s.x0; x <= s.x1; x++) ids.push(layer.data[idx(x, y)]);
    state.clipboard = { w: w, h: h, ids: ids };
    toast('Copied ' + w + '×' + h + ' (active layer). Pick a tool + click to paste.');
  }
  function clearSelection() {
    var s = clampSel(); if (!s) { toast('Select a box first.'); return; }
    pushUndo();
    var layer = L();
    for (var y = s.y0; y <= s.y1; y++)
      for (var x = s.x0; x <= s.x1; x++) {
        layer.data[idx(x, y)] = layer.baseFill;
        if (state.active === 'ground') layer.terrain[idx(x, y)] = '';
      }
    drawMap();
  }
  function cutSelection() { copySelection(); clearSelection(); }
  function pasteClipboard() {
    if (!state.clipboard) { toast('Clipboard empty — Copy a selection first.'); return; }
    // Load the copied block as the current stamp; pencil places it on click.
    state.stamp = { w: state.clipboard.w, h: state.clipboard.h, ids: state.clipboard.ids.slice() };
    state.selectedTile = state.clipboard.ids[0];
    state.eraser = false; $('eraserBtn').classList.remove('active');
    setToolBtn('pencil');
    toast('Paste armed — click on the map to stamp the copied block.');
  }

  // ── Warps ──
  function addWarp(x, y) {
    if (state.warps.some(function (w) { return w.x === x && w.y === y; })) return;
    state.warps.push({ x: x, y: y, dest_map: 'MAP_NONE', dest_warp_id: '0' });
    drawMap(); renderWarpList();
  }
  function renderWarpList() {
    var list = $('warpList'); if (!list) return;   // Warp UI removed — warps are events now
    list.innerHTML = '';
    if (!state.warps.length) { list.innerHTML = '<div class="hint">No warps yet.</div>'; return; }
    state.warps.forEach(function (w, i) {
      var div = document.createElement('div'); div.className = 'warp-item';
      var info = document.createElement('span'); info.textContent = '(' + w.x + ',' + w.y + ')';
      var dest = document.createElement('input');
      dest.type = 'text'; dest.value = w.dest_map; dest.style.width = '100px';
      dest.title = 'destination MAP_CONST';
      dest.addEventListener('change', function () { w.dest_map = this.value; });
      var del = document.createElement('button'); del.textContent = '✕';
      del.addEventListener('click', function () { state.warps.splice(i, 1); drawMap(); renderWarpList(); });
      div.appendChild(info); div.appendChild(dest); div.appendChild(del);
      list.appendChild(div);
    });
  }

  // ── Events (RPG-Maker-style map events) ──
  var EVENT_DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };
  function eventAt(x, y) {
    for (var i = 0; i < state.events.length; i++) if (state.events[i].x === x && state.events[i].y === y) return state.events[i];
    return null;
  }
  function eventClick(x, y) {
    if (state._pickDest) {                       // arming a Transfer destination
      var pd = state._pickDest; state._pickDest = null;
      pd.cmd.map = $('mapName').value || pd.cmd.map; pd.cmd.x = x; pd.cmd.y = y;
      state.selectedEvent = pd.ev; renderEventPanel();
      toast('Destination set: ' + pd.cmd.map + ' (' + x + ',' + y + ')');
      return;
    }
    var ev = eventAt(x, y);
    if (ev) { state.selectedEvent = ev; }
    else {
      pushUndo();
      var id = 1; state.events.forEach(function (e) { if (e.id >= id) id = e.id + 1; });
      ev = { id: id, name: 'EV' + ('00' + id).slice(-3), x: x, y: y,
             graphic: state._defaultGraphic || null, dir: 'down', trigger: 'action', through: false,
             commands: [] };
      state.events.push(ev); state.selectedEvent = ev;
    }
    renderEventPanel(); drawMap();
  }
  function deleteEvent(ev) {
    pushUndo();
    var i = state.events.indexOf(ev); if (i >= 0) state.events.splice(i, 1);
    if (state.selectedEvent === ev) state.selectedEvent = null;
    renderEventPanel(); drawMap();
  }
  // Draw a charset's [row,col] frame into the map cell (feet aligned to bottom).
  function blitCharFrame(g, row, col, dx, dy, size) {
    var img = spriteImg(g.file);
    if (!img.complete || !img.naturalWidth) { img.onload = drawMap; return false; }
    var fw = g.frame_w, fh = g.frame_h, sh = size * (fh / fw);
    mctx.drawImage(img, col * fw, row * fh, fw, fh, dx, dy + size - sh, size, sh);
    return true;
  }
  function drawEvents() {
    var cs = cell();
    state.events.forEach(function (ev) {
      var drew = false;
      if (ev.graphic && ev.graphic.file) {
        var row = EVENT_DIR_ROW[ev.dir] || 0;
        drew = blitCharFrame(ev.graphic, row, 1, ev.x * cs, ev.y * cs, cs);
      }
      if (!drew) {                                   // no graphic: a diamond marker
        mctx.fillStyle = 'rgba(120,90,200,0.55)';
        mctx.beginPath();
        mctx.moveTo(ev.x * cs + cs / 2, ev.y * cs + 3);
        mctx.lineTo(ev.x * cs + cs - 3, ev.y * cs + cs / 2);
        mctx.lineTo(ev.x * cs + cs / 2, ev.y * cs + cs - 3);
        mctx.lineTo(ev.x * cs + 3, ev.y * cs + cs / 2);
        mctx.closePath(); mctx.fill();
      }
      mctx.strokeStyle = ev === state.selectedEvent ? '#ff3030' : 'rgba(120,90,200,0.9)';
      mctx.lineWidth = 2; mctx.strokeRect(ev.x * cs + 1, ev.y * cs + 1, cs - 2, cs - 2);
    });
  }
  function renderEventPanel() {
    var props = $('eventProps');
    var ev = state.selectedEvent;
    if (!ev) { props.innerHTML = '<div class="hint">No event selected. Click a tile to place one.</div>'; renderEventList(); return; }
    props.innerHTML =
      '<div class="row"><label class="lbl">Name</label><input type="text" id="evName" value="' + (ev.name || '') + '" style="flex:1;min-width:0;"></div>' +
      '<div class="row"><label class="lbl">Graphic</label><span id="evGfx" class="hint" style="flex:1;">' + (ev.graphic ? ev.graphic.sprite : '(none)') + '</span><button id="evPick">Choose…</button></div>' +
      '<div class="row"><label class="lbl">Facing</label><select id="evDir"><option value="down">Down</option><option value="left">Left</option><option value="right">Right</option><option value="up">Up</option></select></div>' +
      '<div class="row"><label class="lbl">Trigger</label><select id="evTrig"><option value="action">Action button</option><option value="touch">Player touch</option><option value="auto">Autorun</option><option value="parallel">Parallel</option></select></div>' +
      '<div class="row"><label><input type="checkbox" id="evThrough"> Through (walk past)</label></div>' +
      '<div class="row"><button id="evDel" style="color:#c02020;">✕ Delete event</button></div>';
    $('evName').addEventListener('change', function () { ev.name = this.value; renderEventList(); });
    $('evDir').value = ev.dir || 'down';
    $('evDir').addEventListener('change', function () { ev.dir = this.value; drawMap(); });
    $('evTrig').value = ev.trigger || 'action';
    $('evTrig').addEventListener('change', function () { ev.trigger = this.value; });
    $('evThrough').checked = !!ev.through;
    $('evThrough').addEventListener('change', function () { ev.through = this.checked; });
    $('evPick').addEventListener('click', function () { openSpriteModal('event'); });
    $('evDel').addEventListener('click', function () { deleteEvent(ev); });
    renderEventCommands(ev);
    renderEventList();
  }

  // Command list (RPG Maker's event contents) — Transfer Player + Show Text.
  function mapNameList() {
    var names = Object.keys(treeModel || {});
    if (!names.length && $('mapName')) names = [$('mapName').value];
    return names.sort();
  }
  function renderEventCommands(ev) {
    if (!ev.commands) ev.commands = [];
    var host = document.createElement('div'); host.id = 'evCmds'; host.style.marginTop = '7px';
    var head = document.createElement('div');
    head.innerHTML = '<strong style="font-size:10px;color:#2b4a7a;">CONTENTS</strong>';
    host.appendChild(head);
    ev.commands.forEach(function (cmd, ci) {
      var box = document.createElement('div'); box.className = 'card'; box.style.cssText = 'padding:6px;margin:4px 0;';
      if (cmd.type === 'transfer') {
        box.innerHTML = '<div class="row"><b style="color:#2b4a7a;font-size:11px;flex:1;">◈ Transfer Player</b>' +
          '<button class="cmdDel" title="Remove">✕</button></div>' +
          '<div class="row"><label class="lbl">Map</label><select class="cmMap" style="flex:1;min-width:0;"></select></div>' +
          '<div class="row"><label class="lbl">X</label><input type="number" class="cmX" value="' + (cmd.x || 0) + '" style="width:50px;">' +
          '<label class="lbl">Y</label><input type="number" class="cmY" value="' + (cmd.y || 0) + '" style="width:50px;"></div>' +
          '<div class="row"><label class="lbl">Facing</label><select class="cmDir">' +
          '<option value="retain">Retain</option><option value="down">Down</option><option value="left">Left</option><option value="right">Right</option><option value="up">Up</option></select>' +
          '<button class="cmPick" title="Pick X,Y on a map">📍 Pick…</button></div>';
        var msel = box.querySelector('.cmMap');
        mapNameList().forEach(function (n) { var o = document.createElement('option'); o.value = o.textContent = n; msel.appendChild(o); });
        if (cmd.map) msel.value = cmd.map; else cmd.map = msel.value;
        msel.addEventListener('change', function () { cmd.map = this.value; });
        box.querySelector('.cmX').addEventListener('change', function () { cmd.x = parseInt(this.value, 10) || 0; });
        box.querySelector('.cmY').addEventListener('change', function () { cmd.y = parseInt(this.value, 10) || 0; });
        var dsel = box.querySelector('.cmDir'); dsel.value = cmd.dir || 'retain';
        dsel.addEventListener('change', function () { cmd.dir = this.value; });
        box.querySelector('.cmPick').addEventListener('click', function () { pickDestination(cmd, ev); });
      } else if (cmd.type === 'text') {
        box.innerHTML = '<div class="row"><b style="color:#2b4a7a;font-size:11px;flex:1;">💬 Show Text</b>' +
          '<button class="cmdDel" title="Remove">✕</button></div>' +
          '<textarea class="cmText" rows="2" style="width:100%;box-sizing:border-box;">' + (cmd.text || '') + '</textarea>';
        box.querySelector('.cmText').addEventListener('change', function () { cmd.text = this.value; });
      }
      box.querySelector('.cmdDel').addEventListener('click', function () { ev.commands.splice(ci, 1); renderEventPanel(); });
      host.appendChild(box);
    });
    var add = document.createElement('div'); add.className = 'row'; add.style.marginTop = '4px';
    add.innerHTML = '<label class="lbl">Add</label>' +
      '<button id="addTransfer">◈ Transfer Player</button><button id="addText">💬 Show Text</button>';
    host.appendChild(add);
    $('eventProps').appendChild(host);
    $('addTransfer').addEventListener('click', function () {
      ev.commands.push({ type: 'transfer', map: mapNameList()[0] || '', x: 0, y: 0, dir: 'retain' });
      if (!ev.trigger) ev.trigger = 'action'; renderEventPanel();
    });
    $('addText').addEventListener('click', function () { ev.commands.push({ type: 'text', text: '' }); renderEventPanel(); });
  }
  // "Pick…" — arm a click on the map to set a transfer's X,Y (and map = current).
  function pickDestination(cmd, ev) {
    toast('Click a tile on the CURRENT map to set the destination X,Y.');
    state._pickDest = { cmd: cmd, ev: ev };
    setModeBtn('event'); syncModeUI();
  }
  function renderEventList() {
    var list = $('eventList'); if (!list) return; list.innerHTML = '';
    if (!state.events.length) { list.innerHTML = '<div class="hint">No events yet.</div>'; return; }
    state.events.forEach(function (ev) {
      var d = document.createElement('div'); d.className = 'warp-item';
      d.style.cursor = 'pointer';
      if (ev === state.selectedEvent) { d.style.background = 'var(--accent2)'; d.style.borderColor = 'var(--accent)'; }
      d.textContent = ev.name + '  (' + ev.x + ',' + ev.y + ')' + (ev.graphic ? ' · ' + ev.graphic.sprite : '');
      d.addEventListener('click', function () { state.selectedEvent = ev; renderEventPanel(); drawMap(); });
      list.appendChild(d);
    });
  }

  // ── Export / Import ──
  function hasContent(arr, empty) {
    if (!arr) return false;
    for (var i = 0; i < arr.length; i++) if (arr[i] !== empty) return true;
    return false;
  }

  function sheetGroup(layer) {
    return layer.sheets.map(function (s) { return { name: s.name, offset: s.offset, count: s.count }; });
  }
  function buildLayout() {
    var g = state.layers.ground, o = state.layers.overlay, u = state.layers.upper;
    var base = g.sheets[0] || null;
    var layout = {
      id: $('layoutId').value || 'LAYOUT_NEW_MAP',
      width: state.width, height: state.height,
      primary_tileset: (base && base.meta && base.meta.primary_tileset) || 'gTileset_General',
      secondary_tileset: (base && base.meta && base.meta.secondary_tileset) || '',
      tileset: base ? base.name : null,           // base sheet (single-sheet maps stay engine-compatible)
      tileset_group: sheetGroup(g),               // full group for multi-sheet maps
      metatiles: Array.from(g.data),
      collision: Array.from(g.collision)
    };
    if (g.terrain && g.terrain.some(function (t) { return t; })) {
      layout.terrain = g.terrain.map(function (t) { return t || ''; });
    }
    if (o.sheets.length && hasContent(o.data, -1)) {
      layout.overlay_tileset = o.sheets[0].name;
      layout.overlay_group = sheetGroup(o);
      layout.overlay = Array.from(o.data);
    }
    if (u.sheets.length && hasContent(u.data, -1)) {
      layout.upper_tileset = u.sheets[0].name;
      layout.upper_group = sheetGroup(u);
      layout.upper = Array.from(u.data);
    }
    if (state.region && hasContent(state.region, 0)) {
      layout.region_ids = Array.from(state.region);
    }
    if (state.shadow && hasContent(state.shadow, 0)) {
      layout.shadow = Array.from(state.shadow);
    }
    return layout;
  }

  function buildMap() {
    var name = $('mapName').value || 'NewMap';
    var node = treeModel[name] || (currentNode && treeModel[currentNode]) || null;
    return {
      id: 'MAP_' + name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase(),
      name: name, region: $('mapRegion').value,
      parent: node && node.parent ? node.parent : '',   // tree hierarchy (engine ignores)
      layout: $('layoutId').value || 'LAYOUT_NEW_MAP',
      music: 'MUS_PALLET', weather: 'WEATHER_NONE', map_type: 'MAP_TYPE_TOWN',
      allow_running: true, allow_cycling: true, show_map_name: true,
      connections: [], npcs: [],
      warps: state.warps.map(function (w) {
        return { x: w.x, y: w.y, dest_map: w.dest_map, dest_warp_id: w.dest_warp_id };
      }),
      events: state.events.map(function (ev) {
        return { id: ev.id, name: ev.name, x: ev.x, y: ev.y, graphic: ev.graphic || null,
                 dir: ev.dir || 'down', trigger: ev.trigger || 'action', through: !!ev.through,
                 commands: ev.commands || [] };
      }),
      triggers: [], signs: []
    };
  }

  function download(filename, obj) {
    var blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  $('exportBtn').addEventListener('click', function () {
    var layout = buildLayout(), map = buildMap();
    download(layout.id + '.json', layout);
    setTimeout(function () { download(map.name + '.json', map); }, 250);
  });

  // Apply a parsed layout (+ optional map meta). Loads both layer tilesets.
  function applyLayout(data, mapMeta) {
    if (!data || !data.metatiles || !data.width) {
      return Promise.reject(new Error('Not a layout JSON (needs width/height/metatiles).'));
    }
    var w = data.width, h = data.height;
    var groundGroup = data.tileset_group || (data.tileset ? [{ name: data.tileset }] : []);
    var overlayGroup = data.overlay_group || (data.overlay_tileset ? [{ name: data.overlay_tileset }] : []);
    var upperGroup = data.upper_group || (data.upper_tileset ? [{ name: data.upper_tileset }] : []);
    state.layers.ground = newLayer(0);
    state.layers.overlay = newLayer(-1);
    state.layers.upper = newLayer(-1);
    // load a group's sheets in order, honouring saved offsets (or repacking)
    function loadGroup(layer, group) {
      return group.reduce(function (p, entry) {
        return p.then(function () {
          return loadSheetData(entry.name).then(function (sheet) {
            var off = 0; layer.sheets.forEach(function (s) { off += s.count; });
            sheet.offset = (entry.offset != null) ? entry.offset : off;
            layer.sheets.push(sheet);
          }).catch(function () { /* missing sheet: skip */ });
        });
      }, Promise.resolve()).then(function () { syncActive(layer); });
    }
    return Promise.all([loadGroup(state.layers.ground, groundGroup),
                        loadGroup(state.layers.overlay, overlayGroup),
                        loadGroup(state.layers.upper, upperGroup)]).then(function () {
      state.width = w; state.height = h;
      var g = state.layers.ground;
      g.data = Int32Array.from(data.metatiles);
      g.collision = data.collision ? Uint8Array.from(data.collision) : new Uint8Array(w * h);
      g.terrain = new Array(w * h);
      for (var ti = 0; ti < w * h; ti++) g.terrain[ti] = (data.terrain && data.terrain[ti]) || '';
      var as = autotileSheet(g);
      g.baseFill = (as && as.autotile.fills)
        ? as.offset + (as.autotile.fills[(as.autotile.priority && as.autotile.priority[0]) || 'grass'] || 0)
        : (g.sheets[0] ? g.sheets[0].offset : 0);
      var o = state.layers.overlay;
      o.data = new Int32Array(w * h);
      o.collision = new Uint8Array(w * h);
      o.terrain = new Array(w * h);
      o.baseFill = -1;
      for (var oi = 0; oi < w * h; oi++) { o.data[oi] = data.overlay ? data.overlay[oi] : -1; o.terrain[oi] = ''; }
      var u = state.layers.upper;
      u.data = new Int32Array(w * h);
      u.collision = new Uint8Array(w * h);
      u.terrain = new Array(w * h);
      u.baseFill = -1;
      for (var ui = 0; ui < w * h; ui++) { u.data[ui] = data.upper ? data.upper[ui] : -1; u.terrain[ui] = ''; }
      state.region = new Uint8Array(w * h);
      if (data.region_ids) for (var ri = 0; ri < w * h; ri++) state.region[ri] = data.region_ids[ri] || 0;
      state.shadow = new Uint8Array(w * h);
      if (data.shadow) for (var si = 0; si < w * h; si++) state.shadow[si] = data.shadow[si] || 0;

      $('mapW').value = w; $('mapH').value = h;
      $('layoutId').value = data.id || 'LAYOUT_IMPORTED';
      $('statSize').textContent = w + ' × ' + h;
      if (mapMeta) {
        if (mapMeta.name) $('mapName').value = mapMeta.name;
        if (mapMeta.region) {
          var sel = $('mapRegion');
          if (!Array.prototype.some.call(sel.options, function (op) { return op.value === mapMeta.region; })) {
            var op = document.createElement('option'); op.value = op.textContent = mapMeta.region; sel.appendChild(op);
          }
          sel.value = mapMeta.region;
        }
        state.warps = (mapMeta.warps || []).map(function (w2) {
          return { x: w2.x, y: w2.y, dest_map: w2.dest_map || 'MAP_NONE', dest_warp_id: w2.dest_warp_id || '0' };
        });
        state.events = (mapMeta.events || []).map(function (ev) {
          return { id: ev.id, name: ev.name, x: ev.x, y: ev.y, graphic: ev.graphic || null,
                   dir: ev.dir || 'down', trigger: ev.trigger || 'action', through: !!ev.through,
                   commands: ev.commands || [] };
        });
      } else { state.warps = []; state.events = []; }
      state.selectedEvent = null;
      // reflect ground tileset in the dropdown + palette
      setActiveLayer('ground');
      drawMap(); renderWarpList();
    });
  }

  $('importBtn').addEventListener('click', function () { $('importFile').click(); });
  $('importFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try { applyLayout(JSON.parse(reader.result)).catch(function (err) { alert(err.message); }); }
      catch (err) { alert('Failed to parse JSON: ' + err.message); }
    };
    reader.readAsText(f);
    e.target.value = '';
  });

  // ── Toolbar wiring ──
  function setActiveLayer(key) {
    state.active = key;
    $('layerSel').value = key;
    // reflect on the XP toolbar layer buttons (1/2/3)
    document.querySelectorAll('#layerGroup .mode-layer').forEach(function (x) {
      x.classList.toggle('active', x.dataset.layer === key);
    });
    var layer = L();
    if (!layer.sheets.length && (key === 'overlay' || key === 'upper') && state._tilesetNames) {
      // lazily give the overlay/upper layer a default object sheet on first use:
      // the active set's B page (buildings/props) if available, else first sheet.
      var setB = state.activeSet && state.activeSet.tabs.B;
      var def = (setB && state._tilesetNames.indexOf(setB) >= 0) ? setB
        : ['pf_outside_b', 'pf_outside_c'].filter(function (n) { return state._tilesetNames.indexOf(n) >= 0; })[0]
        || state._tilesetNames[0];
      return useTileset(layer, def).then(function () { setActiveLayer(key); });
    }
    if (layer.name) $('tilesetSel').value = layer.name;
    state.autoMode = state.active === 'ground' && !!L().autotile;
    updateTilesetStatus();
    buildTilesetTabs();
    rebuildAutoPalette();
    refreshPaletteTabs();
    drawPalette();
    updateSelSwatch();
    drawMap();
  }

  $('layerSel').addEventListener('change', function () { setActiveLayer(this.value); });
  $('tilesetSel').addEventListener('change', function () { loadTileset(this.value); });
  $('rmSetSel').addEventListener('change', function () { loadSet(this.value); });

  // ── RPG-Maker-XP chrome wiring (menu bar, toolbar groups) ──
  function clickEl(id) { var e = $(id); if (e) e.click(); }
  var _toast = null;
  function toast(msg) {
    if (!_toast) {
      _toast = document.createElement('div');
      _toast.style.cssText = 'position:fixed; left:50%; bottom:38px; transform:translateX(-50%);' +
        'background:#222; color:#fff; padding:8px 16px; border-radius:6px; font-size:12px;' +
        'z-index:300; box-shadow:0 6px 20px rgba(0,0,0,.4); pointer-events:none; opacity:0; transition:opacity .15s;';
      document.body.appendChild(_toast);
    }
    _toast.textContent = msg; _toast.style.opacity = '1';
    clearTimeout(_toast._t); _toast._t = setTimeout(function () { _toast.style.opacity = '0'; }, 1600);
  }
  function soon() { toast('Coming in a later stage of the RPG-Maker-style rebuild.'); }

  // Resize (visible button in the side panel)
  var rb2 = $('resizeBtn2');
  if (rb2) rb2.addEventListener('click', function () {
    pushUndo();
    newMap(parseInt($('mapW').value, 10) || 20, parseInt($('mapH').value, 10) || 18, true);
  });

  // Scale buttons (1/1, 1/2, 1/4) -> setZoom (deferred: setZoom defined below)
  document.querySelectorAll('#scaleGroup .scale').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#scaleGroup .scale').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      window._setZoom(parseFloat(b.dataset.scale));
    });
  });

  // Layer buttons (Layer 1/2/3 + Event). 1=ground, 2=overlay; 3/event = coming soon.
  document.querySelectorAll('#layerGroup .mode-layer').forEach(function (b) {
    b.addEventListener('click', function () {
      var lyr = b.dataset.layer;
      document.querySelectorAll('#layerGroup .mode-layer').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      setActiveLayer(lyr);
    });
  });
  // Side-panel Mode buttons (Map/Collision/Warp/Region) drive the hidden .mode
  // buttons and reflect active state + show the Region # picker in region mode.
  var MODE_BTNS = { mMap: 'map', mCollide: 'collide', mRegion: 'region', mShadow: 'shadow', mEvent: 'event' };
  function syncModeUI() {
    Object.keys(MODE_BTNS).forEach(function (id) {
      var e = $(id); if (e) e.classList.toggle('active', MODE_BTNS[id] === state.mode);
    });
    var rr = $('regionRow'); if (rr) rr.style.display = state.mode === 'region' ? '' : 'none';
    var sr = $('shadowRow'); if (sr) sr.style.display = state.mode === 'shadow' ? '' : 'none';
    var eh = $('eventHint'); if (eh) eh.style.display = state.mode === 'event' ? '' : 'none';
    var ec = $('eventCard'); if (ec) ec.style.display = state.mode === 'event' ? '' : 'none';
    if (state.mode === 'event') renderEventPanel();
    drawMap();
  }
  Object.keys(MODE_BTNS).forEach(function (id) {
    var e = $(id); if (!e) return;
    e.addEventListener('click', function () { setModeBtn(MODE_BTNS[id]); syncModeUI(); });
  });
  var rn = $('regionNum');
  if (rn) rn.addEventListener('change', function () {
    var v = parseInt(this.value, 10);
    state.regionId = Math.max(1, Math.min(63, isNaN(v) ? 1 : v));
    this.value = state.regionId;
  });
  syncModeUI();

  $('eventModeBtn').addEventListener('click', function () { setModeBtn('event'); syncModeUI(); });
  $('undoBtn').addEventListener('click', doUndo);
  $('redoBtn').addEventListener('click', doRedo);
  // Keyboard: Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) for undo/redo.
  window.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;  // don't hijack typing
    if (!(e.ctrlKey || e.metaKey)) {
      if (e.key === 'Delete' || e.key === 'Backspace') { if (state.sel) { e.preventDefault(); clearSelection(); } }
      return;
    }
    var k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); doRedo(); }
    else if (k === 'c') { e.preventDefault(); copySelection(); }
    else if (k === 'x') { e.preventDefault(); cutSelection(); }
    else if (k === 'v') { e.preventDefault(); pasteClipboard(); }
  });

  // Shift the whole map (all layers + regions) by dx,dy; out-of-range cells clear.
  function shiftMap(dx, dy) {
    pushUndo();
    var w = state.width, h = state.height;
    LAYER_KEYS.forEach(function (key) {
      var layer = state.layers[key];
      if (!layer.data) return;
      var nd = new Int32Array(w * h), nt = new Array(w * h), nc = new Uint8Array(w * h);
      var empty = (key === 'ground') ? layer.baseFill : -1;
      for (var i = 0; i < w * h; i++) { nd[i] = empty; nt[i] = ''; }
      for (var y = 0; y < h; y++)
        for (var x = 0; x < w; x++) {
          var sxp = x - dx, syp = y - dy;
          if (sxp >= 0 && syp >= 0 && sxp < w && syp < h) {
            nd[y * w + x] = layer.data[syp * w + sxp];
            if (layer.terrain) nt[y * w + x] = layer.terrain[syp * w + sxp] || '';
            if (layer.collision) nc[y * w + x] = layer.collision[syp * w + sxp];
          }
        }
      layer.data = nd; layer.terrain = nt; layer.collision = nc;
    });
    if (state.region) {
      var nr = new Uint8Array(w * h);
      for (var ry = 0; ry < h; ry++)
        for (var rx = 0; rx < w; rx++) {
          var sx2 = rx - dx, sy2 = ry - dy;
          if (sx2 >= 0 && sy2 >= 0 && sx2 < w && sy2 < h) nr[ry * w + rx] = state.region[sy2 * w + sx2];
        }
      state.region = nr;
    }
    drawMap();
  }
  function shiftMapPrompt() {
    var v = prompt('Shift map by "dx dy" tiles (e.g. "1 0" = right 1, "0 -1" = up 1):', '0 0');
    if (!v) return;
    var m = v.trim().split(/[\s,]+/).map(function (n) { return parseInt(n, 10); });
    if (m.length < 2 || isNaN(m[0]) || isNaN(m[1])) { toast('Enter two numbers, e.g. 1 0'); return; }
    shiftMap(m[0], m[1]);
  }
  // Visible grid toggle mirrors the (hidden) gridBtn state.
  var gtb = $('gridToolBtn');
  if (gtb) gtb.addEventListener('click', function () {
    clickEl('gridBtn');
    gtb.classList.toggle('active', $('gridBtn').classList.contains('active'));
  });
  ['dbBtn', 'scriptBtn', 'soundBtn'].forEach(function (id) {
    var e = $(id); if (e) e.addEventListener('click', soon);
  });
  // Repurpose the Materials (🎨) toolbar button as the character-sprite picker.
  var matB = $('matBtn');
  if (matB) { matB.title = 'Character Sprites'; matB.addEventListener('click', function () { openSpriteModal('player'); }); }
  $('cutBtn').addEventListener('click', cutSelection);
  $('copyBtn').addEventListener('click', copySelection);
  $('pasteBtn').addEventListener('click', pasteClipboard);
  $('delBtn').addEventListener('click', clearSelection);

  // Screenshot -> capture the whole editor, upload to the `screenshots` branch,
  // show a copyable raw link to paste back. Lets the owner show what they see.
  function uploadShot(b64) {
    var ts = Date.now(), path = 'screenshots/editor-' + ts + '.png';
    var REPO = 'knightdx91-alt/awakened-calamity';
    fetch('https://api.github.com/repos/' + REPO + '/contents/' + path, {
      method: 'PUT',
      headers: { Authorization: 'token ' + GH_TOKEN, 'Content-Type': 'application/json',
                 Accept: 'application/vnd.github+json' },
      body: JSON.stringify({ message: 'editor screenshot ' + ts, content: b64, branch: 'screenshots' })
    }).then(function (r) {
      return r.ok ? r.json() : r.json().then(function (d) { throw new Error(d.message || ('HTTP ' + r.status)); });
    }).then(function () {
      var url = 'https://raw.githubusercontent.com/' + REPO + '/screenshots/' + path;
      var box = document.createElement('div');
      box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
      var inner = document.createElement('div');
      inner.style.cssText = 'background:#fff;border:1px solid #888;border-radius:8px;padding:18px;max-width:440px;width:90%;display:flex;flex-direction:column;gap:10px;font-size:12px;';
      inner.innerHTML = '<b style="color:#2b4a7a;">📷 Screenshot uploaded — paste this link in chat:</b>' +
        '<input id="_ssu" readonly value="' + url + '" style="padding:7px;border:1px solid #888;border-radius:4px;width:100%;box-sizing:border-box;font-family:monospace;font-size:11px;">' +
        '<div style="display:flex;gap:8px;"><button id="_ssc" style="flex:1;padding:8px;">📋 Copy</button>' +
        '<button id="_ssx" style="flex:1;padding:8px;">Close</button></div>';
      box.appendChild(inner); document.body.appendChild(box);
      var inp = inner.querySelector('#_ssu'); inp.focus(); inp.select();
      inner.querySelector('#_ssc').addEventListener('click', function () {
        var self = this;
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
          self.textContent = '✓ Copied'; }).catch(function () { inp.select(); document.execCommand('copy'); self.textContent = '✓ Copied'; });
      });
      inner.querySelector('#_ssx').addEventListener('click', function () { box.remove(); });
    }).catch(function (e) { toast('Screenshot upload failed: ' + e.message); });
  }
  $('shotBtn').addEventListener('click', function () {
    toast('Capturing screenshot…');
    var done = function (canvas) {
      uploadShot(canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''));
    };
    if (window.html2canvas) {
      html2canvas(document.body, { useCORS: true, allowTaint: true, scale: 1 }).then(done)
        .catch(function () { toast('Capture failed (html2canvas).'); });
    } else { toast('Screenshot library not loaded — check your connection and retry.'); }
  });

  // Playtest -> open the game on the current map in a new tab.
  $('playBtn').addEventListener('click', function () {
    var nm = $('mapName').value || 'AwakeningCamp';
    var rg = $('mapRegion').value || 'awakened';
    window.open('game.html?map=' + encodeURIComponent(nm) + '&region=' + encodeURIComponent(rg), '_blank');
  });

  // ── Menu bar (RPG Maker XP menu order) ──
  var MENUS = [
    ['File', [
      ['New', 'Ctrl+N', function () { clickEl('newBtn'); }],
      ['Open / Import…', 'Ctrl+O', function () { clickEl('importBtn'); }],
      ['Load from repo…', '', function () { clickEl('repoLoadBtn'); }],
      'sep',
      ['Export (layout + map)', 'Ctrl+S', function () { clickEl('exportBtn'); }],
      ['Save to repo', '', function () { clickEl('repoSaveBtn'); }]
    ]],
    ['Edit', [
      ['Undo', 'Ctrl+Z', function () { doUndo(); }], ['Redo', 'Ctrl+Y', function () { doRedo(); }], 'sep',
      ['Cut', 'Ctrl+X', function () { cutSelection(); }], ['Copy', 'Ctrl+C', function () { copySelection(); }],
      ['Paste', 'Ctrl+V', function () { pasteClipboard(); }], ['Delete', 'Del', function () { clearSelection(); }],
      'sep',
      ['Shift Map…', '', function () { shiftMapPrompt(); }]
    ]],
    ['Mode', [
      ['Layer 1 (Ground)', '1', function () { setLayerBtn('ground'); }],
      ['Layer 2 (Overlay)', '2', function () { setLayerBtn('overlay'); }],
      ['Layer 3 (Upper)', '3', function () { setLayerBtn('upper'); }],
      ['Event layer', 'F6', null],
      'sep',
      ['Collision / Passage', '', function () { setModeBtn('collide'); syncModeUI(); }],
      ['Tile mode', '', function () { setModeBtn('map'); syncModeUI(); }],
      ['Region IDs', '', function () { setModeBtn('region'); syncModeUI(); }],
      ['Shadow pen', '', function () { setModeBtn('shadow'); syncModeUI(); }]
    ]],
    ['Draw', [
      ['Pencil', '', function () { setToolBtn('pencil'); }],
      ['Rectangle', '', function () { setToolBtn('rect'); }],
      ['Ellipse', '', function () { setToolBtn('ellipse'); }],
      ['Flood Fill', '', function () { setToolBtn('fill'); }],
      ['Select / Pick', '', function () { setToolBtn('pick'); }],
      ['Eraser', '', function () { clickEl('eraserBtn'); }]
    ]],
    ['Scale', [
      ['1/1', '', function () { setScaleBtn(2); }],
      ['1/2', '', function () { setScaleBtn(1); }],
      ['1/4', '', function () { setScaleBtn(0.5); }]
    ]],
    ['View', [
      ['Toggle Grid', '', function () { clickEl('gridBtn'); }],
      ['Screen Orientation…', '', function () { clickEl('orientBtn'); }],
      'sep',
      ['Palette: MV ⇄ XP', '', function () { clickEl('tabModeBtn'); }]
    ]],
    ['Tools', [
      ['Character Sprites…', '', function () { openSpriteModal('player'); }],
      ['Character Generator…', '', function () { window.open('generator.html', '_blank'); }],
      ['Database', '', null], ['Materials', '', null],
      ['Script editor', '', null], ['Sound test', '', null]
    ]],
    ['Game', [
      ['Playtest', 'F12', function () { clickEl('playBtn'); }]
    ]],
    ['Help', [
      ['Send Screenshot…', '', function () { clickEl('shotBtn'); }],
      ['About', '', function () { toast('Awakened Calamity — RPG-Maker-style map editor.'); }]
    ]]
  ];
  function setLayerBtn(lyr) {
    var b = document.querySelector('#layerGroup .mode-layer[data-layer="' + lyr + '"]');
    if (b) b.click();
  }
  function setModeBtn(mode) {
    var b = document.querySelector('#modeGroup .mode[data-mode="' + mode + '"]');
    if (b) b.click();
  }
  function setToolBtn(tool) {
    var b = document.querySelector('#toolGroup .tool[data-tool="' + tool + '"]');
    if (b) b.click();
  }
  function setScaleBtn(z) {
    var b = document.querySelector('#scaleGroup .scale[data-scale="' + z + '"]');
    if (b) b.click();
  }
  function buildMenuBar() {
    var bar = $('menubar'); bar.innerHTML = '';
    MENUS.forEach(function (m) {
      var menu = document.createElement('div'); menu.className = 'menu'; menu.textContent = m[0];
      var dd = document.createElement('div'); dd.className = 'dropdown';
      m[1].forEach(function (it) {
        if (it === 'sep') { var s = document.createElement('div'); s.className = 'mi-sep'; dd.appendChild(s); return; }
        var mi = document.createElement('div');
        mi.className = 'mi' + (it[2] ? '' : ' disabled');
        var lab = document.createElement('span'); lab.textContent = it[0];
        var key = document.createElement('span'); key.className = 'key'; key.textContent = it[1] || '';
        mi.appendChild(lab); mi.appendChild(key);
        if (it[2]) mi.addEventListener('click', function (e) { e.stopPropagation(); closeMenus(); it[2](); });
        else mi.addEventListener('click', function (e) { e.stopPropagation(); });
        dd.appendChild(mi);
      });
      menu.appendChild(dd);
      menu.addEventListener('click', function (e) {
        e.stopPropagation();
        var wasOpen = menu.classList.contains('open');
        closeMenus();
        if (!wasOpen) menu.classList.add('open');
      });
      menu.addEventListener('mouseenter', function () {
        if (bar.querySelector('.menu.open')) { closeMenus(); menu.classList.add('open'); }
      });
      bar.appendChild(menu);
    });
  }
  function closeMenus() {
    document.querySelectorAll('#menubar .menu.open').forEach(function (m) { m.classList.remove('open'); });
  }
  document.addEventListener('click', closeMenus);
  buildMenuBar();
  $('tabModeBtn').addEventListener('click', function () {
    state.tabMode = state.tabMode === 'mv' ? 'xp' : 'mv';
    this.textContent = state.tabMode === 'mv' ? 'MV Tabs' : 'XP Sheet';
    // XP mode shows raw tiles only (autotiles still reachable via Auto toggle on A2)
    if (state.tabMode === 'xp') setAutoMode(false);
    buildTilesetTabs(); applyPaletteTabVisibility(); drawPalette();
  });
  $('newBtn').addEventListener('click', function () {
    newMap(parseInt($('mapW').value, 10) || 20, parseInt($('mapH').value, 10) || 18, false);
  });
  $('resizeBtn').addEventListener('click', function () {
    newMap(parseInt($('mapW').value, 10) || 20, parseInt($('mapH').value, 10) || 18, true);
  });

  $('autoToggle').addEventListener('click', function () { setAutoMode(!state.autoMode); });

  document.querySelectorAll('.tool').forEach(function (b) {
    if (!b.dataset.tool) return;
    b.addEventListener('click', function () {
      state.tool = b.dataset.tool;
      state.eraser = false; $('eraserBtn').classList.remove('active');
      document.querySelectorAll('.tool').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
    });
  });
  $('eraserBtn').addEventListener('click', function () {
    state.eraser = !state.eraser;
    this.classList.toggle('active', state.eraser);
  });

  document.querySelectorAll('.mode').forEach(function (b) {
    b.addEventListener('click', function () {
      state.mode = b.dataset.mode;
      document.querySelectorAll('.mode').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      drawMap();
    });
  });

  $('gridBtn').addEventListener('click', function () {
    state.showGrid = !state.showGrid;
    this.classList.toggle('active', state.showGrid);
    drawMap();
  });
  function setZoom(z) {
    state.zoom = Math.max(0.5, Math.min(6, z));
    $('zoomLabel').textContent = state.zoom + '×';
    drawMap();
  }
  window._setZoom = setZoom;   // used by the XP Scale buttons (defined earlier)
  $('zoomIn').addEventListener('click', function () { setZoom(state.zoom + 1); });
  $('zoomOut').addEventListener('click', function () { setZoom(state.zoom - 1); });

  // Screen orientation: a dropdown of ALL orientations (matches the game's
  // Portrait / Rev. Portrait / Landscape / Rev. Landscape options).
  function orientOpts() {
    return ORIENT_MODES.map(function (m, i) { return { n: i, label: m.label }; });
  }
  function setOrient(n) {
    state.orient = ((n % 4) + 4) % 4;
    var m = ORIENT_MODES[state.orient];
    ORIENT_CLASSES.forEach(function (c) { document.body.classList.remove(c); });
    if (m.cls) document.body.classList.add(m.cls);
    $('orientBtn').textContent = '⟳ ' + m.label;
  }
  var orientMenu = null;
  function toggleOrientMenu() {
    if (orientMenu) { orientMenu.remove(); orientMenu = null; return; }
    orientMenu = document.createElement('div');
    orientMenu.className = 'dropdown';
    orientMenu.style.cssText = 'display:block; position:fixed; z-index:200; min-width:170px;' +
      'background:#fff; color:var(--text); border:1px solid var(--line); padding:3px;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.28);';
    orientOpts().forEach(function (o) {
      var mi = document.createElement('div');
      mi.className = 'mi' + (o.n === state.orient ? ' active' : '');
      mi.style.cssText = 'padding:6px 14px; cursor:pointer; border-radius:3px;' +
        (o.n === state.orient ? 'font-weight:700;' : '');
      mi.textContent = (o.n === state.orient ? '● ' : '○ ') + o.label;
      mi.addEventListener('mouseenter', function () { mi.style.background = 'var(--accent)'; mi.style.color = '#fff'; });
      mi.addEventListener('mouseleave', function () { mi.style.background = ''; mi.style.color = ''; });
      mi.addEventListener('click', function (e) {
        e.stopPropagation(); setOrient(o.n);
        if (orientMenu) { orientMenu.remove(); orientMenu = null; }
      });
      orientMenu.appendChild(mi);
    });
    document.body.appendChild(orientMenu);
    var r = $('orientBtn').getBoundingClientRect();
    var mw = orientMenu.offsetWidth, mh = orientMenu.offsetHeight;
    orientMenu.style.left = Math.min(r.left, window.innerWidth - mw - 6) + 'px';
    orientMenu.style.top = Math.min(r.bottom + 2, window.innerHeight - mh - 6) + 'px';
  }
  $('orientBtn').addEventListener('click', function (e) { e.stopPropagation(); toggleOrientMenu(); });
  document.addEventListener('click', function () { if (orientMenu) { orientMenu.remove(); orientMenu = null; } });

  // ── Save to GitHub 'maps' branch (same mechanism as cloud-saves.js) ──
  var GH_REPO   = 'knightdx91-alt/awakened-calamity';
  var GH_BRANCH = 'maps';
  var GH_TOKEN  = 'IuWWfaKTQMSVRG5HSKuHBZPvlHq1Vpxp3AlUjYkeeF9Qe9dmQyX6f8RcTyg_w567PxfxUQLJ0QCJO3EC11_tap_buhtig'
                  .split('').reverse().join('');
  function ghHeaders() {
    return { Authorization: 'token ' + GH_TOKEN, 'Content-Type': 'application/json',
             Accept: 'application/vnd.github+json' };
  }
  function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decode(b64) { return decodeURIComponent(escape(atob(b64.replace(/\n/g, '')))); }
  function ghUrl(path) { return 'https://api.github.com/repos/' + GH_REPO + '/contents/' + path; }
  function ghGet(path) {
    return fetch(ghUrl(path) + '?ref=' + GH_BRANCH, { headers: ghHeaders() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        return d ? { sha: d.sha, content: d.content ? b64decode(d.content) : null } : { sha: null, content: null };
      })
      .catch(function () { return { sha: null, content: null }; });
  }
  function ghPut(path, obj, message, sha) {
    var body = { message: message, content: b64encode(JSON.stringify(obj)), branch: GH_BRANCH };
    if (sha) body.sha = sha;
    return fetch(ghUrl(path), { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (d) { throw new Error(d.message || ('HTTP ' + r.status)); });
        return r.json();
      });
  }
  function ghDelete(path, message) {
    return ghGet(path).then(function (cur) {
      if (!cur.sha) return null;   // already gone
      return fetch(ghUrl(path), {
        method: 'DELETE', headers: ghHeaders(),
        body: JSON.stringify({ message: message, sha: cur.sha, branch: GH_BRANCH })
      }).then(function (r) {
        if (!r.ok) return r.json().then(function (d) { throw new Error(d.message || ('HTTP ' + r.status)); });
        return r.json();
      });
    });
  }
  // remove a map's entries from the region index (read-modify-write)
  function ghIndexRemove(region, mapId, mapName) {
    var indexPath = 'data/maps/' + region + '_index.json';
    return ghGet(indexPath).then(function (cur) {
      if (!cur.content) return null;
      var index = {}; try { index = JSON.parse(cur.content); } catch (e) { return null; }
      delete index[mapId]; delete index[mapName];
      return ghPut(indexPath, index, 'map-editor: index remove ' + mapName, cur.sha);
    });
  }
  function setRepoBtn(txt, col) {
    var b = $('repoSaveBtn'); b.textContent = txt;
    b.style.color = col || ''; b.style.borderColor = col || '';
  }
  function mapIdOf(name) { return 'MAP_' + name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase(); }

  // Rename a saved map (+ its layout) on the 'maps' branch: write the new
  // files, update the region index, then delete the old files.
  function repoRename(oldName, newName, region) {
    var oldMapPath = 'data/maps/' + region + '/' + oldName + '.json';
    return ghGet(oldMapPath).then(function (c) {
      if (!c.content) throw new Error('map not found on branch');
      var mapObj = JSON.parse(c.content);
      var oldLayoutId = mapObj.layout;
      var oldLayoutPath = 'data/layouts/' + region + '/' + oldLayoutId + '.json';
      return ghGet(oldLayoutPath).then(function (lc) {
        var layoutObj = lc.content ? JSON.parse(lc.content) : null;
        var newLayoutId = layoutIdFor(newName);
        mapObj.name = newName; mapObj.id = mapIdOf(newName); mapObj.layout = newLayoutId;
        var newMapPath = 'data/maps/' + region + '/' + newName + '.json';
        var newLayoutPath = 'data/layouts/' + region + '/' + newLayoutId + '.json';
        var chain = Promise.resolve();
        if (layoutObj) {
          layoutObj.id = newLayoutId;
          chain = chain.then(function () { return ghGet(newLayoutPath); })
            .then(function (cur) { return ghPut(newLayoutPath, layoutObj, 'map-editor: rename layout ' + newLayoutId, cur.sha); });
        }
        return chain
          .then(function () { return ghGet(newMapPath); })
          .then(function (cur) { return ghPut(newMapPath, mapObj, 'map-editor: rename map ' + newName, cur.sha); })
          .then(function () {
            var ip = 'data/maps/' + region + '_index.json';
            return ghGet(ip).then(function (cur) {
              var index = {}; if (cur.content) { try { index = JSON.parse(cur.content); } catch (e) {} }
              index[mapObj.id] = newName; index[newName] = newName;
              delete index[mapIdOf(oldName)]; delete index[oldName];
              return ghPut(ip, index, 'map-editor: rename index ' + newName, cur.sha);
            });
          })
          .then(function () { return ghDelete(oldMapPath, 'map-editor: rename remove ' + oldName); })
          .then(function () { if (layoutObj && newLayoutId !== oldLayoutId) return ghDelete(oldLayoutPath, 'map-editor: rename remove layout ' + oldLayoutId); });
      });
    });
  }

  // Delete a saved map (+ its layout) from the branch and drop it from the index.
  function repoDelete(name, region) {
    var mapPath = 'data/maps/' + region + '/' + name + '.json';
    return ghGet(mapPath).then(function (c) {
      var mapObj = c.content ? JSON.parse(c.content) : null;
      var mapId = mapObj ? mapObj.id : mapIdOf(name);
      var layoutId = mapObj ? mapObj.layout : null;
      var chain = ghDelete(mapPath, 'map-editor: delete map ' + name);
      if (layoutId) chain = chain.then(function () {
        return ghDelete('data/layouts/' + region + '/' + layoutId + '.json', 'map-editor: delete layout ' + layoutId);
      });
      return chain.then(function () { return ghIndexRemove(region, mapId, name); });
    });
  }
  function saveToRepo() {
    if (!state.layers.ground.data) return;
    var region = $('mapRegion').value || 'custom';
    // ensure the tree has a node for the map being saved (carry parent if known)
    var nm = $('mapName').value || 'NewMap';
    if (!treeModel[nm]) {
      var inherit = currentNode && treeModel[currentNode] ? treeModel[currentNode].parent : null;
      treeModel[nm] = { region: region, parent: inherit || null, local: true };
    } else { treeModel[nm].region = region; }
    currentNode = nm;
    var layout = buildLayout(), map = buildMap();
    var layoutPath = 'data/layouts/' + region + '/' + layout.id + '.json';
    var mapPath    = 'data/maps/' + region + '/' + map.name + '.json';
    var indexPath  = 'data/maps/' + region + '_index.json';
    var stamp = new Date().toISOString();
    setRepoBtn('☁ Saving…', '#b58900');
    ghGet(layoutPath)
      .then(function (cur) { return ghPut(layoutPath, layout, 'map-editor: layout ' + layout.id + ' ' + stamp, cur.sha); })
      .then(function () { return ghGet(mapPath); })
      .then(function (cur) { return ghPut(mapPath, map, 'map-editor: map ' + map.name + ' ' + stamp, cur.sha); })
      .then(function () { return ghGet(indexPath); })
      .then(function (cur) {
        var index = {};
        if (cur.content) { try { index = JSON.parse(cur.content); } catch (e) { index = {}; } }
        index[map.id] = map.name; index[map.name] = map.name;
        return ghPut(indexPath, index, 'map-editor: index ' + region + ' ' + stamp, cur.sha);
      })
      .then(function () {
        if (treeModel[nm]) treeModel[nm].local = false;
        persistTree(); renderTree();
        setRepoBtn('✓ Saved', '#2a9d2a');
        setTimeout(function () { setRepoBtn('☁ Save'); }, 2800);
      })
      .catch(function (e) {
        setRepoBtn('✗ Error', '#c02020');
        setTimeout(function () { setRepoBtn('☁ Save'); }, 3500);
        alert('Save to repo failed: ' + e.message);
      });
  }
  $('repoSaveBtn').addEventListener('click', saveToRepo);

  // ── Load from repo + map tree ──
  function ghListMaps() {
    var url = 'https://api.github.com/repos/' + GH_REPO + '/git/trees/' + GH_BRANCH + '?recursive=1';
    return fetch(url, { headers: ghHeaders() })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (tree) {
        var maps = [];
        (tree.tree || []).forEach(function (node) {
          var m = /^data\/maps\/([^/]+)\/([^/]+)\.json$/.exec(node.path);
          if (m && !/_index$/.test(m[2])) maps.push({ region: m[1], name: m[2], path: node.path });
        });
        maps.sort(function (a, b) { return (a.region + a.name).localeCompare(b.region + b.name); });
        return maps;
      });
  }

  // ── Tree model persistence + merge ──
  function persistTree() {
    try { localStorage.setItem(TREE_KEY, JSON.stringify({ maps: treeModel, expanded: treeExpanded })); }
    catch (e) { /* storage may be unavailable */ }
  }
  function loadTreeLocal() {
    try {
      var raw = localStorage.getItem(TREE_KEY);
      if (raw) { var d = JSON.parse(raw); treeModel = d.maps || {}; treeExpanded = d.expanded || {}; }
    } catch (e) { treeModel = {}; treeExpanded = {}; }
  }
  function defRegion() { return $('mapRegion').value || 'awakened'; }
  function layoutIdFor(name) {
    return 'LAYOUT_' + name.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();
  }
  function uniqueName(base) {
    if (!treeModel[base]) return base;
    var i = 2; while (treeModel[base + i]) i++; return base + i;
  }
  function setRegionSelect(region) {
    var sel = $('mapRegion');
    if (!Array.prototype.some.call(sel.options, function (o) { return o.value === region; })) {
      var o = document.createElement('option'); o.value = o.textContent = region; sel.appendChild(o);
    }
    sel.value = region;
  }

  function buildMapTree() {
    loadTreeLocal();
    renderTree();
    // Merge any maps saved on the repo branch into the model (parent kept from
    // the saved file or local hierarchy). Network failure just leaves the
    // local tree as-is.
    ghListMaps().then(function (maps) {
      maps.forEach(function (mp) {
        if (!treeModel[mp.name]) treeModel[mp.name] = { region: mp.region, parent: null, local: false };
        else { treeModel[mp.name].local = false; treeModel[mp.name].region = mp.region; }
      });
      persistTree(); renderTree();
    }).catch(function () { /* offline: keep local tree */ });
  }

  function renderTree() {
    var tree = $('mapTree');
    tree.innerHTML = '';
    var names = Object.keys(treeModel);
    if (!names.length) {
      tree.innerHTML = '<div class="hint" style="padding:6px;">No maps yet. Tap ＋ or press-and-hold here → New Map.</div>';
      return;
    }
    var kids = {};
    names.forEach(function (n) {
      var p = treeModel[n].parent;
      if (p == null || !treeModel[p]) p = '';   // orphan -> root
      (kids[p] = kids[p] || []).push(n);
    });
    Object.keys(kids).forEach(function (k) { kids[k].sort(); });
    function row(name, depth) {
      var node = treeModel[name];
      var item = document.createElement('div');
      item.className = 'tree-item' + (name === currentNode ? ' active' : '');
      item.style.paddingLeft = (4 + depth * 14) + 'px';
      var hasKids = kids[name] && kids[name].length;
      var caret = document.createElement('span'); caret.className = 'tree-caret';
      caret.textContent = hasKids ? (treeExpanded[name] === false ? '▶' : '▼') : '';
      if (hasKids) caret.addEventListener('click', function (e) {
        e.stopPropagation();
        treeExpanded[name] = treeExpanded[name] === false;
        persistTree(); renderTree();
      });
      var icon = document.createElement('span'); icon.className = 'tree-icon';
      icon.textContent = hasKids ? '🗀' : '🗺';
      var label = document.createElement('span'); label.className = 'tree-label';
      label.textContent = name + (node.local ? ' •' : '');
      item.appendChild(caret); item.appendChild(icon); item.appendChild(label);
      item.addEventListener('click', function () { selectNode(name); });
      attachCtx(item, name);
      tree.appendChild(item);
      if (hasKids && treeExpanded[name] !== false)
        kids[name].forEach(function (c) { row(c, depth + 1); });
    }
    (kids[''] || []).forEach(function (n) { row(n, 0); });
  }

  // ── Tree node operations ──
  function selectNode(name) {
    currentNode = name; renderTree();
    var node = treeModel[name];
    if (node && !node.local) {
      loadMapFromRepo({ region: node.region, name: name, path: 'data/maps/' + node.region + '/' + name + '.json' });
    } else {
      // local, not yet saved: set the editor's identity for the eventual save
      $('mapName').value = name; setRegionSelect(node.region); $('layoutId').value = layoutIdFor(name);
    }
  }

  function newMapNode(parent) {
    var name = uniqueName('NewMap');
    var region = (parent && treeModel[parent] && treeModel[parent].region) || defRegion();
    treeModel[name] = { region: region, parent: parent || null, local: true };
    if (parent) treeExpanded[parent] = true;
    currentNode = name;
    $('mapName').value = name; setRegionSelect(region); $('layoutId').value = layoutIdFor(name);
    newMap(parseInt($('mapW').value, 10) || 20, parseInt($('mapH').value, 10) || 18, false);
    persistTree(); renderTree();
  }

  function renameNode(name) {
    var nn = prompt('Rename map "' + name + '" to:', name);
    if (!nn || nn === name) return;
    if (treeModel[nn]) { alert('A map named "' + nn + '" already exists.'); return; }
    var node = treeModel[name];
    var wasSaved = !node.local, region = node.region;
    // update the local model
    treeModel[nn] = node; delete treeModel[name];
    Object.keys(treeModel).forEach(function (k) { if (treeModel[k].parent === name) treeModel[k].parent = nn; });
    if (treeExpanded[name] != null) { treeExpanded[nn] = treeExpanded[name]; delete treeExpanded[name]; }
    if (currentNode === name) { currentNode = nn; $('mapName').value = nn; $('layoutId').value = layoutIdFor(nn); }
    persistTree(); renderTree();
    if (!wasSaved) return;   // local-only: nothing on the repo to move
    setRepoBtn('☁ Renaming…', '#b58900');
    repoRename(name, nn, region)
      .then(function () { setRepoBtn('✓ Renamed', '#2a9d2a'); setTimeout(function () { setRepoBtn('☁ Save'); }, 2500); })
      .catch(function (e) {
        setRepoBtn('✗ Error', '#c02020'); setTimeout(function () { setRepoBtn('☁ Save'); }, 3000);
        treeModel[nn].local = true; persistTree(); renderTree();
        alert('Renamed locally, but the repo update failed:\n' + e.message);
      });
  }

  function duplicateNode(name) {
    var node = treeModel[name];
    var copy = uniqueName(name + 'Copy');
    treeModel[copy] = { region: node.region, parent: node.parent, local: true };
    currentNode = copy;
    persistTree(); renderTree();
    // pull the source content into the editor under the new name, if it's saved
    if (!node.local) {
      loadMapFromRepo({ region: node.region, name: name, path: 'data/maps/' + node.region + '/' + name + '.json' })
        .then(function () {
          $('mapName').value = copy; setRegionSelect(treeModel[copy].region); $('layoutId').value = layoutIdFor(copy);
          currentNode = copy; renderTree();
        });
    } else {
      $('mapName').value = copy; setRegionSelect(node.region); $('layoutId').value = layoutIdFor(copy);
      newMap(parseInt($('mapW').value, 10) || 20, parseInt($('mapH').value, 10) || 18, false);
    }
  }

  function deleteNode(name) {
    var node = treeModel[name];
    var wasSaved = !node.local, region = node.region;
    var msg = wasSaved
      ? 'Delete "' + name + '" from the maps branch?\nThis removes the map AND its layout file, and updates the index. This cannot be undone.'
      : 'Remove "' + name + '" from the list?';
    if (!confirm(msg)) return;
    var parent = node.parent || null;
    Object.keys(treeModel).forEach(function (k) { if (treeModel[k].parent === name) treeModel[k].parent = parent; });
    delete treeModel[name]; delete treeExpanded[name];
    if (currentNode === name) currentNode = null;
    persistTree(); renderTree();
    if (!wasSaved) return;
    setRepoBtn('☁ Deleting…', '#b58900');
    repoDelete(name, region)
      .then(function () { setRepoBtn('✓ Deleted', '#2a9d2a'); setTimeout(function () { setRepoBtn('☁ Save'); }, 2500); })
      .catch(function (e) {
        setRepoBtn('✗ Error', '#c02020'); setTimeout(function () { setRepoBtn('☁ Save'); }, 3000);
        alert('Removed from the list, but the repo delete failed:\n' + e.message);
      });
  }

  // ── Context menu (press-and-hold / right-click) ──
  var ctxMenu = $('ctxMenu');
  function openCtx(x, y, name) {
    ctxMenu.innerHTML = '';
    var items;
    if (name) items = [
      ['New Map (child)', function () { newMapNode(name); }],
      ['Edit', function () { selectNode(name); }],
      ['Rename…', function () { renameNode(name); }],
      ['Duplicate', function () { duplicateNode(name); }],
      'sep',
      ['Delete', function () { deleteNode(name); }, 'danger']
    ];
    else items = [['New Map', function () { newMapNode(null); }]];
    items.forEach(function (it) {
      if (it === 'sep') { var s = document.createElement('div'); s.className = 'ci-sep'; ctxMenu.appendChild(s); return; }
      var d = document.createElement('div');
      d.className = 'ci' + (it[2] ? ' ' + it[2] : '');
      d.textContent = it[0];
      d.addEventListener('click', function () { closeCtx(); it[1](); });
      ctxMenu.appendChild(d);
    });
    ctxMenu.style.display = 'block';
    // clamp to viewport
    var mw = ctxMenu.offsetWidth, mh = ctxMenu.offsetHeight;
    ctxMenu.style.left = Math.min(x, window.innerWidth - mw - 6) + 'px';
    ctxMenu.style.top = Math.min(y, window.innerHeight - mh - 6) + 'px';
  }
  function closeCtx() { ctxMenu.style.display = 'none'; }
  window.addEventListener('mousedown', function (e) { if (!ctxMenu.contains(e.target)) closeCtx(); });
  window.addEventListener('scroll', closeCtx, true);

  function attachCtx(el, name) {
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); openCtx(e.clientX, e.clientY, name); });
    var timer = null, sx = 0, sy = 0;
    el.addEventListener('touchstart', function (e) {
      var t = e.touches[0]; sx = t.clientX; sy = t.clientY;
      timer = setTimeout(function () { timer = null; openCtx(sx, sy, name); }, 500);
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      if (timer && (Math.abs(t.clientX - sx) > 8 || Math.abs(t.clientY - sy) > 8)) { clearTimeout(timer); timer = null; }
    }, { passive: true });
    el.addEventListener('touchend', function () { if (timer) { clearTimeout(timer); timer = null; } });
  }
  // empty-tree-area press-and-hold / right-click -> top-level New Map
  (function () {
    var tree = $('mapTree'), timer = null, sx = 0, sy = 0;
    tree.addEventListener('contextmenu', function (e) {
      if (e.target === tree) { e.preventDefault(); openCtx(e.clientX, e.clientY, null); }
    });
    tree.addEventListener('touchstart', function (e) {
      if (e.target !== tree) return;
      var t = e.touches[0]; sx = t.clientX; sy = t.clientY;
      timer = setTimeout(function () { timer = null; openCtx(sx, sy, null); }, 500);
    }, { passive: true });
    tree.addEventListener('touchmove', function () { if (timer) { clearTimeout(timer); timer = null; } }, { passive: true });
    tree.addEventListener('touchend', function () { if (timer) { clearTimeout(timer); timer = null; } });
  })();
  $('treeAddBtn').addEventListener('click', function (e) { e.stopPropagation(); newMapNode(null); });

  function loadMapFromRepo(mp) {
    return ghGet(mp.path)
      .then(function (cur) {
        if (!cur.content) throw new Error('map file empty');
        var mapObj = JSON.parse(cur.content);
        var layoutPath = 'data/layouts/' + mp.region + '/' + mapObj.layout + '.json';
        return ghGet(layoutPath).then(function (lc) {
          if (!lc.content) throw new Error('layout "' + mapObj.layout + '" not found on branch');
          return { layout: JSON.parse(lc.content), map: mapObj };
        });
      })
      .then(function (res) {
        // sync the tree model from the loaded map's parent field
        var pm = res.map || {};
        treeModel[mp.name] = {
          region: mp.region,
          parent: (pm.parent != null && pm.parent !== '') ? pm.parent
                  : (treeModel[mp.name] && treeModel[mp.name].parent) || null,
          local: false
        };
        currentNode = mp.name;
        persistTree();
        return applyLayout(res.layout, res.map);
      })
      .then(function () { $('repoModal').style.display = 'none'; renderTree(); })
      .catch(function (e) { alert('Failed to load: ' + e.message); });
  }

  function openRepoModal() {
    $('repoModal').style.display = 'flex';
    var body = $('repoModalBody');
    body.innerHTML = '<div class="hint">Loading map list…</div>';
    ghListMaps().then(function (maps) {
      if (!maps.length) { body.innerHTML = '<div class="hint">No maps saved yet.</div>'; return; }
      body.innerHTML = '';
      var lastRegion = null;
      maps.forEach(function (mp) {
        if (mp.region !== lastRegion) {
          lastRegion = mp.region;
          var hdr = document.createElement('div'); hdr.textContent = mp.region;
          hdr.style.cssText = 'color:#2b4a7a; font-size:11px; text-transform:uppercase; letter-spacing:.5px; margin:8px 2px 4px;';
          body.appendChild(hdr);
        }
        var row = document.createElement('button');
        row.textContent = mp.name;
        row.style.cssText = 'display:block; width:100%; text-align:left; margin:3px 0;';
        row.addEventListener('click', function () { loadMapFromRepo(mp); });
        body.appendChild(row);
      });
    }).catch(function (e) {
      body.innerHTML = '<div class="hint" style="color:#c33;">Failed to list maps: ' + e.message + '</div>';
    });
  }
  $('repoLoadBtn').addEventListener('click', openRepoModal);
  $('repoModalClose').addEventListener('click', function () { $('repoModal').style.display = 'none'; });
  $('repoModal').addEventListener('click', function (e) {
    if (e.target === $('repoModal')) $('repoModal').style.display = 'none';
  });

  // ── Character sprite picker (XP/MV charsets) ──
  var _spriteIndex = null, _spriteCache = {}, _selectedSprite = null;
  function loadSpriteIndex() {
    if (_spriteIndex) return Promise.resolve(_spriteIndex);
    return fetch('data/sprites/xp_index.json').then(function (r) { return r.json(); })
      .then(function (d) { _spriteIndex = d; return d; });
  }
  function spriteImg(file) {
    if (_spriteCache[file]) return _spriteCache[file];
    var img = new Image(); img.src = 'data/sprites/' + file;
    _spriteCache[file] = img; return img;
  }
  // Draw an entry's down-facing standing frame into a canvas thumbnail.
  function drawSpriteThumb(cv, e) {
    var img = spriteImg(e.file), cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = false;
    var stand = 1, downRow = 0;            // MV: middle col = stand, row 0 = down
    function paint() {
      cx.clearRect(0, 0, cv.width, cv.height);
      var fw = e.frame_w, fh = e.frame_h;
      var scale = Math.min(cv.width / fw, cv.height / fh);
      var dw = fw * scale, dh = fh * scale;
      cx.drawImage(img, stand * fw, downRow * fh, fw, fh,
        (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh);
    }
    if (img.complete && img.naturalWidth) paint(); else img.onload = paint;
  }
  function renderSpriteGrid(cat) {
    var grid = $('spriteGrid'); grid.innerHTML = '';
    var list = _spriteIndex.sprites.filter(function (e) {
      return cat === '(all)' || e.id.indexOf(cat) === 0;
    });
    list.forEach(function (e) {
      var cell = document.createElement('div');
      cell.style.cssText = 'width:72px; display:flex; flex-direction:column; align-items:center;' +
        'gap:2px; cursor:pointer; padding:4px; border:1px solid transparent; border-radius:5px;';
      var cv = document.createElement('canvas'); cv.width = 56; cv.height = 64;
      cv.style.cssText = 'image-rendering:pixelated; background:#e8e8e8; border:1px solid var(--line2); border-radius:3px;';
      var lab = document.createElement('span'); lab.textContent = e.id;
      lab.style.cssText = 'font-size:10px; text-align:center; word-break:break-word; line-height:1.1;';
      cell.appendChild(cv); cell.appendChild(lab);
      drawSpriteThumb(cv, e);
      cell.addEventListener('click', function () {
        _selectedSprite = e;
        grid.querySelectorAll('div').forEach(function (d) { d.style.borderColor = 'transparent'; d.style.background = ''; });
        cell.style.borderColor = 'var(--accent)'; cell.style.background = 'var(--accent2)';
        $('spriteSel').textContent = 'Selected: ' + e.id + ' (' + e.frame_w + '×' + e.frame_h + (e.single ? ', single' : ', 8-char') + ')';
        $('setPlayerBtn').disabled = false;
      });
      grid.appendChild(cell);
    });
    if (!list.length) grid.innerHTML = '<div class="hint">No sprites in this category.</div>';
  }
  var _spriteTarget = 'player';
  function openSpriteModal(target) {
    _spriteTarget = target || 'player';
    $('setPlayerBtn').textContent = _spriteTarget === 'event' ? '◆ Use for Event' : '★ Set as Player';
    $('spriteModal').style.display = 'flex';
    loadSpriteIndex().then(function (d) {
      var sel = $('spriteCat');
      if (!sel._built) {
        sel.innerHTML = '';
        ['(all)'].concat(d.categories).forEach(function (c) {
          var o = document.createElement('option'); o.value = o.textContent = c; sel.appendChild(o);
        });
        sel._built = true;
        sel.addEventListener('change', function () { renderSpriteGrid(this.value); });
      }
      renderSpriteGrid(sel.value || '(all)');
    }).catch(function (e) { $('spriteGrid').innerHTML = '<div class="hint" style="color:#c33;">Failed to load sprite index: ' + e.message + '</div>'; });
  }
  $('spriteModalClose').addEventListener('click', function () { $('spriteModal').style.display = 'none'; });
  $('spriteModal').addEventListener('click', function (e) { if (e.target === $('spriteModal')) $('spriteModal').style.display = 'none'; });
  $('setPlayerBtn').addEventListener('click', function () {
    if (!_selectedSprite) return;
    var e = _selectedSprite;
    var g = { sprite: e.id, file: e.file, frame_w: e.frame_w, frame_h: e.frame_h, cols: e.cols, rows: e.rows, single: e.single };
    if (_spriteTarget === 'event' && state.selectedEvent) {
      pushUndo();
      state.selectedEvent.graphic = g;
      state._defaultGraphic = g;                 // reuse for the next placed event
      $('spriteModal').style.display = 'none';
      renderEventPanel(); drawMap();
      return;
    }
    try {
      localStorage.setItem('ac_player_sprite', JSON.stringify(g));
      toast('Player sprite set to ' + e.id + '. Playtest to see it.');
    } catch (err) { toast('Could not save (storage blocked).'); }
  });

  // ── Boot ──
  // Load tileset names + the "Sheet" dropdown, the RM set manifest, then open the
  // first set (Outside) so the ground layer's group is defined by the set.
  Promise.all([
    fetch('data/tilesets/_index.json').then(function (r) { return r.json(); }),
    loadRmSets()
  ]).then(function (parts) {
    state._tilesetNames = parts[0];
    var sel = $('tilesetSel'); sel.innerHTML = '';
    parts[0].forEach(function (n) {
      var o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o);
    });
    var firstSet = (state.rmSets[0] && state.rmSets[0].id) || null;
    var open = firstSet ? loadSet(firstSet) : useTileset(L(), parts[0][0]).then(afterTilesetChange);
    return open;
  }).then(function () {
    newMap(state.width, state.height, false);
    setStampFromPalette(0, 0, 0, 0);
    buildMapTree();
  }).catch(function (err) {
    alert('Failed to load tilesets. Serve over http (not file://).\n' + err);
  });
})();
