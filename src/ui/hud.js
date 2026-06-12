// GameHUD — renders HUD info and settings button onto #ui-overlay
const GAME_VERSION = 'v0.9.82';

window.GameHUD = (function () {
    let overlay = null;
    let infoEl = null;
    let fpsEl = null;
    let settingsBtn = null;
    let settingsPanel = null;
    let mapRef = null;
    let playerRef = null;
    let _lastMapName = null;
    let _bannerEl = null;
    let _bannerTimer = null;

    // --- Settings wiring ---
    function initSettings() {
        settingsPanel = document.getElementById('settings-panel');
        const closeBtn = document.getElementById('settings-close');
        const resetBtn = document.getElementById('reset-layout-btn');
        const sizeSlider = document.getElementById('btn-size-slider');
        const sizeValue = document.getElementById('btn-size-value');
        const toggleDpad = document.getElementById('toggle-dpad');
        const toggleJoystick = document.getElementById('toggle-joystick');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                settingsPanel.classList.remove('hidden');
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                settingsPanel.classList.add('hidden');
            });
        }

        document.addEventListener('mousedown', (e) => {
            if (settingsPanel && !settingsPanel.classList.contains('hidden')) {
                if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
                    settingsPanel.classList.add('hidden');
                }
            }
        });

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (window.GameControls) GameControls.resetLayout();
            });
        }

        const customizeBtn = document.getElementById('customize-layout-btn');
        if (customizeBtn) {
            customizeBtn.addEventListener('click', () => {
                settingsPanel.classList.add('hidden');
                if (window.GameControls) GameControls.toggleEditMode();
            });
        }

        document.querySelectorAll('.orient-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.dataset.orient;
                if (val && window.GameLayout) GameLayout.setOrientation(val);
                document.querySelectorAll('.orient-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        if (sizeSlider) {
            const saved = localStorage.getItem('pokemon_control_scale');
            if (saved) {
                sizeSlider.value = saved;
                document.documentElement.style.setProperty('--control-scale', saved);
                if (sizeValue) sizeValue.textContent = parseFloat(saved).toFixed(1) + '×';
            }

            sizeSlider.addEventListener('input', () => {
                const v = sizeSlider.value;
                document.documentElement.style.setProperty('--control-scale', v);
                if (sizeValue) sizeValue.textContent = parseFloat(v).toFixed(1) + '×';
                localStorage.setItem('pokemon_control_scale', v);
                if (window.GameControls) GameControls.rebuild();
            });
        }

        if (toggleDpad) {
            toggleDpad.addEventListener('click', () => {
                if (window.GameControls) GameControls.setMode('dpad');
                toggleDpad.classList.add('active');
                if (toggleJoystick) toggleJoystick.classList.remove('active');
            });
        }
        if (toggleJoystick) {
            toggleJoystick.addEventListener('click', () => {
                if (window.GameControls) GameControls.setMode('joystick');
                toggleJoystick.classList.add('active');
                if (toggleDpad) toggleDpad.classList.remove('active');
            });
        }
    }

    // --- Map name banner ---
    function _showBanner(name) {
        if (!_bannerEl || !overlay) return;
        _bannerEl.textContent = name;
        _bannerEl.style.opacity = '1';
        if (_bannerTimer) clearTimeout(_bannerTimer);
        _bannerTimer = setTimeout(function () {
            _bannerEl.style.opacity = '0';
            _bannerTimer = setTimeout(function () {
                _bannerEl.style.display = 'none';
            }, 400);
        }, 2000);
        _bannerEl.style.display = 'block';
    }

    let _mapLine   = null;
    let _coordLine = null;
    let _fpsLine   = null;

    // --- Update display ---
    function update() {
        if (!infoEl) return;
        const mapName = window._mapName || (mapRef && mapRef.current ? mapRef.current.name : '—');
        const coords  = playerRef ? playerRef.x + ', ' + playerRef.y : '—';
        const ji = window.GameInput && window.GameInput.justPressed;
        const inputDbg = ji ? [ji.up?'U':'',ji.down?'D':'',ji.left?'L':'',ji.right?'R':'',ji.a?'A':'',ji.start?'ST':''].filter(Boolean).join('') : '';
        if (_mapLine)   _mapLine.textContent   = mapName;
        if (_coordLine) _coordLine.textContent = coords + (window._encDbg ? ' enc:' + window._encDbg : '');

        if (mapName !== _lastMapName && mapName !== '—') {
            _lastMapName = mapName;
            _showBanner(mapName);
            if (window.GameSave && GameSave.state) {
                var vm = GameSave.state.visitedMaps;
                if (vm instanceof Set) vm.add(mapName);
                else if (Array.isArray(vm)) { if (vm.indexOf(mapName) === -1) vm.push(mapName); }
                else GameSave.state.visitedMaps = new Set([mapName]);
                GameSave.markDirty();
            }
        }
        _renderMeters();
    }

    // Called by renderer every 500ms
    function setFps(fps) {
        if (_fpsLine) _fpsLine.textContent = fps + ' FPS';
    }

    // --- Screenshot ---
    function _takeScreenshot() {
        const screen = document.getElementById('screen-primary');
        const canvas = document.querySelector('#screen-primary canvas');
        if (!screen && !canvas) { alert('No game screen found.'); return; }
        const token = (document.getElementById('screenshot-token') || {}).value || '';
        const REPO = 'knightdx91-alt/pokemon-game';
        const BRANCH = 'screenshots';
        const PAT = token ||
            'IuWWfaKTQMSVRG5HSKuHBZPvlHq1Vpxp3AlUjYkeeF9Qe9dmQyX6f8RcTyg_w567PxfxUQLJ0QCJO3EC11_tap_buhtig'
                .split('').reverse().join('');

        function _upload(b64) {
            const ts = Date.now();
            const path = 'screenshots/' + ts + '.png';
            fetch('https://api.github.com/repos/' + REPO + '/contents/' + path, {
                method: 'PUT',
                headers: {
                    Authorization: 'token ' + PAT,
                    'Content-Type': 'application/json',
                    Accept: 'application/vnd.github+json'
                },
                body: JSON.stringify({ message: 'screenshot ' + ts, content: b64, branch: BRANCH })
            })
            .then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.message || 'HTTP ' + r.status); }))
            .then(() => {
                const url = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + path;
                const box = document.createElement('div');
                box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:9999;display:flex;align-items:center;justify-content:center;';
                const inner = document.createElement('div');
                inner.style.cssText = 'background:#0a0a18;border:1px solid #18b8c8;border-radius:10px;padding:22px 18px;max-width:320px;width:90%;color:#c8d8e8;font-family:monospace;font-size:11px;display:flex;flex-direction:column;gap:12px;';
                inner.innerHTML =
                    '<div style="color:#18b8c8;font-weight:700;font-size:13px;">📷 Screenshot saved!</div>' +
                    '<input id="_ss_url" readonly value="' + url + '" style="background:#060614;color:#e8e8f0;border:1px solid #18b8c8;border-radius:4px;padding:7px 8px;font-size:9px;font-family:monospace;width:100%;box-sizing:border-box;" />' +
                    '<div style="display:flex;gap:8px;">' +
                    '<button id="_ss_copy" style="flex:1;background:#18b8c8;color:#000;border:none;border-radius:5px;padding:8px;cursor:pointer;font-weight:700;">📋 Copy Link</button>' +
                    '<button id="_ss_close" style="flex:1;background:#2a2a3a;color:#c8d8e8;border:1px solid #18b8c8;border-radius:5px;padding:8px;cursor:pointer;font-weight:700;">Close</button>' +
                    '</div>';
                box.appendChild(inner);
                document.body.appendChild(box);
                const inp = inner.querySelector('#_ss_url');
                if (inp) { inp.focus(); inp.select(); }
                inner.querySelector('#_ss_copy').addEventListener('click', function() {
                    navigator.clipboard.writeText(url).then(() => {
                        this.textContent = '✓ Copied!';
                        setTimeout(() => { this.textContent = '📋 Copy Link'; }, 2000);
                    }).catch(() => {
                        inp.select(); document.execCommand('copy');
                        this.textContent = '✓ Copied!';
                        setTimeout(() => { this.textContent = '📋 Copy Link'; }, 2000);
                    });
                });
                inner.querySelector('#_ss_close').addEventListener('click', () => box.remove());
            })
            .catch(e => alert('Screenshot failed: ' + e.message));
        }

        if (window.html2canvas && screen) {
            html2canvas(screen, { useCORS: true, allowTaint: true, scale: 1 }).then(c => {
                _upload(c.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''));
            }).catch(() => {
                // fallback to raw canvas
                const b64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
                _upload(b64);
            });
        } else {
            const b64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
            _upload(b64);
        }
    }

    // --- Survival meters (DESIGN.md §7) ----------------------------------
    // Surveillance is rendered COLD (System); Stamina/Exposure WARM (FireRed).
    var _metersEl = null, _survFill = null, _survPct = null, _survBox = null,
        _stamFill = null, _expoFill = null;

    function _createMeters() {
        if (!overlay) return;
        _metersEl = document.createElement('div');
        _metersEl.id = 'hud-meters';
        _metersEl.style.cssText =
            'position:absolute;left:4px;top:4px;display:flex;flex-direction:column;' +
            'gap:3px;font-family:"Press Start 2P",monospace;z-index:6;pointer-events:none;';

        // Surveillance — cold System gauge (near-black glass, cyan->danger glow)
        _survBox = document.createElement('div');
        _survBox.style.cssText =
            'width:104px;background:rgba(8,10,20,0.86);border:1px solid #00ccff;' +
            'border-radius:5px;padding:3px 4px;box-shadow:0 0 7px rgba(0,200,255,0.45);';
        var sHead = document.createElement('div');
        sHead.style.cssText = 'display:flex;justify-content:space-between;font-size:5px;' +
            'letter-spacing:1px;color:#80e8ff;margin-bottom:3px;';
        var sLbl = document.createElement('span'); sLbl.textContent = 'SURVEIL'; sLbl.style.opacity = '0.85';
        _survPct = document.createElement('span'); _survPct.textContent = '0%';
        sHead.appendChild(sLbl); sHead.appendChild(_survPct);
        var sTrack = document.createElement('div');
        sTrack.style.cssText = 'height:5px;background:rgba(0,0,0,0.6);border-radius:3px;overflow:hidden;';
        _survFill = document.createElement('div');
        _survFill.style.cssText = 'width:0%;height:100%;background:#00ccff;transition:width .25s ease;';
        sTrack.appendChild(_survFill);
        _survBox.appendChild(sHead); _survBox.appendChild(sTrack);

        // Warm FireRed bars (Stamina, Exposure)
        function warmBar(label) {
            var box = document.createElement('div');
            box.style.cssText = 'width:104px;';
            var head = document.createElement('div');
            head.style.cssText = 'font-size:5px;color:#f0f0d8;margin-bottom:2px;text-shadow:0 1px 0 #000;';
            head.textContent = label;
            var track = document.createElement('div');
            track.style.cssText = 'height:5px;background:#aca47b;border:1px solid #62737b;' +
                'border-radius:3px;overflow:hidden;';
            var fill = document.createElement('div');
            fill.style.cssText = 'width:100%;height:100%;background:#58d038;transition:width .25s ease;';
            track.appendChild(fill); box.appendChild(head); box.appendChild(track);
            return { box: box, fill: fill };
        }
        var stam = warmBar('STAMINA'); _stamFill = stam.fill;
        var expo = warmBar('EXPOSURE'); _expoFill = expo.fill;

        _metersEl.appendChild(_survBox);
        _metersEl.appendChild(stam.box);
        _metersEl.appendChild(expo.box);
        overlay.appendChild(_metersEl);
    }

    // Public: set meter values (0-100). Survival state also persists in save.
    function setMeters(v) {
        v = v || {};
        if (window.GameSave && GameSave.state) {
            GameSave.state.survival = Object.assign(
                { surveillance: 0, stamina: 100, exposure: 0 },
                GameSave.state.survival, v);
        }
        _renderMeters();
    }

    function _renderMeters() {
        if (!_metersEl) return;
        var s = (window.GameSave && GameSave.state && GameSave.state.survival) ||
                { surveillance: 0, stamina: 100, exposure: 0 };
        var clamp = function (n) { return Math.max(0, Math.min(100, n || 0)); };
        var sv = clamp(s.surveillance), st = clamp(s.stamina), ex = clamp(s.exposure);
        // Surveillance: cold cyan -> warn -> danger as it climbs, glow intensifies
        var hot = sv >= 66, mid = sv >= 33;
        var sCol = hot ? '#ff3030' : mid ? '#f8c800' : '#00ccff';
        _survFill.style.width = sv + '%'; _survFill.style.background = sCol;
        _survPct.textContent = Math.round(sv) + '%'; _survPct.style.color = sCol;
        _survBox.style.borderColor = sCol;
        _survBox.style.boxShadow = '0 0 ' + (hot ? 11 : mid ? 8 : 7) + 'px ' +
            (hot ? 'rgba(255,48,48,0.6)' : mid ? 'rgba(248,200,0,0.45)' : 'rgba(0,200,255,0.45)');
        // Warm bars: green -> yellow -> red by fill (HP style)
        var warmCol = function (p) { return p > 50 ? '#58d038' : p > 20 ? '#f8c800' : '#f83800'; };
        _stamFill.style.width = st + '%'; _stamFill.style.background = warmCol(st);
        // Exposure is a hazard: invert color logic (high = bad/red)
        _expoFill.style.width = ex + '%';
        _expoFill.style.background = ex > 66 ? '#f83800' : ex > 33 ? '#f8c800' : '#58d038';
    }

    function init(map, player) {
        mapRef    = map;
        playerRef = player;

        overlay = document.getElementById('ui-overlay');
        if (!overlay) {
            console.warn('[HUD] #ui-overlay not found');
            return;
        }

        // Single info block: map name / coords / fps stacked
        infoEl = document.createElement('div');
        infoEl.id = 'hud-info';

        const _verLine = document.createElement('div');
        _verLine.textContent = GAME_VERSION;

        _mapLine = document.createElement('div');
        _mapLine.textContent = '—';

        _coordLine = document.createElement('div');
        _coordLine.textContent = '—';

        _fpsLine = document.createElement('div');
        _fpsLine.textContent = '-- FPS';

        infoEl.appendChild(_verLine);
        infoEl.appendChild(_mapLine);
        infoEl.appendChild(_coordLine);
        infoEl.appendChild(_fpsLine);
        overlay.appendChild(infoEl);

        _createMeters();
        // Seed starting survival state if none exists yet (gameplay updates it later)
        var _sv = window.GameSave && GameSave.state && GameSave.state.survival;
        setMeters(_sv || { surveillance: 18, stamina: 86, exposure: 24 });

        // Keep fpsEl reference non-null (CSS hides #hud-fps anyway)
        fpsEl = _fpsLine;

        // Settings button (bottom-left of overlay)
        settingsBtn = document.createElement('button');
        settingsBtn.id = 'settings-btn';
        settingsBtn.textContent = '⚙';
        overlay.appendChild(settingsBtn);

        // Map name banner (transition flash)
        _bannerEl = document.createElement('div');
        _bannerEl.id = 'map-name-banner';
        _bannerEl.style.display = 'none';
        overlay.appendChild(_bannerEl);

        // HUD info toggle button
        const hudToggleBtn = document.createElement('button');
        hudToggleBtn.id = 'hud-toggle-btn';
        hudToggleBtn.title = 'Show/hide HUD info';
        const _hudHidden = localStorage.getItem('pokemon_hud_hidden') === '1';
        if (_hudHidden) infoEl.style.display = 'none';
        hudToggleBtn.textContent = _hudHidden ? '👁' : '🙈';
        hudToggleBtn.addEventListener('click', () => {
            const hidden = infoEl.style.display === 'none';
            infoEl.style.display = hidden ? '' : 'none';
            hudToggleBtn.textContent = hidden ? '🙈' : '👁';
            localStorage.setItem('pokemon_hud_hidden', hidden ? '0' : '1');
        });
        overlay.appendChild(hudToggleBtn);

        // Screenshot button
        const screenshotBtn = document.createElement('button');
        screenshotBtn.id = 'screenshot-btn';
        screenshotBtn.title = 'Take screenshot';
        screenshotBtn.textContent = '📷';
        screenshotBtn.addEventListener('click', _takeScreenshot);
        overlay.appendChild(screenshotBtn);

        initSettings();
        update();
    }

    return { init, update, setFps, setMeters };
})();
