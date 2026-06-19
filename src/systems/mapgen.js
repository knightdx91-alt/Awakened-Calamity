// GameMapGen — RUNTIME dungeon-floor generator (PURE, deterministic, portable).
// A JS port of tools/mapgen_indoor.py's dungeon path so the engine can grow a
// FRESH floor per descent instead of reusing a fixed pool of baked maps. No DOM,
// no fetch — give it a seed + tier and it returns { map, layout } objects ready
// to inject into GameMap. Same seed → identical floor (replay-safe). Mirrors the
// Python carve/connect/place logic; a Unity/C# port can mirror this in turn.
//
//   GameMapGen.generateFloor({ seed, tier, w, h, name, region, creatures, boss })
//
// Tile model (matches the baked dungeon tilesets): base layer = flat floor (tile
// 0 of rtp_dungeon_ground); walls + props + side-view faces are OVERLAY gids into
// the baked `dun_props` sheet (gid table embedded below, from dun_props.gid.json).
(function (root) {
    'use strict';
    var RNG = root.GameRNG || (typeof require !== 'undefined' && require('./rng.js'));

    var T = 32;                                   // dungeon tile size (px)
    var GROUND = 'rtp_dungeon_ground', GROUND_N = 145, PROPS = 'dun_props';
    // gid table — baked, stable (data/tilesets/dun_props.gid.json)
    var WALL = { tl: 0, t: 1, tr: 2, l: 3, f: 4, r: 5, bl: 6, b: 7, br: 8 };
    var GID = {
        pillar: 9, crystal: 10, crystal2: 11, rockpile: 12, barrel: 13, crate: 14,
        bones: 15, grave: 16, stairs: 17, goldpile: 18,
        face_cap_l: 19, face_cap_m: 20, face_cap_r: 21, face_body_l: 22, face_body_m: 23,
        face_body_r: 24, face_base_l: 25, face_base_m: 26, face_base_r: 27,
    };
    // enemy rosters banded by tier (data/systems/creatures.json keys)
    var T1 = ['emberling', 'thornwolf', 'husk_rat', 'mire_slime', 'ash_imp', 'cave_crawler'];
    var T2 = ['bramblewight', 'frost_shade', 'voltspine', 'bonepicker', 'sahagin_raider', 'cinder_hound'];
    var T3 = ['gargoyle_sentry', 'lamia_binder', 'ogre_breaker', 'wraith', 'scorpion_stalker', 'vampire_thrall'];
    var BOSSES = ['veinmother', 'cinder_tyrant', 'hollow_warden', 'drowned_choir', 'unmade_echo'];

    // ── BIOME (generator roadmap #3) ──────────────────────────────────────────
    // A biome def (data/systems/biomes.json) drives a floor's palette (base floor
    // tile), prop tables, enemy roster, boss pool and hazard mix. DEFAULT mirrors
    // the historical hardcoded behavior so an absent biome changes nothing.
    var DEFAULT_BIOME = {
        floorTile: 0,
        props: [
            { gid: 'crystal', count: 4, block: true },
            { gid: 'rockpile', count: 6, block: true },
            { gid: 'bones', count: 4, block: false }
        ],
        enemyTiers: { 1: T1, 2: T2, 3: T3 },
        bosses: BOSSES,
        hazard: { sensorWeight: 0.4, spikeText: 'Spikes erupt from the floor!', spikeDmg: 16,
            sensorText: 'A System sigil flares underfoot — it has logged your position.', sensorSurveil: 12 },
        encounterRate: 0.75
    };
    function resolveBiome(biome) {
        if (!biome || typeof biome !== 'object') return DEFAULT_BIOME;
        var et = biome.enemyTiers || DEFAULT_BIOME.enemyTiers;
        return {
            floorTile: biome.floorTile != null ? (biome.floorTile | 0) : DEFAULT_BIOME.floorTile,
            props: (biome.props && biome.props.length) ? biome.props : DEFAULT_BIOME.props,
            enemyTiers: { 1: et[1] || et['1'] || T1, 2: et[2] || et['2'] || T2, 3: et[3] || et['3'] || T3 },
            bosses: (biome.bosses && biome.bosses.length) ? biome.bosses : DEFAULT_BIOME.bosses,
            hazard: biome.hazard || DEFAULT_BIOME.hazard,
            encounterRate: biome.encounterRate != null ? biome.encounterRate : DEFAULT_BIOME.encounterRate
        };
    }

    // ── seeded RNG helpers (mulberry32 via GameRNG), Python-random-shaped API ──
    function mkRng(seed) {
        var st = RNG.create(((seed | 0) || 1) >>> 0);
        function next() { return RNG.next(st); }
        return {
            random: next,
            randint: function (a, b) { return a + Math.floor(next() * (b - a + 1)); },   // inclusive
            choice: function (arr) { return arr[Math.floor(next() * arr.length) % arr.length]; },
            sample: function (arr, k) { var c = arr.slice(), out = []; for (var i = 0; i < k && c.length; i++) out.push(c.splice(Math.floor(next() * c.length), 1)[0]); return out; },
            shuffle: function (arr) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(next() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; },
        };
    }

    // ── the builder (mirror of IndoorBuilder, dungeon-only) ───────────────────
    function Builder(w, h, rng, floorTile) {
        this.W = w; this.H = h; this.rng = rng;
        var n = w * h;
        this.walk = new Array(n).fill(false);     // carved (passable) cells
        this.over = new Array(n).fill(-1);        // overlay gid (-1 = none)
        this.coll = new Array(n).fill(1);         // 1 = solid until carved
        this.meta = new Array(n).fill(floorTile | 0); // biome base floor tile
        this.events = [];
    }
    Builder.prototype.inb = function (x, y) { return x >= 0 && x < this.W && y >= 0 && y < this.H; };
    Builder.prototype.carveRect = function (x0, y0, x1, y1) {
        for (var y = Math.max(1, Math.min(y0, y1)); y <= Math.min(this.H - 2, Math.max(y0, y1)); y++)
            for (var x = Math.max(1, Math.min(x0, x1)); x <= Math.min(this.W - 2, Math.max(x0, x1)); x++)
                this.walk[y * this.W + x] = true;
    };
    Builder.prototype._mark = function (x, y) {
        if (this.inb(x, y) && x > 0 && x < this.W - 1 && y > 0 && y < this.H - 1) this.walk[y * this.W + x] = true;
    };
    Builder.prototype.carveCorridor = function (x0, y0, x1, y1, width) {
        width = width || 1; var x = x0, y = y0, w;
        while (x !== x1) { for (w = 0; w < width; w++) this._mark(x, y + w); x += x1 > x ? 1 : -1; }
        while (y !== y1) { for (w = 0; w < width; w++) this._mark(x + w, y); y += y1 > y ? 1 : -1; }
        this._mark(x1, y1);
    };
    Builder.prototype.setp = function (x, y, gid, block) {
        if (this.inb(x, y)) { this.over[y * this.W + x] = gid; this.coll[y * this.W + x] = block ? 1 : 0; }
    };
    Builder.prototype._wallSlice = function (x, y) {
        var W = this.W, walk = this.walk, self = this;
        function fl(nx, ny) { return self.inb(nx, ny) && walk[ny * W + nx]; }
        var up = fl(x, y - 1), dn = fl(x, y + 1), lf = fl(x - 1, y), rt = fl(x + 1, y);
        if (dn && rt) return 'br'; if (dn && lf) return 'bl'; if (up && rt) return 'tr'; if (up && lf) return 'tl';
        if (dn) return 'b'; if (up) return 't'; if (lf) return 'l'; if (rt) return 'r'; return 'f';
    };
    Builder.prototype._walkComponents = function () {
        var W = this.W, H = this.H, seen = new Array(W * H).fill(false), out = [];
        for (var s = 0; s < W * H; s++) {
            if (seen[s] || !this.walk[s]) continue;
            var comp = [], stack = [s]; seen[s] = true;
            while (stack.length) {
                var i = stack.pop(); comp.push(i); var x = i % W, y = (i / W) | 0;
                var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                for (var k = 0; k < 4; k++) {
                    var nx = x + nb[k][0], ny = y + nb[k][1];
                    if (nx >= 0 && nx < W && ny >= 0 && ny < H) { var j = ny * W + nx; if (!seen[j] && this.walk[j]) { seen[j] = true; stack.push(j); } }
                }
            }
            out.push(comp);
        }
        return out;
    };
    // REACHABILITY GUARANTEE: connect every stranded walkable component to the main one.
    Builder.prototype.ensureConnected = function () {
        var W = this.W, self = this;
        function centroid(comp) {
            var sx = 0, sy = 0; for (var a = 0; a < comp.length; a++) { sx += comp[a] % W; sy += (comp[a] / W) | 0; }
            sx = (sx / comp.length) | 0; sy = (sy / comp.length) | 0;
            return comp.reduce(function (best, i) { var bx = best % W, by = (best / W) | 0, ix = i % W, iy = (i / W) | 0; return ((ix - sx) * (ix - sx) + (iy - sy) * (iy - sy)) < ((bx - sx) * (bx - sx) + (by - sy) * (by - sy)) ? i : best; });
        }
        var guard = 0, comps = this._walkComponents();
        while (comps.length > 1 && guard < 40) {
            guard++; comps.sort(function (a, b) { return b.length - a.length; });
            var mc = centroid(comps[0]), mx = mc % W, my = (mc / W) | 0;
            for (var c = 1; c < comps.length; c++) { var cc = centroid(comps[c]); self.carveCorridor(cc % W, (cc / W) | 0, mx, my, 1); }
            comps = this._walkComponents();
        }
    };
    Builder.prototype.finalizeWalls = function () {
        for (var y = 0; y < this.H; y++) for (var x = 0; x < this.W; x++) {
            var i = y * this.W + x;
            if (this.walk[i]) { this.over[i] = -1; this.coll[i] = 0; }
            else { this.over[i] = WALL[this._wallSlice(x, y)]; this.coll[i] = 1; }
        }
    };
    // Side-view FACE on north-facing walls (wall directly above a floor cell rises).
    Builder.prototype.renderNorthFaces = function () {
        var W = this.W, self = this;
        function wall(x, y) { return self.inb(x, y) && !self.walk[y * W + x]; }
        function floor(x, y) { return self.inb(x, y) && self.walk[y * W + x]; }
        function edge(x, y) { return floor(x, y) && wall(x, y - 1); }
        for (var y = 0; y < this.H; y++) for (var x = 0; x < this.W; x++) {
            if (!edge(x, y)) continue;
            var col = !edge(x - 1, y) ? 'l' : (!edge(x + 1, y) ? 'r' : 'm');
            var rows = [['base', y - 1], ['body', y - 2], ['cap', y - 3]];
            for (var ri = 0; ri < rows.length; ri++) {
                var part = rows[ri][0], yy = rows[ri][1];
                if (!wall(x, yy)) { if (ri > 0 && wall(x, yy + 1)) self.over[(yy + 1) * W + x] = GID['face_cap_' + col]; break; }
                var name = part;
                if (part === 'body' && !wall(x, yy - 1)) name = 'cap';
                self.over[yy * W + x] = GID['face_' + name + '_' + col]; self.coll[yy * W + x] = 1;
            }
        }
    };
    Builder.prototype._isOpen = function (x, y) {
        var n = 0, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (var k = 0; k < 4; k++) { var nx = x + nb[k][0], ny = y + nb[k][1]; if (nx >= 0 && nx < this.W && ny >= 0 && ny < this.H && this.walk[ny * this.W + nx]) n++; }
        return n >= 3;
    };
    Builder.prototype._roomFloor = function (room, awayFromEvents, openOnly) {
        var cx = room[0], cy = room[1], rw = room[2], rh = room[3];
        var evset = {}; if (awayFromEvents) for (var e = 0; e < this.events.length; e++) evset[this.events[e].x + ',' + this.events[e].y] = 1;
        for (var t = 0; t < 40; t++) {
            var x = cx + this.rng.randint(-((rw / 2) | 0) + 1, ((rw / 2) | 0) - 1);
            var y = cy + this.rng.randint(-((rh / 2) | 0) + 1, ((rh / 2) | 0) - 1);
            var i = y * this.W + x;
            if (x >= 0 && x < this.W && y >= 0 && y < this.H && this.walk[i] && this.over[i] === -1 && !this.coll[i]
                && !evset[x + ',' + y] && (!openOnly || this._isOpen(x, y))) return [x, y];
        }
        return [null, null];
    };
    Builder.prototype.scatterInRooms = function (gid, n, block) {
        var placed = 0, tries = 0;
        while (placed < n && tries < n * 80) {
            tries++;
            var x = this.rng.randint(1, this.W - 2), y = this.rng.randint(1, this.H - 2), i = y * this.W + x;
            if (!this.walk[i] || this.over[i] !== -1 || this.coll[i]) continue;
            if (block && !this._isOpen(x, y)) continue;
            this.setp(x, y, gid, block); placed++;
        }
    };
    // FINAL reachability: remove any blocking prop that severs the COLLISION map.
    Builder.prototype.repairPropConnectivity = function () {
        var W = this.W, H = this.H, self = this;
        function collComps() {
            var seen = new Array(W * H).fill(false), cid = new Array(W * H).fill(-1), out = 0;
            for (var s = 0; s < W * H; s++) {
                if (seen[s] || self.coll[s]) continue;
                var stack = [s]; seen[s] = true;
                while (stack.length) {
                    var i = stack.pop(); cid[i] = out; var x = i % W, y = (i / W) | 0, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                    for (var k = 0; k < 4; k++) { var nx = x + nb[k][0], ny = y + nb[k][1]; if (nx >= 0 && nx < W && ny >= 0 && ny < H) { var j = ny * W + nx; if (!seen[j] && !self.coll[j]) { seen[j] = true; stack.push(j); } } }
                }
                out++;
            }
            return { cid: cid, n: out };
        }
        for (var pass = 0; pass < 200; pass++) {
            var cc = collComps(); if (cc.n <= 1) return;
            var removed = false;
            for (var i = 0; i < W * H; i++) {
                if (!(self.walk[i] && self.coll[i] && self.over[i] >= 0)) continue;
                var x = i % W, y = (i / W) | 0, nbr = {}, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                for (var k = 0; k < 4; k++) { var nx = x + nb[k][0], ny = y + nb[k][1]; if (nx >= 0 && nx < W && ny >= 0 && ny < H && !self.coll[ny * W + nx]) nbr[cc.cid[ny * W + nx]] = 1; }
                if (Object.keys(nbr).length >= 2) { self.over[i] = -1; self.coll[i] = 0; removed = true; break; }
            }
            if (!removed) return;
        }
    };

    // ── event builders (ported one-for-one from the Python) ───────────────────
    function chestGfx() { return { sprite: 'Chest', file: 'rtp/Chest.png', frame_w: 32, frame_h: 32, cols: 3, rows: 4, single: false }; }
    Builder.prototype.placeMonster = function (x, y, key, level, sprite, creatures) {
        var cs = (creatures && creatures[key] || {}).charset, gfx;
        if (cs) gfx = { sprite: key, file: cs.file, frame_w: 32, frame_h: 32, cols: (cs.charCols || 4) * 3, rows: 8, single: false, char: cs.char || 0, charCols: cs.charCols || 4 };
        else gfx = { sprite: sprite, file: 'rtp/' + sprite + '.png', frame_w: 32, frame_h: 32, cols: 3, rows: 4, single: false };
        this.events.push({ x: x, y: y, name: 'Roamer', trigger: 'touch', through: false,
            behavior: { type: 'roam', sight: 5, speed: 420 }, graphic: gfx,
            commands: [{ type: 'text', text: 'A System-twisted creature lunges from the dark!' },
                { type: 'battle', enemies: [{ key: key, level: level }] }, { type: 'despawn' }] });
    };
    Builder.prototype.placeChest = function (x, y, money, item) {
        var loot = [], gained = [];
        if (money) { loot.push({ type: 'money', op: '+', amount: money }); gained.push(money + ' Cr'); }
        if (item) { loot.push({ type: 'item', op: '+', id: item, pocket: 'items', qty: 1 }); gained.push('a ' + item.replace(/_/g, ' ')); }
        loot.push({ type: 'text', text: 'You found ' + (gained.length ? gained.join(' and ') : 'nothing of use') + '.' });
        loot.push({ type: 'selfswitch', letter: 'A', value: true });
        this.setp(x, y, GID.crate, true);
        this.events.push({ x: x, y: y, name: 'Chest', trigger: 'action', through: false, graphic: chestGfx(),
            commands: [{ type: 'conditional', cond: { kind: 'selfswitch', letter: 'A', value: true },
                then: [{ type: 'text', text: 'The chest lies open and empty.' }],
                else: [{ type: 'text', text: 'A weathered chest, half-buried in the dust.' }].concat(loot) }] });
    };
    Builder.prototype.placeRelicCache = function (x, y, count) {
        this.setp(x, y, GID.crate, true);
        this.events.push({ x: x, y: y, name: 'RelicCache', trigger: 'action', through: false, graphic: chestGfx(),
            commands: [{ type: 'relic', count: count || 3 }] });
    };
    Builder.prototype.placeTrap = function (x, y, kind, hz) {
        hz = hz || {};
        var body = kind === 'sensor'
            ? [{ type: 'text', text: hz.sensorText || 'A System sigil flares underfoot — it has logged your position.' }, { type: 'surveil', amount: hz.sensorSurveil != null ? hz.sensorSurveil : 12 }]
            : [{ type: 'text', text: hz.spikeText || 'Spikes erupt from the floor!' }, { type: 'hurt', what: 'hp', amount: hz.spikeDmg != null ? hz.spikeDmg : 16 }];
        this.events.push({ x: x, y: y, name: 'Trap', trigger: 'touch', through: true, graphic: { sprite: '', file: '', single: true },
            commands: [{ type: 'conditional', cond: { kind: 'selfswitch', letter: 'A', value: true }, then: [],
                else: body.concat([{ type: 'selfswitch', letter: 'A', value: true }]) }] });
    };

    // A REST node's refuge: a campfire that fully heals once (act composer #4).
    Builder.prototype.placeCampfire = function (x, y) {
        this.setp(x, y, GID.goldpile, false);
        this.events.push({ x: x, y: y, name: 'Campfire', trigger: 'action', through: false,
            graphic: { sprite: 'Other3', file: 'rtp/Other3.png', frame_w: 32, frame_h: 32, cols: 3, rows: 4, single: false },
            commands: [{ type: 'conditional', cond: { kind: 'selfswitch', letter: 'A', value: true },
                then: [{ type: 'text', text: 'The embers have burned to ash.' }],
                else: [{ type: 'text', text: 'A guttering fire in a pocket of stillness — the System’s eye slips past here.' },
                    { type: 'heal', what: 'all' },
                    { type: 'text', text: 'You rest. Your wounds close.' },
                    { type: 'selfswitch', letter: 'A', value: true }] }] });
    };

    // ── orchestration (mirror of gen_dungeon) ─────────────────────────────────
    function generateFloor(opts) {
        opts = opts || {};
        var w = opts.w || 48, h = opts.h || 48, tier = opts.tier || 1;
        var name = opts.name || ('RunGen' + (opts.seed | 0));
        var region = opts.region || 'awakened';
        var creatures = opts.creatures || null;
        var bio = resolveBiome(opts.biome);
        var node = opts.node || {};               // act-composer node gen modifiers (#4)
        var encMult = node.encounterMult != null ? node.encounterMult : 1;
        var lvlBonus = node.levelBonus | 0;
        var rng = mkRng(opts.seed);
        var b = new Builder(w, h, rng, bio.floorTile);

        // scatter non-overlapping rooms, chain + loop with corridors
        var rooms = [], attempts = 0, targetRooms = 6 + tier * 2;
        while (rooms.length < targetRooms && attempts < targetRooms * 12) {
            attempts++;
            var rw = rng.randint(5, 9), rh = rng.randint(4, 7);
            var rx = rng.randint(2, w - rw - 2), ry = rng.randint(2, h - rh - 2);
            var cx = rx + (rw / 2 | 0), cy = ry + (rh / 2 | 0);
            var clash = false;
            for (var q = 0; q < rooms.length; q++) if (Math.abs(cx - rooms[q][0]) < rw && Math.abs(cy - rooms[q][1]) < rh) { clash = true; break; }
            if (clash) continue;
            b.carveRect(rx, ry, rx + rw, ry + rh); rooms.push([cx, cy, rw, rh]);
        }
        rooms.sort(function (a, c) { return a[1] - c[1] || a[0] - c[0]; });
        for (var i = 1; i < rooms.length; i++) b.carveCorridor(rooms[i - 1][0], rooms[i - 1][1], rooms[i][0], rooms[i][1], rng.choice([1, 2]));
        for (var ex2 = 0; ex2 < 1 + tier; ex2++) if (rooms.length >= 3) { var pr = rng.sample(rooms, 2); b.carveCorridor(pr[0][0], pr[0][1], pr[1][0], pr[1][1], 1); }
        b.ensureConnected();
        b.finalizeWalls();
        b.renderNorthFaces();

        // critical path: Entrance = first room; Alpha = the room farthest from it
        var ex = rooms[0][0], ey = rooms[0][1];
        function far(r) { return (r[0] - ex) * (r[0] - ex) + (r[1] - ey) * (r[1] - ey); }
        var alpha = rooms.reduce(function (best, r) { return far(r) > far(best) ? r : best; }, rooms[0]);
        var ax = alpha[0], ay = alpha[1];
        b.setp(ex, ey, GID.stairs, false);
        b.events.push({ x: ex, y: ey, name: 'Entrance', trigger: 'action', through: false,
            graphic: { sprite: 'Other3', file: 'rtp/Other3.png', frame_w: 32, frame_h: 32, cols: 3, rows: 4, single: false },
            commands: [{ type: 'text', text: 'Worn stairs lead back up to the surface.' },
                // legible run shape (act composer #4 / onboarding #5): glyph map + this floor
                { type: 'text', text: 'DESCENT:  [act]\nHere:  [floorlabel]' }] });

        var pool = (tier <= 1 ? bio.enemyTiers[1] : tier === 2 ? bio.enemyTiers[2] : bio.enemyTiers[3]).concat(tier >= 2 ? bio.enemyTiers[1] : []);
        // The deepest room holds either the way DOWN (normal floor → descend to the
        // next) or the ALPHA boss (boss floor → battle, then descend = run cleared).
        var boss = opts.kind === 'boss';
        if (boss) {
            var bossKey = opts.boss || rng.choice(bio.bosses), bossLvl = 2 + tier * 2;
            b.events.push({ x: ax, y: ay, name: 'Alpha', trigger: 'action', through: false,
                graphic: { sprite: 'Monster2', file: 'rtp/Monster2.png', frame_w: 32, frame_h: 32, cols: 3, rows: 4, single: false },
                commands: [{ type: 'text', text: 'The Alpha uncoils from the dark — far larger than its kin.' },
                    { type: 'battle', enemies: [{ key: bossKey, level: bossLvl }] },
                    { type: 'text', text: 'The Alpha falls. The dungeon goes still.' }, { type: 'despawn' },
                    // fine-grained run loop: advance, then clear (past boss) vs. enter next
                    { type: 'run', op: 'deeper' },
                    { type: 'conditional', cond: { kind: 'run', check: 'cleared' },
                        then: [{ type: 'run', op: 'end', reason: 'cleared' }],
                        else: [{ type: 'gendungeon' }] }] });
        } else {
            b.setp(ax, ay, GID.stairs, false);
            b.events.push({ x: ax, y: ay, name: 'StairsDown', trigger: 'action', through: false,
                graphic: { sprite: 'Other3', file: 'rtp/Other3.png', frame_w: 32, frame_h: 32, cols: 3, rows: 4, single: false },
                commands: [{ type: 'text', text: 'Stairs spiral deeper into the dark.' },
                    // fine-grained run loop: advance one floor, then clear vs. enter next
                    { type: 'run', op: 'deeper' },
                    { type: 'conditional', cond: { kind: 'run', check: 'cleared' },
                        then: [{ type: 'run', op: 'end', reason: 'cleared' }],
                        else: [{ type: 'gendungeon' }] }] });
        }

        // roaming encounters in body rooms, scaled by depth. The act node tunes
        // density (encMult: rest=0/treasure=0.3/elite≥1) and enemy level (lvlBonus).
        var body = rooms.filter(function (r) { return r !== rooms[0] && r !== alpha; });
        var maxd = rooms.reduce(function (m, r) { return Math.max(m, far(r)); }, 1) || 1;
        var sprites = ['Monster1', 'Monster3'];
        var encRate = bio.encounterRate * encMult;
        for (var r1 = 0; r1 < body.length; r1++) {
            if (rng.random() < encRate) {
                var depth = far(body[r1]) / maxd, lvl = Math.max(1, tier + lvlBonus + ((depth * 2 + rng.random()) | 0));
                var sf = b._roomFloor(body[r1]);
                if (sf[0] !== null) b.placeMonster(sf[0], sf[1], rng.choice(pool), lvl, rng.choice(sprites), creatures);
            }
        }
        // ELITE node: a guaranteed tougher roamer in the deepest body room.
        if (node.elite && body.length) {
            var eroom = body.slice().sort(function (a, c) { return far(c) - far(a); })[0];
            var ef = b._roomFloor(eroom);
            if (ef[0] !== null) b.placeMonster(ef[0], ef[1], rng.choice(pool), Math.max(2, tier + lvlBonus + 2), 'Monster2', creatures);
        }
        // REST node: no extra loot churn — a campfire refuge instead (placed below).
        // chests reward the deep / dead-end rooms (treasure node = extra chest).
        var chestN = 1 + tier + (node.treasure ? 1 : 0);
        var loot = body.slice().sort(function (a, c) { return far(c) - far(a); }).slice(0, chestN);
        for (var l = 0; l < loot.length; l++) {
            var cf = b._roomFloor(loot[l], true, true);
            if (cf[0] !== null) b.placeChest(cf[0], cf[1], rng.randint(40, 80) * (1 + ((far(loot[l]) / maxd * 2) | 0)), rng.choice([null, 'potion', 'bandage', 'ration', 'ether']));
        }
        // relic cache in the deepest body room (run-reward layer). Elite/treasure
        // nodes guarantee a second cache (richer reward for the harder/lucky floor).
        if (loot.length) { var rf = b._roomFloor(loot[0], true, true); if (rf[0] !== null) b.placeRelicCache(rf[0], rf[1], 3); }
        if (node.guaranteedRelic && loot.length > 1) { var rf2 = b._roomFloor(loot[1], true, true); if (rf2[0] !== null) b.placeRelicCache(rf2[0], rf2[1], 3); }
        // REST node: a campfire refuge (full heal once) in a body room.
        if (node.rest && body.length) { var rr = b._roomFloor(body[(body.length / 2) | 0] || body[0]); if (rr[0] !== null) b.placeCampfire(rr[0], rr[1]); }
        // hidden hazards in open floor cells
        var walkCells = [];
        for (var ci = 0; ci < w * h; ci++) {
            if (b.walk[ci] && !b.coll[ci] && b.over[ci] === -1) {
                var wx = ci % w, wy = (ci / w) | 0, taken = false;
                for (var ee = 0; ee < b.events.length; ee++) if (b.events[ee].x === wx && b.events[ee].y === wy) { taken = true; break; }
                if (!taken) walkCells.push([wx, wy]);
            }
        }
        rng.shuffle(walkCells);
        var sensorW = bio.hazard.sensorWeight != null ? bio.hazard.sensorWeight : 0.4;
        var trapN = node.rest ? 0 : (3 + tier);     // a refuge has no hazards
        for (var tt = 0; tt < trapN && tt < walkCells.length; tt++) b.placeTrap(walkCells[tt][0], walkCells[tt][1], rng.random() < sensorW ? 'sensor' : 'spike', bio.hazard);
        // pillars in big halls + light clutter
        for (var rp = 0; rp < rooms.length; rp++) {
            var room = rooms[rp];
            if (room[2] >= 7 && room[3] >= 5) {
                var dxs = [-((room[2] / 2 | 0)) + 1, (room[2] / 2 | 0) - 1], pys = [room[1] - (room[3] / 2 | 0) + 1, room[1] + (room[3] / 2 | 0) - 1];
                for (var di = 0; di < 2; di++) for (var pi = 0; pi < 2; pi++) {
                    var px = room[0] + dxs[di], py = pys[pi];
                    if (b.inb(px, py) && b.over[py * w + px] === -1 && b._isOpen(px, py)) b.setp(px, py, GID.pillar, true);
                }
            }
        }
        for (var bp = 0; bp < bio.props.length; bp++) {
            var prop = bio.props[bp], pgid = GID[prop.gid];
            if (pgid == null) continue;
            // first prop type gets a small depth bump (tier) like the old crystal scatter
            b.scatterInRooms(pgid, (prop.count | 0) + (bp === 0 ? tier : 0), !!prop.block);
        }
        b.repairPropConnectivity();

        return assemble(b, name, region);
    }

    // pack the builder into engine-ready { map, layout }
    function assemble(b, name, region) {
        var lid = 'LAYOUT_' + name.toUpperCase(), mid = 'MAP_' + name.toUpperCase();
        var layout = { id: lid, width: b.W, height: b.H, tileset: GROUND,
            tileset_group: [{ name: GROUND, offset: 0, count: GROUND_N }],
            metatiles: b.meta, collision: b.coll, terrain: new Array(b.W * b.H).fill(''),
            overlay_tileset: PROPS, overlay: b.over, tileSize: T };
        var events = b.events.map(function (e, i) {
            return { id: i + 1, name: e.name || ('Event' + (i + 1)), x: e.x, y: e.y,
                graphic: e.graphic || { sprite: '', file: '', single: true },
                dir: e.dir || 'down', trigger: e.trigger || 'action', through: !!e.through,
                behavior: e.behavior, commands: e.commands || [{ type: 'text', text: 'The dark presses in.' }] };
        });
        var start = null, j;
        for (j = 0; j < events.length; j++) if (events[j].name === 'Entrance') { start = { x: events[j].x, y: events[j].y }; break; }
        if (!start || b.coll[start.y * b.W + start.x]) for (j = 0; j < b.coll.length; j++) if (!b.coll[j]) { start = { x: j % b.W, y: (j / b.W) | 0 }; break; }
        var map = { id: mid, name: name, region: region, parent: '', layout: lid,
            music: 'MUS_NONE', weather: 'WEATHER_NONE', map_type: 'MAP_TYPE_DUNGEON',
            allow_running: true, show_map_name: true, connections: [], start: start,
            npcs: [], warps: [], triggers: [], signs: [], events: events };
        return { map: map, layout: layout };
    }

    var GameMapGen = { generateFloor: generateFloor, _Builder: Builder };
    root.GameMapGen = GameMapGen;
    if (typeof module !== 'undefined' && module.exports) module.exports = GameMapGen;
})(typeof window !== 'undefined' ? window : globalThis);
