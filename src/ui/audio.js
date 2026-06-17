// GameAudio — presentation-layer sound for Awakened Calamity.
//
// Plays the imported RPG Maker VX Ace RTP audio (data/audio/{se,me,bgs,bgm}).
// Categories mirror RM:
//   SE  — sound effects (one-shot, may overlap)
//   ME  — musical effects / fanfares (one-shot; ducks BGM while playing)
//   BGS — background sounds / ambience (looped)
//   BGM — background music (looped; files only present after a --bgm pull,
//         so playBGM() degrades to a no-op when the track is missing)
//
// This is the throwaway presentation layer (see ARCHITECTURE.md): pure audio
// playback, no game logic. The event runner already calls GameAudio.playSE().
window.GameAudio = (function () {
    'use strict';

    var BASE = 'data/audio/';
    function bust() { return '?b=' + (window.__BUILD__ || '0'); }

    var _index = null;            // data/audio/rtp_audio_index.json (track lists)
    var _bgm = null, _bgs = null; // the single looping element per channel
    var _bgmName = null, _bgsName = null;
    var _me = null;               // current one-shot ME
    var _muted = false;

    // Per-channel volume (0..1), multiplied by master.
    var _vol = { master: 1.0, bgm: 0.65, bgs: 0.55, me: 0.8, se: 0.9 };

    // Restore persisted prefs.
    try {
        var saved = JSON.parse(localStorage.getItem('ac_audio') || 'null');
        if (saved) {
            if (typeof saved.muted === 'boolean') _muted = saved.muted;
            if (saved.vol) for (var k in saved.vol) if (k in _vol) _vol[k] = saved.vol[k];
        }
    } catch (e) {}

    function _persist() {
        try { localStorage.setItem('ac_audio', JSON.stringify({ muted: _muted, vol: _vol })); } catch (e) {}
    }

    function init() {
        fetch(BASE + 'rtp_audio_index.json' + bust(), { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) { if (j) _index = j; })
            .catch(function () { /* index is advisory only */ });
    }

    function _cat(cat) { return (_index && _index.categories && _index.categories[cat]) || null; }
    function _path(cat, name) { return BASE + cat + '/' + name + '.ogg' + bust(); }

    // Is this category present on disk? Unknown index → assume yes (optimistic),
    // except BGM which we know is excluded from the repo unless explicitly pulled.
    function _present(cat) {
        var c = _cat(cat);
        if (!c) return cat !== 'bgm';
        return c.present !== false;
    }

    // ---- SE: one-shot, overlapping ----------------------------------------
    function playSE(name, opts) {
        if (!name || _muted) return;
        var a = new Audio(_path('se', name));
        a.volume = _clamp(_vol.master * _vol.se * ((opts && opts.volume) || 1));
        a.play().catch(function () {}); // browsers block until first user gesture
        return a;
    }

    // ---- ME: one-shot fanfare; ducks BGM, restores after -------------------
    function playME(name) {
        if (!name || _muted) return;
        _stopEl(_me); _me = null;
        var a = new Audio(_path('me', name));
        a.volume = _clamp(_vol.master * _vol.me);
        var prevBgm = _bgm ? _bgm.volume : null;
        if (_bgm) _bgm.volume = _clamp((prevBgm || 0) * 0.25);
        a.addEventListener('ended', function () {
            if (_bgm && prevBgm != null) _bgm.volume = prevBgm;
            if (_me === a) _me = null;
        });
        _me = a;
        a.play().catch(function () {});
        return a;
    }

    // ---- BGS: looped ambience ---------------------------------------------
    function playBGS(name) {
        if (!name) { stopBGS(); return; }
        if (_bgsName === name && _bgs) { _bgs.muted = _muted; return; }
        stopBGS();
        var a = new Audio(_path('bgs', name));
        a.loop = true;
        a.volume = _clamp(_vol.master * _vol.bgs);
        a.muted = _muted;
        _bgs = a; _bgsName = name;
        a.play().catch(function () {});
    }
    function stopBGS() { _stopEl(_bgs); _bgs = null; _bgsName = null; }

    // ---- BGM: looped music (no-op if not pulled) --------------------------
    function playBGM(name) {
        if (!name) { stopBGM(); return; }
        if (!_present('bgm')) { _bgmName = name; return; } // remembered, silent
        if (_bgmName === name && _bgm) { _bgm.muted = _muted; return; }
        stopBGM();
        var a = new Audio(_path('bgm', name));
        a.loop = true;
        a.volume = _clamp(_vol.master * _vol.bgm);
        a.muted = _muted;
        _bgm = a; _bgmName = name;
        a.play().catch(function () {});
    }
    function stopBGM() { _stopEl(_bgm); _bgm = null; _bgmName = null; }

    function _stopEl(el) { if (el) { try { el.pause(); el.src = ''; } catch (e) {} } }
    function _clamp(v) { return Math.max(0, Math.min(1, v)); }

    // ---- Mixer ------------------------------------------------------------
    function setMute(m) {
        _muted = !!m;
        if (_bgm) _bgm.muted = _muted;
        if (_bgs) _bgs.muted = _muted;
        _persist();
    }
    function toggleMute() { setMute(!_muted); return _muted; }
    function isMuted() { return _muted; }

    function setVolume(channel, v) {
        if (!(channel in _vol)) return;
        _vol[channel] = _clamp(v);
        if (_bgm) _bgm.volume = _clamp(_vol.master * _vol.bgm);
        if (_bgs) _bgs.volume = _clamp(_vol.master * _vol.bgs);
        _persist();
    }
    function getVolume(channel) { return _vol[channel]; }

    return {
        init: init,
        playSE: playSE, playME: playME,
        playBGS: playBGS, stopBGS: stopBGS,
        playBGM: playBGM, stopBGM: stopBGM,
        setMute: setMute, toggleMute: toggleMute, isMuted: isMuted,
        setVolume: setVolume, getVolume: getVolume,
        present: _present
    };
})();
