/* src/ui/icons.js — icon sheet helper (presentation only). Global: GameIcons.
 *
 * Draws icons from the imported RPG Maker VX Ace IconSet (data/icons/rtp_iconset
 * .png, a 16-wide grid of 24px icons). The UI (SUPPLIES, skills, status effects)
 * references an icon by its integer index. Pure renderer — no game logic.
 *
 *   await GameIcons.load();
 *   GameIcons.draw(ctx, iconIndex, x, y, size);   // size optional (defaults 24)
 */
window.GameIcons = (function () {
  'use strict';
  var meta = null, img = null, ready = false, loading = null;

  function load() {
    if (ready) return Promise.resolve(meta);
    if (loading) return loading;
    loading = fetch('data/icons/rtp_iconset.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (m) {
        meta = m;
        return new Promise(function (res) {
          img = new Image();
          img.onload = function () { ready = true; res(meta); };
          img.onerror = function () { res(null); };
          img.src = 'data/icons/' + m.sheet;
        });
      })
      .catch(function () { return null; });
    return loading;
  }

  function draw(ctx, index, dx, dy, size) {
    if (!ready || index == null || index < 0 || index >= meta.count) return false;
    var s = meta.icon, c = index % meta.per_row, r = (index / meta.per_row) | 0;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, c * s, r * s, s, s, dx, dy, size || s, size || s);
    return true;
  }

  return { load: load, draw: draw, info: function () { return meta; },
           image: function () { return img; }, isReady: function () { return ready; } };
})();
