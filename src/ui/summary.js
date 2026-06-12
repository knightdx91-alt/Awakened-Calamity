// GameSummary — Pokémon summary screen
// Three tabs: INFO | SKILLS | MOVES
// Open with GameSummary.show(partyIndex, onClose)
window.GameSummary = (function () {
    'use strict';

    const TYPE_COLORS = {
        normal:'#A8A878',fire:'#F08030',water:'#6890F0',electric:'#F8D030',
        grass:'#78C850',ice:'#98D8D8',fighting:'#C03028',poison:'#A040A0',
        ground:'#E0C068',flying:'#A890F0',psychic:'#F85888',bug:'#A8B820',
        rock:'#B8A038',ghost:'#705898',dragon:'#7038F8',dark:'#705848',
        steel:'#B8B8D0',fairy:'#EE99AC',
    };

    const NATURES_DISPLAY = {
        hardy:'Hardy',docile:'Docile',serious:'Serious',bashful:'Bashful',quirky:'Quirky',
        lonely:'Lonely',brave:'Brave',adamant:'Adamant',naughty:'Naughty',
        bold:'Bold',relaxed:'Relaxed',impish:'Impish',lax:'Lax',
        timid:'Timid',hasty:'Hasty',jolly:'Jolly',naive:'Naive',
        modest:'Modest',mild:'Mild',quiet:'Quiet',rash:'Rash',
        calm:'Calm',gentle:'Gentle',sassy:'Sassy',careful:'Careful',
    };

    const STAT_NAMES = { hp:'HP', atk:'Attack', def:'Defense', spa:'Sp.Atk', spd:'Sp.Def', spe:'Speed' };
    const STAT_ORDER = ['hp','atk','def','spa','spd','spe'];

    let _el = null;
    let _tab = 'info';
    let _partyIdx = 0;
    let _onClose = null;
    let _dexDb = null;
    let _movesDb = null;

    async function _ensureData() {
        if (!_dexDb) {
            try { const r = await fetch('data/pokemon/pokedex.json'); _dexDb = r.ok ? await r.json() : {}; } catch(e) { _dexDb = {}; }
        }
        if (!_movesDb) {
            try { const r = await fetch('data/pokemon/moves.json'); _movesDb = r.ok ? await r.json() : {}; } catch(e) { _movesDb = {}; }
        }
    }

    async function show(partyIdx, onClose) {
        if (_el) close();
        await _ensureData();
        _partyIdx = partyIdx || 0;
        _onClose = onClose || null;
        _tab = 'info';
        _build();
    }

    function close() {
        if (_el && _el.parentNode) _el.parentNode.removeChild(_el);
        _el = null;
        if (_onClose) { const cb = _onClose; _onClose = null; cb(); }
    }

    function isOpen() { return !!_el; }

    function _getMon() {
        const st = window.GameSave && GameSave.state;
        return st && st.party && st.party[_partyIdx] || null;
    }

    function _getDex(mon) {
        if (!mon || !mon.speciesId) return null;
        return _dexDb && _dexDb[mon.speciesId] || null;
    }

    // Gen 4 stat calculation
    function _calcHP(base, iv, ev, level) {
        return Math.floor(((2*base + iv + Math.floor(ev/4)) * level) / 100) + level + 10;
    }
    function _calcStat(base, iv, ev, level, nm) {
        return Math.floor((Math.floor(((2*base + iv + Math.floor(ev/4)) * level) / 100) + 5) * (nm || 1));
    }

    const NATURE_MODS = {
        hardy:{},docile:{},serious:{},bashful:{},quirky:{},
        lonely:{atk:1.1,def:0.9},brave:{atk:1.1,spe:0.9},adamant:{atk:1.1,spa:0.9},naughty:{atk:1.1,spd:0.9},
        bold:{def:1.1,atk:0.9},relaxed:{def:1.1,spe:0.9},impish:{def:1.1,spa:0.9},lax:{def:1.1,spd:0.9},
        timid:{spe:1.1,atk:0.9},hasty:{spe:1.1,def:0.9},jolly:{spe:1.1,spa:0.9},naive:{spe:1.1,spd:0.9},
        modest:{spa:1.1,atk:0.9},mild:{spa:1.1,def:0.9},quiet:{spa:1.1,spe:0.9},rash:{spa:1.1,spd:0.9},
        calm:{spd:1.1,atk:0.9},gentle:{spd:1.1,def:0.9},sassy:{spd:1.1,spe:0.9},careful:{spd:1.1,spa:0.9},
    };

    function _calcStats(mon, dex) {
        if (!dex) return null;
        const nm = NATURE_MODS[mon.nature || 'hardy'] || {};
        const ivs = mon.ivs || {hp:15,atk:15,def:15,spa:15,spd:15,spe:15};
        const evs = mon.evs || {hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
        const lv = mon.level || 5;
        const b = dex.stats;
        return {
            hp:  _calcHP(b.hp, ivs.hp, evs.hp, lv),
            atk: _calcStat(b.atk, ivs.atk, evs.atk, lv, nm.atk||1),
            def: _calcStat(b.def, ivs.def, evs.def, lv, nm.def||1),
            spa: _calcStat(b.spa, ivs.spa, evs.spa, lv, nm.spa||1),
            spd: _calcStat(b.spd, ivs.spd, evs.spd, lv, nm.spd||1),
            spe: _calcStat(b.spe, ivs.spe, evs.spe, lv, nm.spe||1),
        };
    }

    function _formatName(key) {
        return key ? key.split('_').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ') : '';
    }

    function _build() {
        const screen = document.getElementById('screen-primary');
        if (!screen) return;

        _el = document.createElement('div');
        _el.id = 'summary-overlay';
        screen.appendChild(_el);

        _render();

        document.addEventListener('keydown', _onKey);
    }

    function _render() {
        if (!_el) return;
        const mon = _getMon();
        if (!mon) { close(); return; }
        const dex = _getDex(mon);
        const stats = _calcStats(mon, dex);
        const name = mon.nickname || (dex && dex.name) || 'POKéMON';
        const spriteUrl = `data/sprites/pokemon/front/${mon.speciesId}.png`;

        let content = `
<div id="sum-header">
  <button id="sum-close" class="sum-back-btn">✕</button>
  <div id="sum-name-row">
    <span id="sum-name">${name}</span>
    ${mon.isShiny ? '<span class="sum-shiny">★</span>' : ''}
    <span class="sum-lv">Lv ${mon.level || 1}</span>
  </div>
  ${dex ? `<div id="sum-types">${(dex.types||[]).map(t=>`<span class="type-badge" data-type="${t.toLowerCase()}">${t}</span>`).join('')}</div>` : ''}
</div>
<div id="sum-tabs">
  <button class="sum-tab ${_tab==='info'?'active':''}" data-tab="info">INFO</button>
  <button class="sum-tab ${_tab==='skills'?'active':''}" data-tab="skills">SKILLS</button>
  <button class="sum-tab ${_tab==='moves'?'active':''}" data-tab="moves">MOVES</button>
</div>
<div id="sum-body">`;

        if (_tab === 'info') {
            content += `
<div id="sum-sprite-row">
  <img class="sum-sprite" src="${spriteUrl}" onerror="this.src=''" alt="${name}">
  <div id="sum-info-block">
    <div class="sum-info-row"><span>Dex No.</span><span>${dex ? String(dex.num).padStart(3,'0') : '???'}</span></div>
    <div class="sum-info-row"><span>Species</span><span>${dex ? dex.category || '???' : '???'}</span></div>
    <div class="sum-info-row"><span>Type</span><span>${dex ? (dex.types||[]).join('/') : '???'}</span></div>
    <div class="sum-info-row"><span>Nature</span><span>${NATURES_DISPLAY[mon.nature||'hardy']||'Hardy'}</span></div>
    <div class="sum-info-row"><span>OT</span><span>${mon.originalTrainer||'Player'}</span></div>
    <div class="sum-info-row"><span>ID No.</span><span>00000</span></div>
  </div>
</div>
<div id="sum-hp-row">
  <span class="sum-stat-lbl">HP</span>
  <div class="sum-hp-wrap"><div class="sum-hp-bar" style="width:${Math.round((mon.currentHp||0)/(stats?stats.hp:1)*100)}%"></div></div>
  <span class="sum-hp-txt">${mon.currentHp||0} / ${stats ? stats.hp : '??'}</span>
</div>
${dex && dex.entry ? `<div id="sum-entry">${dex.entry}</div>` : ''}`;
        } else if (_tab === 'skills') {
            const nm = NATURE_MODS[mon.nature||'hardy']||{};
            const ivs = mon.ivs || {};
            const evs = mon.evs || {};
            const b = dex ? dex.stats : {};
            const maxStatVal = 400;
            content += `<div id="sum-stats-list">`;
            for (const stat of STAT_ORDER) {
                const val = stats ? stats[stat] : 0;
                const base = b[stat] || 0;
                const pct = Math.min(100, Math.round(val / maxStatVal * 100));
                const natureUp = nm[stat] > 1;
                const natureDn = nm[stat] < 1;
                content += `
<div class="sum-stat-row">
  <span class="sum-stat-name ${natureUp?'stat-up':''} ${natureDn?'stat-dn':''}">${STAT_NAMES[stat]}</span>
  <span class="sum-stat-val">${val}</span>
  <div class="sum-stat-bar-wrap"><div class="sum-stat-bar" style="width:${pct}%"></div></div>
  <span class="sum-stat-base">${base}</span>
  <span class="sum-stat-iv">${ivs[stat]||0}</span>
</div>`;
            }
            content += `</div><div class="sum-stat-legend"><span>Total: ${stats ? Object.values(stats).reduce((a,b)=>a+b,0)-stats.hp+stats.hp : 0}</span></div>`;
        } else if (_tab === 'moves') {
            content += `<div id="sum-moves-list">`;
            const moves = mon.moves || [];
            if (!moves.filter(Boolean).length) {
                content += `<div class="sum-no-moves">No moves learned</div>`;
            } else {
                for (const mv of moves) {
                    if (!mv) continue;
                    const md = _movesDb && _movesDb[mv] || null;
                    const mvName = md ? md.name : _formatName(mv);
                    const mvType = md ? md.type : 'Normal';
                    const mvPP = md ? md.pp : 10;
                    const mvPow = md ? (md.power || '—') : '—';
                    const mvAcc = md ? (md.accuracy || '—') : '—';
                    content += `
<div class="sum-move-row">
  <div class="sum-move-top">
    <span class="sum-move-name">${mvName}</span>
    <span class="type-badge" data-type="${mvType.toLowerCase()}">${mvType}</span>
  </div>
  <div class="sum-move-bottom">
    <span>PP: ${mvPP}</span>
    <span>Pow: ${mvPow}</span>
    <span>Acc: ${mvAcc}</span>
  </div>
</div>`;
                }
            }
            content += `</div>`;
        }

        content += `</div>`; // sum-body

        _el.innerHTML = content;

        // Wire tabs
        _el.querySelectorAll('.sum-tab').forEach(t => {
            t.addEventListener('click', () => { _tab = t.dataset.tab; _render(); });
        });
        const closeBtn = document.getElementById('sum-close');
        if (closeBtn) closeBtn.addEventListener('click', close);

        // Apply type badge colors
        _el.querySelectorAll('.type-badge').forEach(b => {
            b.style.background = TYPE_COLORS[b.dataset.type] || '#A8A878';
        });
        // HP bar color
        const hpBar = _el.querySelector('.sum-hp-bar');
        if (hpBar && stats) {
            const pct = (mon.currentHp||0) / stats.hp;
            hpBar.className = 'sum-hp-bar ' + (pct > 0.5 ? 'hp-green' : pct > 0.2 ? 'hp-yellow' : 'hp-red');
        }
        // Stat bars
        _el.querySelectorAll('.sum-stat-bar').forEach(b => {
            const pct = parseFloat(b.style.width);
            b.className = 'sum-stat-bar ' + (pct >= 70 ? 'hp-green' : pct >= 40 ? 'hp-yellow' : 'hp-red');
        });
    }

    function _onKey(e) {
        if (!_el) return;
        if (e.key === 'Escape' || e.key === 'x') { close(); }
        if (e.key === 'ArrowLeft')  _switchTab(-1);
        if (e.key === 'ArrowRight') _switchTab(1);
    }

    function _switchTab(dir) {
        const tabs = ['info','skills','moves'];
        const i = tabs.indexOf(_tab);
        _tab = tabs[Math.max(0, Math.min(tabs.length-1, i+dir))];
        _render();
    }

    function handleInput(jp) {
        if (!_el) return false;
        if (jp.b) { close(); return true; }
        if (jp.left)  { _switchTab(-1); return true; }
        if (jp.right) { _switchTab(1);  return true; }
        return true;
    }

    return { show, close, isOpen, handleInput };
})();
