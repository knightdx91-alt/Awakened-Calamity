// Network-first service worker — guarantees freshness.
//
// GitHub Pages serves HTML with a short HTTP cache (max-age), so a browser can
// hand back a stale game.html for minutes. This worker bypasses that: every
// same-origin GET is fetched from the NETWORK first (always the latest deploy),
// and the cache is only a fallback when offline. Combined with the per-commit
// `?v=<SHA>` asset busting + the in-game version.txt check, clients always run
// the current build the moment they (re)load online.
const CACHE = 'ac-netfirst-v1';

self.addEventListener('install', function () {
    self.skipWaiting();                       // activate the new worker immediately
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys()
            .then(function (keys) {
                return Promise.all(keys.filter(function (k) { return k !== CACHE; })
                    .map(function (k) { return caches.delete(k); }));
            })
            .then(function () { return self.clients.claim(); })   // take control of open pages
    );
});

self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;
    var url;
    try { url = new URL(req.url); } catch (err) { return; }
    if (url.origin !== self.location.origin) return;   // don't touch cross-origin

    e.respondWith(
        fetch(req)
            .then(function (res) {
                // Cache a copy of good same-origin responses for offline use.
                if (res && res.status === 200 && res.type === 'basic') {
                    var copy = res.clone();
                    caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
                }
                return res;
            })
            .catch(function () { return caches.match(req); })   // offline → last-seen copy
    );
});
