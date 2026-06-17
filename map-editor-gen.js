/* map-editor-gen.js — in-browser map generator for the editor.
 *
 * A JS port of tools/mapgen.py + tools/mapgen_indoor.py. Builds the SAME layout
 * object the Python tools write (vt_ground / town_props for outside; rtp_*_ground /
 * dun_props|int_props for indoor) so the editor's applyLayout() can drop a freshly
 * generated map straight onto the canvas. Asset metadata (gid maps, autotile LUTs,
 * tile counts) is fetched from the committed JSON; the art lives in the tilesets.
 *
 * Usage:  MapGen.generate({archetype:'town', name:'Riverbend', w:50, h:50, seed:7})
 *           -> Promise<{layout, map}>
 */
(function () {
  'use strict';
  var T = 32;

  // ---- seeded RNG (mulberry32) ----
  function RNG(seed) {
    var a = (seed >>> 0) || 1;
    function next() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      rnd: next,
      randint: function (lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
      choice: function (arr) { return arr[Math.floor(next() * arr.length)]; },
    };
  }

  function fetchJSON(path) {
    return fetch(path + '?b=' + Date.now(), { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('fetch ' + path); return r.json();
    });
  }

  var ROOFS = ['orange', 'brown', 'green', 'blue', 'red', 'gold', 'sage'];
  var WALLS = ['stone', 'brick', 'block', 'plank', 'log', 'thatch', 'white'];
  var FLOWERS = ['flower_w', 'flower_r', 'flower_p', 'flower_y'];
  var DIRS = [[0, -1, 1], [1, -1, 2], [1, 0, 4], [1, 1, 8], [0, 1, 16], [-1, 1, 32], [-1, 0, 64], [-1, -1, 128]];

  // ============================ outside palette ============================
  function loadOutside() {
    return Promise.all([
      fetchJSON('data/tilesets/town_props.gid.json'),
      fetchJSON('data/tilesets/vt_ground.json'),
      fetchJSON('data/tilesets/rtp_outside_ground.autotile.json'),
      fetchJSON('data/tilesets/rtp_outside_ground.json'),
      fetchJSON('data/tilesets/rtp_outside_water.autotile.json'),
    ]).then(function (r) {
      var gid = r[0], baseN = r[1].total_metatiles, gcfg = r[2], gcount = r[3].total_metatiles, wcfg = r[4];
      var LUT = {
        dirt: gcfg.terrains.dirt.lut, cobble: gcfg.terrains.cobble.lut, road: gcfg.terrains.road.lut,
        water: wcfg.terrains.water.lut.map(function (v) { return gcount + (v - 1); }),
      };
      return { gid: gid, baseN: baseN, LUT: LUT, propsN: Object.keys(gid).length };
    });
  }

  function Builder(w, h, seed, asset) {
    this.W = w; this.H = h; this.r = RNG(seed); this.a = asset;
    this.terr = []; for (var y = 0; y < h; y++) { var row = []; for (var x = 0; x < w; x++) row.push('grass'); this.terr.push(row); }
    this.over = new Array(w * h).fill(-1);
    this.upper = new Array(w * h).fill(-1);   // Layer 3 (drawn above the player)
    this.coll = new Array(w * h).fill(0);
    this.events = [];
    this.PRI = { grass: 0, dirt: 1, cobble: 2, road: 2, water: 3 };
  }
  Builder.prototype.inb = function (x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; };
  Builder.prototype.setp = function (x, y, name, block) {
    if (!this.inb(x, y)) return;
    var g = this.a.gid[name]; if (g == null) return;
    this.over[y * this.W + x] = g;
    if (block !== false) this.coll[y * this.W + x] = 1;
  };
  Builder.prototype.setterr = function (x, y, t) {
    if (this.inb(x, y) && this.terr[y][x] !== 'water') this.terr[y][x] = t;
  };
  Builder.prototype.empty = function (x, y) {
    return this.inb(x, y) && this.over[y * this.W + x] === -1 && !this.coll[y * this.W + x];
  };
  Builder.prototype.rectTerr = function (x0, y0, x1, y1, t) {
    for (var y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (var x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.setterr(x, y, t);
  };
  Builder.prototype.pond = function (cx, cy, rx, ry) {
    for (var y = 0; y < this.H; y++) for (var x = 0; x < this.W; x++) {
      var d = Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2);
      if (d <= 1.0 + (this.r.rnd() * 0.4 - 0.18) && this.inb(x, y)) {
        this.terr[y][x] = 'water'; this.coll[y * this.W + x] = 1;
      }
    }
  };
  Builder.prototype.path = function (x0, y0, x1, y1, t, width, wander, overgrow) {
    width = width || 1; wander = wander == null ? 0.5 : wander; overgrow = overgrow || 0;
    var horiz = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
    var x = x0, y = y0, guard = 0, self = this;
    function brush(bx, by) {
      for (var wdt = 0; wdt < width; wdt++) {
        var ax = horiz ? bx : bx + wdt, ay = horiz ? by + wdt : by;
        if (self.r.rnd() >= overgrow) self.setterr(ax, ay, t);
      }
    }
    while ((x !== x1 || y !== y1) && guard < (this.W + this.H) * 4) {
      guard++; brush(x, y);
      var stepx = x !== x1 && (y === y1 || this.r.rnd() < 0.5);
      if (stepx) x += x1 > x ? 1 : -1; else if (y !== y1) y += y1 > y ? 1 : -1;
      if (this.r.rnd() < wander) {
        if (horiz) brush(x, Math.max(0, Math.min(this.H - 1, y + (this.r.rnd() < 0.5 ? -1 : 1))));
        else brush(Math.max(0, Math.min(this.W - 1, x + (this.r.rnd() < 0.5 ? -1 : 1))), y);
      }
    }
    brush(x1, y1);
  };
  Builder.prototype.setu = function (x, y, name) {   // Layer 3 — above player, never blocks
    if (!this.inb(x, y)) return;
    var g = this.a.gid[name]; if (g == null) return;
    this.upper[y * this.W + x] = g;
  };
  Builder.prototype.grid9 = function (prefix, x0, y0, w, h, up) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var vy = j === 0 ? 't' : (j === h - 1 ? 'b' : '');
      var vx = i === 0 ? 'l' : (i === w - 1 ? 'r' : '');
      var nm = prefix + '_' + ((vy + vx) || 'f');
      if (up) this.setu(x0 + i, y0 + j, nm); else this.setp(x0 + i, y0 + j, nm);
    }
  };
  Builder.prototype.house = function (wx, wy, ww, wh, roof, wall) {
    var rh = (ww >= 6 || wh >= 3) ? 3 : 2;
    this.grid9('roof_' + roof, wx - 1, wy - rh, ww + 2, rh, true);   // roof → Layer 3 (walk under the eaves)
    this.grid9('wall_' + wall, wx, wy, ww, wh);
    var fy = wy + wh - 1, dxr = (ww / 2) | 0, doorX = wx + dxr;
    this.setp(doorX, fy, 'wall_' + wall + '_door'); this.events.push({ x: doorX, y: fy });
    [dxr - 1, dxr + 1].forEach(function (wxi) {
      if (wxi > 0 && wxi < ww - 1 && wxi !== dxr) this.setp(wx + wxi, fy, 'wall_' + wall + '_window');
    }, this);
    if (wh >= 2) for (var wxi = 1; wxi < ww - 1; wxi += 2) if (wxi !== dxr) this.setp(wx + wxi, wy, 'wall_' + wall + '_window_t');
    if (ww >= 3) this.setu(wx + ww - 1, wy - rh, 'roof_' + roof + '_chimney');
    return [doorX, fy + 1];
  };
  Builder.prototype.tower = function (x, y0) {
    for (var dx = 0; dx < 2; dx++) {
      ['tower_top', 'tower_mid', 'tower_door', 'tower_base'].forEach(function (nm, k) {
        this.setp(x + dx, y0 - 3 + k, nm);
      }, this);
    }
  };
  Builder.prototype.keep = function (x0, y0, w, h) {
    [[x0, y0], [x0 + w - 2, y0], [x0, y0 + h - 1], [x0 + w - 2, y0 + h - 1]].forEach(function (p) { this.tower(p[0], p[1]); }, this);
    this.grid9('wall_stone', x0 + 2, y0 - 1, w - 4, 2);
    var kw = w - 4; if (kw >= 3) this.house(x0 + 2, y0 + 3, kw, 2, 'sage', 'stone');
    var gx = x0 + ((w / 2) | 0);
    this.setp(gx, y0, 'wall_stone_door'); this.events.push({ x: gx, y: y0 });
    this.setp(gx - 2, y0 - 1, 'banner_red'); this.setp(gx + 1, y0 - 1, 'banner_blue');
    for (var yy = y0 + 1; yy < y0 + h; yy++) for (var xx = x0 + 2; xx < x0 + w - 2; xx++)
      if (this.over[yy * this.W + xx] === -1) this.setterr(xx, yy, 'cobble');
    return gx;
  };
  Builder.prototype.tree2 = function (x, y) {
    if (!(this.inb(x, y) && this.inb(x + 1, y + 1))) return false;
    var offs = [[0, 0], [1, 0], [0, 1], [1, 1]];
    for (var i = 0; i < 4; i++) {
      var ox = offs[i][0], oy = offs[i][1];
      if (this.over[(y + oy) * this.W + (x + ox)] !== -1 || this.terr[y + oy][x + ox] !== 'grass') return false;
    }
    this.setp(x, y, 'tree_tl', false); this.setp(x + 1, y, 'tree_tr', false);
    this.setp(x, y + 1, 'tree_bl'); this.setp(x + 1, y + 1, 'tree_br'); return true;
  };
  Builder.prototype.scatter = function (name, n, block, on) {
    on = on || ['grass']; var placed = 0, tries = 0;
    while (placed < n && tries < n * 60) {
      tries++;
      var x = this.r.randint(1, this.W - 2), y = this.r.randint(1, this.H - 2), i = y * this.W + x;
      if (this.over[i] !== -1 || this.coll[i]) continue;
      if (on.indexOf(this.terr[y][x]) < 0) continue;
      this.setp(x, y, name, block); placed++;
    }
  };
  Builder.prototype.bake = function () {
    var meta = new Array(this.W * this.H).fill(0), flat = new Array(this.W * this.H).fill('');
    for (var y = 0; y < this.H; y++) for (var x = 0; x < this.W; x++) {
      var t = this.terr[y][x], i = y * this.W + x; flat[i] = t === 'grass' ? '' : t;
      if (t === 'grass') { meta[i] = 0; continue; }
      var m = 0;
      for (var d = 0; d < DIRS.length; d++) {
        var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        var nt = this.inb(nx, ny) ? this.terr[ny][nx] : 'grass';
        if (nt === t || (this.PRI[nt] || 0) > this.PRI[t]) m |= DIRS[d][2];
      }
      meta[i] = this.a.LUT[t][m];
    }
    return { meta: meta, flat: flat };
  };
  Builder.prototype.result = function (name, region, mapType) {
    var b = this.bake(), lid = 'LAYOUT_' + name.toUpperCase();
    var layout = {
      id: lid, width: this.W, height: this.H, tileset: 'vt_ground',
      tileset_group: [{ name: 'vt_ground', offset: 0, count: this.a.baseN }],
      metatiles: b.meta, collision: this.coll, terrain: b.flat,
      overlay_tileset: 'town_props', overlay: this.over, tileSize: T,
    };
    if (this.upper.some(function (v) { return v >= 0; })) {
      layout.upper_tileset = 'town_props';
      layout.upper_group = [{ name: 'town_props', offset: 0, count: this.a.propsN || 256 }];
      layout.upper = this.upper;
    }
    var map = {
      name: name, region: region, map_type: mapType,
      events: this.events.map(function (e, i) {
        return { id: i + 1, name: 'Door' + (i + 1), x: e.x, y: e.y, dir: 'down',
                 trigger: 'action', through: false, commands: [{ type: 'text', text: 'The door is locked.' }] };
      }),
    };
    return { layout: layout, map: map };
  };

  // ---- outside archetypes ----
  function treeBorder(b, density, ring) {
    density = density || 0.55; ring = ring || 2;
    for (var x = 1; x < b.W - 2; x += 2)
      for (var y = 0; y < b.H; y++) if ((y < ring || y >= b.H - ring - 1) && b.r.rnd() < density) b.tree2(x, y);
    for (var y2 = 1; y2 < b.H - 2; y2 += 2)
      for (var x2 = 0; x2 < b.W; x2++) if ((x2 < ring || x2 >= b.W - ring - 1) && b.r.rnd() < density) b.tree2(x2, y2);
  }
  function naturePass(b, trees, bushes, flowers, tufts, rocks) {
    for (var i = 0; i < trees; i++) b.tree2(b.r.randint(2, b.W - 3), b.r.randint(2, b.H - 3));
    b.scatter('pine', (trees / 3) | 0); b.scatter('tree_round', (trees / 3) | 0);
    b.scatter('bush', bushes, false); b.scatter('bush2', (bushes / 2) | 0, false);
    FLOWERS.forEach(function (f) { b.scatter(f, flowers, false); });
    b.scatter('grass_tuft', tufts, false);
    b.scatter('boulder', rocks); b.scatter('rock', rocks, false);
    b.scatter('firewood', Math.max(2, (rocks / 2) | 0));
  }
  function houseFits(b, wx, wy, ww, wh, rh) {
    for (var yy = wy - rh - 1; yy <= wy + wh + 1; yy++)
      for (var xx = wx - 2; xx <= wx + ww + 1; xx++) {
        if (!b.inb(xx, yy)) return false;
        if (b.terr[yy][xx] !== 'grass' || b.over[yy * b.W + xx] !== -1) return false;
      }
    return true;
  }
  function placeHouses(b, n, cx, cy) {
    var R = b.r, placed = 0, tries = 0;
    while (placed < n && tries < n * 40) {
      tries++;
      var sz = R.choice([[4, 2], [5, 2], [4, 2], [6, 3], [5, 3], [4, 2]]), ww = sz[0], wh = sz[1];
      var rh = (ww >= 6 || wh >= 3) ? 3 : 2;
      var wx = R.randint(3, b.W - ww - 3), wy = R.randint(rh + 2, b.H - wh - 3);
      if (!houseFits(b, wx, wy, ww, wh, rh)) continue;
      var d = b.house(wx, wy, ww, wh, R.choice(ROOFS), R.choice(WALLS));
      if (Math.abs(d[1] - cy) <= Math.abs(d[0] - cx)) b.path(d[0], d[1], d[0], cy, 'dirt', 1, 0.3);
      else b.path(d[0], d[1], cx, d[1], 'dirt', 1, 0.3);
      if (R.rnd() < 0.4) for (var fx = wx - 1; fx <= wx + ww; fx++)
        if (b.empty(fx, d[1] + 1) && b.terr[d[1] + 1][fx] === 'grass' && R.rnd() < 0.5)
          b.setp(fx, d[1] + 1, R.choice(FLOWERS), false);
      placed++;
    }
  }
  function genTown(b, opt) {
    var w = b.W, h = b.H, R = b.r;
    var cx = ((w / 2) | 0) + R.randint(-3, 3), cy = ((h / 2) | 0) + R.randint(-3, 3);
    if (opt.pond !== false && R.rnd() < 0.8) {
      var pc = R.choice([[0.82, 0.82], [0.18, 0.82], [0.84, 0.2], [0.18, 0.2]]);
      b.pond((w * pc[0]) | 0, (h * pc[1]) | 0, 4 + R.rnd() * 2, 3 + R.rnd() * 2);
    }
    var ph = R.randint(4, 6);
    b.rectTerr(cx - ph, cy - ph, cx + ph - 1, cy + ph - 1, 'cobble');
    [cx, cx + 1].forEach(function (ax) { for (var y = 0; y < h; y++) b.setterr(ax, y, 'cobble'); });
    [cy, cy + 1].forEach(function (ay) { for (var x = 0; x < w; x++) b.setterr(x, ay, 'cobble'); });
    if (R.rnd() < 0.5) { var ry = R.randint(6, h - 6); for (var x2 = 0; x2 < w; x2++) { b.setterr(x2, ry, 'dirt'); b.setterr(x2, ry + 1, 'dirt'); } }
    if (opt.keep !== false && R.rnd() < 0.8) b.keep(R.randint(4, w - 18), R.randint(7, 9), 14, 6);
    placeHouses(b, opt.houses || 12, cx, cy);
    b.setp(cx, cy, 'well');
    [[-3, -2, 'barrel'], [-3, -1, 'barrel_open'], [3, -2, 'crate'], [3, -1, 'crate'],
     [-2, 3, 'sign_h'], [2, 3, 'sign_v'], [0, -3, 'oven']].forEach(function (o) {
      if (b.empty(cx + o[0], cy + o[1])) b.setp(cx + o[0], cy + o[1], o[2]);
    });
    treeBorder(b, 0.6); naturePass(b, 22, 24, 8, 30, 8);
    return b.result(opt.name, opt.region, 'MAP_TYPE_TOWN');
  }
  function genRoute(b, opt) {
    var w = b.W, h = b.H;
    if (opt.vertical) b.path((w / 2) | 0, 0, (w / 2) | 0, h - 1, 'dirt', 2, 0.55, 0.04);
    else b.path(0, (h / 2) | 0, w - 1, (h / 2) | 0, 'dirt', 2, 0.55, 0.04);
    if (b.r.rnd() < 0.7) b.pond((w * 0.7) | 0, (h * 0.78) | 0, 4.0, 3.0);
    treeBorder(b, 0.7, 3); naturePass(b, 28, 20, 10, 34, 10);
    return b.result(opt.name, opt.region, 'MAP_TYPE_ROUTE');
  }
  function genForest(b, opt) {
    var w = b.W, h = b.H;
    b.path(0, (h * 0.4) | 0, w - 1, (h * 0.6) | 0, 'dirt', 2, 0.6, 0.18);
    b.path((w * 0.55) | 0, 0, (w * 0.45) | 0, h - 1, 'dirt', 1, 0.6, 0.22);
    b.pond((w * 0.25) | 0, (h * 0.7) | 0, 4.5, 3.2);
    [[(w * 0.7) | 0, (h * 0.3) | 0], [(w * 0.35) | 0, (h * 0.45) | 0]].forEach(function (g) {
      FLOWERS.forEach(function (f) { for (var k = 0; k < 4; k++) b.setp(g[0] + b.r.randint(-2, 2), g[1] + b.r.randint(-2, 2), f, false); });
    });
    for (var i = 0; i < 140; i++) {
      var x = b.r.randint(1, b.W - 3), y = b.r.randint(1, b.H - 3);
      if (b.terr[y][x] !== 'grass') continue;
      var rr = b.r.rnd();
      if (rr < 0.6) b.tree2(x, y); else if (rr < 0.8) b.scatter('pine', 1); else b.scatter('tree_round', 1);
    }
    b.scatter('bush', 40, false); b.scatter('bush2', 24, false);
    FLOWERS.forEach(function (f) { b.scatter(f, 7, false); });
    b.scatter('grass_tuft', 44, false); b.scatter('boulder', 12); b.scatter('rock', 10, false);
    b.scatter('firewood', 4); b.scatter('deadtree', 6);
    return b.result(opt.name, opt.region, 'MAP_TYPE_FOREST');
  }

  // ============================ indoor palette ============================
  function loadIndoor(scene) {
    var tid = scene === 'dungeon' ? 'dun_props' : 'int_props';
    var ground = scene === 'dungeon' ? 'rtp_dungeon_ground' : 'rtp_inside_ground';
    return Promise.all([
      fetchJSON('data/tilesets/' + tid + '.gid.json'),
      fetchJSON('data/tilesets/' + ground + '.json'),
    ]).then(function (r) {
      return { gid: r[0], baseN: r[1].total_metatiles, ground: ground, props: tid, scene: scene };
    });
  }
  function Indoor(w, h, seed, asset) {
    this.W = w; this.H = h; this.r = RNG(seed); this.a = asset;
    this.walk = new Array(w * h).fill(false);
    this.over = new Array(w * h).fill(-1);
    this.coll = new Array(w * h).fill(1);
    this.events = [];
  }
  Indoor.prototype.inb = Builder.prototype.inb;
  Indoor.prototype.setp = Builder.prototype.setp;
  Indoor.prototype.carveRect = function (x0, y0, x1, y1) {
    for (var y = Math.max(1, Math.min(y0, y1)); y <= Math.min(this.H - 2, Math.max(y0, y1)); y++)
      for (var x = Math.max(1, Math.min(x0, x1)); x <= Math.min(this.W - 2, Math.max(x0, x1)); x++)
        this.walk[y * this.W + x] = true;
  };
  Indoor.prototype.corridor = function (x0, y0, x1, y1, width) {
    width = width || 1; var x = x0, y = y0, self = this;
    function mk(mx, my) { if (self.inb(mx, my) && mx > 0 && my > 0 && mx < self.W - 1 && my < self.H - 1) self.walk[my * self.W + mx] = true; }
    while (x !== x1) { for (var w = 0; w < width; w++) mk(x, y + w); x += x1 > x ? 1 : -1; }
    while (y !== y1) { for (var w2 = 0; w2 < width; w2++) mk(x + w2, y); y += y1 > y ? 1 : -1; }
    mk(x1, y1);
  };
  Indoor.prototype.wallSlice = function (x, y) {
    var self = this;
    function fl(nx, ny) { return self.inb(nx, ny) && self.walk[ny * self.W + nx]; }
    var up = fl(x, y - 1), dn = fl(x, y + 1), lf = fl(x - 1, y), rt = fl(x + 1, y);
    if (dn && rt) return 'br'; if (dn && lf) return 'bl'; if (up && rt) return 'tr'; if (up && lf) return 'tl';
    if (dn) return 'b'; if (up) return 't'; if (lf) return 'l'; if (rt) return 'r'; return 'f';
  };
  Indoor.prototype.finalizeWalls = function () {
    for (var y = 0; y < this.H; y++) for (var x = 0; x < this.W; x++) {
      var i = y * this.W + x;
      if (this.walk[i]) { this.over[i] = -1; this.coll[i] = 0; }
      else { this.over[i] = this.a.gid['wall_' + this.wallSlice(x, y)]; this.coll[i] = 1; }
    }
  };
  Indoor.prototype.scatterRooms = function (name, n, block) {
    var placed = 0, tries = 0;
    while (placed < n && tries < n * 80) {
      tries++;
      var x = this.r.randint(1, this.W - 2), y = this.r.randint(1, this.H - 2), i = y * this.W + x;
      if (!this.walk[i] || this.over[i] !== -1 || this.coll[i]) continue;
      this.setp(x, y, name, block); placed++;
    }
  };
  Indoor.prototype.result = function (name, region, mapType) {
    var n = this.W * this.H, lid = 'LAYOUT_' + name.toUpperCase();
    var layout = {
      id: lid, width: this.W, height: this.H, tileset: this.a.ground,
      tileset_group: [{ name: this.a.ground, offset: 0, count: this.a.baseN }],
      metatiles: new Array(n).fill(0), collision: this.coll, terrain: new Array(n).fill(''),
      overlay_tileset: this.a.props, overlay: this.over, tileSize: T,
    };
    var map = {
      name: name, region: region, map_type: mapType,
      events: this.events.map(function (e, i) {
        return { id: i + 1, name: e.name || ('Event' + (i + 1)), x: e.x, y: e.y, dir: 'down',
                 trigger: 'action', through: false, commands: [{ type: 'text', text: e.text || '...' }] };
      }),
    };
    return { layout: layout, map: map };
  };
  function genDungeon(b, opt) {
    var w = b.W, h = b.H, tier = opt.tier || 1, rng = b.r, rooms = [], attempts = 0, target = 6 + tier * 2;
    while (rooms.length < target && attempts < target * 12) {
      attempts++;
      var rw = rng.randint(5, 9), rh = rng.randint(4, 7);
      var rx = rng.randint(2, w - rw - 2), ry = rng.randint(2, h - rh - 2);
      var cx = rx + (rw / 2 | 0), cy = ry + (rh / 2 | 0);
      var clash = rooms.some(function (r) { return Math.abs(cx - r[0]) < rw && Math.abs(cy - r[1]) < rh; });
      if (clash) continue;
      b.carveRect(rx, ry, rx + rw, ry + rh); rooms.push([cx, cy, rw, rh]);
    }
    rooms.sort(function (p, q) { return p[1] - q[1] || p[0] - q[0]; });
    for (var i = 1; i < rooms.length; i++) b.corridor(rooms[i - 1][0], rooms[i - 1][1], rooms[i][0], rooms[i][1], rng.choice([1, 2]));
    b.finalizeWalls();
    if (rooms.length) {
      b.setp(rooms[0][0], rooms[0][1], 'stairs', false); b.events.push({ x: rooms[0][0], y: rooms[0][1], name: 'Entrance', text: 'Stairs back up.' });
      var last = rooms[rooms.length - 1];
      b.setp(last[0], last[1], 'grave', false); b.events.push({ x: last[0], y: last[1], name: 'Alpha', text: 'The Alpha stirs in the dark.' });
    }
    rooms.forEach(function (r) {
      if (r[2] >= 7 && r[3] >= 5) {
        [-(r[2] >> 1) + 1, (r[2] >> 1) - 1].forEach(function (dx) {
          b.setp(r[0] + dx, r[1] - (r[3] >> 1) + 1, 'pillar'); b.setp(r[0] + dx, r[1] + (r[3] >> 1) - 1, 'pillar');
        });
      }
    });
    b.scatterRooms('crystal', 6 + tier * 2, true); b.scatterRooms('rockpile', 8, true);
    b.scatterRooms('barrel', 6); b.scatterRooms('crate', 5);
    b.scatterRooms('bones', 5, false); b.scatterRooms('goldpile', 3);
    return b.result(opt.name, opt.region, 'MAP_TYPE_DUNGEON');
  }
  function genInterior(b, opt) {
    var w = b.W, h = b.H;
    b.carveRect(2, 2, w - 3, h - 3);
    b.finalizeWalls();
    var exx = (w / 2) | 0;
    b.setp(exx, h - 3, 'stairs', false); b.events.push({ x: exx, y: h - 3, name: 'Exit', text: 'Leave.' });
    b.setp(3, 2, 'bed', true); b.setp(4, 2, 'bed2', true);
    b.setp(w - 4, 2, 'shelf'); b.setp(w - 5, 2, 'cabinet');
    b.setp((w / 2 | 0) - 1, 3, 'table'); b.setp(w / 2 | 0, 3, 'chair', false);
    b.setp(3, h - 4, 'fireplace'); b.setp(w - 4, h - 4, 'barrel');
    b.scatterRooms('pot', 3); b.scatterRooms('crate', 3);
    return b.result(opt.name, opt.region, 'MAP_TYPE_INTERIOR');
  }

  // ============================ public API ============================
  function generate(opt) {
    opt = opt || {}; var arch = opt.archetype || 'town';
    var name = opt.name || (arch[0].toUpperCase() + arch.slice(1) + 'Map');
    var seed = (opt.seed != null) ? opt.seed : (Math.random() * 1e9) | 0;
    opt = Object.assign({}, opt, { name: name, region: opt.region || 'awakened', seed: seed });
    if (arch === 'dungeon' || arch === 'interior') {
      return loadIndoor(arch).then(function (asset) {
        var b = new Indoor(opt.w, opt.h, seed, asset);
        return arch === 'dungeon' ? genDungeon(b, opt) : genInterior(b, opt);
      });
    }
    return loadOutside().then(function (asset) {
      var b = new Builder(opt.w, opt.h, seed, asset);
      if (arch === 'route') return genRoute(b, opt);
      if (arch === 'forest') return genForest(b, opt);
      return genTown(b, opt);
    });
  }

  window.MapGen = { generate: generate, DEFAULT_SIZE: {
    town: [50, 50], route: [64, 30], forest: [50, 50], dungeon: [48, 48], interior: [26, 18] } };
})();
