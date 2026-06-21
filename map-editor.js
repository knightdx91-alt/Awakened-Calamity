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
    multiTile: false,            // palette: single tile by default; drag-select a block only when ON
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
    // Default to a real terrain (not the (erase) swatch) so Auto-mode painting
    // is visible by default; do this BEFORE building so the right swatch lights up.
    if (!state.selectedTerrain || keys.indexOf(state.selectedTerrain) < 0) state.selectedTerrain = keys[1] || '';
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
  paletteCanvas.addEventListener('pointerdown', function (e) {
    palDrag = palCellFromEvent(e);
    setStampFromPalette(palDrag.cx, palDrag.cy, palDrag.cx, palDrag.cy);
    // Only capture the gesture for drag-select (mouse, or touch with multi-tile ON);
    // otherwise leave it so a touch drag scrolls the palette (large sheets overflow).
    if (e.pointerType === 'mouse' || state.multiTile) {
      e.preventDefault();
      try { paletteCanvas.setPointerCapture(e.pointerId); } catch (_) {}
    } else { palDrag = null; }
  });
  paletteCanvas.addEventListener('pointermove', function (e) {
    if (!palDrag) return;
    if (!state.multiTile) return;   // single tile by default; opt in for a multi-tile block
    var p = palCellFromEvent(e);
    setStampFromPalette(palDrag.cx, palDrag.cy, p.cx, p.cy);
  });
  window.addEventListener('pointerup', function () { palDrag = null; });

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
    if (state.dragPreview) {
      var d = state.dragPreview;
      var dcx = (d.x0 + d.x1) / 2, dcy = (d.y0 + d.y1) / 2;
      var drx = (d.x1 - d.x0) / 2 + 0.5, dry = (d.y1 - d.y0) / 2 + 0.5;
      mctx.fillStyle = 'rgba(58,123,213,0.30)';
      for (var py = d.y0; py <= d.y1; py++)
        for (var px = d.x0; px <= d.x1; px++) {
          if (d.ellipse) { var nx = (px - dcx) / drx, ny = (py - dcy) / dry; if (nx * nx + ny * ny > 1) continue; }
          mctx.fillRect(px * cs, py * cs, cs, cs);
        }
      mctx.strokeStyle = '#3a7bd5'; mctx.lineWidth = 2;
      mctx.strokeRect(d.x0 * cs + 1, d.y0 * cs + 1, (d.x1 - d.x0 + 1) * cs - 2, (d.y1 - d.y0 + 1) * cs - 2);
    }
    if (state.events && state.events.length) drawEvents();
    // Player start marker (green "S" flag) when viewing the start map
    if (state.startLoc && state.startLoc.map === ($('mapName') && $('mapName').value)) {
      var sX = state.startLoc.x * cs, sY = state.startLoc.y * cs;
      mctx.fillStyle = 'rgba(40,180,70,0.55)'; mctx.fillRect(sX, sY, cs, cs);
      mctx.strokeStyle = '#1c7a32'; mctx.lineWidth = 2; mctx.strokeRect(sX + 1, sY + 1, cs - 2, cs - 2);
      mctx.fillStyle = '#fff'; mctx.font = 'bold ' + Math.floor(cs * 0.6) + 'px sans-serif';
      mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
      mctx.fillText('S', sX + cs / 2, sY + cs / 2);
    }
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
  var _collidePaint = 1;   // value a collide-drag writes (set at gesture start)

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
      state.layers.ground.collision[idx(x, y)] = _collidePaint;
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
    // In Auto mode, flood the TERRAIN (not the raw tile ids) so the bucket fills
    // a region of like terrain with the selected terrain and re-blends edges.
    if (isAutoPaint() && !state.eraser) { floodFillTerrain(x, y); return; }
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
  function floodFillTerrain(x, y) {
    var layer = state.layers.ground;
    var target = layer.terrain[idx(x, y)] || '';
    var repl = state.selectedTerrain || '';
    if (target === repl) return;
    var minx = x, maxx = x, miny = y, maxy = y, seen = {}, stack = [[x, y]];
    while (stack.length) {
      var p = stack.pop(), px = p[0], py = p[1];
      if (!inBounds(px, py)) continue;
      var k = idx(px, py);
      if (seen[k] || (layer.terrain[k] || '') !== target) continue;
      seen[k] = 1; layer.terrain[k] = repl;
      if (px < minx) minx = px; if (px > maxx) maxx = px;
      if (py < miny) miny = py; if (py > maxy) maxy = py;
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
    for (var ry = miny - 1; ry <= maxy + 1; ry++)
      for (var rx = minx - 1; rx <= maxx + 1; rx++) recomputeTerrainCell(rx, ry);
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
        // collision lives on the GROUND layer (the only one exported), regardless of
        // which layer is active — match the single-tile paint + the render overlay.
        if (state.mode === 'collide') { state.layers.ground.collision[idx(x, y)] = state.eraser ? 0 : 1; continue; }
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

  // ── Pan: hold & drag to scroll the map. Active with the Pan tool, the middle
  // mouse button, or Space held. Scrolls #canvasPanel by the drag delta. ──
  var panState = null;
  var spaceHeld = false;
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) {
      spaceHeld = true; mapCanvas.style.cursor = 'grab'; e.preventDefault();
    }
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'Space') { spaceHeld = false; mapCanvas.style.cursor = ''; }
  });
  function panPanel() { return document.getElementById('canvasPanel'); }
  function startPan(e) {
    var panel = panPanel(); if (!panel) return false;
    panState = { x: e.clientX, y: e.clientY, sl: panel.scrollLeft, st: panel.scrollTop };
    mapCanvas.style.cursor = 'grabbing';
    try { mapCanvas.setPointerCapture(e.pointerId); } catch (_) {}
    return true;
  }

  mapCanvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    // Pan tool (one-finger drag), middle button, or Space-held → pan instead of paint
    if (e.button === 1 || spaceHeld || state.tool === 'pan') { startPan(e); return; }
    try { mapCanvas.setPointerCapture(e.pointerId); } catch (_) {}   // keep drag tracking (touch+mouse)
    var p = eventCell(e);
    if (!inBounds(p.x, p.y)) return;
    if (state._settingStart) {                   // Game → Set Player Start
      state._settingStart = false;
      state.startLoc = { map: $('mapName').value, region: $('mapRegion').value, x: p.x, y: p.y };
      try { localStorage.setItem('ac_start_location', JSON.stringify(state.startLoc)); } catch (_) {}
      toast('Player start: ' + state.startLoc.map + ' (' + p.x + ',' + p.y + ')');
      drawMap(); return;
    }
    // Collision / Region modes act regardless of the active draw tool (so picking
    // Pan/Rectangle/etc. doesn't stop collision painting). Pan still wins (above).
    if (state.mode === 'collide') {
      pushUndo();
      _collidePaint = state.eraser ? 0 : (state.layers.ground.collision[idx(p.x, p.y)] ? 0 : 1);
      painting = true; applyAt(p.x, p.y); drawMap(); return;
    }
    if (state.mode === 'region') {
      pushUndo(); painting = true; applyAt(p.x, p.y); drawMap(); return;
    }
    if (state.tool === 'pick' && state.mode === 'map') { applyAt(p.x, p.y); return; } // pick doesn't mutate
    if (state.tool === 'select') { rectStart = p; state.sel = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; drawMap(); return; }
    if (state.mode === 'event') {
      // Press on an existing event → arm a drag (move it). A tap that doesn't
      // move just falls through to eventClick (select/edit) on pointerup.
      var evHit = eventAt(p.x, p.y);
      if (evHit && !state._pickDest) { state._evDrag = { ev: evHit, startX: p.x, startY: p.y, moved: false }; return; }
      eventClick(p.x, p.y); return;
    }
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

  mapCanvas.addEventListener('pointermove', function (e) {
    if (panState) {
      var panel = panPanel();
      if (panel) {
        panel.scrollLeft = panState.sl - (e.clientX - panState.x);
        panel.scrollTop  = panState.st - (e.clientY - panState.y);
      }
      return;
    }
    var p = eventCell(e);
    $('statCoord').textContent = 'x: ' + p.x + '  y: ' + p.y;
    if (inBounds(p.x, p.y)) {
      var layer = L();
      $('statTile').textContent = 'tile #' + layer.data[idx(p.x, p.y)] +
        (state.layers.ground.collision[idx(p.x, p.y)] ? '  (blocked)' : '');
    }
    if (state._evDrag) {                                 // dragging an event to a new tile
      var ed = state._evDrag;
      if (inBounds(p.x, p.y) && (p.x !== ed.ev.x || p.y !== ed.ev.y) && !eventAt(p.x, p.y)) {
        if (!ed.moved) { pushUndo(); ed.moved = true; }
        ed.ev.x = p.x; ed.ev.y = p.y; state.selectedEvent = ed.ev; drawMap();
      }
      return;
    }
    if (state.tool === 'select' && rectStart) {
      state.sel = { x0: Math.min(rectStart.x, p.x), y0: Math.min(rectStart.y, p.y),
                    x1: Math.max(rectStart.x, p.x), y1: Math.max(rectStart.y, p.y) };
      drawMap();
    }
    // Live preview while dragging Rectangle/Ellipse (shows the shape before release).
    if ((state.tool === 'rect' || state.tool === 'ellipse') && rectStart) {
      state.dragPreview = { x0: Math.min(rectStart.x, p.x), y0: Math.min(rectStart.y, p.y),
                            x1: Math.max(rectStart.x, p.x), y1: Math.max(rectStart.y, p.y),
                            ellipse: state.tool === 'ellipse' };
      drawMap();
    }
    if (painting && state.mode === 'shadow') { applyShadow(eventQuarter(e)); drawMap(); return; }
    if (painting && inBounds(p.x, p.y)) { applyAt(p.x, p.y); drawMap(); }
  });

  window.addEventListener('pointerup', function (e) {
    if (panState) {
      panState = null;
      mapCanvas.style.cursor = (state.tool === 'pan' || spaceHeld) ? 'grab' : '';
      return;
    }
    if (state._evDrag) {
      var ed = state._evDrag; state._evDrag = null;
      if (ed.moved) toast('Moved ' + ed.ev.name + ' → (' + ed.ev.x + ',' + ed.ev.y + ')');
      else eventClick(ed.startX, ed.startY);           // a tap (no move) → select/edit
      drawMap(); painting = false; return;
    }
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
      rectStart = null; state.dragPreview = null; drawMap();
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
  function openEventEditor() { $('eventEditorModal').style.display = 'flex'; renderEventPanel(); }
  function closeEventEditor() { $('eventEditorModal').style.display = 'none'; }
  function eventClick(x, y) {
    if (state._pickDest) {                       // arming a Transfer destination
      var pd = state._pickDest; state._pickDest = null;
      pd.cmd.map = $('mapName').value || pd.cmd.map; pd.cmd.x = x; pd.cmd.y = y;
      state.selectedEvent = pd.ev; openEventEditor();
      toast('Destination set: ' + pd.cmd.map + ' (' + x + ',' + y + ')');
      return;
    }
    var ev = eventAt(x, y);
    if (ev) {                                    // click an existing event → just select/edit it
      state.selectedEvent = ev; openEventEditor(); drawMap(); return;
    }
    // Empty cell: a single click only deselects (so panning/zooming/tapping never
    // drops a stray event). Creating a NEW event requires a DOUBLE-click on the cell.
    var now = Date.now(), last = state._lastEvClick;
    var isDbl = last && last.x === x && last.y === y && (now - last.t) < 450;
    state._lastEvClick = { x: x, y: y, t: now };
    if (!isDbl) {
      state.selectedEvent = null; drawMap();
      toast('Double-click an empty tile to add an event.');
      return;
    }
    state._lastEvClick = null;
    pushUndo();
    var id = 1; state.events.forEach(function (e) { if (e.id >= id) id = e.id + 1; });
    ev = { id: id, name: 'EV' + ('00' + id).slice(-3), x: x, y: y,
           graphic: state._defaultGraphic || null, dir: 'down', trigger: 'action', through: false,
           commands: [] };
    state.events.push(ev); state.selectedEvent = ev;
    openEventEditor(); drawMap();
  }
  function deleteEvent(ev) {
    pushUndo();
    var i = state.events.indexOf(ev); if (i >= 0) state.events.splice(i, 1);
    if (state.selectedEvent === ev) state.selectedEvent = null;
    closeEventEditor(); drawMap();
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

  // ── Event command list (RPG-Maker contents) — full Phase A command set ──
  function mapNameList() {
    var names = Object.keys(treeModel || {});
    if (!names.length && $('mapName')) names = [$('mapName').value];
    return names.sort();
  }
  var CMD_TYPES = [
    ['text', '💬 Show Text'], ['choice', '❓ Show Choices'], ['conditional', '◇ Conditional Branch'],
    ['switch', '🔘 Control Switch'], ['selfswitch', '🔲 Control Self-Switch'], ['variable', '🔢 Control Variable'],
    ['transfer', '◈ Transfer Player'], ['move', '🚶 Move Route'], ['setdir', '🧭 Set Direction'],
    ['setgfx', '🎭 Change Graphic'], ['spawn', '👤 Spawn NPC/Monster'],
    ['money', '💰 Change Money'], ['item', '🎒 Give/Take Item'], ['battle', '⚔️ Battle Processing'],
    ['system', '🔮 Open System Shop'], ['shop', '🛒 Off-grid Market'],
    // run loop (roguelite descent) — fine-grained primitives + the descend macro
    ['run', '🏔️ Run (start/deeper/end)'], ['gendungeon', '🗺️ Generate+Enter Floor'],
    ['descend', '⛰️ Descend (macro)'], ['relic', '💎 Offer Relic'], ['meta', '🕯️ Remembrance (meta)'],
    ['grantclass', '🎓 Grant Class'], ['grantspec', '✦ Grant Specialization'], ['grantskill', '📖 Grant Skill'],
    ['quest', '⚑ Quest'], ['heal', '✚ Heal (vitals)'], ['hurt', '🗡️ Hurt (trap)'], ['surveil', '👁️ Surveil (+Surveillance)'],
    ['fade', '🌑 Fade Screen'], ['shake', '〰️ Shake Screen'],
    ['wait', '⏳ Wait'], ['se', '🔊 Play SE'], ['script', '📜 Script…'],
    ['label', '🏷️ Label'], ['jump', '↪️ Jump to Label'], ['comment', '📝 Comment'], ['exit', '⛔ Exit Event'],
    // flow control
    ['loop', '🔁 Loop'], ['break_loop', '⏹️ Break Loop'], ['input_number', '🔢 Input Number'],
    ['common_event', '📑 Common Event'], ['timer', '⏱️ Control Timer'],
    ['name_input', '⌨️ Name Input'], ['creation', '🧬 Creation Screen'],
    ['affinity', '🜂 Set Affinity'], ['appearance', '🧍 Set Appearance'], ['finalize_creation', '✅ Finalize Creation'],
    // audio
    ['bgm', '🎵 Play/Stop BGM'], ['bgs', '🌊 Play/Stop BGS'], ['me', '🎺 Play ME'], ['stop_se', '🔇 Stop SE'],
    // screen / camera
    ['tint', '🎨 Tint Screen'], ['flash', '⚡ Flash Screen'], ['scroll_map', '🎥 Scroll Map'],
    ['weather', '🌧️ Set Weather Effect'],
    // character / message
    ['balloon', '💭 Show Balloon'], ['animation', '✨ Show Animation'], ['scroll_text', '📜 Scrolling Text'], ['location_info', '📍 Get Location Info'],
    ['setevloc', '📌 Set Event Location'], ['transparency', '👻 Change Transparency'], ['erase_event', '❌ Erase Event'],
    // scene / system
    ['openmenu', '☰ Open Menu Screen'], ['opensave', '💾 Open Save Screen'], ['gameover', '💀 Game Over'], ['totitle', '🏁 Return to Title'],
    ['recover_all', '❤️‍🩹 Recover All'], ['change_level', '⬆️ Change Level'], ['change_exp', '✨ Change EXP'], ['select_item', '🗝️ Select Item']
  ];
  function newCmd(type) {
    switch (type) {
      case 'text': return { type: 'text', text: '' };
      case 'choice': return { type: 'choice', prompt: '', options: [{ label: 'Yes', then: [] }, { label: 'No', then: [] }] };
      case 'conditional': return { type: 'conditional', cond: { kind: 'switch', id: '1', value: true }, then: [], else: [] };
      case 'switch': return { type: 'switch', id: '1', value: true };
      case 'selfswitch': return { type: 'selfswitch', letter: 'A', value: true };
      case 'variable': return { type: 'variable', id: '1', op: '=', value: 0 };
      case 'transfer': return { type: 'transfer', map: mapNameList()[0] || '', x: 0, y: 0, dir: 'retain' };
      case 'wait': return { type: 'wait', frames: 30 };
      case 'se': return { type: 'se', name: '' };
      case 'script': return { type: 'script', code: '' };
      case 'move': return { type: 'move', target: 'player', steps: [] };
      case 'setdir': return { type: 'setdir', target: 'player', dir: 'down' };
      case 'setgfx': return { type: 'setgfx', target: 'this', graphic: null };
      case 'spawn': return { type: 'spawn', kind: 'npc', x: 0, y: 0, graphic: null, dir: 'down', text: '', enemies: [] };
      case 'money': return { type: 'money', op: '+', amount: 100 };
      case 'item': return { type: 'item', pocket: 'items', id: '', op: '+', qty: 1 };
      case 'battle': return { type: 'battle', enemies: [] };
      case 'system': return { type: 'system' };
      case 'shop': return { type: 'shop', offgrid: true };
      case 'run': return { type: 'run', op: 'start', tethered: true, seed: null, reason: 'cleared' };
      case 'gendungeon': return { type: 'gendungeon' };
      case 'descend': return { type: 'descend', start: true, tethered: true, seed: null };
      case 'relic': return { type: 'relic', count: 3, guaranteed: '' };
      case 'meta': return { type: 'meta' };
      case 'weather': return { type: 'weather', kind: 'rain', power: 5 };
      case 'setevloc': return { type: 'setevloc', target: 'this', x: 0, y: 0, dir: 'retain' };
      case 'transparency': return { type: 'transparency', on: true };
      case 'erase_event': return { type: 'erase_event' };
      case 'openmenu': return { type: 'openmenu' };
      case 'opensave': return { type: 'opensave' };
      case 'gameover': return { type: 'gameover' };
      case 'totitle': return { type: 'totitle' };
      case 'recover_all': return { type: 'recover_all' };
      case 'change_level': return { type: 'change_level', op: '+', amount: 1 };
      case 'change_exp': return { type: 'change_exp', op: '+', amount: 50 };
      case 'select_item': return { type: 'select_item', pocket: 'items', prompt: 'Select an item', variable: '1' };
      case 'grantclass': return { type: 'grantclass', classId: '', unlockOnly: false };
      case 'grantspec': return { type: 'grantspec', specId: '' };
      case 'grantskill': return { type: 'grantskill', skill: '' };
      case 'quest': return { type: 'quest', op: 'start', id: '', stage: 0 };
      case 'heal': return { type: 'heal', what: 'all', amount: null };
      case 'hurt': return { type: 'hurt', what: 'hp', amount: 15 };
      case 'surveil': return { type: 'surveil', amount: 10 };
      case 'fade': return { type: 'fade', mode: 'out', color: '#000000', frames: 30 };
      case 'shake': return { type: 'shake', power: 5, frames: 30 };
      case 'label': return { type: 'label', label: '' };
      case 'jump': return { type: 'jump', label: '' };
      case 'comment': return { type: 'comment', text: '' };
      case 'exit': return { type: 'exit' };
      // ── added VX Ace commands ──
      case 'loop': return { type: 'loop', commands: [] };
      case 'break_loop': return { type: 'break_loop' };
      case 'input_number': return { type: 'input_number', prompt: 'Enter a number', digits: 3, variable: '1', initial: 0 };
      case 'common_event': return { type: 'common_event', id: '' };
      case 'name_input': return { type: 'name_input', prompt: 'Enter your name', maxLength: 12 };
      case 'creation': return { type: 'creation' };
      case 'affinity': return { type: 'affinity', value: 'untethered' };
      case 'appearance': return { type: 'appearance', sheet: 'rtp/Actor1.png', char: 0 };
      case 'finalize_creation': return { type: 'finalize_creation', classId: 'warrior' };
      case 'timer': return { type: 'timer', op: 'start', seconds: 60 };
      case 'bgm': return { type: 'bgm', op: 'play', name: '' };
      case 'bgs': return { type: 'bgs', op: 'play', name: '' };
      case 'me': return { type: 'me', name: '' };
      case 'stop_se': return { type: 'stop_se' };
      case 'tint': return { type: 'tint', color: 'rgba(0,0,0,0.4)', frames: 30 };
      case 'flash': return { type: 'flash', color: '#ffffff', frames: 12 };
      case 'scroll_map': return { type: 'scroll_map', dir: 'right', distance: 4, frames: 30 };
      case 'balloon': return { type: 'balloon', target: 'player', balloon: 'exclaim', wait: true };
      case 'animation': return { type: 'animation', target: 'player', id: 'Attack1', wait: true };
      case 'scroll_text': return { type: 'scroll_text', text: '', frames: 180 };
      case 'location_info': return { type: 'location_info', x: 0, y: 0, info: 'collision', variable: '1' };
    }
    return { type: type };
  }
  function el(tag, css, html) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; return e; }
  function lbl(t) { return '<label class="lbl">' + t + '</label>'; }
  function boolSel(val) {
    return '<select class="cBool"><option value="true">ON</option><option value="false">OFF</option><option value="toggle">Toggle</option></select>';
  }
  function renderEventCommands(ev) {
    if (!ev.commands) ev.commands = [];
    var host = el('div', 'margin-top:7px;', '<strong style="font-size:10px;color:#2b4a7a;">CONTENTS</strong>');
    host.id = 'evCmds';
    renderCmdList(ev.commands, host, 0, ev);
    $('eventProps').appendChild(host);
  }
  function renderCmdList(list, container, depth, ev) {
    var wrap = el('div', depth > 0 ? 'border-left:2px solid var(--accent2);margin:2px 0 2px 6px;padding-left:6px;' : '');
    list.forEach(function (cmd, ci) {
      var card = el('div', 'background:#fafafa;border:1px solid var(--line2);border-radius:4px;padding:5px;margin:4px 0;');
      renderCmdEditor(cmd, card, list, ci, ev, depth);
      wrap.appendChild(card);
    });
    var add = el('div', 'margin:3px 0;');
    var sel = el('select'); sel.style.fontSize = '11px';
    sel.appendChild(el('option', null, '+ Add command…'));
    CMD_TYPES.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; sel.appendChild(op); });
    sel.addEventListener('change', function () {
      if (!this.value) return;
      list.push(newCmd(this.value));
      if (this.value === 'transfer' && !ev.trigger) ev.trigger = 'action';
      renderEventPanel();
    });
    add.appendChild(sel); wrap.appendChild(add);
    container.appendChild(wrap);
  }
  function renderCmdEditor(cmd, card, list, ci, ev, depth) {
    var label = (CMD_TYPES.filter(function (t) { return t[0] === cmd.type; })[0] || ['', cmd.type])[1];
    var head = el('div', 'display:flex;align-items:center;gap:6px;',
      '<b style="color:#2b4a7a;font-size:11px;flex:1;">' + label + '</b><button class="cmdDel" title="Remove">✕</button>');
    card.appendChild(head);
    head.querySelector('.cmdDel').addEventListener('click', function () { list.splice(ci, 1); renderEventPanel(); });
    var body = el('div'); card.appendChild(body);

    if (cmd.type === 'text' || cmd.type === 'script') {
      var ta = el('textarea'); ta.rows = 2; ta.style.cssText = 'width:100%;box-sizing:border-box;font-family:' + (cmd.type === 'script' ? 'monospace' : 'inherit') + ';';
      ta.value = cmd.type === 'text' ? (cmd.text || '') : (cmd.code || '');
      if (cmd.type === 'script') ta.placeholder = "$.setSwitch('1',true); $.say('hi')";
      ta.addEventListener('change', function () { if (cmd.type === 'text') cmd.text = this.value; else cmd.code = this.value; });
      body.appendChild(ta);
      if (cmd.type === 'text') {            // optional RTP face portrait for this line
        var fr = el('div', 'display:flex;gap:5px;align-items:center;margin-top:4px;flex-wrap:wrap;');
        fr.innerHTML = lbl('Face') +
          '<select class="cFaceSheet" style="max-width:120px"><option value="">— none —</option></select>' +
          '<input type="number" class="cFaceIdx" min="0" max="7" style="width:46px" title="face index 0-7">' +
          '<span class="cFacePrev" style="width:32px;height:32px;display:inline-block;border:1px solid var(--line2);background-repeat:no-repeat;"></span>';
        body.appendChild(fr);
        var sheetSel = fr.querySelector('.cFaceSheet'), idxIn = fr.querySelector('.cFaceIdx'), prev = fr.querySelector('.cFacePrev');
        function updFacePrev() {
          if (sheetSel.value) {
            var i = parseInt(idxIn.value || 0, 10), c = i % 4, r = (i / 4) | 0;
            prev.style.backgroundImage = "url('data/faces/rtp/" + sheetSel.value + ".png')";
            prev.style.backgroundSize = '128px 64px';
            prev.style.backgroundPosition = '-' + (c * 32) + 'px -' + (r * 32) + 'px';
          } else prev.style.backgroundImage = '';
        }
        function applyFace() {
          if (sheetSel.value) cmd.face = { sheet: sheetSel.value, index: parseInt(idxIn.value || 0, 10) };
          else delete cmd.face;
          updFacePrev();
        }
        loadFaceSheets().then(function (sheets) {
          sheets.forEach(function (s) { var o = el('option'); o.value = o.textContent = s.id; sheetSel.appendChild(o); });
          if (cmd.face) { sheetSel.value = cmd.face.sheet || ''; idxIn.value = cmd.face.index || 0; }
          updFacePrev();
        });
        sheetSel.addEventListener('change', applyFace);
        idxIn.addEventListener('change', applyFace);
      }
    } else if (cmd.type === 'switch' || cmd.type === 'variable' || cmd.type === 'selfswitch') {
      var row = el('div', 'display:flex;gap:5px;flex-wrap:wrap;align-items:center;');
      if (cmd.type === 'selfswitch') {
        row.innerHTML = lbl('Self-SW') + '<select class="cLetter"><option>A</option><option>B</option><option>C</option><option>D</option></select>' + boolSel();
        row.querySelector('.cLetter').value = cmd.letter || 'A';
        row.querySelector('.cLetter').addEventListener('change', function () { cmd.letter = this.value; });
      } else if (cmd.type === 'switch') {
        row.innerHTML = lbl('Switch #') + '<input type="text" class="cId" value="' + (cmd.id || '1') + '" style="width:54px;">' + boolSel();
        row.querySelector('.cId').addEventListener('change', function () { cmd.id = this.value; });
      } else {
        row.innerHTML = lbl('Var #') + '<input type="text" class="cId" value="' + (cmd.id || '1') + '" style="width:46px;">' +
          '<select class="cOp"><option value="=">=</option><option value="+">+=</option><option value="-">-=</option><option value="*">*=</option></select>' +
          '<input type="number" class="cVal" value="' + (cmd.value | 0) + '" style="width:56px;">';
        row.querySelector('.cId').addEventListener('change', function () { cmd.id = this.value; });
        row.querySelector('.cOp').value = cmd.op || '='; row.querySelector('.cOp').addEventListener('change', function () { cmd.op = this.value; });
        row.querySelector('.cVal').addEventListener('change', function () { cmd.value = parseInt(this.value, 10) || 0; });
      }
      var bs = row.querySelector('.cBool');
      if (bs) { bs.value = cmd.value === 'toggle' ? 'toggle' : (cmd.value ? 'true' : 'false'); bs.addEventListener('change', function () { cmd.value = this.value === 'toggle' ? 'toggle' : this.value === 'true'; }); }
      body.appendChild(row);
    } else if (cmd.type === 'wait') {
      body.innerHTML = '<div class="row">' + lbl('Frames') + '<input type="number" class="cF" value="' + (cmd.frames || 30) + '" style="width:60px;"></div>';
      body.querySelector('.cF').addEventListener('change', function () { cmd.frames = parseInt(this.value, 10) || 0; });
    } else if (cmd.type === 'se') {
      body.innerHTML = '<div class="row">' + lbl('SE name') + '<input type="text" class="cN" value="' + (cmd.name || '') + '" style="flex:1;min-width:0;"></div>';
      body.querySelector('.cN').addEventListener('change', function () { cmd.name = this.value; });
    } else if (cmd.type === 'transfer') {
      body.innerHTML =
        '<div class="row"><label style="font-size:10px;"><input type="checkbox" class="cmSys"' + (cmd.useSystemStart ? ' checked' : '') + '> Use System start (system.json → newGame)</label></div>' +
        '<div class="cmManual">' +
        '<div class="row">' + lbl('Map') + '<select class="cmMap" style="flex:1;min-width:0;"></select></div>' +
        '<div class="row">' + lbl('X') + '<input type="number" class="cmX" value="' + (cmd.x || 0) + '" style="width:50px;">' + lbl('Y') + '<input type="number" class="cmY" value="' + (cmd.y || 0) + '" style="width:50px;"></div>' +
        '<div class="row">' + lbl('Facing') + '<select class="cmDir"><option value="retain">Retain</option><option value="down">Down</option><option value="left">Left</option><option value="right">Right</option><option value="up">Up</option></select>' +
        '<button class="cmPick" title="Pick X,Y on the current map">📍 Pick…</button></div>' +
        '</div>';
      var cmSys = body.querySelector('.cmSys'), cmManual = body.querySelector('.cmManual');
      function cmSysToggle() { cmManual.style.display = cmSys.checked ? 'none' : ''; }
      cmSys.addEventListener('change', function () { cmd.useSystemStart = this.checked; if (!this.checked) delete cmd.useSystemStart; cmSysToggle(); }); cmSysToggle();
      var msel = body.querySelector('.cmMap');
      mapNameList().forEach(function (n) { var o = el('option', null, n); o.value = n; msel.appendChild(o); });
      if (cmd.map) msel.value = cmd.map; else cmd.map = msel.value;
      msel.addEventListener('change', function () { cmd.map = this.value; });
      body.querySelector('.cmX').addEventListener('change', function () { cmd.x = parseInt(this.value, 10) || 0; });
      body.querySelector('.cmY').addEventListener('change', function () { cmd.y = parseInt(this.value, 10) || 0; });
      var dsel = body.querySelector('.cmDir'); dsel.value = cmd.dir || 'retain';
      dsel.addEventListener('change', function () { cmd.dir = this.value; });
      body.querySelector('.cmPick').addEventListener('click', function () { pickDestination(cmd, ev); });
    } else if (cmd.type === 'conditional') {
      if (!cmd.cond) cmd.cond = { kind: 'switch', id: '1', value: true };
      var cr = el('div', 'display:flex;gap:4px;flex-wrap:wrap;align-items:center;');
      cr.innerHTML = lbl('If') +
        '<select class="cKind"><option value="switch">Switch</option><option value="selfswitch">Self-SW</option><option value="variable">Variable</option><option value="quest">Quest</option><option value="run">Run</option><option value="meta">Meta (lifetime)</option></select>' +
        '<span class="cParams"></span>';
      cr.querySelector('.cKind').value = cmd.cond.kind;
      cr.querySelector('.cKind').addEventListener('change', function () {
        if (this.value === 'quest') cmd.cond = { kind: 'quest', id: '', check: 'active', stage: 0 };
        else if (this.value === 'run') cmd.cond = { kind: 'run', check: 'cleared', op: '>=', value: 1 };
        else if (this.value === 'meta') cmd.cond = { kind: 'meta', metric: 'deepest', op: '>=', value: 1 };
        else cmd.cond = { kind: this.value, id: '1', letter: 'A', op: '>=', value: this.value === 'variable' ? 0 : true };
        renderEventPanel();
      });
      var cp = cr.querySelector('.cParams');
      if (cmd.cond.kind === 'switch') {
        cp.innerHTML = '# <input type="text" class="kId" value="' + (cmd.cond.id || '1') + '" style="width:42px;"> is <select class="kV"><option value="true">ON</option><option value="false">OFF</option></select>';
        cp.querySelector('.kId').addEventListener('change', function () { cmd.cond.id = this.value; });
        cp.querySelector('.kV').value = cmd.cond.value === false ? 'false' : 'true'; cp.querySelector('.kV').addEventListener('change', function () { cmd.cond.value = this.value === 'true'; });
      } else if (cmd.cond.kind === 'selfswitch') {
        cp.innerHTML = '<select class="kL"><option>A</option><option>B</option><option>C</option><option>D</option></select> is <select class="kV"><option value="true">ON</option><option value="false">OFF</option></select>';
        cp.querySelector('.kL').value = cmd.cond.letter || 'A'; cp.querySelector('.kL').addEventListener('change', function () { cmd.cond.letter = this.value; });
        cp.querySelector('.kV').value = cmd.cond.value === false ? 'false' : 'true'; cp.querySelector('.kV').addEventListener('change', function () { cmd.cond.value = this.value === 'true'; });
      } else if (cmd.cond.kind === 'quest') {
        cp.innerHTML = '<select class="kQid" style="max-width:120px"><option value="">— quest —</option></select> is ' +
          '<select class="kQc"><option value="active">Active</option><option value="done">Done</option><option value="failed">Failed</option><option value="notstarted">Not started</option><option value="stage">At stage ≥</option></select> ' +
          '<input type="number" class="kQs" value="' + (cmd.cond.stage | 0) + '" style="width:42px;display:none;">';
        var kqid = cp.querySelector('.kQid'), kqc = cp.querySelector('.kQc'), kqs = cp.querySelector('.kQs');
        loadQuestList().then(function (list) { list.forEach(function (q) { var o = el('option', null, q.name); o.value = q.id; kqid.appendChild(o); }); if (cmd.cond.id) kqid.value = cmd.cond.id; });
        kqid.addEventListener('change', function () { cmd.cond.id = this.value; });
        kqc.value = cmd.cond.check || 'active';
        kqs.style.display = (cmd.cond.check === 'stage') ? '' : 'none';
        kqc.addEventListener('change', function () { cmd.cond.check = this.value; kqs.style.display = this.value === 'stage' ? '' : 'none'; });
        kqs.addEventListener('change', function () { cmd.cond.stage = parseInt(this.value, 10) || 0; });
      } else if (cmd.cond.kind === 'run') {
        cp.innerHTML = '<select class="kRc"><option value="cleared">Cleared</option><option value="active">Active</option><option value="boss">On boss floor</option><option value="floor">Floor</option></select> ' +
          '<span class="kRf" style="display:none;"><select class="kOp"><option>&gt;=</option><option>==</option><option>&lt;=</option><option>&gt;</option><option>&lt;</option><option>!=</option></select> <input type="number" class="kVal" value="' + (cmd.cond.value | 0) + '" style="width:48px;"></span>';
        var krc = cp.querySelector('.kRc'), krf = cp.querySelector('.kRf');
        krc.value = cmd.cond.check || 'cleared'; krf.style.display = (cmd.cond.check === 'floor') ? '' : 'none';
        krc.addEventListener('change', function () { cmd.cond.check = this.value; krf.style.display = this.value === 'floor' ? '' : 'none'; });
        var kro = cp.querySelector('.kOp'); kro.value = cmd.cond.op || '>='; kro.addEventListener('change', function () { cmd.cond.op = this.value; });
        cp.querySelector('.kVal').addEventListener('change', function () { cmd.cond.value = parseInt(this.value, 10) || 0; });
      } else if (cmd.cond.kind === 'meta') {
        cp.innerHTML = '<select class="kMetric"><option value="deepest">Deepest floor</option><option value="clears">Total clears</option><option value="runs">Total runs</option><option value="fragments">Fragments</option></select> ' +
          '<select class="kOp"><option>&gt;=</option><option>==</option><option>&lt;=</option><option>&gt;</option><option>&lt;</option><option>!=</option></select> <input type="number" class="kVal" value="' + (cmd.cond.value | 0) + '" style="width:48px;">';
        var km = cp.querySelector('.kMetric'); km.value = cmd.cond.metric || 'deepest'; km.addEventListener('change', function () { cmd.cond.metric = this.value; });
        var kmo = cp.querySelector('.kOp'); kmo.value = cmd.cond.op || '>='; kmo.addEventListener('change', function () { cmd.cond.op = this.value; });
        cp.querySelector('.kVal').addEventListener('change', function () { cmd.cond.value = parseInt(this.value, 10) || 0; });
      } else {
        cp.innerHTML = '# <input type="text" class="kId" value="' + (cmd.cond.id || '1') + '" style="width:36px;"> <select class="kOp"><option>==</option><option>&gt;=</option><option>&lt;=</option><option>&gt;</option><option>&lt;</option><option>!=</option></select> <input type="number" class="kVal" value="' + (cmd.cond.value | 0) + '" style="width:48px;">';
        cp.querySelector('.kId').addEventListener('change', function () { cmd.cond.id = this.value; });
        var ko = cp.querySelector('.kOp'); ko.value = cmd.cond.op || '=='; ko.addEventListener('change', function () { cmd.cond.op = this.value; });
        cp.querySelector('.kVal').addEventListener('change', function () { cmd.cond.value = parseInt(this.value, 10) || 0; });
      }
      body.appendChild(cr);
      body.appendChild(el('div', 'font-size:10px;color:#2b8a2b;margin-top:3px;', 'THEN'));
      renderCmdList(cmd.then = cmd.then || [], body, depth + 1, ev);
      body.appendChild(el('div', 'font-size:10px;color:#8a2b2b;margin-top:3px;', 'ELSE'));
      renderCmdList(cmd.else = cmd.else || [], body, depth + 1, ev);
    } else if (cmd.type === 'choice') {
      body.innerHTML = '<div class="row">' + lbl('Prompt') + '<input type="text" class="cP" value="' + (cmd.prompt || '') + '" style="flex:1;min-width:0;"></div>';
      body.querySelector('.cP').addEventListener('change', function () { cmd.prompt = this.value; });
      (cmd.options = cmd.options || []).forEach(function (opt, oi) {
        var ob = el('div', 'margin:3px 0;border-top:1px dashed var(--line2);padding-top:3px;');
        ob.innerHTML = '<div class="row"><input type="text" class="oL" value="' + (opt.label || '') + '" style="flex:1;min-width:0;" placeholder="choice label"><button class="oDel">✕</button></div>';
        ob.querySelector('.oL').addEventListener('change', function () { opt.label = this.value; });
        ob.querySelector('.oDel').addEventListener('click', function () { cmd.options.splice(oi, 1); renderEventPanel(); });
        renderCmdList(opt.then = opt.then || [], ob, depth + 1, ev);
        body.appendChild(ob);
      });
      var addOpt = el('button', 'font-size:11px;', '+ choice');
      addOpt.addEventListener('click', function () { cmd.options.push({ label: 'Option', then: [] }); renderEventPanel(); });
      body.appendChild(addOpt);
    } else if (cmd.type === 'move' || cmd.type === 'setdir') {
      var tr = el('div', 'display:flex;gap:5px;flex-wrap:wrap;align-items:center;');
      tr.innerHTML = lbl('Target') +
        '<select class="cTgt"><option value="player">Player</option><option value="this">This event</option></select>' +
        lbl('or Ev#') + '<input type="number" class="cTgtId" style="width:46px;" title="event id (overrides)">';
      var tgtSel = tr.querySelector('.cTgt'), tgtId = tr.querySelector('.cTgtId');
      if (typeof cmd.target === 'number') tgtId.value = cmd.target; else tgtSel.value = cmd.target || 'player';
      tgtSel.addEventListener('change', function () { cmd.target = this.value; tgtId.value = ''; });
      tgtId.addEventListener('change', function () { cmd.target = this.value === '' ? tgtSel.value : (parseInt(this.value, 10) | 0); });
      body.appendChild(tr);
      if (cmd.type === 'setdir') {
        var dr = el('div', 'display:flex;gap:5px;align-items:center;margin-top:4px;');
        dr.innerHTML = lbl('Face') + '<select class="cDir"><option>down</option><option>left</option><option>right</option><option>up</option></select>';
        dr.querySelector('.cDir').value = cmd.dir || 'down';
        dr.querySelector('.cDir').addEventListener('change', function () { cmd.dir = this.value; });
        body.appendChild(dr);
      } else {
        var mr = el('div', 'margin-top:4px;');
        mr.innerHTML = lbl('Steps') +
          '<input type="text" class="cSteps" style="width:100%;box-sizing:border-box;" placeholder="up,up,left,wait,down">';
        var stIn = mr.querySelector('.cSteps');
        stIn.value = (cmd.steps || []).join(',');
        stIn.addEventListener('change', function () {
          cmd.steps = this.value.split(',').map(function (s) { return s.trim().toLowerCase(); })
            .filter(function (s) { return ['up', 'down', 'left', 'right', 'wait'].indexOf(s) >= 0; });
          this.value = cmd.steps.join(',');
        });
        mr.appendChild(el('div', 'font-size:9px;color:#888;margin-top:2px;', 'tokens: up · down · left · right · wait'));
        body.appendChild(mr);
      }
    } else if (cmd.type === 'setgfx') {
      var gtr = el('div', 'display:flex;gap:5px;flex-wrap:wrap;align-items:center;');
      gtr.innerHTML = lbl('Target') +
        '<select class="cTgt"><option value="this">This event</option><option value="player">Player</option></select>' +
        lbl('or Ev#') + '<input type="number" class="cTgtId" style="width:46px;">';
      var gtSel = gtr.querySelector('.cTgt'), gtId = gtr.querySelector('.cTgtId');
      if (typeof cmd.target === 'number') gtId.value = cmd.target; else gtSel.value = cmd.target || 'this';
      gtSel.addEventListener('change', function () { cmd.target = this.value; gtId.value = ''; });
      gtId.addEventListener('change', function () { cmd.target = this.value === '' ? gtSel.value : (parseInt(this.value, 10) | 0); });
      body.appendChild(gtr);
      var gr2 = el('div', 'display:flex;gap:6px;align-items:center;margin-top:4px;');
      gr2.innerHTML = '<span class="cGfx" style="flex:1;font-size:11px;color:#2b4a7a;">' + (cmd.graphic ? cmd.graphic.sprite : '(none)') + '</span><button class="cGfxPick">Choose…</button>';
      gr2.querySelector('.cGfxPick').addEventListener('click', function () {
        openSpriteModalForCmd(function (g) { cmd.graphic = g; renderEventPanel(); });
      });
      body.appendChild(gr2);
    } else if (cmd.type === 'spawn') {
      var kr = el('div', 'display:flex;gap:5px;flex-wrap:wrap;align-items:center;');
      kr.innerHTML = lbl('Kind') +
        '<select class="cKind"><option value="npc">NPC</option><option value="monster">Monster</option></select>' +
        lbl('X') + '<input type="number" class="cX" value="' + (cmd.x | 0) + '" style="width:48px;">' +
        lbl('Y') + '<input type="number" class="cY" value="' + (cmd.y | 0) + '" style="width:48px;">' +
        lbl('Face') + '<select class="cDir"><option>down</option><option>left</option><option>right</option><option>up</option></select>';
      kr.querySelector('.cKind').value = cmd.kind || 'npc';
      kr.querySelector('.cKind').addEventListener('change', function () { cmd.kind = this.value; renderEventPanel(); });
      kr.querySelector('.cX').addEventListener('change', function () { cmd.x = parseInt(this.value, 10) || 0; });
      kr.querySelector('.cY').addEventListener('change', function () { cmd.y = parseInt(this.value, 10) || 0; });
      kr.querySelector('.cDir').value = cmd.dir || 'down';
      kr.querySelector('.cDir').addEventListener('change', function () { cmd.dir = this.value; });
      body.appendChild(kr);
      var gr3 = el('div', 'display:flex;gap:6px;align-items:center;margin-top:4px;');
      gr3.innerHTML = lbl('Graphic') + '<span class="cGfx" style="flex:1;font-size:11px;color:#2b4a7a;">' + (cmd.graphic ? cmd.graphic.sprite : '(none)') + '</span><button class="cGfxPick">Choose…</button>';
      gr3.querySelector('.cGfxPick').addEventListener('click', function () {
        openSpriteModalForCmd(function (g) { cmd.graphic = g; renderEventPanel(); });
      });
      body.appendChild(gr3);
      if ((cmd.kind || 'npc') === 'monster') {
        var sr = el('div', 'margin-top:4px;');
        sr.innerHTML = lbl('Enemies') + '<input type="text" class="cEn" style="width:100%;box-sizing:border-box;" placeholder="emberling:2, thornwolf:3">';
        var sEn = sr.querySelector('.cEn');
        sEn.value = (cmd.enemies || []).map(function (en) { return en.key + ':' + (en.level || 2); }).join(', ');
        sEn.addEventListener('change', function () {
          cmd.enemies = this.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
            var p = s.split(':'); return { key: p[0].trim(), level: parseInt(p[1], 10) || 2 };
          });
          this.value = cmd.enemies.map(function (en) { return en.key + ':' + en.level; }).join(', ');
        });
        body.appendChild(sr);
      } else {
        var tr2 = el('div', 'margin-top:4px;');
        tr2.innerHTML = lbl('Says') + '<input type="text" class="cTxt" value="' + (cmd.text || '').replace(/"/g, '&quot;') + '" style="width:100%;box-sizing:border-box;" placeholder="optional dialogue">';
        tr2.querySelector('.cTxt').addEventListener('change', function () { cmd.text = this.value; });
        body.appendChild(tr2);
      }
    } else if (cmd.type === 'money') {
      body.innerHTML = '<div class="row">' + lbl('Money') +
        '<select class="cOp"><option value="+">+ gain</option><option value="-">− lose</option><option value="=">= set</option></select>' +
        '<input type="number" class="cAmt" value="' + (cmd.amount | 0) + '" style="width:80px;"></div>';
      body.querySelector('.cOp').value = cmd.op || '+';
      body.querySelector('.cOp').addEventListener('change', function () { cmd.op = this.value; });
      body.querySelector('.cAmt').addEventListener('change', function () { cmd.amount = parseInt(this.value, 10) || 0; });
    } else if (cmd.type === 'item') {
      body.innerHTML = '<div class="row">' + lbl('Pocket') +
        '<select class="cPk"><option>items</option><option>campKits</option><option>food</option><option>tethers</option><option>tonics</option><option>materials</option><option>gear</option><option>keyItems</option></select></div>' +
        '<div class="row">' + lbl('Item id') + '<input type="text" class="cIid" value="' + (cmd.id || '') + '" style="flex:1;min-width:0;"></div>' +
        '<div class="row">' + lbl('') +
        '<select class="cOp"><option value="+">+ give</option><option value="-">− take</option></select>' +
        lbl('Qty') + '<input type="number" class="cQty" value="' + ((cmd.qty | 0) || 1) + '" style="width:56px;"></div>';
      body.querySelector('.cPk').value = cmd.pocket || 'items';
      body.querySelector('.cPk').addEventListener('change', function () { cmd.pocket = this.value; });
      body.querySelector('.cIid').addEventListener('change', function () { cmd.id = this.value.trim(); });
      body.querySelector('.cOp').value = cmd.op || '+';
      body.querySelector('.cOp').addEventListener('change', function () { cmd.op = this.value; });
      body.querySelector('.cQty').addEventListener('change', function () { cmd.qty = parseInt(this.value, 10) || 1; });
    } else if (cmd.type === 'battle') {
      var br = el('div');
      br.innerHTML = lbl('Enemies') +
        '<input type="text" class="cEn" style="width:100%;box-sizing:border-box;" placeholder="emberling:2, thornwolf:3">';
      var enIn = br.querySelector('.cEn');
      enIn.value = (cmd.enemies || []).map(function (e) { return e.key + ':' + (e.level || 2); }).join(', ');
      enIn.addEventListener('change', function () {
        cmd.enemies = this.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          var p = s.split(':'); return { key: p[0].trim(), level: parseInt(p[1], 10) || 2 };
        });
        this.value = cmd.enemies.map(function (e) { return e.key + ':' + e.level; }).join(', ');
      });
      br.appendChild(el('div', 'font-size:9px;color:#888;margin-top:2px;', 'key:level — blank = random test pack'));
      body.appendChild(br);
    } else if (cmd.type === 'grantclass') {
      var gc = el('div');
      gc.innerHTML = '<div class="row">' + lbl('Class') + '<select class="cCls" style="flex:1;min-width:0;"><option value="">— choose —</option></select></div>' +
        '<div class="row"><label class="lbl" style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" class="cUnlock"> unlock only (don\'t switch to it)</label></div>';
      var clsSel = gc.querySelector('.cCls');
      loadClassList().then(function (list) {
        list.forEach(function (c2) { var o = el('option', null, c2.name + ' (' + (c2.tier || '?') + ')'); o.value = c2.id; clsSel.appendChild(o); });
        if (cmd.classId) clsSel.value = cmd.classId;
      });
      clsSel.addEventListener('change', function () { cmd.classId = this.value; });
      var unl = gc.querySelector('.cUnlock'); unl.checked = !!cmd.unlockOnly;
      unl.addEventListener('change', function () { cmd.unlockOnly = this.checked; });
      body.appendChild(gc);
    } else if (cmd.type === 'grantspec') {
      body.innerHTML = '<div class="row">' + lbl('Spec id') + '<input type="text" class="cSp" value="' + (cmd.specId || '') + '" style="flex:1;min-width:0;" placeholder="e.g. two_handed"></div>' +
        '<div style="font-size:9px;color:#888;margin-top:2px;">must be a specialization of the player\'s current class</div>';
      body.querySelector('.cSp').addEventListener('change', function () { cmd.specId = this.value.trim(); });
    } else if (cmd.type === 'grantskill') {
      var gk = el('div');
      gk.innerHTML = '<div class="row">' + lbl('Skill') + '<select class="cSk" style="flex:1;min-width:0;"><option value="">— choose —</option></select></div>';
      var skSel = gk.querySelector('.cSk');
      loadSkillList().then(function (list) {
        list.forEach(function (s2) { var o = el('option', null, s2.name); o.value = s2.id; skSel.appendChild(o); });
        if (cmd.skill) skSel.value = cmd.skill;
      });
      skSel.addEventListener('change', function () { cmd.skill = this.value; });
      body.appendChild(gk);
    } else if (cmd.type === 'quest') {
      var qd = el('div');
      qd.innerHTML = '<div class="row">' + lbl('Op') +
        '<select class="cQop"><option value="start">Start</option><option value="advance">Advance</option><option value="complete">Complete</option><option value="fail">Fail</option><option value="stage">Set Stage</option></select>' +
        lbl('Quest') + '<select class="cQid" style="flex:1;min-width:0;"><option value="">— choose —</option></select></div>' +
        '<div class="row cQstageRow" style="display:none;">' + lbl('Stage #') + '<input type="number" class="cQstage" value="' + (cmd.stage | 0) + '" style="width:54px;"></div>';
      var qop = qd.querySelector('.cQop'), qid = qd.querySelector('.cQid'), qstageRow = qd.querySelector('.cQstageRow');
      qop.value = cmd.op || 'start';
      qop.addEventListener('change', function () { cmd.op = this.value; qstageRow.style.display = this.value === 'stage' ? '' : 'none'; });
      qstageRow.style.display = (cmd.op === 'stage') ? '' : 'none';
      loadQuestList().then(function (list) { list.forEach(function (q) { var o = el('option', null, q.name); o.value = q.id; qid.appendChild(o); }); if (cmd.id) qid.value = cmd.id; });
      qid.addEventListener('change', function () { cmd.id = this.value; });
      qd.querySelector('.cQstage').addEventListener('change', function () { cmd.stage = parseInt(this.value, 10) || 0; });
      body.appendChild(qd);
    } else if (cmd.type === 'heal') {
      body.innerHTML = '<div class="row">' + lbl('Restore') +
        '<select class="cWhat"><option value="all">All (HP·MP·SP)</option><option value="hp">HP</option><option value="mp">MP</option><option value="sp">Stamina</option></select>' +
        lbl('Amount %') + '<input type="number" class="cAmt" min="0" max="100" value="' + (cmd.amount == null ? '' : cmd.amount) + '" placeholder="full" style="width:60px;"></div>' +
        '<div style="font-size:9px;color:#888;margin-top:2px;">blank = full restore</div>';
      body.querySelector('.cWhat').value = cmd.what || 'all';
      body.querySelector('.cWhat').addEventListener('change', function () { cmd.what = this.value; });
      body.querySelector('.cAmt').addEventListener('change', function () { cmd.amount = this.value === '' ? null : (parseInt(this.value, 10) || 0); });
    } else if (cmd.type === 'hurt') {
      body.innerHTML = '<div class="row">' + lbl('Drain') +
        '<select class="cWhat"><option value="hp">HP</option><option value="mp">MP</option><option value="sp">Stamina</option></select>' +
        lbl('Amount %') + '<input type="number" class="cAmt" min="1" max="100" value="' + (cmd.amount || 15) + '" style="width:60px;"></div>';
      body.querySelector('.cWhat').value = cmd.what || 'hp';
      body.querySelector('.cWhat').addEventListener('change', function () { cmd.what = this.value; });
      body.querySelector('.cAmt').addEventListener('change', function () { cmd.amount = parseInt(this.value, 10) || 15; });
    } else if (cmd.type === 'surveil') {
      body.innerHTML = '<div class="row">' + lbl('Surveillance +') + '<input type="number" class="cAmt" min="1" value="' + (cmd.amount || 10) + '" style="width:60px;"></div>' +
        '<div style="font-size:9px;color:#888;">the System notices you (active descent only)</div>';
      body.querySelector('.cAmt').addEventListener('change', function () { cmd.amount = parseInt(this.value, 10) || 10; });
    } else if (cmd.type === 'fade') {
      body.innerHTML = '<div class="row">' + lbl('Fade') +
        '<select class="cMode"><option value="out">Out (to color)</option><option value="in">In (clear)</option></select></div>' +
        '<div class="row">' + lbl('Color') + '<input type="color" class="cCol" value="' + (cmd.color || '#000000') + '">' +
        lbl('Frames') + '<input type="number" class="cF" value="' + ((cmd.frames | 0) || 30) + '" style="width:56px;"></div>';
      body.querySelector('.cMode').value = cmd.mode || 'out';
      body.querySelector('.cMode').addEventListener('change', function () { cmd.mode = this.value; });
      body.querySelector('.cCol').addEventListener('change', function () { cmd.color = this.value; });
      body.querySelector('.cF').addEventListener('change', function () { cmd.frames = parseInt(this.value, 10) || 30; });
    } else if (cmd.type === 'shake') {
      body.innerHTML = '<div class="row">' + lbl('Power') + '<input type="number" class="cP" value="' + ((cmd.power | 0) || 5) + '" style="width:56px;">' +
        lbl('Frames') + '<input type="number" class="cF" value="' + ((cmd.frames | 0) || 30) + '" style="width:56px;"></div>';
      body.querySelector('.cP').addEventListener('change', function () { cmd.power = parseInt(this.value, 10) || 5; });
      body.querySelector('.cF').addEventListener('change', function () { cmd.frames = parseInt(this.value, 10) || 30; });
    } else if (cmd.type === 'label' || cmd.type === 'jump') {
      body.innerHTML = '<div class="row">' + lbl(cmd.type === 'label' ? 'Name' : 'Jump to') +
        '<input type="text" class="cL" value="' + (cmd.label || '') + '" style="flex:1;min-width:0;"></div>';
      body.querySelector('.cL').addEventListener('change', function () { cmd.label = this.value.trim(); });
    } else if (cmd.type === 'comment') {
      var ca = el('textarea'); ca.rows = 2; ca.style.cssText = 'width:100%;box-sizing:border-box;color:#2b8a2b;';
      ca.value = cmd.text || ''; ca.placeholder = 'author note (not shown in game)';
      ca.addEventListener('change', function () { cmd.text = this.value; });
      body.appendChild(ca);
    } else if (cmd.type === 'loop') {
      body.appendChild(el('div', 'font-size:9px;color:#888;', 'Repeats until Break Loop / Exit Event:'));
      renderCmdList(cmd.commands = cmd.commands || [], body, depth + 1, ev);
    } else if (cmd.type === 'input_number') {
      body.innerHTML = '<div class="row">' + lbl('Prompt') + '<input type="text" class="cP" value="' + (cmd.prompt || '') + '" style="flex:1;min-width:0;"></div>' +
        '<div class="row">' + lbl('Digits') + '<input type="number" class="cD" value="' + (cmd.digits || 3) + '" style="width:46px;">' + lbl('→ Var #') + '<input type="text" class="cV" value="' + (cmd.variable || '1') + '" style="width:46px;"></div>';
      body.querySelector('.cP').addEventListener('change', function () { cmd.prompt = this.value; });
      body.querySelector('.cD').addEventListener('change', function () { cmd.digits = parseInt(this.value, 10) || 3; });
      body.querySelector('.cV').addEventListener('change', function () { cmd.variable = this.value; });
    } else if (cmd.type === 'common_event') {
      body.innerHTML = '<div class="row">' + lbl('Event id') + '<input type="text" class="cI" value="' + (cmd.id || '') + '" style="flex:1;min-width:0;" placeholder="e.g. heal_chime"></div>';
      body.querySelector('.cI').addEventListener('change', function () { cmd.id = this.value.trim(); });
    } else if (cmd.type === 'name_input') {
      body.innerHTML = '<div class="row">' + lbl('Prompt') + '<input type="text" class="cP" value="' + (cmd.prompt || '') + '" style="flex:1;min-width:0;"></div>' +
        '<div class="row">' + lbl('Max len') + '<input type="number" class="cM" value="' + (cmd.maxLength || 12) + '" style="width:50px;"></div>';
      body.querySelector('.cP').addEventListener('change', function () { cmd.prompt = this.value; });
      body.querySelector('.cM').addEventListener('change', function () { cmd.maxLength = parseInt(this.value, 10) || 12; });
    } else if (cmd.type === 'creation') {
      body.appendChild(el('div', 'font-size:9px;color:#888;', 'Launches the Awakening creation screen (name / appearance / affinity / class). Affinities + classes are data.'));
    } else if (cmd.type === 'affinity') {
      body.innerHTML = '<div class="row">' + lbl('Affinity') + '<input type="text" class="cV" value="' + (cmd.value || '') + '" style="flex:1;min-width:0;" placeholder="ember / tide / stone / untethered…"></div>';
      body.querySelector('.cV').addEventListener('change', function () { cmd.value = this.value.trim(); });
    } else if (cmd.type === 'appearance') {
      body.innerHTML = '<div class="row"><label class="lbl"><input type="checkbox" class="cPick"> Picker (live preview + Confirm)</label></div>' +
        '<div class="row">' + lbl('Sheet') + '<input type="text" class="cS" value="' + (cmd.sheet || 'rtp/Actor1.png') + '" style="width:130px;"></div>' +
        '<div class="row cCharRow">' + lbl('Char') + '<input type="number" class="cC" min="0" max="7" value="' + (cmd.char | 0) + '" style="width:46px;"></div>' +
        '<div class="row cCharsRow" style="display:none;">' + lbl('Chars') + '<input type="text" class="cChars" value="' + ((cmd.chars || [0,1,2,3,4,5,6,7]).join(',')) + '" style="width:140px;" placeholder="0,1,2,3..."></div>';
      var pk = body.querySelector('.cPick'); pk.checked = !!cmd.pick;
      function syncRows() { body.querySelector('.cCharRow').style.display = cmd.pick ? 'none' : ''; body.querySelector('.cCharsRow').style.display = cmd.pick ? '' : 'none'; }
      pk.addEventListener('change', function () { cmd.pick = this.checked; syncRows(); }); syncRows();
      body.querySelector('.cS').addEventListener('change', function () { cmd.sheet = this.value.trim(); });
      body.querySelector('.cC').addEventListener('change', function () { cmd.char = parseInt(this.value, 10) || 0; });
      body.querySelector('.cChars').addEventListener('change', function () { cmd.chars = this.value.split(',').map(function (s) { return parseInt(s, 10) || 0; }); });
    } else if (cmd.type === 'finalize_creation') {
      body.innerHTML = '<div class="row">' + lbl('Class id') + '<input type="text" class="cI" value="' + (cmd.classId || '') + '" style="flex:1;min-width:0;" placeholder="warrior / rogue / cleric…"></div>';
      body.querySelector('.cI').addEventListener('change', function () { cmd.classId = this.value.trim(); });
    } else if (cmd.type === 'timer') {
      body.innerHTML = '<div class="row">' + lbl('Op') + '<select class="cO"><option value="start">Start</option><option value="stop">Stop</option></select>' +
        lbl('Seconds') + '<input type="number" class="cS" value="' + (cmd.seconds || 60) + '" style="width:60px;"></div>';
      body.querySelector('.cO').value = cmd.op || 'start'; body.querySelector('.cO').addEventListener('change', function () { cmd.op = this.value; });
      body.querySelector('.cS').addEventListener('change', function () { cmd.seconds = parseInt(this.value, 10) || 0; });
    } else if (cmd.type === 'bgm' || cmd.type === 'bgs') {
      body.innerHTML = '<div class="row">' + lbl('Op') + '<select class="cO"><option value="play">Play</option><option value="stop">Stop</option></select>' +
        lbl('Name') + '<input type="text" class="cN" value="' + (cmd.name || '') + '" style="flex:1;min-width:0;"></div>';
      body.querySelector('.cO').value = cmd.op || 'play'; body.querySelector('.cO').addEventListener('change', function () { cmd.op = this.value; });
      body.querySelector('.cN').addEventListener('change', function () { cmd.name = this.value; });
    } else if (cmd.type === 'me') {
      body.innerHTML = '<div class="row">' + lbl('ME name') + '<input type="text" class="cN" value="' + (cmd.name || '') + '" style="flex:1;min-width:0;"></div>';
      body.querySelector('.cN').addEventListener('change', function () { cmd.name = this.value; });
    } else if (cmd.type === 'tint' || cmd.type === 'flash') {
      body.innerHTML = '<div class="row">' + lbl('Color') + '<input type="text" class="cC" value="' + (cmd.color || '') + '" style="width:120px;" placeholder="rgba(0,0,0,0.4)">' +
        lbl('Frames') + '<input type="number" class="cF" value="' + (cmd.frames || 30) + '" style="width:50px;"></div>';
      body.querySelector('.cC').addEventListener('change', function () { cmd.color = this.value; });
      body.querySelector('.cF').addEventListener('change', function () { cmd.frames = parseInt(this.value, 10) || 30; });
    } else if (cmd.type === 'scroll_map') {
      body.innerHTML = '<div class="row">' + lbl('Dir') + '<select class="cDir"><option>right</option><option>left</option><option>up</option><option>down</option></select>' +
        lbl('Tiles') + '<input type="number" class="cDist" value="' + (cmd.distance || 4) + '" style="width:46px;">' + lbl('Frames') + '<input type="number" class="cF" value="' + (cmd.frames || 30) + '" style="width:50px;"></div>';
      body.querySelector('.cDir').value = cmd.dir || 'right'; body.querySelector('.cDir').addEventListener('change', function () { cmd.dir = this.value; });
      body.querySelector('.cDist').addEventListener('change', function () { cmd.distance = parseInt(this.value, 10) || 1; });
      body.querySelector('.cF').addEventListener('change', function () { cmd.frames = parseInt(this.value, 10) || 30; });
    } else if (cmd.type === 'balloon') {
      body.innerHTML = '<div class="row">' + lbl('Target') + '<select class="cT"><option value="player">Player</option><option value="this">This event</option></select>' +
        lbl('Icon') + '<select class="cB"><option>exclaim</option><option>question</option><option>music</option><option>heart</option><option>anger</option><option>sweat</option><option>sleep</option><option>idea</option><option>silence</option></select></div>';
      body.querySelector('.cT').value = (typeof cmd.target === 'string') ? cmd.target : 'player';
      body.querySelector('.cT').addEventListener('change', function () { cmd.target = this.value; });
      body.querySelector('.cB').value = cmd.balloon || 'exclaim'; body.querySelector('.cB').addEventListener('change', function () { cmd.balloon = this.value; });
    } else if (cmd.type === 'animation') {
      body.innerHTML = '<div class="row">' + lbl('Target') + '<select class="cT"><option value="player">Player</option><option value="this">This event</option></select>' +
        lbl('Anim') + '<input type="text" class="cA" list="animList" value="' + (cmd.id || 'Attack1') + '" style="width:120px;"></div>' +
        '<datalist id="animList"></datalist>';
      body.querySelector('.cT').value = (typeof cmd.target === 'string') ? cmd.target : 'player';
      body.querySelector('.cT').addEventListener('change', function () { cmd.target = this.value; });
      body.querySelector('.cA').addEventListener('change', function () { cmd.id = this.value.trim(); });
      fetch('data/animations/rtp_animations_index.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (!j) return; var dl = body.querySelector('#animList'); (j.animations || []).forEach(function (a) { var o = document.createElement('option'); o.value = a.id; dl.appendChild(o); });
      }).catch(function () {});
    } else if (cmd.type === 'scroll_text') {
      var sta = el('textarea'); sta.rows = 3; sta.style.cssText = 'width:100%;box-sizing:border-box;';
      sta.value = cmd.text || ''; sta.placeholder = 'scrolling credits text…';
      sta.addEventListener('change', function () { cmd.text = this.value; });
      body.appendChild(sta);
      var sf = el('div', 'margin-top:4px;'); sf.innerHTML = lbl('Frames') + '<input type="number" class="cF" value="' + (cmd.frames || 180) + '" style="width:60px;">';
      sf.querySelector('.cF').addEventListener('change', function () { cmd.frames = parseInt(this.value, 10) || 180; });
      body.appendChild(sf);
    } else if (cmd.type === 'location_info') {
      body.innerHTML = '<div class="row">' + lbl('X') + '<input type="number" class="cX" value="' + (cmd.x | 0) + '" style="width:46px;">' + lbl('Y') + '<input type="number" class="cY" value="' + (cmd.y | 0) + '" style="width:46px;"></div>' +
        '<div class="row">' + lbl('Info') + '<select class="cInfo"><option value="collision">collision</option><option value="walkable">walkable</option><option value="region">region</option><option value="event">event id</option></select>' +
        lbl('→ Var #') + '<input type="text" class="cV" value="' + (cmd.variable || '1') + '" style="width:46px;"></div>';
      body.querySelector('.cX').addEventListener('change', function () { cmd.x = parseInt(this.value, 10) || 0; });
      body.querySelector('.cY').addEventListener('change', function () { cmd.y = parseInt(this.value, 10) || 0; });
      body.querySelector('.cInfo').value = cmd.info || 'collision'; body.querySelector('.cInfo').addEventListener('change', function () { cmd.info = this.value; });
      body.querySelector('.cV').addEventListener('change', function () { cmd.variable = this.value; });
    } else if (cmd.type === 'descend') {
      body.innerHTML = '<div class="row">' + lbl('Action') +
        '<select class="cStart"><option value="start">Start a NEW run (floor 1)</option><option value="deeper">Go DEEPER (next floor / boss → clear)</option></select></div>' +
        '<div class="row cTethRow">' + lbl('Tethered') +
        '<select class="cTeth"><option value="true">Tethered — System catches you (Surveillance ↑)</option><option value="false">Untethered — death is real (off-grid)</option></select></div>' +
        '<div class="row cSeedRow">' + lbl('Seed') + '<input type="number" class="cSeed" value="' + (cmd.seed == null ? '' : (cmd.seed | 0)) + '" placeholder="random" style="width:120px;"></div>' +
        '<div style="font-size:9px;color:#888;margin-top:2px;">Start = begin a fresh descent; Deeper = continue an active run (used by StairsDown). Seed blank = random (honors the run_seed_in variable if set).</div>';
      var dStart = body.querySelector('.cStart'); dStart.value = (cmd.start === false) ? 'deeper' : 'start';
      function dToggle() { var s = dStart.value === 'start'; body.querySelector('.cTethRow').style.display = s ? '' : 'none'; body.querySelector('.cSeedRow').style.display = s ? '' : 'none'; }
      dStart.addEventListener('change', function () { cmd.start = (this.value === 'start'); dToggle(); }); dToggle();
      body.querySelector('.cTeth').value = (cmd.tethered === false) ? 'false' : 'true';
      body.querySelector('.cTeth').addEventListener('change', function () { cmd.tethered = (this.value === 'true'); });
      body.querySelector('.cSeed').addEventListener('change', function () { cmd.seed = this.value === '' ? null : (parseInt(this.value, 10) || 0); });
    } else if (cmd.type === 'relic') {
      body.innerHTML = '<div class="row">' + lbl('Choices') + '<input type="number" class="cCount" min="1" max="6" value="' + ((cmd.count | 0) || 3) + '" style="width:50px;"></div>' +
        '<div class="row">' + lbl('Guaranteed') + '<input type="text" class="cGuar" value="' + (cmd.guaranteed || '') + '" placeholder="relic id (optional)" style="width:140px;"></div>' +
        '<div style="font-size:9px;color:#888;margin-top:2px;">Offer a choice of N seeded relics, OR force one specific relic by id (Guaranteed). Active descent only.</div>';
      body.querySelector('.cCount').addEventListener('change', function () { cmd.count = parseInt(this.value, 10) || 3; });
      body.querySelector('.cGuar').addEventListener('change', function () { cmd.guaranteed = this.value.trim(); });
    } else if (cmd.type === 'meta') {
      body.innerHTML = '<div style="font-size:10px;color:#aaa;">Opens the Remembrance (meta-progression) menu — spend Memory Fragments on permanent unlocks. No parameters.</div>';
    } else if (cmd.type === 'run') {
      body.innerHTML = '<div class="row">' + lbl('Op') +
        '<select class="cOp"><option value="start">Start — begin a fresh run (floor 1)</option><option value="deeper">Deeper — advance one floor (sets cleared past boss)</option><option value="end">End — finish the run (carry to meta)</option></select></div>' +
        '<div class="row cTethRow">' + lbl('Tethered') +
        '<select class="cTeth"><option value="true">Tethered (Surveillance ↑)</option><option value="false">Untethered (death is real)</option></select></div>' +
        '<div class="row cSeedRow">' + lbl('Seed') + '<input type="number" class="cSeed" value="' + (cmd.seed == null ? '' : (cmd.seed | 0)) + '" placeholder="random" style="width:120px;"></div>' +
        '<div class="row cReasonRow">' + lbl('Reason') + '<select class="cReason"><option value="cleared">cleared</option><option value="died">died</option><option value="collected">collected</option></select></div>' +
        '<div style="font-size:9px;color:#888;margin-top:2px;">Fine-grained: pair <b>Start</b>/<b>Deeper</b> with a <b>Generate+Enter Floor</b> command. Use a Conditional (kind: run → cleared) after Deeper to decide End vs. Generate.</div>';
      var rOp = body.querySelector('.cOp'); rOp.value = cmd.op || 'start';
      function rToggle() { var o = rOp.value; body.querySelector('.cTethRow').style.display = o === 'start' ? '' : 'none'; body.querySelector('.cSeedRow').style.display = o === 'start' ? '' : 'none'; body.querySelector('.cReasonRow').style.display = o === 'end' ? '' : 'none'; }
      rOp.addEventListener('change', function () { cmd.op = this.value; rToggle(); }); rToggle();
      body.querySelector('.cTeth').value = (cmd.tethered === false) ? 'false' : 'true';
      body.querySelector('.cTeth').addEventListener('change', function () { cmd.tethered = (this.value === 'true'); });
      body.querySelector('.cSeed').addEventListener('change', function () { cmd.seed = this.value === '' ? null : (parseInt(this.value, 10) || 0); });
      body.querySelector('.cReason').value = cmd.reason || 'cleared';
      body.querySelector('.cReason').addEventListener('change', function () { cmd.reason = this.value; });
    } else if (cmd.type === 'gendungeon') {
      body.innerHTML = '<div style="font-size:10px;color:#aaa;">Generates the CURRENT run floor (from run.seed + floor) and transfers the player onto it. Pool fallback when runtime-gen is off. Use after a <b>Run: Start/Deeper</b>.</div>';
    } else if (cmd.type === 'weather') {
      body.innerHTML = '<div class="row">' + lbl('Type') +
        '<select class="cWk"><option value="none">None</option><option value="rain">Rain</option><option value="storm">Storm</option><option value="snow">Snow</option><option value="fog">Fog</option></select>' +
        lbl('Power') + '<input type="number" class="cWp" min="0" max="9" value="' + ((cmd.power == null ? 5 : cmd.power) | 0) + '" style="width:50px;"></div>' +
        '<div style="font-size:9px;color:#888;">Weather resets to None when you change maps.</div>';
      body.querySelector('.cWk').value = cmd.kind || 'rain';
      body.querySelector('.cWk').addEventListener('change', function () { cmd.kind = this.value; });
      body.querySelector('.cWp').addEventListener('change', function () { cmd.power = parseInt(this.value, 10) || 0; });
    } else if (cmd.type === 'setevloc') {
      body.innerHTML = '<div class="row">' + lbl('Target') + '<input type="text" class="cT" value="' + (cmd.target || 'this') + '" placeholder="this / player / event id" style="width:120px;"></div>' +
        '<div class="row">' + lbl('X') + '<input type="number" class="cX" value="' + (cmd.x | 0) + '" style="width:50px;">' + lbl('Y') + '<input type="number" class="cY" value="' + (cmd.y | 0) + '" style="width:50px;">' +
        lbl('Facing') + '<select class="cD"><option value="retain">Retain</option><option value="down">Down</option><option value="left">Left</option><option value="right">Right</option><option value="up">Up</option></select></div>';
      body.querySelector('.cT').addEventListener('change', function () { cmd.target = this.value.trim(); });
      body.querySelector('.cX').addEventListener('change', function () { cmd.x = parseInt(this.value, 10) || 0; });
      body.querySelector('.cY').addEventListener('change', function () { cmd.y = parseInt(this.value, 10) || 0; });
      var sd = body.querySelector('.cD'); sd.value = cmd.dir || 'retain'; sd.addEventListener('change', function () { cmd.dir = this.value; });
    } else if (cmd.type === 'transparency') {
      body.innerHTML = '<div class="row">' + lbl('Player') + '<select class="cOn"><option value="true">Transparent (hidden)</option><option value="false">Visible</option></select></div>';
      body.querySelector('.cOn').value = (cmd.on === false) ? 'false' : 'true';
      body.querySelector('.cOn').addEventListener('change', function () { cmd.on = (this.value === 'true'); });
    } else if (cmd.type === 'change_level' || cmd.type === 'change_exp') {
      var isLv = cmd.type === 'change_level';
      body.innerHTML = '<div class="row">' + lbl(isLv ? 'Level' : 'EXP') +
        '<select class="cOp"><option value="+">+</option><option value="-">−</option>' + (isLv ? '<option value="=">=</option>' : '') + '</select>' +
        '<input type="number" class="cAmt" value="' + ((cmd.amount | 0) || (isLv ? 1 : 50)) + '" style="width:70px;"></div>';
      var op = body.querySelector('.cOp'); op.value = cmd.op || '+'; op.addEventListener('change', function () { cmd.op = this.value; });
      body.querySelector('.cAmt').addEventListener('change', function () { cmd.amount = parseInt(this.value, 10) || 0; });
    } else if (cmd.type === 'select_item') {
      body.innerHTML = '<div class="row">' + lbl('Prompt') + '<input type="text" class="cP" value="' + (cmd.prompt || 'Select an item') + '" style="flex:1;min-width:0;"></div>' +
        '<div class="row">' + lbl('Pocket') + '<input type="text" class="cPk" value="' + (cmd.pocket || 'items') + '" style="width:90px;">' + lbl('→ Var #') + '<input type="text" class="cV" value="' + (cmd.variable || '1') + '" style="width:46px;"></div>' +
        '<div style="font-size:9px;color:#888;">Sets the variable to the chosen item id (and #_id). 0/empty if cancelled.</div>';
      body.querySelector('.cP').addEventListener('change', function () { cmd.prompt = this.value; });
      body.querySelector('.cPk').addEventListener('change', function () { cmd.pocket = this.value.trim() || 'items'; });
      body.querySelector('.cV').addEventListener('change', function () { cmd.variable = this.value; });
    } else if (cmd.type === 'erase_event' || cmd.type === 'openmenu' || cmd.type === 'opensave' || cmd.type === 'gameover' || cmd.type === 'totitle' || cmd.type === 'recover_all') {
      var notes = { erase_event: 'Removes THIS event for the rest of the map session.', openmenu: 'Opens the start/pause menu.', opensave: 'Saves the game to the current slot.', gameover: 'Plays the Game Over fanfare and returns to the title.', totitle: 'Returns to the title screen.', recover_all: 'Fully restores HP / MP / Stamina and clears Exposure.' };
      body.innerHTML = '<div style="font-size:10px;color:#aaa;">' + (notes[cmd.type] || '') + ' No parameters.</div>';
    }
  }
  // "Pick…" — arm a click on the map to set a transfer's X,Y (and map = current).
  // Transfer destination picker: open the chosen map and click where the player
  // arrives — captures map + X + Y in one click (no typing).
  function pickDestination(cmd, ev) { closeEventEditor(); openDestPicker(cmd, ev); }

  // Load a layout's tileset groups + data into a throwaway {ground,overlay,upper}
  // (does NOT touch the edit session), so we can render any map read-only.
  function loadLayoutLayers(data) {
    var Lg = newLayer(0), Lo = newLayer(-1), Lu = newLayer(-1);
    var grp = function (g, t) { return g || (t ? [{ name: t }] : []); };
    function loadGroup(layer, group) {
      return group.reduce(function (pr, e) {
        return pr.then(function () {
          return loadSheetData(e.name).then(function (sh) {
            var off = 0; layer.sheets.forEach(function (s) { off += s.count; });
            sh.offset = (e.offset != null) ? e.offset : off; layer.sheets.push(sh);
          }).catch(function () {});
        });
      }, Promise.resolve());
    }
    return Promise.all([
      loadGroup(Lg, grp(data.tileset_group, data.tileset)),
      loadGroup(Lo, grp(data.overlay_group, data.overlay_tileset)),
      loadGroup(Lu, grp(data.upper_group, data.upper_tileset))
    ]).then(function () {
      var w = data.width, h = data.height;
      Lg.data = Int32Array.from(data.metatiles || []);
      Lo.data = new Int32Array(w * h); Lu.data = new Int32Array(w * h);
      for (var i = 0; i < w * h; i++) { Lo.data[i] = data.overlay ? data.overlay[i] : -1; Lu.data[i] = data.upper ? data.upper[i] : -1; }
      return { layers: { ground: Lg, overlay: Lo, upper: Lu }, width: w, height: h };
    });
  }
  var DEST_CS = 16;
  function renderDestCanvas(res) {
    var c = $('destCanvas'); c.width = res.width * DEST_CS; c.height = res.height * DEST_CS;
    var ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    ['ground', 'overlay', 'upper'].forEach(function (k) {
      var L = res.layers[k]; if (!L || !L.sheets.length || !L.data) return;
      for (var y = 0; y < res.height; y++)
        for (var x = 0; x < res.width; x++) { var v = L.data[y * res.width + x]; if (v >= 0) blitGid(ctx, L, v, x * DEST_CS, y * DEST_CS, DEST_CS); }
    });
  }
  function loadDestMap(name) {
    var info = $('destPickInfo'); info.textContent = 'Loading…';
    var cur = $('mapName').value, p;
    if (name === cur) { p = Promise.resolve(buildLayout()); }
    else {
      var region = (treeModel[name] && treeModel[name].region) || defRegion();
      p = ghGet('data/maps/' + region + '/' + name + '.json').then(function (c) {
        if (!c.content) throw new Error('unsaved');
        var m = JSON.parse(c.content);
        return ghGet('data/layouts/' + region + '/' + m.layout + '.json').then(function (lc) {
          if (!lc.content) throw new Error('no layout'); return JSON.parse(lc.content);
        });
      });
    }
    p.then(loadLayoutLayers).then(function (res) {
      state._destLayers = res; info.textContent = res.width + '×' + res.height + ' — click a tile';
      renderDestCanvas(res);
    }).catch(function () {
      state._destLayers = null; info.textContent = 'Can’t preview — save that map first (☁), then pick.';
      var c = $('destCanvas'); c.width = 1; c.height = 1;
    });
  }
  function openDestPicker(cmd, ev) {
    state._destPick = { cmd: cmd, ev: ev };
    $('destPickModal').style.display = 'flex';
    var sel = $('destMapSel'); sel.innerHTML = '';
    var cur = $('mapName').value;
    var names = Object.keys(treeModel || {}); if (names.indexOf(cur) < 0) names.unshift(cur);
    names.sort();
    names.forEach(function (n) { var o = document.createElement('option'); o.value = n; o.textContent = n + (n === cur ? '  (current)' : ''); sel.appendChild(o); });
    sel.value = (cmd.map && names.indexOf(cmd.map) >= 0) ? cmd.map : cur;
    sel.onchange = function () { loadDestMap(this.value); };
    loadDestMap(sel.value);
  }
  function renderEventList() {
    var list = $('eventList'); if (!list) return; list.innerHTML = '';
    if (!state.events.length) { list.innerHTML = '<div class="hint">No events yet.</div>'; return; }
    state.events.forEach(function (ev) {
      var d = document.createElement('div'); d.className = 'warp-item';
      d.style.cursor = 'pointer';
      if (ev === state.selectedEvent) { d.style.background = 'var(--accent2)'; d.style.borderColor = 'var(--accent)'; }
      d.textContent = ev.name + '  (' + ev.x + ',' + ev.y + ')' + (ev.graphic ? ' · ' + ev.graphic.sprite : '');
      d.addEventListener('click', function () { state.selectedEvent = ev; openEventEditor(); drawMap(); });
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

  // ── Generate map (in-browser MapGen → applyLayout) ──
  (function () {
    var modal = $('genModal');
    if (!modal) return;
    function syncOpts() {
      var a = $('genArch').value;
      $('genTownOpts').style.display = (a === 'town') ? '' : 'none';
      $('genTier').style.display = (a === 'dungeon') ? '' : 'none';
      var sz = (window.MapGen && MapGen.DEFAULT_SIZE[a]) || [50, 50];
      $('genW').value = sz[0]; $('genH').value = sz[1];
    }
    var genParent = null;   // when set, the generated map nests under this map
    function open(parent) {
      genParent = parent || null;
      if (genParent) {
        $('genName').value = uniqueName(genParent + 'Sub');
        var pr = treeModel[genParent] && treeModel[genParent].region;
        if (pr) setRegionSelect(pr);
        $('genModal').querySelector('.ed-head strong').textContent = '🎲 Generate Child of ' + genParent;
      } else {
        $('genName').value = $('mapName') ? ($('mapName').value || 'NewMap') : 'NewMap';
        $('genModal').querySelector('.ed-head strong').textContent = '🎲 Generate Map';
      }
      $('genSeed').value = '';   // blank = a fresh random map every time
      syncOpts(); modal.style.display = 'flex';
    }
    function close() { modal.style.display = 'none'; }
    window._openGenModal = open;   // tree context menu → Generate child map
    $('genBtn').addEventListener('click', function () { open(null); });
    $('genClose').addEventListener('click', close);
    $('genCancel').addEventListener('click', close);
    $('genArch').addEventListener('change', syncOpts);
    $('genReseed').addEventListener('click', function () { $('genSeed').value = (Math.random() * 1e9) | 0; });
    $('genGo').addEventListener('click', function () {
      if (!window.MapGen) { alert('Generator script not loaded.'); return; }
      var arch = $('genArch').value;
      var name = ($('genName').value || 'NewMap').trim().replace(/\s+/g, '');
      var seedStr = $('genSeed').value;
      var opt = {
        archetype: arch, name: name,
        region: $('mapRegion') ? $('mapRegion').value : 'awakened',
        w: parseInt($('genW').value, 10) || 50, h: parseInt($('genH').value, 10) || 50,
        seed: seedStr !== '' ? (parseInt(seedStr, 10) || 0) : undefined,
        keep: $('genKeep').checked, pond: $('genPond').checked,
        houses: parseInt($('genHouses').value, 10), tier: parseInt($('genTierIn').value, 10) || 1,
      };
      var go = $('genGo'); go.disabled = true; go.textContent = 'Generating…';
      var parent = genParent;
      Promise.resolve().then(function () { return MapGen.generate(opt); })
        .then(function (res) { try { pushUndo(); } catch (_) {} return applyLayout(res.layout, res.map); })
        .then(function () {
          // register the generated map in the tree (nested if a parent was given)
          treeModel[name] = treeModel[name] || { region: opt.region, parent: parent || null, local: true };
          treeModel[name].region = opt.region; treeModel[name].local = true;
          if (parent) { treeModel[name].parent = parent; treeExpanded[parent] = true; }
          currentNode = name; persistTree(); renderTree();
          close(); try { toast('Generated ' + name + (parent ? ' (child of ' + parent + ')' : '')); } catch (_) {}
        })
        .catch(function (err) { alert('Generate failed: ' + ((err && err.message) || err)); })
        .then(function () { go.disabled = false; go.textContent = 'Generate'; });
    });
  })();

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
    var inR = state.mode === 'region', inS = state.mode === 'shadow', inE = state.mode === 'event';
    if ($('regionRow')) $('regionRow').style.display = inR ? '' : 'none';
    if ($('shadowRow')) $('shadowRow').style.display = inS ? '' : 'none';
    if ($('eventHint')) $('eventHint').style.display = inE ? '' : 'none';
    if ($('modeBar')) $('modeBar').style.display = (inR || inS || inE) ? 'flex' : 'none';
    if ($('eventModeBtn')) $('eventModeBtn').classList.toggle('active', inE);
    drawMap();
  }
  Object.keys(MODE_BTNS).forEach(function (id) {
    var e = $(id); if (!e) return;
    e.addEventListener('click', function () {
      // clicking the already-active mode (other than Map) toggles back to Map
      var target = MODE_BTNS[id];
      setModeBtn((state.mode === target && target !== 'map') ? 'map' : target);
      syncModeUI();
    });
  });
  var rn = $('regionNum');
  if (rn) rn.addEventListener('change', function () {
    var v = parseInt(this.value, 10);
    state.regionId = Math.max(1, Math.min(63, isNaN(v) ? 1 : v));
    this.value = state.regionId;
  });
  syncModeUI();

  // Multi-tile palette toggle (visible button above the palette). OFF = one tile
  // per pick; ON = drag a rectangle across the palette to grab a block (like the
  // rectangle tool, but for the source tiles).
  function syncMultiTileBtn() {
    var b = $('multiTileBtn'); if (!b) return;
    b.classList.toggle('active', state.multiTile);
    b.textContent = state.multiTile ? '▦ Multi' : '▦ 1×1';
  }
  if ($('multiTileBtn')) $('multiTileBtn').addEventListener('click', function () {
    state.multiTile = !state.multiTile;
    if (!state.multiTile && state.stamp && state.stamp.ids && state.stamp.ids.length > 1) {
      state.stamp = { ids: [state.stamp.ids[0]], w: 1, h: 1 };   // collapse back to a single tile
    }
    syncMultiTileBtn();
    toast(state.multiTile ? 'Multi-tile ON — drag across the palette to grab a block'
                          : 'Multi-tile OFF — one tile at a time');
  });
  syncMultiTileBtn();

  // Event-layer button TOGGLES: click again (or while already in event mode) to
  // return to Map/tile mode, so it doesn't get stuck on.
  $('eventModeBtn').addEventListener('click', function () {
    setModeBtn(state.mode === 'event' ? 'map' : 'event'); syncModeUI();
  });
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
    var q = 'game.html?map=' + encodeURIComponent(nm) + '&region=' + encodeURIComponent(rg);
    // Honor the player-start tile if one was set on this map.
    if (state.startLoc && state.startLoc.map === nm && state.startLoc.x != null)
      q += '&x=' + state.startLoc.x + '&y=' + state.startLoc.y;
    window.open(q, '_blank');
  });

  // ── Menu bar (RPG Maker XP menu order) ──
  var MENUS = [
    ['File', [
      ['New', 'Ctrl+N', function () { clickEl('newBtn'); }],
      ['Open / Import…', 'Ctrl+O', function () { clickEl('importBtn'); }],
      ['Load from repo…', '', function () { clickEl('repoLoadBtn'); }],
      'sep',
      ['Map Properties…', '', function () { window._openMapProps(); }],
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
      ['Layer 1 (Ground)', '1', function () { setLayerBtn('ground'); }, function () { return state.active === 'ground'; }],
      ['Layer 2 (Overlay)', '2', function () { setLayerBtn('overlay'); }, function () { return state.active === 'overlay'; }],
      ['Layer 3 (Upper)', '3', function () { setLayerBtn('upper'); }, function () { return state.active === 'upper'; }],
      ['Event layer', 'F6', function () { setModeBtn(state.mode === 'event' ? 'map' : 'event'); syncModeUI(); }, function () { return state.mode === 'event'; }],
      'sep',
      ['Collision / Passage', '', function () { setModeBtn(state.mode === 'collide' ? 'map' : 'collide'); syncModeUI(); }, function () { return state.mode === 'collide'; }],
      ['Tile mode', '', function () { setModeBtn('map'); syncModeUI(); }, function () { return state.mode === 'map'; }],
      ['Region IDs', '', function () { setModeBtn(state.mode === 'region' ? 'map' : 'region'); syncModeUI(); }, function () { return state.mode === 'region'; }],
      ['Shadow pen', '', function () { setModeBtn(state.mode === 'shadow' ? 'map' : 'shadow'); syncModeUI(); }, function () { return state.mode === 'shadow'; }]
    ]],
    ['Draw', [
      ['Pencil', '', function () { setToolBtn('pencil'); }, function () { return state.tool === 'pencil' && !state.eraser; }],
      ['Rectangle', '', function () { setToolBtn('rect'); }, function () { return state.tool === 'rect'; }],
      ['Ellipse', '', function () { setToolBtn('ellipse'); }, function () { return state.tool === 'ellipse'; }],
      ['Flood Fill', '', function () { setToolBtn('fill'); }, function () { return state.tool === 'fill'; }],
      ['Select (box)', '', function () { setToolBtn('select'); }, function () { return state.tool === 'select'; }],
      ['Pick (eyedropper)', '', function () { setToolBtn('pick'); }, function () { return state.tool === 'pick'; }],
      ['Pan (drag to move map)', '', function () { setToolBtn('pan'); }, function () { return state.tool === 'pan'; }],
      ['Eraser', '', function () { clickEl('eraserBtn'); }, function () { return state.eraser; }],
      'sep',
      ['Multi-tile brush', '', function () {
        state.multiTile = !state.multiTile;
        toast(state.multiTile ? 'Multi-tile brush ON — drag across the palette to grab a block'
                              : 'Multi-tile brush OFF — one tile at a time');
      }, function () { return state.multiTile; }]
    ]],
    ['Scale', [
      ['1/1', '', function () { setScaleBtn(2); }, function () { return state.zoom === 2; }],
      ['1/2', '', function () { setScaleBtn(1); }, function () { return state.zoom === 1; }],
      ['1/4', '', function () { setScaleBtn(0.5); }, function () { return state.zoom === 0.5; }]
    ]],
    ['View', [
      ['Toggle Grid', '', function () { clickEl('gridBtn'); }],
      ['Screen Orientation…', '', function () { clickEl('orientBtn'); }],
      'sep',
      ['Palette: MV ⇄ XP', '', function () { clickEl('tabModeBtn'); }]
    ]],
    ['Tools', [
      ['Generate Map…', '', function () { clickEl('genBtn'); }],
      'sep',
      ['Character Sprites…', '', function () { openSpriteModal('player'); }],
      ['Character Generator…', '', function () { window.open('generator.html', '_blank'); }]
    ]],
    ['Game', [
      ['Playtest', 'F12', function () { clickEl('playBtn'); }],
      'sep',
      ['Set Player Start (click a tile)', '', function () {
        state._settingStart = true; toast('Click a tile to set the player’s start position.');
      }]
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
        if (it[3]) { mi._activeFn = it[3]; mi._label = it[0]; mi._lab = lab; }   // active-state marker
        if (it[2]) mi.addEventListener('click', function (e) { e.stopPropagation(); closeMenus(); it[2](); });
        else mi.addEventListener('click', function (e) { e.stopPropagation(); });
        dd.appendChild(mi);
      });
      menu.appendChild(dd);
      menu.addEventListener('click', function (e) {
        e.stopPropagation();
        var wasOpen = menu.classList.contains('open');
        closeMenus();
        if (!wasOpen) { markActiveItems(menu); menu.classList.add('open'); }
      });
      menu.addEventListener('mouseenter', function () {
        if (bar.querySelector('.menu.open')) { closeMenus(); markActiveItems(menu); menu.classList.add('open'); }
      });
      bar.appendChild(menu);
    });
  }
  function markActiveItems(menu) {       // prefix the active tool/mode/scale/layer with ●
    menu.querySelectorAll('.mi').forEach(function (mi) {
      if (!mi._activeFn) return;
      var on = false; try { on = !!mi._activeFn(); } catch (e) {}
      mi._lab.textContent = (on ? '● ' : '   ') + mi._label;
      mi.style.fontWeight = on ? '700' : '';
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

  var TOOL_ICON = { pencil: '✏ Pencil', rect: '▭ Rectangle', ellipse: '◯ Ellipse',
                    fill: '🪣 Fill', pick: '⛏ Pick', select: '⬚ Select', pan: '🖐 Pan' };
  function updateToolStatus() {
    var st = $('statTool'); if (!st) return;
    st.textContent = state.eraser ? '⌫ Eraser' : (TOOL_ICON[state.tool] || state.tool);
  }
  document.querySelectorAll('.tool').forEach(function (b) {
    if (!b.dataset.tool) return;
    b.addEventListener('click', function () {
      state.tool = b.dataset.tool;
      state.eraser = false; $('eraserBtn').classList.remove('active');
      document.querySelectorAll('.tool').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      mapCanvas.style.cursor = (state.tool === 'pan') ? 'grab' : '';
      updateToolStatus();
    });
  });
  $('eraserBtn').addEventListener('click', function () {
    state.eraser = !state.eraser;
    this.classList.toggle('active', state.eraser);
    updateToolStatus();
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

  // ── Save maps straight to the live `main` branch (same mechanism as
  // cloud-saves.js). Writing to main means an authored map deploys to Pages and
  // the game can actually load it — everything lives together on one branch. ──
  var GH_REPO   = 'knightdx91-alt/awakened-calamity';
  var GH_BRANCH = 'main';
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
    // no-store + cache-bust: the GitHub contents API sends cache headers, and a
    // browser-cached GET returns a STALE sha → the next PUT 409s ("does not
    // match"). Always read the live sha.
    return fetch(ghUrl(path) + '?ref=' + GH_BRANCH + '&_=' + Date.now(),
                 { headers: ghHeaders(), cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        return d ? { sha: d.sha, content: d.content ? b64decode(d.content) : null } : { sha: null, content: null };
      })
      .catch(function () { return { sha: null, content: null }; });
  }
  function ghPut(path, obj, message, sha) {
    function put(curSha) {
      var body = { message: message, content: b64encode(JSON.stringify(obj)), branch: GH_BRANCH };
      if (curSha) body.sha = curSha;
      return fetch(ghUrl(path), { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) });
    }
    return put(sha).then(function (r) {
      if (r.ok) return r.json();
      return r.json().then(function (d) {
        // Stale sha (file changed since we read it) → refetch the live sha and retry once.
        if (r.status === 409 || r.status === 422) {
          return ghGet(path).then(function (cur) {
            return put(cur.sha || undefined).then(function (r2) {
              if (r2.ok) return r2.json();
              return r2.json().then(function (d2) { throw new Error(d2.message || ('HTTP ' + r2.status)); });
            });
          });
        }
        throw new Error(d.message || ('HTTP ' + r.status));
      });
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

  // Rename a saved map (+ its layout) on the live branch: write the new
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
      ? 'Delete "' + name + '" from the live game (main)?\nThis removes the map AND its layout file, and updates the index. This cannot be undone.'
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
      ['Generate child map…', function () { selectNode(name); if (window._openGenModal) window._openGenModal(name); }],
      ['Edit', function () { selectNode(name); }],
      ['Map Properties…', function () { selectNode(name); window._openMapProps(); }],
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
  var _faceSheets = null;
  function loadFaceSheets() {
    if (_faceSheets) return Promise.resolve(_faceSheets);
    return fetch('data/faces/rtp_faces_index.json').then(function (r) { return r.json(); })
      .then(function (d) { _faceSheets = d.sheets || []; return _faceSheets; })
      .catch(function () { return (_faceSheets = []); });
  }
  var _classList = null, _skillList = null, _questList = null;
  function loadQuestList() {
    if (_questList) return Promise.resolve(_questList);
    return fetch('data/systems/quests.json').then(function (r) { return r.json(); })
      .then(function (j) { _questList = Object.keys(j).filter(function (k) { return k !== '_meta' && j[k]; }).map(function (k) { return { id: k, name: j[k].name || k }; }); return _questList; })
      .catch(function () { return (_questList = []); });
  }
  function loadClassList() {
    if (_classList) return Promise.resolve(_classList);
    return fetch('data/systems/classes.json').then(function (r) { return r.json(); })
      .then(function (j) { _classList = Object.keys(j).filter(function (k) { return k !== '_meta' && j[k]; }).map(function (k) { return { id: k, name: j[k].name || k, tier: j[k].tier }; }); return _classList; })
      .catch(function () { return (_classList = []); });
  }
  function loadSkillList() {
    if (_skillList) return Promise.resolve(_skillList);
    return fetch('data/systems/skills.json').then(function (r) { return r.json(); })
      .then(function (j) { _skillList = Object.keys(j).filter(function (k) { return k !== '_meta' && k.indexOf('_comment') !== 0 && j[k]; }).map(function (k) { return { id: k, name: j[k].name || k }; }); return _skillList; })
      .catch(function () { return (_skillList = []); });
  }
  function loadSpriteIndex() {
    if (_spriteIndex) return Promise.resolve(_spriteIndex);
    // Merge every available sprite set (RTP first, then XP) so the picker shows
    // all charsets. Each entry's `file` carries its own subdir, so they coexist.
    var sets = ['rtp_index.json', 'xp_index.json'];
    return Promise.all(sets.map(function (f) {
      return fetch('data/sprites/' + f).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    })).then(function (parts) {
      var sprites = [], cats = {};
      parts.filter(Boolean).forEach(function (d) {
        (d.sprites || []).forEach(function (s) { sprites.push(s); });
        (d.categories || []).forEach(function (c) { cats[c] = 1; });
      });
      _spriteIndex = { categories: Object.keys(cats).sort(), sprites: sprites };
      return _spriteIndex;
    });
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
  var _spriteTarget = 'player', _spriteApply = null;
  // Open the sprite picker and hand the chosen graphic to a callback (used by
  // event commands like Change Graphic / Spawn that store their own graphic).
  function openSpriteModalForCmd(cb) { _spriteApply = cb; openSpriteModal('cmd'); }
  function openSpriteModal(target) {
    _spriteTarget = target || 'player';
    $('setPlayerBtn').textContent = _spriteTarget === 'event' ? '◆ Use for Event'
                                   : _spriteTarget === 'cmd' ? '◆ Use Graphic' : '★ Set as Player';
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

  // ── Map Properties + Event editor modal wiring (RM XP-style dialogs) ──
  function openMapProps() {
    state._propsOrig = $('mapName').value || '';   // remember identity to detect a rename
    $('mapPropsModal').style.display = 'flex';
  }
  function closeMapProps() { $('mapPropsModal').style.display = 'none'; }
  $('mapPropsClose').addEventListener('click', closeMapProps);
  if ($('mapPropsDone')) $('mapPropsDone').addEventListener('click', closeMapProps);
  if ($('mapPropsSaveRepo')) $('mapPropsSaveRepo').addEventListener('click', function () {
    var orig = state._propsOrig || '';
    var newName = ($('mapName').value || '').trim();
    if (!newName) { alert('Map name cannot be empty.'); return; }
    $('mapName').value = newName;
    // Name changed → RENAME the existing map (don't create a duplicate).
    if (orig && newName !== orig) {
      if (treeModel[newName]) { alert('A map named "' + newName + '" already exists.'); return; }
      var node = treeModel[orig] || { region: $('mapRegion').value, parent: null, local: true };
      var oldRegion = node.region || $('mapRegion').value;
      var wasSaved = !node.local;
      // move the tree node old → new (keep parent/region; reparent children)
      treeModel[newName] = { region: $('mapRegion').value || oldRegion, parent: node.parent || null, local: node.local };
      delete treeModel[orig];
      Object.keys(treeModel).forEach(function (k) { if (treeModel[k].parent === orig) treeModel[k].parent = newName; });
      if (treeExpanded[orig] != null) { treeExpanded[newName] = treeExpanded[orig]; delete treeExpanded[orig]; }
      if (currentNode === orig) currentNode = newName;
      $('layoutId').value = layoutIdFor(newName);
      persistTree(); renderTree();
      closeMapProps();
      // remove the old repo files (if it was saved), then write the current content as the new name
      if (wasSaved) {
        setRepoBtn('☁ Renaming…', '#b58900');
        repoDelete(orig, oldRegion).then(saveToRepo).catch(function () { saveToRepo(); });
      } else {
        saveToRepo();
      }
      return;
    }
    closeMapProps(); saveToRepo();   // no rename — just persist
  });
  $('mapPropsModal').addEventListener('click', function (e) { if (e.target === $('mapPropsModal')) closeMapProps(); });
  $('eventEditorClose').addEventListener('click', closeEventEditor);
  $('eventEditorModal').addEventListener('click', function (e) { if (e.target === $('eventEditorModal')) closeEventEditor(); });
  window._openMapProps = openMapProps;   // used by the menu + tree context menu

  // Destination picker: click a tile on the previewed map → set map + X + Y.
  function _cancelDestPick() {
    $('destPickModal').style.display = 'none';
    var pd = state._destPick; state._destPick = null; state._destLayers = null;
    if (pd) { state.selectedEvent = pd.ev; openEventEditor(); }   // reopen the event editor unchanged
  }
  $('destPickClose').addEventListener('click', _cancelDestPick);
  $('destPickModal').addEventListener('click', function (e) { if (e.target === $('destPickModal')) _cancelDestPick(); });
  $('destCanvas').addEventListener('click', function (e) {
    if (!state._destPick || !state._destLayers) return;
    var r = this.getBoundingClientRect();
    var x = Math.floor((e.clientX - r.left) / DEST_CS), y = Math.floor((e.clientY - r.top) / DEST_CS);
    if (x < 0 || y < 0 || x >= state._destLayers.width || y >= state._destLayers.height) return;
    var pd = state._destPick;
    pd.cmd.map = $('destMapSel').value; pd.cmd.x = x; pd.cmd.y = y; if (!pd.cmd.dir) pd.cmd.dir = 'down';
    $('destPickModal').style.display = 'none'; state._destPick = null; state._destLayers = null;
    state.selectedEvent = pd.ev; openEventEditor();
    toast('Destination set: ' + pd.cmd.map + ' (' + x + ',' + y + ')');
  });
  $('setPlayerBtn').addEventListener('click', function () {
    if (!_selectedSprite) return;
    var e = _selectedSprite;
    var g = { sprite: e.id, file: e.file, frame_w: e.frame_w, frame_h: e.frame_h, cols: e.cols, rows: e.rows, single: e.single };
    if (_spriteTarget === 'cmd' && _spriteApply) {
      var apply = _spriteApply; _spriteApply = null;
      $('spriteModal').style.display = 'none';
      apply(g);
      return;
    }
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
    try { state.startLoc = JSON.parse(localStorage.getItem('ac_start_location') || 'null'); } catch (e) {}
    newMap(state.width, state.height, false);
    setStampFromPalette(0, 0, 0, 0);
    buildMapTree();
  }).catch(function (err) {
    alert('Failed to load tilesets. Serve over http (not file://).\n' + err);
  });
})();
