// GameDialogue — GBA-style message window at bottom of screen
// Usage: GameDialogue.show([line1, line2, ...]) — player presses A to advance/close
window.GameDialogue = (function () {
    'use strict';

    let _boxEl    = null;   // outer frame
    let _textEl   = null;   // inner text area
    let _arrowEl  = null;   // ▼ advance indicator
    let _faceEl   = null;   // optional RTP face portrait
    let _lines    = [];     // queued dialogue lines
    let _idx      = 0;      // current line index
    let _typing   = false;  // typewriter in progress
    let _typeTimer = null;
    let _charIdx  = 0;

    // Dialogue database loaded lazily
    let _db       = null;
    let _dbLoading = false;

    const CHARS_PER_TICK = 2;   // characters per typewriter frame
    const TICK_MS        = 30;  // ms between typewriter ticks

    // --- DB ---
    function _loadDb(cb) {
        if (_db) { cb(_db); return; }
        if (_dbLoading) { setTimeout(function(){ _loadDb(cb); }, 100); return; }
        _dbLoading = true;
        fetch('data/scripts/dialogue.json')
            .then(function(r){ return r.ok ? r.json() : {}; })
            .then(function(d){ _db = d; _dbLoading = false; cb(_db); })
            .catch(function(){ _db = {}; _dbLoading = false; cb({}); });
    }

    // Look up script label across the current map's folder and all maps
    function getLines(mapName, scriptLabel) {
        if (!_db || !scriptLabel || scriptLabel === '0x0') return null;
        // Try exact map folder name first (FR uses PalletTown not pallet_town)
        // Map names in dialogue.json are folder names from pokefirered/data/maps/
        // Our map names may be camelCase matching folder names
        const folders = [mapName, mapName.replace(/_/g, '')];
        for (const folder of folders) {
            if (_db[folder] && _db[folder][scriptLabel]) {
                return _db[folder][scriptLabel];
            }
        }
        // Search all folders for this label
        for (const folder of Object.keys(_db)) {
            if (_db[folder][scriptLabel]) return _db[folder][scriptLabel];
        }
        return null;
    }

    // --- Typewriter ---
    function _typeChar() {
        if (!_textEl) return;
        const full = _lines[_idx] || '';
        if (_charIdx < full.length) {
            _textEl.textContent = full.slice(0, _charIdx + CHARS_PER_TICK);
            _charIdx = Math.min(_charIdx + CHARS_PER_TICK, full.length);
            _typeTimer = setTimeout(_typeChar, TICK_MS);
        } else {
            _typing = false;
            if (_arrowEl) _arrowEl.style.visibility = 'visible';
        }
    }

    function _showLine(idx) {
        if (!_boxEl || !_textEl) return;
        _idx = idx;
        _charIdx = 0;
        _typing = true;
        if (_arrowEl) _arrowEl.style.visibility = 'hidden';
        _textEl.textContent = '';
        clearTimeout(_typeTimer);
        _typeChar();
    }

    let _onCloseCallback = null;

    // --- Public ---
    function show(lines, onClose, opts) {
        if (!_boxEl) _build();
        if (!lines || !lines.length) { if (onClose) onClose(); return; }
        _onCloseCallback = onClose || null;
        _lines = lines;
        _idx   = 0;
        _setFace(opts && opts.face);
        _boxEl.style.display = 'block';
        _showLine(0);
    }

    function showScript(mapName, scriptLabel, onClose) {
        _loadDb(function(db) {
            const lines = getLines(mapName, scriptLabel);
            if (lines && lines.length) {
                show(lines, onClose);
            } else {
                show(['...'], onClose);
            }
        });
    }

    // Returns true if dialogue consumed the A press
    function advance() {
        if (!_boxEl || _boxEl.style.display === 'none') return false;
        if (_typing) {
            // Skip typewriter — show full line immediately
            clearTimeout(_typeTimer);
            _typing = false;
            if (_textEl) _textEl.textContent = _lines[_idx] || '';
            if (_arrowEl) _arrowEl.style.visibility = 'visible';
            return true;
        }
        // Advance to next line or close
        if (_idx + 1 < _lines.length) {
            _showLine(_idx + 1);
        } else {
            close();
        }
        return true;
    }

    function close() {
        if (!_boxEl) return;
        _boxEl.style.display = 'none';
        clearTimeout(_typeTimer);
        _lines = []; _idx = 0; _typing = false;
        const cb = _onCloseCallback;
        _onCloseCallback = null;
        if (cb) cb();
    }

    function isOpen() {
        return !!(_boxEl && _boxEl.style.display !== 'none');
    }

    // --- Build DOM ---
    function _build() {
        // Attach to #screen-primary so it clips to the game screen
        const screen = document.getElementById('screen-primary');
        if (!screen) return;

        _boxEl = document.createElement('div');
        _boxEl.id = 'dialogue-box';
        _boxEl.style.display = 'none';

        const inner = document.createElement('div');
        inner.id = 'dialogue-inner';

        _textEl = document.createElement('div');
        _textEl.id = 'dialogue-text';

        _arrowEl = document.createElement('div');
        _arrowEl.id = 'dialogue-arrow';
        _arrowEl.textContent = '▼';
        _arrowEl.style.visibility = 'hidden';

        // Optional RTP face portrait (left side). 96x96 cells, 4 per row.
        _faceEl = document.createElement('div');
        _faceEl.id = 'dialogue-face';
        _faceEl.style.cssText = 'display:none;flex:0 0 auto;width:52px;height:52px;' +
            'background-repeat:no-repeat;border-radius:4px;align-self:flex-start;margin-right:8px;' +
            'box-shadow:0 0 0 1px rgba(120,200,255,0.45);';
        inner.style.display = 'flex';
        inner.style.alignItems = 'flex-start';
        _textEl.style.flex = '1';
        inner.appendChild(_faceEl);
        inner.appendChild(_textEl);
        inner.appendChild(_arrowEl);
        _boxEl.appendChild(inner);
        screen.appendChild(_boxEl);
    }

    // face = { sheet:'Actor1', index:0 } -> crop the 96px cell from data/faces/rtp/<sheet>.png
    function _setFace(face) {
        if (!_faceEl) return;
        if (!face || !face.sheet) { _faceEl.style.display = 'none'; _faceEl.style.backgroundImage = ''; return; }
        var S = 52, idx = face.index || 0, col = idx % 4, row = (idx / 4) | 0;
        _faceEl.style.display = 'block';
        _faceEl.style.backgroundImage = "url('data/faces/rtp/" + face.sheet + ".png')";
        _faceEl.style.backgroundSize = (4 * S) + 'px ' + (2 * S) + 'px';   // sheet is 4x2 cells
        _faceEl.style.backgroundPosition = '-' + (col * S) + 'px -' + (row * S) + 'px';
    }

    function init() {
        _build();
        // Pre-load dialogue db in background
        _loadDb(function(){});
    }

    return { init, show, showScript, advance, close, isOpen, getLines };
})();
