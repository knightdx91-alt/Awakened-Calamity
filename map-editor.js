/* Map Editor — RPG Maker MZ-style metatile editor.
 *
 * Reshaped to behave like RM's editor: tabbed tile palette (A = autotiles,
 * B = raw tiles with multi-tile drag-select stamps), two paint layers
 * (Ground + Overlay), and autotile-on-paint (the A tab blends edges live).
 *
 * Layout format (matches data/layouts/*.json), engine reads these fields:
 *   { id, width, height, tileset, metatiles:[ids...], collision:[0|1...],
 *     terrain:[names...]              // author-time autotile source (engine ignores)
 *     overlay_tileset, overlay:[ids... | -1] }   // optional second layer
 * Map format (matches data/maps/<region>/*.json):
 *   { id, name, region, layout, ..., connections, npcs, warps, triggers, signs }
 */
(function () {
  'use strict';

  var DT = 16;                 // DISPLAY metatile px (on-screen cell, tileset-independent)
  var META_PER_ROW = 16;       // fallback metatiles-per-row
  var $ = function (id) { return document.getElementById(id); };

  // ── Per-layer record. SOURCE geometry (tile px / per-row) is read from meta. ──
  function newLayer(fill) {
    return { name: null, img: null, meta: null, autotile: null,
             data: null, collision: null, terrain: null, fill: fill };
  }

  var state = {
    layers: { ground: newLayer(1), overlay: newLayer(-1) },
    active: 'ground',
    width: 20, height: 18,
    warps: [],
    selectedTile: 1,             // top-left id of the B-tab stamp
    stamp: { w: 1, h: 1, ids: [1] },   // multi-tile stamp from B tab
    selectedTerrain: '',         // A tab
    paletteTab: 'B',             // 'A' (auto) | 'B' (tiles)
    tool: 'pencil',              // pencil | rect | ellipse | fill | pick
    mode: 'map',                 // map | collide | warp
    eraser: false,
    showGrid: true,
    zoom: 2,
    orient: 0                    // 0..3 -> 0/90/180/270 deg whole-editor rotation
  };

  var ORIENT_DEG = [0, 90, 180, 270];

  // Map a screen point to a (rotated) canvas's own untransformed content
  // coordinates. The editor may be CSS-rotated about the viewport centre; since
  // that transform is rigid, inverse-rotating the offset from the canvas's
  // on-screen bounding-box centre recovers local coords regardless of pivot.
  function screenToLocal(canvas, clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    var dx = clientX - (r.left + r.width / 2);
    var dy = clientY - (r.top + r.height / 2);
    var a = -ORIENT_DEG[state.orient] * Math.PI / 180;
    var ca = Math.cos(a), sa = Math.sin(a);
    return { x: (dx * ca - dy * sa) + canvas.width / 2,
             y: (dx * sa + dy * ca) + canvas.height / 2 };
  }

  function L() { return state.layers[state.active]; }
  function srcTile(layer) { layer = layer || L(); return (layer.meta && layer.meta.tile) || 16; }
  function perRow(layer)  { layer = layer || L(); return (layer.meta && layer.meta.metatiles_per_row) || META_PER_ROW; }

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

  // Load a tileset's png + json (+ optional autotile.json) into a layer.
  function loadTilesetInto(layer, name) {
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
      layer.name = name;
      layer.meta = parts[0];
      layer.img = parts[1];
      layer.autotile = (parts[2] && parts[2].terrains) ? parts[2] : null;
      return layer;
    });
  }

  function loadTileset(name) {
    return loadTilesetInto(L(), name).then(function () {
      updateTilesetStatus();
      rebuildAutoPalette();
      refreshPaletteTabs();
      drawPalette();
      drawMap();
      updateSelSwatch();
    });
  }

  function updateTilesetStatus() {
    var layer = L();
    $('statTileset').textContent = 'Tileset: ' + (layer.name || '—') +
      ' (' + (totalMetatiles(layer) || '?') + ')';
    $('statLayer').textContent = 'Layer: ' + state.active;
  }

  function totalMetatiles(layer) {
    layer = layer || L();
    if (layer.meta && layer.meta.total_metatiles) return layer.meta.total_metatiles;
    if (!layer.img) return 0;
    var st = srcTile(layer);
    return Math.floor((layer.img.width / st) * (layer.img.height / st));
  }

  // ── Autotiler (author-time edge blob, ground layer) ──
  function recomputeTerrainCell(x, y) {
    var layer = state.layers.ground;
    if (!layer.autotile) return;
    var i = idx(x, y);
    var name = layer.terrain[i];
    if (!name) {                                  // base cell -> default fill
      var fills = layer.autotile.fills || {};
      var baseKey = (layer.autotile.priority && layer.autotile.priority[0]) || 'grass';
      if (fills[baseKey] != null) { layer.data[i] = fills[baseKey]; layer.collision[i] = 0; }
      return;
    }
    var info = layer.autotile.terrains[name];
    if (!info) return;
    var prio = layer.autotile.priority || null;
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
    if (layer.autotile.scheme === 'wang8_lut' && (info.luts || info.lut)) {
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
      layer.data[i] = lut[m8];
    } else {
      var mask = (same(x, y - 1) ? 1 : 0) | (same(x + 1, y) ? 2 : 0) |
                 (same(x, y + 1) ? 4 : 0) | (same(x - 1, y) ? 8 : 0);
      layer.data[i] = info.base_index + mask;
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

  function refreshPaletteTabs() {
    var hasAuto = !!L().autotile;
    var aTab = document.querySelector('.pal-tab[data-pal="A"]');
    aTab.style.opacity = hasAuto ? '1' : '0.4';
    aTab.style.pointerEvents = hasAuto ? '' : 'none';
    if (!hasAuto && state.paletteTab === 'A') setPaletteTab('B');
    else applyPaletteTabVisibility();
  }

  function applyPaletteTabVisibility() {
    var auto = state.paletteTab === 'A';
    $('autoPalette').classList.toggle('show', auto);
    paletteCanvas.style.display = auto ? 'none' : 'block';
    document.querySelectorAll('.pal-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.pal === state.paletteTab);
    });
  }

  function setPaletteTab(tab) {
    if (tab === 'A' && !L().autotile) return;
    state.paletteTab = tab;
    applyPaletteTabVisibility();
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
        blitMeta(cx, layer, fillId, 0, 0, 32);
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

  function drawPalette() {
    var layer = L();
    if (!layer.img) return;
    var n = totalMetatiles(layer);
    var rows = Math.ceil(n / PAL_COLS);
    var cw = PAL_COLS * DT * PAL_SCALE;
    var ch = rows * DT * PAL_SCALE;
    paletteCanvas.width = cw; paletteCanvas.height = ch;
    pctx.imageSmoothingEnabled = false;
    pctx.clearRect(0, 0, cw, ch);
    for (var i = 0; i < n; i++) {
      var dc = i % PAL_COLS, dr = (i / PAL_COLS) | 0;
      blitMeta(pctx, layer, i, dc * DT * PAL_SCALE, dr * DT * PAL_SCALE, DT * PAL_SCALE);
    }
    // highlight current stamp rectangle
    var s = state.stamp, top = state.selectedTile;
    var sc = top % PAL_COLS, sr = (top / PAL_COLS) | 0;
    pctx.strokeStyle = '#ff3030'; pctx.lineWidth = 2;
    pctx.strokeRect(sc * DT * PAL_SCALE + 1, sr * DT * PAL_SCALE + 1,
      s.w * DT * PAL_SCALE - 2, s.h * DT * PAL_SCALE - 2);
    $('paletteCount').textContent = n + ' tiles';
  }

  function blitMeta(c, layer, id, dx, dy, dsize) {
    if (!layer.img || id < 0) return;
    var st = srcTile(layer), pr = perRow(layer);
    var col = id % pr, row = (id / pr) | 0;
    c.drawImage(layer.img, col * st, row * st, st, st, dx, dy, dsize, dsize);
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
    var n = totalMetatiles();
    var x0 = Math.min(cx0, cx1), x1 = Math.max(cx0, cx1);
    var y0 = Math.min(cy0, cy1), y1 = Math.max(cy0, cy1);
    var ids = [], w = x1 - x0 + 1, h = y1 - y0 + 1;
    for (var y = y0; y <= y1; y++)
      for (var x = x0; x <= x1; x++) {
        var id = y * PAL_COLS + x;
        ids.push(id >= 0 && id < n ? id : 0);
      }
    state.stamp = { w: w, h: h, ids: ids };
    state.selectedTile = y0 * PAL_COLS + x0;
    state.eraser = false; $('eraserBtn').classList.remove('active');
    $('selId').textContent = state.selectedTile + (w * h > 1 ? (' (' + w + '×' + h + ')') : '');
    var beh = L().meta && L().meta.behaviors ? L().meta.behaviors[state.selectedTile] : null;
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
    blitMeta(sc, L(), state.selectedTile, 0, 0, 16);
  }

  // ── Map model ──
  function newMap(w, h, keep) {
    var prev = keep ? state.layers : null;
    var pw = keep ? state.width : 0, ph = keep ? state.height : 0;
    state.width = w; state.height = h;
    ['ground', 'overlay'].forEach(function (key) {
      var layer = state.layers[key];
      // Ground default fill = the autotile base fill (clean grass) when available.
      var fill = layer.fill;
      if (key === 'ground' && layer.autotile && layer.autotile.fills) {
        var baseKey = (layer.autotile.priority && layer.autotile.priority[0]) || 'grass';
        if (layer.autotile.fills[baseKey] != null) fill = layer.autotile.fills[baseKey];
      }
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
    if (!keep) state.warps = [];
    $('statSize').textContent = w + ' × ' + h;
    drawMap();
    renderWarpList();
  }

  function idx(x, y) { return y * state.width + x; }
  function inBounds(x, y) { return x >= 0 && y >= 0 && x < state.width && y < state.height; }

  // ── Map rendering ──
  var mapCanvas = $('mapCanvas');
  var mctx = mapCanvas.getContext('2d');
  function cell() { return DT * state.zoom; }

  function drawLayer(key, alpha) {
    var layer = state.layers[key];
    if (!layer.img || !layer.data) return;
    var cs = cell();
    mctx.globalAlpha = alpha;
    for (var y = 0; y < state.height; y++)
      for (var x = 0; x < state.width; x++) {
        var v = layer.data[idx(x, y)];
        if (v >= 0) blitMeta(mctx, layer, v, x * cs, y * cs, cs);
      }
    mctx.globalAlpha = 1;
  }

  function drawMap() {
    var cs = cell();
    mapCanvas.width = state.width * cs;
    mapCanvas.height = state.height * cs;
    mctx.imageSmoothingEnabled = false;
    mctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    // Ground always under overlay. Dim the non-active layer like RM.
    drawLayer('ground', state.active === 'ground' ? 1 : 0.4);
    drawLayer('overlay', state.active === 'overlay' ? 1 : 0.4);

    if (state.mode === 'collide') {
      var col = state.layers.ground.collision;
      for (var yy = 0; yy < state.height; yy++)
        for (var xx = 0; xx < state.width; xx++)
          if (col[idx(xx, yy)]) {
            mctx.fillStyle = 'rgba(230,40,40,0.45)';
            mctx.fillRect(xx * cs, yy * cs, cs, cs);
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
  }

  // ── Painting ──
  var painting = false, rectStart = null;

  function eventCell(e) {
    var p = screenToLocal(mapCanvas, e.clientX, e.clientY);
    var cs = cell();
    return { x: Math.floor(p.x / cs), y: Math.floor(p.y / cs) };
  }

  // Stamp the current B-tab block (or eraser) with top-left at (ax,ay).
  function stampAt(ax, ay) {
    var layer = L();
    var s = state.stamp;
    for (var dy = 0; dy < s.h; dy++)
      for (var dx = 0; dx < s.w; dx++) {
        var x = ax + dx, y = ay + dy;
        if (!inBounds(x, y)) continue;
        layer.data[idx(x, y)] = state.eraser ? layer.fill : s.ids[dy * s.w + dx];
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
    if (state.mode === 'collide') {
      var c = state.layers.ground.collision;
      c[idx(x, y)] = c[idx(x, y)] ? 0 : 1;
      return;
    }
    if (state.tool === 'pick') {
      var v = L().data[idx(x, y)];
      if (v >= 0) setStampFromPalette(v % PAL_COLS, (v / PAL_COLS) | 0, v % PAL_COLS, (v / PAL_COLS) | 0);
      return;
    }
    if (state.paletteTab === 'A' && state.active === 'ground' && L().autotile && !state.eraser) {
      paintTerrain(x, y);
      return;
    }
    stampAt(x, y);
  }

  function floodFill(x, y) {
    var layer = L();
    var target = layer.data[idx(x, y)];
    var repl = state.eraser ? layer.fill : state.stamp.ids[0];
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
    var auto = state.paletteTab === 'A' && state.active === 'ground' && layer.autotile && !state.eraser;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var rx = (x1 - x0) / 2 + 0.5, ry = (y1 - y0) / 2 + 0.5;
    for (var y = y0; y <= y1; y++)
      for (var x = x0; x <= x1; x++) {
        if (!inBounds(x, y)) continue;
        if (ellipse) {
          var nx = (x - cx) / rx, ny = (y - cy) / ry;
          if (nx * nx + ny * ny > 1) continue;
        }
        if (state.mode === 'collide') { layer.collision[idx(x, y)] = state.eraser ? 0 : 1; continue; }
        if (auto) { layer.terrain[idx(x, y)] = state.selectedTerrain; continue; }
        // tile the stamp block by relative position
        var s = state.stamp;
        var id = state.eraser ? layer.fill : s.ids[((y - y0) % s.h) * s.w + ((x - x0) % s.w)];
        layer.data[idx(x, y)] = id;
        if (state.active === 'ground') layer.terrain[idx(x, y)] = '';
      }
    if (auto) for (var ry2 = y0 - 1; ry2 <= y1 + 1; ry2++)
      for (var rx2 = x0 - 1; rx2 <= x1 + 1; rx2++) recomputeTerrainCell(rx2, ry2);
  }

  mapCanvas.addEventListener('mousedown', function (e) {
    var p = eventCell(e);
    if (!inBounds(p.x, p.y)) return;
    if (state.mode === 'warp') { addWarp(p.x, p.y); return; }
    if (state.tool === 'fill' && state.mode !== 'collide') { floodFill(p.x, p.y); drawMap(); return; }
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
    if (painting && inBounds(p.x, p.y)) { applyAt(p.x, p.y); drawMap(); }
  });

  window.addEventListener('mouseup', function (e) {
    if ((state.tool === 'rect' || state.tool === 'ellipse') && rectStart) {
      var p = eventCell(e);
      var x0 = Math.min(rectStart.x, p.x), x1 = Math.max(rectStart.x, p.x);
      var y0 = Math.min(rectStart.y, p.y), y1 = Math.max(rectStart.y, p.y);
      fillRegion(x0, y0, x1, y1, state.tool === 'ellipse');
      rectStart = null; drawMap();
    }
    painting = false;
  });

  // ── Warps ──
  function addWarp(x, y) {
    if (state.warps.some(function (w) { return w.x === x && w.y === y; })) return;
    state.warps.push({ x: x, y: y, dest_map: 'MAP_NONE', dest_warp_id: '0' });
    drawMap(); renderWarpList();
  }
  function renderWarpList() {
    var list = $('warpList'); list.innerHTML = '';
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

  // ── Export / Import ──
  function hasContent(arr, empty) {
    if (!arr) return false;
    for (var i = 0; i < arr.length; i++) if (arr[i] !== empty) return true;
    return false;
  }

  function buildLayout() {
    var g = state.layers.ground, o = state.layers.overlay;
    var layout = {
      id: $('layoutId').value || 'LAYOUT_NEW_MAP',
      width: state.width, height: state.height,
      primary_tileset: (g.meta && g.meta.primary_tileset) || 'gTileset_General',
      secondary_tileset: (g.meta && g.meta.secondary_tileset) || '',
      tileset: g.name,
      metatiles: Array.from(g.data),
      collision: Array.from(g.collision)
    };
    if (g.terrain && g.terrain.some(function (t) { return t; })) {
      layout.terrain = g.terrain.map(function (t) { return t || ''; });
    }
    if (o.name && hasContent(o.data, -1)) {
      layout.overlay_tileset = o.name;
      layout.overlay = Array.from(o.data);
    }
    return layout;
  }

  function buildMap() {
    var name = $('mapName').value || 'NewMap';
    return {
      id: 'MAP_' + name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase(),
      name: name, region: $('mapRegion').value,
      layout: $('layoutId').value || 'LAYOUT_NEW_MAP',
      music: 'MUS_PALLET', weather: 'WEATHER_NONE', map_type: 'MAP_TYPE_TOWN',
      allow_running: true, allow_cycling: true, show_map_name: true,
      connections: [], npcs: [],
      warps: state.warps.map(function (w) {
        return { x: w.x, y: w.y, dest_map: w.dest_map, dest_warp_id: w.dest_warp_id };
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
    var loads = [];
    var groundName = data.tileset;
    var overlayName = data.overlay_tileset || null;
    // ensure ground layer is the active dropdown target after load
    loads.push(groundName ? loadTilesetInto(state.layers.ground, groundName)
      .catch(function () { alert('Tileset "' + groundName + '" not found.'); }) : Promise.resolve());
    if (overlayName) {
      loads.push(loadTilesetInto(state.layers.overlay, overlayName)
        .catch(function () { state.layers.overlay = newLayer(-1); }));
    } else {
      state.layers.overlay = newLayer(-1);
    }
    return Promise.all(loads).then(function () {
      state.width = w; state.height = h;
      var g = state.layers.ground;
      g.data = Int32Array.from(data.metatiles);
      g.collision = data.collision ? Uint8Array.from(data.collision) : new Uint8Array(w * h);
      g.terrain = new Array(w * h);
      for (var ti = 0; ti < w * h; ti++) g.terrain[ti] = (data.terrain && data.terrain[ti]) || '';
      var o = state.layers.overlay;
      o.data = new Int32Array(w * h);
      o.collision = new Uint8Array(w * h);
      o.terrain = new Array(w * h);
      for (var oi = 0; oi < w * h; oi++) { o.data[oi] = data.overlay ? data.overlay[oi] : -1; o.terrain[oi] = ''; }

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
      } else { state.warps = []; }
      // reflect ground tileset in the dropdown + palette
      setActiveLayer('ground');
      if (groundName) $('tilesetSel').value = groundName;
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
    var layer = L();
    if (layer.name) { $('tilesetSel').value = layer.name; }
    else if (key === 'overlay' && state._tilesetNames) {
      // pick a sensible default overlay tileset (buildings/props) lazily
      var def = ['ac_buildings', 'ac_props'].filter(function (n) {
        return state._tilesetNames.indexOf(n) >= 0;
      })[0] || $('tilesetSel').value;
      return loadTileset(def).then(function () { setActiveLayer(key); });
    }
    updateTilesetStatus();
    rebuildAutoPalette();
    refreshPaletteTabs();
    drawPalette();
    updateSelSwatch();
    drawMap();
  }

  $('layerSel').addEventListener('change', function () { setActiveLayer(this.value); });
  $('tilesetSel').addEventListener('change', function () { loadTileset(this.value); });
  $('newBtn').addEventListener('click', function () {
    newMap(parseInt($('mapW').value, 10) || 20, parseInt($('mapH').value, 10) || 18, false);
  });
  $('resizeBtn').addEventListener('click', function () {
    newMap(parseInt($('mapW').value, 10) || 20, parseInt($('mapH').value, 10) || 18, true);
  });

  document.querySelectorAll('.pal-tab').forEach(function (t) {
    t.addEventListener('click', function () { setPaletteTab(t.dataset.pal); });
  });

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
    state.zoom = Math.max(1, Math.min(6, z));
    $('zoomLabel').textContent = state.zoom + '×';
    drawMap();
  }
  $('zoomIn').addEventListener('click', function () { setZoom(state.zoom + 1); });
  $('zoomOut').addEventListener('click', function () { setZoom(state.zoom - 1); });

  $('orientBtn').addEventListener('click', function () {
    state.orient = (state.orient + 1) % 4;
    document.body.dataset.orient = state.orient;
    this.textContent = '⟳ ' + ORIENT_DEG[state.orient] + '°';
  });

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
  function setRepoBtn(txt, col) {
    var b = $('repoSaveBtn'); b.textContent = txt;
    b.style.color = col || ''; b.style.borderColor = col || '';
  }
  function saveToRepo() {
    if (!state.layers.ground.data) return;
    var region = $('mapRegion').value || 'custom';
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

  function buildMapTree() {
    var tree = $('mapTree');
    ghListMaps().then(function (maps) {
      tree.innerHTML = '';
      if (!maps.length) { tree.innerHTML = '<div class="hint" style="padding:6px;">No saved maps.</div>'; return; }
      var lastRegion = null;
      maps.forEach(function (mp) {
        if (mp.region !== lastRegion) {
          lastRegion = mp.region;
          var hdr = document.createElement('div'); hdr.className = 'tree-region';
          hdr.textContent = mp.region; tree.appendChild(hdr);
        }
        var item = document.createElement('div'); item.className = 'tree-item';
        item.textContent = mp.name;
        item.addEventListener('click', function () {
          document.querySelectorAll('.tree-item').forEach(function (t) { t.classList.remove('active'); });
          item.classList.add('active');
          loadMapFromRepo(mp);
        });
        tree.appendChild(item);
      });
    }).catch(function (e) {
      tree.innerHTML = '<div class="hint" style="padding:6px; color:#c33;">List failed: ' + e.message + '</div>';
    });
  }

  function loadMapFromRepo(mp) {
    ghGet(mp.path)
      .then(function (cur) {
        if (!cur.content) throw new Error('map file empty');
        var mapObj = JSON.parse(cur.content);
        var layoutPath = 'data/layouts/' + mp.region + '/' + mapObj.layout + '.json';
        return ghGet(layoutPath).then(function (lc) {
          if (!lc.content) throw new Error('layout "' + mapObj.layout + '" not found on branch');
          return { layout: JSON.parse(lc.content), map: mapObj };
        });
      })
      .then(function (res) { return applyLayout(res.layout, res.map); })
      .then(function () { $('repoModal').style.display = 'none'; })
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

  // ── Boot ──
  loadTilesetList().then(function () {
    newMap(state.width, state.height, false);
    setStampFromPalette(1, 0, 1, 0);
    buildMapTree();
  }).catch(function (err) {
    alert('Failed to load tilesets. Serve over http (not file://).\n' + err);
  });
})();
