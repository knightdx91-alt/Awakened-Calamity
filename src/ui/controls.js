// GameControls — wires static HTML gamepad buttons to GameInput.
window.GameControls = (function () {
    'use strict';

    var mode = 'dpad';

    function _wire(id, key) {
        var el = document.getElementById(id);
        if (!el) return;

        el.style.pointerEvents = 'auto';
        el.style.touchAction   = 'none';

        el.addEventListener('pointerdown', function (e) {
            if (window.GameInput) {
                GameInput.state[key]       = true;
                GameInput.justPressed[key] = true;
            }
            e.preventDefault();
            try { el.setPointerCapture(e.pointerId); } catch (_) {}
        });

        el.addEventListener('pointerup',          function () { if (window.GameInput) GameInput.state[key] = false; });
        el.addEventListener('pointercancel',       function () { if (window.GameInput) GameInput.state[key] = false; });
        el.addEventListener('lostpointercapture', function () { if (window.GameInput) GameInput.state[key] = false; });
    }

    function init() {
        _wire('gp-up',     'up');
        _wire('gp-down',   'down');
        _wire('gp-left',   'left');
        _wire('gp-right',  'right');
        _wire('gp-a',      'a');
        _wire('gp-b',      'b');
        _wire('gp-l',      'l');
        _wire('gp-r',      'r');
        _wire('gp-start',  'start');
        _wire('gp-select', 'select');
    }

    function setMode(m)       { mode = m; }
    function rebuild()        {}
    function toggleEditMode() {}
    function setEditMode()    {}
    function resetLayout()    {}

    return { init, setMode, rebuild, toggleEditMode, setEditMode, resetLayout,
             get mode() { return mode; } };
})();
