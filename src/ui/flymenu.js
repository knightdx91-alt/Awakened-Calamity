// FlyMenu — SELECT opens a fly-to list; navigated by d-pad, confirmed with A
window.FlyMenu = (function () {
    'use strict';

    const FLY_DESTINATIONS = [
        { label: 'Viridian City',   map: 'ViridianCity',   x: 26, y: 27, region: 'kanto' },
        { label: 'Pewter City',     map: 'PewterCity',     x: 17, y: 26, region: 'kanto' },
        { label: 'Cerulean City',   map: 'CeruleanCity',   x: 22, y: 20, region: 'kanto' },
        { label: 'Vermilion City',  map: 'VermilionCity',  x: 15, y: 7,  region: 'kanto' },
        { label: 'Lavender Town',   map: 'LavenderTown',   x: 6,  y: 6,  region: 'kanto' },
        { label: 'Celadon City',    map: 'CeladonCity',    x: 48, y: 12, region: 'kanto' },
        { label: 'Fuchsia City',    map: 'FuchsiaCity',    x: 25, y: 32, region: 'kanto' },
        { label: 'Saffron City',    map: 'SaffronCity',    x: 24, y: 39, region: 'kanto' },
        { label: 'Cinnabar Island', map: 'CinnabarIsland', x: 14, y: 12, region: 'kanto' },
        { label: 'Pallet Town',     map: 'PalletTown',     x: 10, y: 10, region: 'kanto' },
        { label: 'CANCEL',          map: null },
    ];

    let _el    = null;
    let _open  = false;
    let _cursor = 0;
    let _onFly = null;

    function _row(text, selected, isCancel) {
        const row = document.createElement('div');
        row.style.cssText = [
            'display:flex', 'align-items:center',
            'padding:4px 6px',
            "font-family:'Press Start 2P',monospace",
            'font-size:8px',
            isCancel ? 'color:#e07050;border-top:1px solid #18b8c8' : 'color:#c8d8e8',
            selected  ? 'background:rgba(24,184,200,0.18)' : '',
        ].join(';');

        const arrow = document.createElement('span');
        arrow.textContent = selected ? '▶ ' : '  ';
        arrow.style.cssText = 'color:#18b8c8;min-width:14px;display:inline-block;';
        row.appendChild(arrow);

        const lbl = document.createElement('span');
        lbl.textContent = text;
        row.appendChild(lbl);
        return row;
    }

    function _build() {
        if (_el) { _el.remove(); _el = null; }

        _el = document.createElement('div');
        _el.id = 'fly-menu';
        _el.style.cssText = [
            'position:absolute', 'top:24px', 'right:4px', 'width:54%',
            'background:#060610',
            'border:1px solid #000',
            'box-shadow:0 0 0 3px #18b8c8,0 0 0 4px #000,inset 0 0 0 1px #002830',
            'z-index:80', 'pointer-events:all', 'overflow:hidden',
        ].join(';');

        // Title bar
        const title = document.createElement('div');
        title.textContent = 'FLY TO';
        title.style.cssText = [
            'background:#0a1830', 'border-bottom:1px solid #18b8c8',
            "color:#80d0e8;font-family:'Press Start 2P',monospace;",
            'font-size:8px;padding:3px 6px;text-align:center;letter-spacing:2px;',
        ].join('');
        _el.appendChild(title);

        FLY_DESTINATIONS.forEach(function (dest, i) {
            const isCancel = dest.map === null;
            const row = _row(dest.label, i === _cursor, isCancel);

            // Direct tap: select that row and confirm
            row.addEventListener('pointerdown', function (e) {
                e.preventDefault();
                e.stopPropagation();
                _cursor = i;
                _confirm();
            });

            _el.appendChild(row);
        });

        const screen = document.getElementById('screen-primary');
        if (screen) screen.appendChild(_el);
    }

    function open(onFly) {
        if (_open) { close(); return; }
        _onFly = onFly;
        _open  = true;
        _cursor = 0;
        _build();
    }

    function close() {
        _open  = false;
        _onFly = null;
        if (_el) { _el.remove(); _el = null; }
    }

    function _confirm() {
        const dest = FLY_DESTINATIONS[_cursor];
        const cb   = _onFly;
        close();
        if (dest && dest.map && cb) cb(dest);
        // if CANCEL row, just close (already done)
    }

    function moveUp()   { if (!_open) return; _cursor = (_cursor - 1 + FLY_DESTINATIONS.length) % FLY_DESTINATIONS.length; _build(); }
    function moveDown() { if (!_open) return; _cursor = (_cursor + 1) % FLY_DESTINATIONS.length; _build(); }
    function confirm()  { if (_open) _confirm(); }
    function cancel()   { close(); }

    return { open, close, moveUp, moveDown, confirm, cancel, get isOpen() { return _open; } };
})();
