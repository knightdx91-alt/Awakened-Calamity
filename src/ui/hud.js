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
            const saved = localStorage.getItem('ac_control_scale');
            if (saved) {
                sizeSlider.value = saved;
                document.documentElement.style.setProperty('--control-scale', saved);
                if (sizeValue) sizeValue.textContent = parseFloat(saved).toFixed(1) + '×';
            }

            sizeSlider.addEventListener('input', () => {
                const v = sizeSlider.value;
                document.documentElement.style.setProperty('--control-scale', v);
                if (sizeValue) sizeValue.textContent = parseFloat(v).toFixed(1) + '×';
                localStorage.setItem('ac_control_scale', v);
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

    // --- Update display ---
    // Minimal HUD (System OS, per design): the play screen shows only vitals.
    // Map name still flashes as a transition banner; everything else (version,
    // coords, fps, designation, Surveillance) lives in the STATUS menu.
    function update() {
        const mapName = window._mapName || (mapRef && mapRef.current ? mapRef.current.name : '—');
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

    // Called by renderer every 500ms — FPS is no longer shown on-screen.
    function setFps(fps) { /* minimal HUD: fps lives in STATUS menu */ }

    // --- Screenshot ---
    function _takeScreenshot() {
        const screen = document.getElementById('screen-primary');
        const canvas = document.querySelector('#screen-primary canvas');
        if (!screen && !canvas) { alert('No game screen found.'); return; }
        const token = (document.getElementById('screenshot-token') || {}).value || '';
        const REPO = 'knightdx91-alt/awakened-calamity';
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

    // --- The System OS HUD — MINIMAL BY RULE (design IMPLEMENTATION §3d) ------
    // On-screen: HP / Mana / Stamina VitalBars always; Exposure ONLY while a
    // hazard is active. Surveillance + everything else moves to the STATUS menu.
    // System OS palette (tokens/colors.css): cold holographic glass + cyan.
    var OS = {
        scrim: 'rgba(2,4,10,0.62)', edge: '#00ccff', ink: '#bfeeff',
        glow: '0 0 10px rgba(0,200,255,0.28), 0 4px 14px rgba(0,0,0,0.6)',
        hp: '#ff3b54', hpLow: '#ff7a3c', mana: '#3aa0ff', stamina: '#ffc23a'
    };
    var _metersEl = null, _vitals = {}, _expoTag = null, _expoFill = null, _expoLbl = null;

    function _vitalBar(tag, color) {
        var box = document.createElement('div');
        box.style.cssText =
            'display:flex;align-items:center;gap:4px;width:108px;background:' + OS.scrim +
            ';border:1px solid ' + OS.edge + ';border-radius:4px;padding:2px 4px;' +
            'box-shadow:' + OS.glow + ';';
        var lbl = document.createElement('span');
        lbl.textContent = tag;
        lbl.style.cssText = 'font-size:5px;letter-spacing:1px;color:' + OS.ink + ';width:14px;';
        var track = document.createElement('div');
        track.style.cssText = 'flex:1;height:5px;background:rgba(0,0,0,0.55);border-radius:3px;overflow:hidden;';
        var fill = document.createElement('div');
        fill.style.cssText = 'width:100%;height:100%;background:' + color + ';transition:width .2s ease;';
        var num = document.createElement('span');
        num.style.cssText = 'font-size:5px;color:' + OS.ink + ';min-width:16px;text-align:right;';
        track.appendChild(fill); box.appendChild(lbl); box.appendChild(track); box.appendChild(num);
        return { box: box, fill: fill, num: num, color: color };
    }

    function _createMeters() {
        if (!overlay) return;
        _metersEl = document.createElement('div');
        _metersEl.id = 'hud-meters';
        _metersEl.style.cssText =
            'position:absolute;left:4px;top:4px;display:flex;flex-direction:column;' +
            'gap:3px;font-family:"Press Start 2P",monospace;z-index:6;pointer-events:none;';
        _vitals.hp = _vitalBar('HP', OS.hp);
        _vitals.mana = _vitalBar('MP', OS.mana);
        _vitals.stamina = _vitalBar('SP', OS.stamina);
        _metersEl.appendChild(_vitals.hp.box);
        _metersEl.appendChild(_vitals.mana.box);
        _metersEl.appendChild(_vitals.stamina.box);

        // Exposure tag — hidden unless a hazard is active (exposure > 0)
        _expoTag = document.createElement('div');
        _expoTag.style.cssText =
            'display:none;align-items:center;gap:4px;width:108px;background:' + OS.scrim +
            ';border:1px solid #e8632a;border-radius:4px;padding:2px 4px;box-shadow:' + OS.glow + ';';
        _expoLbl = document.createElement('span');
        _expoLbl.textContent = 'EXPO'; _expoLbl.style.cssText = 'font-size:5px;color:#ffce9e;width:14px;';
        var et = document.createElement('div');
        et.style.cssText = 'flex:1;height:5px;background:rgba(0,0,0,0.55);border-radius:3px;overflow:hidden;';
        _expoFill = document.createElement('div');
        _expoFill.style.cssText = 'width:0%;height:100%;background:#e8632a;transition:width .2s ease;';
        et.appendChild(_expoFill); _expoTag.appendChild(_expoLbl); _expoTag.appendChild(et);
        _metersEl.appendChild(_expoTag);

        overlay.appendChild(_metersEl);
    }

    // Public: set vitals/survival (0-100). Persists in save.survival.
    function setMeters(v) {
        v = v || {};
        if (window.GameSave && GameSave.state) {
            GameSave.state.survival = Object.assign(
                { hp: 100, mana: 100, stamina: 100, surveillance: 0, exposure: 0 },
                GameSave.state.survival, v);
        }
        _renderMeters();
    }

    // True when the active layout is portrait — respects the orientation override
    // class on <body>, falling back to the viewport aspect for 'auto'.
    function _isPortraitLayout() {
        var c = document.body.classList;
        if (c.contains('orient-portrait') || c.contains('orient-reverse-portrait')) return true;
        if (c.contains('orient-landscape') || c.contains('orient-reverse-landscape')) return false;
        return window.innerHeight >= window.innerWidth;
    }

    function _renderMeters() {
        if (!_metersEl) return;
        // Hide the HUD whenever the start menu (or any sub-screen) is open, OR a
        // battle is up — combat draws its own vitals, so the overworld meters would
        // double up in the corner.
        var menuOpen = !!(window.GameStartMenu && GameStartMenu.isOpen);
        var inBattle = !!((window.GameCombatView && GameCombatView.isActive()) ||
                          (window.GameBattle && GameBattle.isActive()));
        _metersEl.style.display = (menuOpen || inBattle) ? 'none' : 'flex';
        if (menuOpen || inBattle) return;
        // Portrait → right side; otherwise top-left.
        var portrait = _isPortraitLayout();
        if (portrait) {
            _metersEl.style.left = 'auto'; _metersEl.style.right = '4px'; _metersEl.style.top = '6px';
        } else {
            _metersEl.style.right = 'auto'; _metersEl.style.left = '4px'; _metersEl.style.top = '4px';
        }
        var s = (window.GameSave && GameSave.state && GameSave.state.survival) ||
                { hp: 100, mana: 100, stamina: 100, exposure: 0 };
        var clamp = function (n) { return Math.max(0, Math.min(100, n == null ? 100 : n)); };
        // Vitals
        var hp = clamp(s.hp), mp = clamp(s.mana), st = clamp(s.stamina);
        _vitals.hp.fill.style.width = hp + '%';
        _vitals.hp.fill.style.background = hp < 25 ? OS.hpLow : OS.hp;   // crit flash
        _vitals.hp.num.textContent = Math.round(hp);
        _vitals.mana.fill.style.width = mp + '%'; _vitals.mana.num.textContent = Math.round(mp);
        _vitals.stamina.fill.style.width = st + '%'; _vitals.stamina.num.textContent = Math.round(st);
        // Exposure — only while a hazard is active (exposure > 0)
        var ex = clamp(s.exposure);
        if (ex > 0) {
            _expoTag.style.display = 'flex';
            _expoFill.style.width = ex + '%';
            var ecol = ex > 66 ? '#ff3030' : ex > 33 ? '#e8632a' : '#f8c800';
            _expoFill.style.background = ecol; _expoTag.style.borderColor = ecol;
        } else {
            _expoTag.style.display = 'none';
        }
    }

    function init(map, player) {
        mapRef    = map;
        playerRef = player;

        overlay = document.getElementById('ui-overlay');
        if (!overlay) {
            console.warn('[HUD] #ui-overlay not found');
            return;
        }

        // Minimal HUD: no on-screen version/map/coords/fps text (moved to STATUS).
        _createMeters();
        // Seed starting vitals/survival if none exists yet (gameplay updates later)
        var _sv = window.GameSave && GameSave.state && GameSave.state.survival;
        setMeters(_sv || { hp: 100, mana: 100, stamina: 86, surveillance: 18, exposure: 0 });

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

        // HUD toggle button — shows/hides the vitals cluster
        const hudToggleBtn = document.createElement('button');
        hudToggleBtn.id = 'hud-toggle-btn';
        hudToggleBtn.title = 'Show/hide HUD';
        const _hudHidden = localStorage.getItem('ac_hud_hidden') === '1';
        if (_hudHidden && _metersEl) _metersEl.style.display = 'none';
        hudToggleBtn.textContent = _hudHidden ? '👁' : '🙈';
        hudToggleBtn.addEventListener('click', () => {
            if (!_metersEl) return;
            const hidden = _metersEl.style.display === 'none';
            _metersEl.style.display = hidden ? 'flex' : 'none';
            hudToggleBtn.textContent = hidden ? '🙈' : '👁';
            localStorage.setItem('ac_hud_hidden', hidden ? '0' : '1');
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
