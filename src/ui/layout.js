// GameLayout — orientation detection, drag/resize, position persistence
window.GameLayout = (function () {
    const STORAGE_KEY = 'pokemon_layout_v1';

    // Defaults per element id
    const DEFAULTS = {
        'screen-primary': { top: null, left: null, width: null, height: null },
        'screen-secondary': { top: null, left: null, width: null, height: null }
    };

    let savedLayout = {};

    // --- Orientation detection ---
    function getOrientation() {
        let type = '';
        if (screen.orientation && screen.orientation.type) {
            type = screen.orientation.type;
        } else if (typeof window.orientation !== 'undefined') {
            const a = window.orientation;
            if (a === 0)   type = 'portrait-primary';
            else if (a === 180) type = 'portrait-secondary';
            else if (a === 90)  type = 'landscape-primary';
            else if (a === -90) type = 'landscape-secondary';
        } else {
            type = window.innerWidth > window.innerHeight ? 'landscape-primary' : 'portrait-primary';
        }
        return type; // portrait-primary | portrait-secondary | landscape-primary | landscape-secondary
    }

    function isPortrait() {
        const o = getOrientation();
        return o.startsWith('portrait');
    }

    // --- Persistence ---
    function saveLayout() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLayout));
    }

    function loadLayout() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) savedLayout = JSON.parse(raw);
        } catch (e) {
            savedLayout = {};
        }
    }

    function applyElementLayout(el, key) {
        const data = savedLayout[key];
        if (!data) return;
        if (data.top  != null) el.style.top  = data.top;
        if (data.left != null) el.style.left = data.left;
        if (data.width  != null) el.style.width  = data.width;
        if (data.height != null) el.style.height = data.height;
    }

    // --- Drag logic ---
    function makeDraggable(el, handleEl) {
        let startX, startY, startElX, startElY;
        let dragging = false;

        function getPos(e) {
            return e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
                             : { x: e.clientX, y: e.clientY };
        }

        function onStart(e) {
            if (e.target.classList.contains('resize-handle')) return;
            dragging = true;
            const p = getPos(e);
            startX = p.x;
            startY = p.y;
            const rect = el.getBoundingClientRect();
            startElX = rect.left;
            startElY = rect.top;
            e.preventDefault();
        }

        function onMove(e) {
            if (!dragging) return;
            const p = getPos(e);
            const dx = p.x - startX;
            const dy = p.y - startY;
            const newLeft = startElX + dx;
            const newTop  = startElY + dy;
            el.style.left = newLeft + 'px';
            el.style.top  = newTop  + 'px';
            el.style.position = 'fixed';
            e.preventDefault();
        }

        function onEnd() {
            if (!dragging) return;
            dragging = false;
            const key = el.id;
            if (!savedLayout[key]) savedLayout[key] = {};
            savedLayout[key].left = el.style.left;
            savedLayout[key].top  = el.style.top;
            saveLayout();
        }

        (handleEl || el).addEventListener('mousedown', onStart);
        (handleEl || el).addEventListener('touchstart', onStart, { passive: false });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);
    }

    // --- Resize logic ---
    function makeResizable(el) {
        // Add a resize handle
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        el.appendChild(handle);

        let startX, startY, startW, startH;
        let resizing = false;

        function getPos(e) {
            return e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
                             : { x: e.clientX, y: e.clientY };
        }

        handle.addEventListener('mousedown', onStart);
        handle.addEventListener('touchstart', onStart, { passive: false });

        function onStart(e) {
            resizing = true;
            const p = getPos(e);
            startX = p.x;
            startY = p.y;
            startW = el.offsetWidth;
            startH = el.offsetHeight;
            e.preventDefault();
            e.stopPropagation();
        }

        function onMove(e) {
            if (!resizing) return;
            const p = getPos(e);
            const newW = Math.max(160, startW + (p.x - startX));
            const newH = Math.max(120, startH + (p.y - startY));
            el.style.width  = newW + 'px';
            el.style.height = newH + 'px';
            e.preventDefault();
        }

        function onEnd() {
            if (!resizing) return;
            resizing = false;
            const key = el.id;
            if (!savedLayout[key]) savedLayout[key] = {};
            savedLayout[key].width  = el.style.width;
            savedLayout[key].height = el.style.height;
            saveLayout();
        }

        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);
    }

    // --- Individual control button drag ---
    function makeControlDraggable(btn) {
        makeDraggable(btn, btn);
    }

    // --- Reflow layout on orientation change ---
    function reflow() {
        const portrait = isPortrait();
        const wrapper = document.getElementById('game-wrapper');
        const primary = document.getElementById('screen-primary');
        const secondary = document.getElementById('screen-secondary');

        if (wrapper) {
            wrapper.dataset.orientation = getOrientation();
        }

        // Always keep screens in normal flow — CSS handles layout per orientation class
        if (primary)   applyElementLayout(primary,   'screen-primary');
        if (secondary) applyElementLayout(secondary, 'screen-secondary');
    }

    function reset() {
        savedLayout = {};
        saveLayout();
        const primary   = document.getElementById('screen-primary');
        const secondary = document.getElementById('screen-secondary');
        if (primary) {
            primary.style.left = '';
            primary.style.top = '';
            primary.style.width = '';
            primary.style.height = '';
        }
        if (secondary) {
            secondary.style.left = '';
            secondary.style.top = '';
            secondary.style.width = '';
            secondary.style.height = '';
        }
        reflow();
    }

    // --- Orientation (real CSS rotation, like EmulatorJS fullscreen) ---
    const ORIENT_KEY = 'pokemon_orientation';
    const ORIENT_CLASSES = [
        'orient-portrait', 'orient-reverse-portrait',
        'orient-landscape', 'orient-reverse-landscape'
    ];

    function setOrientation(mode) {
        // Remove all orientation classes first
        ORIENT_CLASSES.forEach(function (c) { document.body.classList.remove(c); });

        // In landscape modes we also need to reset any saved inline position
        // on #screen-primary so the flex layout takes over cleanly
        const primary = document.getElementById('screen-primary');
        if (primary) {
            primary.style.left = '';
            primary.style.top  = '';
            primary.style.width  = '';
            primary.style.height = '';
            primary.style.position = '';
        }

        if (mode && mode !== 'auto') {
            document.body.classList.add('orient-' + mode);
            localStorage.setItem(ORIENT_KEY, mode);
        } else {
            localStorage.removeItem(ORIENT_KEY);
        }

        // Show/hide the controls-opacity slider row
        const opacityRow = document.getElementById('controls-opacity-row');
        if (opacityRow) {
            const isLandscape = mode === 'landscape' || mode === 'reverse-landscape';
            opacityRow.style.display = isLandscape ? '' : 'none';
        }

        reflow();
    }

    function getOrientationPref() {
        return localStorage.getItem(ORIENT_KEY) || 'auto';
    }

    function init() {
        loadLayout();

        // Restore saved orientation preference
        const savedOrient = localStorage.getItem(ORIENT_KEY);
        if (savedOrient) setOrientation(savedOrient);

        const primary   = document.getElementById('screen-primary');
        const secondary = document.getElementById('screen-secondary');

        if (primary) {
            const dragHandle = primary.querySelector('.drag-handle') || primary;
            makeDraggable(primary, dragHandle);
            makeResizable(primary);
        }

        if (secondary) {
            const dragHandle = secondary.querySelector('.drag-handle') || secondary;
            makeDraggable(secondary, dragHandle);
            makeResizable(secondary);
        }

        // Make individual control buttons draggable
        document.querySelectorAll('.control-btn').forEach(btn => {
            makeControlDraggable(btn);
        });

        reflow();

        // Listen for orientation changes
        if (screen.orientation) {
            screen.orientation.addEventListener('change', reflow);
        }
        window.addEventListener('orientationchange', reflow);
        window.addEventListener('resize', reflow);
    }

    return { init, reset, reflow, getOrientation, isPortrait, makeControlDraggable, setOrientation, getOrientationPref };
})();
