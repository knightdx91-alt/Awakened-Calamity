// GameCamera — tracks player and clamps viewport to map bounds
window.GameCamera = (function () {
    const VIEWPORT_TILES_W = 15;
    const VIEWPORT_TILES_H = 13;

    let x = 0; // top-left tile x of viewport
    let y = 0; // top-left tile y of viewport

    function update(playerX, playerY, mapW, mapH) {
        // Center camera on player
        x = playerX - Math.floor(VIEWPORT_TILES_W / 2);
        y = playerY - Math.floor(VIEWPORT_TILES_H / 2);

        // Clamp to map boundaries
        x = Math.max(0, Math.min(x, mapW - VIEWPORT_TILES_W));
        y = Math.max(0, Math.min(y, mapH - VIEWPORT_TILES_H));

        // If map is smaller than viewport, keep at 0
        if (mapW <= VIEWPORT_TILES_W) x = 0;
        if (mapH <= VIEWPORT_TILES_H) y = 0;
    }

    return {
        get x() { return x; },
        get y() { return y; },
        get viewportW() { return VIEWPORT_TILES_W; },
        get viewportH() { return VIEWPORT_TILES_H; },
        update
    };
})();
