// GameCamera — tracks player and clamps viewport to map bounds.
// Viewport size (in tiles) derives from the map's render cell size: the canvas
// is a fixed 240x208 logical px, so a 16px cell shows 15x13 tiles while a 32px
// cell shows ~8x7 (bigger tiles, fewer of them). setRenderTile() is called by
// the renderer each frame from the active map's tileSize.
window.GameCamera = (function () {
    const LOGICAL_W = 240;
    const LOGICAL_H = 208;
    let renderTile = 16;

    let x = 0; // top-left tile x of viewport
    let y = 0; // top-left tile y of viewport

    function vw() { return Math.ceil(LOGICAL_W / renderTile); }
    function vh() { return Math.ceil(LOGICAL_H / renderTile); }

    function setRenderTile(rt) {
        if (rt && rt > 0) renderTile = rt;
    }

    function update(playerX, playerY, mapW, mapH) {
        var W = vw(), H = vh();
        // Center camera on player
        x = playerX - Math.floor(W / 2);
        y = playerY - Math.floor(H / 2);
        // Clamp to map boundaries
        x = Math.max(0, Math.min(x, mapW - W));
        y = Math.max(0, Math.min(y, mapH - H));
        // If map is smaller than viewport, keep at 0
        if (mapW <= W) x = 0;
        if (mapH <= H) y = 0;
    }

    return {
        get x() { return x; },
        get y() { return y; },
        get viewportW() { return vw(); },
        get viewportH() { return vh(); },
        setRenderTile,
        update
    };
})();
