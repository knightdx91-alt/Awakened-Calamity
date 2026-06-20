#!/usr/bin/env node
/* Headless boot-check for the game — verifies a map loads with no JS errors and
 * captures a screenshot. Use to verify UI/engine changes before/after pushing.
 *
 * Deps (not vendored; install ad hoc):
 *   npm i puppeteer-core            # in /tmp or anywhere on NODE_PATH
 *   Chromium: Playwright cache at $PLAYWRIGHT_BROWSERS_PATH (or set CHROME below)
 * Serve the repo first:  python3 -m http.server 8099
 *
 * Usage: node bootcheck.mjs "http://localhost:8099/game.html?map=GenTown&region=awakened" out.png
 */
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ||
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const url = process.argv[2] || 'http://localhost:8099/game.html';
const out = process.argv[3] || '/tmp/boot.png';

// NOTE: do NOT pass --single-process (it HANGS this container's chromium).
// --disable-dev-shm-usage avoids /dev/shm exhaustion in sandboxes.
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
const p = await b.newPage();
// Bypass the service worker + disk cache, or the SW serves a STALE game.html and
// new <script>s never load (modules show up undefined). The #1 boot-check gotcha.
const _cdp = await p.target().createCDPSession();
await _cdp.send('Network.setBypassServiceWorker', { bypass: true }).catch(() => {});
await p.setCacheEnabled(false);
await p.setViewport({ width: 480, height: 320, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
await p.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  .catch(e => errs.push('GOTO: ' + e.message));
await new Promise(r => setTimeout(r, 3500));
const probe = await p.evaluate(() => ({
  meters: !!document.getElementById('hud-meters'),
  hud: typeof window.GameHUD, startMenu: typeof window.GameStartMenu,
  map: window._mapName || null,
}));
await p.screenshot({ path: out });
console.log('probe', JSON.stringify(probe));
// External CDN (fonts/html2canvas) + missing *_index.json 404s are expected offline.
const real = errs.filter(e => !/ERR_CERT|css2\?family|html2canvas|404|index for undefined|NPC sprite index/.test(e));
console.log('real errors (' + real.length + '):'); real.forEach(e => console.log('  ' + e));
console.log('screenshot ->', out);
await b.close();
process.exit(real.length ? 1 : 0);
