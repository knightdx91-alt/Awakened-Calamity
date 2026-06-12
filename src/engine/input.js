// GameInput — keyboard, joystick, and on-screen button input
// On-screen d-pad is handled zone-based in controls.js via direct state mutation.
window.GameInput = (function () {

    const state = {
        up: false, down: false, left: false, right: false,
        a: false, b: false, start: false, select: false, l: false, r: false
    };

    // justPressed: latches true on press, cleared by consumeJustPressed().
    // Guarantees a quick tap is seen by the game loop even if released before the next rAF.
    const justPressed = {
        up: false, down: false, left: false, right: false,
        a: false, b: false, start: false, select: false, l: false, r: false
    };

    function _setPressed(btn) {
        state[btn] = true;
        justPressed[btn] = true;
    }

    function _clearPressed(btn) {
        state[btn] = false;
    }

    function consumeJustPressed() {
        for (const k in justPressed) justPressed[k] = false;
    }

    const KEY_MAP = {
        ArrowUp: 'up',    w: 'up',    W: 'up',
        ArrowDown: 'down', s: 'down',  S: 'down',
        ArrowLeft: 'left', a: 'left',  A: 'left',
        ArrowRight: 'right', d: 'right', D: 'right',
        z: 'a', Z: 'a', Enter: 'a',
        x: 'b', X: 'b', Backspace: 'b',
        ' ': 'start',
        Shift: 'select',
        q: 'l', Q: 'l',
        e: 'r', E: 'r'
    };

    function init() {
        window.addEventListener('keydown', function (e) {
            const btn = KEY_MAP[e.key];
            if (btn) { _setPressed(btn); e.preventDefault(); }
        });
        window.addEventListener('keyup', function (e) {
            const btn = KEY_MAP[e.key];
            if (btn) _clearPressed(btn);
        });
    }

    // Joystick: analog stick mapped to 4 directions via Pointer Events.
    function bindJoystick(baseEl, thumbEl) {
        const active   = new Map(); // pointerId -> {x, y}
        const RADIUS   = 40;
        const DEADZONE = 18;
        const DIRS     = ['up', 'down', 'left', 'right'];

        function flush() {
            DIRS.forEach(function (d) { _clearPressed(d); });
            thumbEl.style.transform = 'translate(-50%, -50%)';
            if (active.size === 0) return;
            const pt    = active.values().next().value;
            const dx    = pt.x - originX;
            const dy    = pt.y - originY;
            const dist  = Math.hypot(dx, dy);
            const clamp = Math.min(dist, RADIUS);
            const angle = Math.atan2(dy, dx);
            thumbEl.style.transform =
                'translate(calc(-50% + ' + (Math.cos(angle) * clamp) + 'px),' +
                          ' calc(-50% + ' + (Math.sin(angle) * clamp) + 'px))';
            if (dist >= DEADZONE) {
                if (Math.abs(dx) >= Math.abs(dy)) _setPressed(dx > 0 ? 'right' : 'left');
                else                               _setPressed(dy > 0 ? 'down'  : 'up');
            }
        }

        let originX = 0, originY = 0;

        baseEl.addEventListener('pointerdown', function (e) {
            if (e.cancelable) e.preventDefault();
            baseEl.setPointerCapture(e.pointerId);
            const r = baseEl.getBoundingClientRect();
            originX = r.left + r.width  / 2;
            originY = r.top  + r.height / 2;
            active.set(e.pointerId, { x: e.clientX, y: e.clientY });
            flush();
        });
        baseEl.addEventListener('pointermove', function (e) {
            if (!active.has(e.pointerId)) return;
            if (e.cancelable) e.preventDefault();
            active.set(e.pointerId, { x: e.clientX, y: e.clientY });
            flush();
        });
        baseEl.addEventListener('pointerup',     function (e) { active.delete(e.pointerId); flush(); });
        baseEl.addEventListener('pointercancel', function (e) { active.delete(e.pointerId); flush(); });
    }

    return { state, justPressed, consumeJustPressed, init, bindJoystick };
})();
