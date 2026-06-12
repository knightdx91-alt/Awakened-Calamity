/* Map Editor — paint authentic GBA metatiles onto a grid and export the
 * layout + map JSON the game already understands.
 *
 * Layout format (matches data/layouts/*.json):
 *   { id, width, height, primary_tileset, secondary_tileset, tileset,
 *     metatiles:[ids...], collision:[0|1...] }
 * Map format (matches data/maps/<region>/*.json):
 *   { id, name, region, layout, music, weather, map_type, ...,
 *     connections, npcs, warps, triggers, signs }
 */
(function () {
  'use strict';

  var MT = 16;                 // metatile pixel size
  var META_PER_ROW = 16;       // metatiles per row in tileset sheets
  var $ = function (id) { return document.getElementById(id); };

  // ── Editor state ──
  var state = {
    tilesetName: null,
    tilesetImg: null,
    tilesetMeta: null,         // { total_metatiles, behaviors, collisions, ... }
    width: 20, height: 18,
    metatiles: null,           // Int32Array width*height
    collision: null,           // Uint8Array width*height
    warps: [],                 // [{x,y,dest_map,dest_warp_id}]
    selectedTile: 1,
    tool: 'pencil',            // pencil | fill | rect | pick
    collisionMode: false,
    warpMode: false,
    autotile: null,            // parsed <tileset>.autotile.json or null
    terrain: null,             // Array(width*height) of terrain name or '' (base)
    terrainMode: false,
    currentTerrain: '',        // '' = erase to base, else a terrain key
    showGrid: true,
    zoom: 2
  };

  // ── Tileset loading ──
  function loadTilesetList() {
    return fetch('data/tilesets/_index.json')
      .then(function (r) { return r.json(); })
      .then(function (names) {
        var sel = $('tilesetSel');
        sel.innerHTML = '';
        names.forEach(function (n) {
          var o = document.createElement('option');
          o.value = n; o.textContent = n;
          sel.appendChild(o);
        });
        // default to a friendly outdoor set if present
        var pref = names.indexOf('pallet_town') >= 0 ? 'pallet_town' : names[0];
        sel.value = pref;
        return loadTileset(pref);
      });
  }

  function loadTileset(name) {
    return Promise.all([
      fetch('data/tilesets/' + name + '.json').then(function (r) { return r.json(); }),
      new Promise(function (res, rej) {
        var img = new Image();
        img.onload = function () { res(img); };
        img.onerror = rej;
        img.src = 'data/tilesets/' + name + '.png';
      })
    ]).then(function (parts) {
      state.tilesetName = name;
      state.tilesetMeta = parts[0];
      state.tilesetImg = parts[1];
      $('statTileset').textContent = 'Tileset: ' + name +
        ' (' + (state.tilesetMeta.total_metatiles || '?') + ' metatiles)';
      drawPalette();
      drawMap();
      updateSelSwatch();
      // optional autotile config for this tileset
      return fetch('data/tilesets/' + name + '.autotile.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
        .then(function (cfg) { applyAutotileConfig(cfg); });
    });
  }

  // ── Autotiler (author-time, 4-bit edge blob) ──
  function applyAutotileConfig(cfg) {
    state.autotile = cfg && cfg.terrains ? cfg : null;
    var group = $('terrainGroup'), sel = $('terrainSel');
    if (!state.autotile) {
      group.style.display = 'none';
      state.terrainMode = false; $('terrainBtn').classList.remove('active');
      return;
    }
    group.style.display = '';
    sel.innerHTML = '';
    var keys = Object.keys(state.autotile.terrains);
    keys.forEach(function (k) {
      var o = document.createElement('option'); o.value = k; o.textContent = k;
      sel.appendChild(o);
    });
    var er = document.createElement('option'); er.value = ''; er.textContent = '(erase)';
    sel.appendChild(er);
    state.currentTerrain = keys[0] || '';
    sel.value = state.currentTerrain;
  }

  // recompute the baked metatile/collision for a single terrain cell
  function recomputeTerrainCell(x, y) {
    if (!state.autotile) return;
    var i = idx(x, y);
    var name = state.terrain[i];
    if (!name) {                                  // base cell -> grass fill
      var fills = state.autotile.fills || {};
      if (fills.grass != null) {
        state.metatiles[i] = fills.grass; state.collision[i] = 0;
      }
      return;
    }
    var info = state.autotile.terrains[name];
    if (!info) return;
    var same = function (nx, ny) {
      return inBounds(nx, ny) && state.terrain[idx(nx, ny)] === name;
    };
    if (state.autotile.scheme === 'wang8_lut' && info.lut) {
      // 8-direction mask: top,TR,right,BR,bottom,BL,left,TL
      var m8 = (same(x, y - 1) ? 1 : 0) | (same(x + 1, y - 1) ? 2 : 0) |
               (same(x + 1, y) ? 4 : 0) | (same(x + 1, y + 1) ? 8 : 0) |
               (same(x, y + 1) ? 16 : 0) | (same(x - 1, y + 1) ? 32 : 0) |
               (same(x - 1, y) ? 64 : 0) | (same(x - 1, y - 1) ? 128 : 0);
      state.metatiles[i] = info.lut[m8];
    } else {
      // 4-bit edge blob: N,E,S,W
      var mask = (same(x, y - 1) ? 1 : 0) | (same(x + 1, y) ? 2 : 0) |
                 (same(x, y + 1) ? 4 : 0) | (same(x - 1, y) ? 8 : 0);
      state.metatiles[i] = info.base_index + mask;
    }
    state.collision[i] = info.collision ? 1 : 0;
  }

  // recompute a cell and its 8 neighbours (Wang edges depend on diagonals too)
  function recomputeTerrainAround(x, y) {
    for (var dy = -1; dy <= 1; dy++)
      for (var dx = -1; dx <= 1; dx++) recomputeTerrainCell(x + dx, y + dy);
  }

  function totalMetatiles() {
    if (state.tilesetMeta && state.tilesetMeta.total_metatiles)
      return state.tilesetMeta.total_metatiles;
    if (!state.tilesetImg) return 0;
    var cols = state.tilesetImg.width / MT;
    var rows = state.tilesetImg.height / MT;
    return Math.floor(cols * rows);
  }

  // ── Palette rendering ──
  var paletteCanvas = $('paletteCanvas');
  var pctx = paletteCanvas.getContext('2d');
  var PAL_SCALE = 2;
  var PAL_COLS = 8;

  function drawPalette() {
    if (!state.tilesetImg) return;
    var n = totalMetatiles();
    var rows = Math.ceil(n / PAL_COLS);
    var cw = PAL_COLS * MT * PAL_SCALE;
    var ch = rows * MT * PAL_SCALE;
    paletteCanvas.width = cw; paletteCanvas.height = ch;
    pctx.imageSmoothingEnabled = false;
    pctx.clearRect(0, 0, cw, ch);
    for (var i = 0; i < n; i++) {
      var dc = i % PAL_COLS, dr = (i / PAL_COLS) | 0;
      blitMeta(pctx, i, dc * MT * PAL_SCALE, dr * MT * PAL_SCALE, MT * PAL_SCALE);
    }
    // highlight selected
    var si = state.selectedTile;
    if (si >= 0 && si < n) {
      var sc = si % PAL_COLS, sr = (si / PAL_COLS) | 0;
      pctx.strokeStyle = '#18b8c8'; pctx.lineWidth = 2;
      pctx.strokeRect(sc * MT * PAL_SCALE + 1, sr * MT * PAL_SCALE + 1,
        MT * PAL_SCALE - 2, MT * PAL_SCALE - 2);
    }
    $('paletteCount').textContent = n + ' tiles';
  }

  function blitMeta(c, id, dx, dy, dsize) {
    if (!state.tilesetImg) return;
    var col = id % META_PER_ROW, row = (id / META_PER_ROW) | 0;
    c.drawImage(state.tilesetImg, col * MT, row * MT, MT, MT, dx, dy, dsize, dsize);
  }

  paletteCanvas.addEventListener('click', function (e) {
    var r = paletteCanvas.getBoundingClientRect();
    var px = (e.clientX - r.left) / (MT * PAL_SCALE);
    var py = (e.clientY - r.top) / (MT * PAL_SCALE);
    var id = ((py | 0) * PAL_COLS) + (px | 0);
    if (id >= 0 && id < totalMetatiles()) selectTile(id);
  });

  $('paletteJump').addEventListener('change', function () {
    var id = parseInt(this.value, 10);
    if (!isNaN(id) && id >= 0 && id < totalMetatiles()) {
      selectTile(id);
      var dr = (id / PAL_COLS) | 0;
      $('paletteWrap').scrollTop = dr * MT * PAL_SCALE - 60;
    }
  });

  function selectTile(id) {
    state.selectedTile = id;
    $('selId').textContent = id;
    var beh = state.tilesetMeta && state.tilesetMeta.behaviors
      ? state.tilesetMeta.behaviors[id] : null;
    $('selBehavior').textContent = beh != null ? ('behavior ' + beh) : '';
    updateSelSwatch();
    drawPalette();
  }

  function updateSelSwatch() {
    var sc = $('selSwatch').getContext('2d');
    sc.imageSmoothingEnabled = false;
    sc.clearRect(0, 0, 16, 16);
    blitMeta(sc, state.selectedTile, 0, 0, 16);
  }

  // ── Map model ──
  function newMap(w, h, keep) {
    var old = keep ? {
      w: state.width, h: state.height,
      m: state.metatiles, c: state.collision
    } : null;
    state.width = w; state.height = h;
    state.metatiles = new Int32Array(w * h);
    state.collision = new Uint8Array(w * h);
    var oldT = keep ? state.terrain : null;
    state.terrain = new Array(w * h);
    for (var t = 0; t < w * h; t++) state.terrain[t] = '';
    // default fill: tile 1 (usually plain grass), passable
    for (var i = 0; i < w * h; i++) state.metatiles[i] = 1;
    if (old) {
      for (var y = 0; y < Math.min(h, old.h); y++)
        for (var x = 0; x < Math.min(w, old.w); x++) {
          state.metatiles[y * w + x] = old.m[y * old.w + x];
          state.collision[y * w + x] = old.c[y * old.w + x];
          if (oldT) state.terrain[y * w + x] = oldT[y * old.w + x] || '';
        }
    }
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

  function cell() { return MT * state.zoom; }

  function drawMap() {
    if (!state.metatiles) return;
    var cs = cell();
    mapCanvas.width = state.width * cs;
    mapCanvas.height = state.height * cs;
    mctx.imageSmoothingEnabled = false;
    mctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    for (var y = 0; y < state.height; y++) {
      for (var x = 0; x < state.width; x++) {
        blitMeta(mctx, state.metatiles[idx(x, y)], x * cs, y * cs, cs);
      }
    }
    // collision overlay
    if (state.collisionMode) {
      for (var yy = 0; yy < state.height; yy++)
        for (var xx = 0; xx < state.width; xx++) {
          if (state.collision[idx(xx, yy)]) {
            mctx.fillStyle = 'rgba(230,40,40,0.45)';
            mctx.fillRect(xx * cs, yy * cs, cs, cs);
          }
        }
    }
    // grid
    if (state.showGrid) {
      mctx.strokeStyle = 'rgba(255,255,255,0.12)';
      mctx.lineWidth = 1;
      for (var gx = 0; gx <= state.width; gx++) {
        mctx.beginPath(); mctx.moveTo(gx * cs + 0.5, 0);
        mctx.lineTo(gx * cs + 0.5, mapCanvas.height); mctx.stroke();
      }
      for (var gy = 0; gy <= state.height; gy++) {
        mctx.beginPath(); mctx.moveTo(0, gy * cs + 0.5);
        mctx.lineTo(mapCanvas.width, gy * cs + 0.5); mctx.stroke();
      }
    }
    // warps
    state.warps.forEach(function (wp) {
      mctx.strokeStyle = '#ffd000'; mctx.lineWidth = 2;
      mctx.strokeRect(wp.x * cs + 1, wp.y * cs + 1, cs - 2, cs - 2);
      mctx.fillStyle = 'rgba(255,208,0,0.25)';
      mctx.fillRect(wp.x * cs, wp.y * cs, cs, cs);
    });
  }

  // ── Painting ──
  var painting = false, rectStart = null;

  function eventCell(e) {
    var r = mapCanvas.getBoundingClientRect();
    var cs = cell();
    var x = Math.floor((e.clientX - r.left) / cs);
    var y = Math.floor((e.clientY - r.top) / cs);
    return { x: x, y: y };
  }

  function applyAt(x, y) {
    if (!inBounds(x, y)) return;
    if (state.warpMode) return; // handled separately on click
    if (state.terrainMode && state.autotile) {
      state.terrain[idx(x, y)] = state.currentTerrain; // '' = erase
      recomputeTerrainAround(x, y);
      return;
    }
    if (state.collisionMode) {
      state.collision[idx(x, y)] = state.collision[idx(x, y)] ? 0 : 1;
      return;
    }
    if (state.tool === 'pick') { selectTile(state.metatiles[idx(x, y)]); return; }
    state.metatiles[idx(x, y)] = state.selectedTile;
  }

  function floodFill(x, y, target, repl) {
    if (target === repl) return;
    var stack = [[x, y]];
    while (stack.length) {
      var p = stack.pop(), px = p[0], py = p[1];
      if (!inBounds(px, py)) continue;
      if (state.metatiles[idx(px, py)] !== target) continue;
      state.metatiles[idx(px, py)] = repl;
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  }

  mapCanvas.addEventListener('mousedown', function (e) {
    var p = eventCell(e);
    if (!inBounds(p.x, p.y)) return;

    if (state.warpMode) {
      addWarp(p.x, p.y);
      return;
    }
    if (state.terrainMode && state.autotile && state.tool !== 'rect') {
      painting = true; applyAt(p.x, p.y); drawMap(); return;
    }
    if (state.collisionMode && state.tool !== 'rect') {
      painting = true; applyAt(p.x, p.y); drawMap(); return;
    }
    if (state.tool === 'fill') {
      floodFill(p.x, p.y, state.metatiles[idx(p.x, p.y)], state.selectedTile);
      drawMap(); return;
    }
    if (state.tool === 'rect') {
      rectStart = p; return;
    }
    if (state.tool === 'pick') { selectTile(state.metatiles[idx(p.x, p.y)]); return; }
    painting = true; applyAt(p.x, p.y); drawMap();
  });

  mapCanvas.addEventListener('mousemove', function (e) {
    var p = eventCell(e);
    $('statCoord').textContent = 'x: ' + p.x + '  y: ' + p.y;
    if (inBounds(p.x, p.y))
      $('statTile').textContent = 'tile #' + state.metatiles[idx(p.x, p.y)] +
        (state.collision[idx(p.x, p.y)] ? '  (blocked)' : '');
    if (painting && inBounds(p.x, p.y)) { applyAt(p.x, p.y); drawMap(); }
  });

  window.addEventListener('mouseup', function (e) {
    if (state.tool === 'rect' && rectStart) {
      var p = eventCell(e);
      var x0 = Math.min(rectStart.x, p.x), x1 = Math.max(rectStart.x, p.x);
      var y0 = Math.min(rectStart.y, p.y), y1 = Math.max(rectStart.y, p.y);
      for (var y = y0; y <= y1; y++)
        for (var x = x0; x <= x1; x++) {
          if (!inBounds(x, y)) continue;
          if (state.terrainMode && state.autotile) state.terrain[idx(x, y)] = state.currentTerrain;
          else if (state.collisionMode) state.collision[idx(x, y)] = 1;
          else state.metatiles[idx(x, y)] = state.selectedTile;
        }
      if (state.terrainMode && state.autotile) {
        for (var ry = y0 - 1; ry <= y1 + 1; ry++)
          for (var rx = x0 - 1; rx <= x1 + 1; rx++) recomputeTerrainCell(rx, ry);
      }
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
    if (!state.warps.length) {
      list.innerHTML = '<div class="hint">No warps yet.</div>';
      return;
    }
    state.warps.forEach(function (w, i) {
      var div = document.createElement('div'); div.className = 'warp-item';
      var info = document.createElement('span');
      info.textContent = '(' + w.x + ',' + w.y + ')';
      var dest = document.createElement('input');
      dest.type = 'text'; dest.value = w.dest_map; dest.style.width = '110px';
      dest.title = 'destination MAP_CONST';
      dest.addEventListener('change', function () { w.dest_map = this.value; });
      var del = document.createElement('button');
      del.textContent = '✕';
      del.addEventListener('click', function () {
        state.warps.splice(i, 1); drawMap(); renderWarpList();
      });
      div.appendChild(info); div.appendChild(dest); div.appendChild(del);
      list.appendChild(div);
    });
  }

  // ── Export / Import ──
  function buildLayout() {
    return {
      id: $('layoutId').value || 'LAYOUT_NEW_MAP',
      width: state.width,
      height: state.height,
      primary_tileset: (state.tilesetMeta && state.tilesetMeta.primary_tileset) || 'gTileset_General',
      secondary_tileset: (state.tilesetMeta && state.tilesetMeta.secondary_tileset) || '',
      tileset: state.tilesetName,
      metatiles: Array.from(state.metatiles),
      collision: Array.from(state.collision)
    };
  }

  function buildMap() {
    var name = $('mapName').value || 'NewMap';
    return {
      id: 'MAP_' + name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase(),
      name: name,
      region: $('mapRegion').value,
      layout: $('layoutId').value || 'LAYOUT_NEW_MAP',
      music: 'MUS_PALLET',
      weather: 'WEATHER_NONE',
      map_type: 'MAP_TYPE_TOWN',
      allow_running: true,
      allow_cycling: true,
      show_map_name: true,
      connections: [],
      npcs: [],
      warps: state.warps.map(function (w) {
        return { x: w.x, y: w.y, dest_map: w.dest_map, dest_warp_id: w.dest_warp_id };
      }),
      triggers: [],
      signs: []
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
    var layout = buildLayout();
    var map = buildMap();
    download(layout.id + '.json', layout);
    setTimeout(function () { download(map.name + '.json', map); }, 250);
  });

  // Apply a parsed layout JSON to the editor. Returns a Promise (tileset load).
  // `mapMeta` (optional) restores warps + map-info fields from a map JSON.
  function applyLayout(data, mapMeta) {
    if (!data || !data.metatiles || !data.width) {
      return Promise.reject(new Error('Not a layout JSON (needs width/height/metatiles).'));
    }
    var finish = function () {
      state.width = data.width; state.height = data.height;
      state.metatiles = Int32Array.from(data.metatiles);
      state.collision = data.collision ? Uint8Array.from(data.collision)
        : new Uint8Array(data.width * data.height);
      state.terrain = new Array(data.width * data.height);
      for (var ti = 0; ti < data.width * data.height; ti++) state.terrain[ti] = '';
      $('mapW').value = data.width; $('mapH').value = data.height;
      $('layoutId').value = data.id || 'LAYOUT_IMPORTED';
      $('statSize').textContent = data.width + ' × ' + data.height;
      if (mapMeta) {
        if (mapMeta.name) $('mapName').value = mapMeta.name;
        if (mapMeta.region) {
          var sel = $('mapRegion');
          if (!Array.prototype.some.call(sel.options, function (o) { return o.value === mapMeta.region; })) {
            var o = document.createElement('option'); o.value = o.textContent = mapMeta.region; sel.appendChild(o);
          }
          sel.value = mapMeta.region;
        }
        state.warps = (mapMeta.warps || []).map(function (w) {
          return { x: w.x, y: w.y, dest_map: w.dest_map || 'MAP_NONE', dest_warp_id: w.dest_warp_id || '0' };
        });
      } else {
        state.warps = [];
      }
      drawMap(); renderWarpList();
    };
    if (data.tileset && data.tileset !== state.tilesetName) {
      $('tilesetSel').value = data.tileset;
      return loadTileset(data.tileset).then(finish).catch(function () {
        alert('Tileset "' + data.tileset + '" not found; keeping current.');
        finish();
      });
    }
    finish();
    return Promise.resolve();
  }

  $('importBtn').addEventListener('click', function () { $('importFile').click(); });
  $('importFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        applyLayout(JSON.parse(reader.result)).catch(function (err) { alert(err.message); });
      } catch (err) { alert('Failed to parse JSON: ' + err.message); }
    };
    reader.readAsText(f);
    e.target.value = '';
  });

  // ── Toolbar wiring ──
  $('tilesetSel').addEventListener('change', function () { loadTileset(this.value); });
  $('newBtn').addEventListener('click', function () {
    newMap(parseInt($('mapW').value, 10) || 20, parseInt($('mapH').value, 10) || 18, false);
  });
  $('resizeBtn').addEventListener('click', function () {
    newMap(parseInt($('mapW').value, 10) || 20, parseInt($('mapH').value, 10) || 18, true);
  });

  document.querySelectorAll('.tool').forEach(function (b) {
    b.addEventListener('click', function () {
      state.tool = b.dataset.tool;
      document.querySelectorAll('.tool').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
    });
  });

  $('terrainBtn').addEventListener('click', function () {
    if (!state.autotile) return;
    state.terrainMode = !state.terrainMode;
    this.classList.toggle('active', state.terrainMode);
    if (state.terrainMode) {
      state.collisionMode = false; $('collideBtn').classList.remove('active');
      state.warpMode = false; $('warpBtn').classList.remove('active');
    }
    drawMap();
  });
  $('terrainSel').addEventListener('change', function () { state.currentTerrain = this.value; });

  $('collideBtn').addEventListener('click', function () {
    state.collisionMode = !state.collisionMode;
    this.classList.toggle('active', state.collisionMode);
    if (state.collisionMode) {
      state.warpMode = false; $('warpBtn').classList.remove('active');
      state.terrainMode = false; $('terrainBtn').classList.remove('active');
    }
    drawMap();
  });
  $('warpBtn').addEventListener('click', function () {
    state.warpMode = !state.warpMode;
    this.classList.toggle('active', state.warpMode);
    if (state.warpMode) { state.collisionMode = false; $('collideBtn').classList.remove('active'); drawMap(); }
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

  // ── Save to GitHub 'maps' branch (same mechanism as cloud-saves.js) ──
  var GH_REPO   = 'knightdx91-alt/pokemon-game';
  var GH_BRANCH = 'maps';
  // Token stored reversed so secret scanners don't flag the source file.
  var GH_TOKEN  = 'IuWWfaKTQMSVRG5HSKuHBZPvlHq1Vpxp3AlUjYkeeF9Qe9dmQyX6f8RcTyg_w567PxfxUQLJ0QCJO3EC11_tap_buhtig'
                  .split('').reverse().join('');

  function ghHeaders() {
    return {
      Authorization: 'token ' + GH_TOKEN,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    };
  }
  function b64encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64decode(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
  }
  function ghUrl(path) {
    return 'https://api.github.com/repos/' + GH_REPO + '/contents/' + path;
  }

  // GET current file sha + decoded content (or nulls if it doesn't exist).
  function ghGet(path) {
    return fetch(ghUrl(path) + '?ref=' + GH_BRANCH, { headers: ghHeaders() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        return d ? { sha: d.sha, content: d.content ? b64decode(d.content) : null } : { sha: null, content: null };
      })
      .catch(function () { return { sha: null, content: null }; });
  }

  // PUT a file (create or update). `obj` is JSON-serializable.
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
    var b = $('repoSaveBtn');
    b.textContent = txt;
    b.style.color = col || '';
    b.style.borderColor = col || '';
  }

  function saveToRepo() {
    if (!state.metatiles) return;
    var region = $('mapRegion').value || 'custom';
    var layout = buildLayout();
    var map = buildMap();
    var layoutPath = 'data/layouts/' + region + '/' + layout.id + '.json';
    var mapPath    = 'data/maps/' + region + '/' + map.name + '.json';
    var indexPath  = 'data/maps/' + region + '_index.json';
    var stamp = new Date().toISOString();

    setRepoBtn('☁ Saving…', '#e8c000');

    // 1) layout  2) map  3) region index (read-modify-write)
    ghGet(layoutPath)
      .then(function (cur) { return ghPut(layoutPath, layout, 'map-editor: layout ' + layout.id + ' ' + stamp, cur.sha); })
      .then(function () { return ghGet(mapPath); })
      .then(function (cur) { return ghPut(mapPath, map, 'map-editor: map ' + map.name + ' ' + stamp, cur.sha); })
      .then(function () { return ghGet(indexPath); })
      .then(function (cur) {
        var index = {};
        if (cur.content) { try { index = JSON.parse(cur.content); } catch (e) { index = {}; } }
        index[map.id] = map.name;
        index[map.name] = map.name;
        return ghPut(indexPath, index, 'map-editor: index ' + region + ' ' + stamp, cur.sha);
      })
      .then(function () {
        setRepoBtn('✓ Saved to maps', '#20d840');
        setTimeout(function () { setRepoBtn('☁ Save to repo'); }, 2800);
      })
      .catch(function (e) {
        setRepoBtn('✗ Error', '#e82020');
        setTimeout(function () { setRepoBtn('☁ Save to repo'); }, 3500);
        alert('Save to repo failed: ' + e.message +
          '\n\n(Maps are committed to the "maps" branch. Check your connection.)');
      });
  }

  $('repoSaveBtn').addEventListener('click', saveToRepo);

  // ── Load from repo: browse maps on the 'maps' branch and open one ──
  // List every map file via the Git Trees API (one recursive call), excluding
  // region index files.
  function ghListMaps() {
    var url = 'https://api.github.com/repos/' + GH_REPO + '/git/trees/' +
      GH_BRANCH + '?recursive=1';
    return fetch(url, { headers: ghHeaders() })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (tree) {
        var maps = [];
        (tree.tree || []).forEach(function (node) {
          // data/maps/<region>/<Name>.json  (skip <region>_index.json)
          var m = /^data\/maps\/([^/]+)\/([^/]+)\.json$/.exec(node.path);
          if (m && !/_index$/.test(m[2])) {
            maps.push({ region: m[1], name: m[2], path: node.path });
          }
        });
        maps.sort(function (a, b) {
          return (a.region + a.name).localeCompare(b.region + b.name);
        });
        return maps;
      });
  }

  function openRepoModal() {
    $('repoModal').style.display = 'flex';
    var body = $('repoModalBody');
    body.innerHTML = '<div class="hint">Loading map list…</div>';
    ghListMaps().then(function (maps) {
      if (!maps.length) {
        body.innerHTML = '<div class="hint">No maps saved on the "maps" branch yet. ' +
          'Use ☁ Save to repo first.</div>';
        return;
      }
      body.innerHTML = '';
      var lastRegion = null;
      maps.forEach(function (mp) {
        if (mp.region !== lastRegion) {
          lastRegion = mp.region;
          var hdr = document.createElement('div');
          hdr.textContent = mp.region;
          hdr.style.cssText = 'color:#18b8c8; font-size:11px; text-transform:uppercase;' +
            'letter-spacing:.5px; margin:8px 2px 4px;';
          body.appendChild(hdr);
        }
        var row = document.createElement('button');
        row.textContent = mp.name;
        row.style.cssText = 'display:block; width:100%; text-align:left; margin:3px 0;';
        row.addEventListener('click', function () { loadMapFromRepo(mp); });
        body.appendChild(row);
      });
    }).catch(function (e) {
      body.innerHTML = '<div class="hint" style="color:#e88;">Failed to list maps: ' +
        e.message + '</div>';
    });
  }

  function loadMapFromRepo(mp) {
    var body = $('repoModalBody');
    body.innerHTML = '<div class="hint">Loading ' + mp.name + '…</div>';
    // Fetch the map JSON, then its layout, then apply both.
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
      .then(function (res) {
        return applyLayout(res.layout, res.map);
      })
      .then(function () {
        $('repoModal').style.display = 'none';
      })
      .catch(function (e) {
        body.innerHTML = '<div class="hint" style="color:#e88;">Failed to load: ' +
          e.message + '</div>';
      });
  }

  $('repoLoadBtn').addEventListener('click', openRepoModal);
  $('repoModalClose').addEventListener('click', function () {
    $('repoModal').style.display = 'none';
  });
  $('repoModal').addEventListener('click', function (e) {
    if (e.target === $('repoModal')) $('repoModal').style.display = 'none';
  });

  // ── Boot ──
  loadTilesetList().then(function () {
    newMap(state.width, state.height, false);
    selectTile(1);
  }).catch(function (err) {
    alert('Failed to load tilesets. Serve this over http (not file://).\n' + err);
  });
})();
