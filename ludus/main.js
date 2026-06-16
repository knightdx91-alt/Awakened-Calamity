/* ludus/main.js — menu + game controller wiring engine/ai/render/net together.
 * Global: window.LudusGame (mostly self-starting on DOMContentLoaded).
 */
(function () {
  'use strict';
  var E = window.Ludus, AI = window.LudusAI, UI = window.LudusUI, NET = window.LudusNet;

  var ui, state, mode = null;          // 'bot' | 'hotseat' | 'online'
  var humanColors = {};                // colors the local player controls
  var aiDifficulty = 'medium', aiColor = 'black';
  var net = null, unsub = null, applying = false;

  function $(id) { return document.getElementById(id); }

  function setStatus(msg) { $('status').textContent = msg; }

  function newGame(opts) {
    if (unsub) { unsub(); unsub = null; }
    net = null;
    mode = opts.mode;
    state = E.initialState();
    humanColors = opts.humanColors;
    if (opts.aiColor) aiColor = opts.aiColor;
    if (opts.difficulty) aiDifficulty = opts.difficulty;
    ui.setPerspective(opts.perspective || 'white');
    ui.clearSelection();
    $('roomBox').style.display = 'none';
    loop();
  }

  function loop() {
    ui.render(state);
    if (state.winner) {
      setStatus(state.winner.toUpperCase() + ' wins — the First Lord has fallen.');
      ui.setInteractive(false);
      return;
    }
    var humanTurn = !!humanColors[state.turn];
    ui.setInteractive(humanTurn && (mode !== 'online' || true));
    if (mode === 'online') {
      setStatus(humanTurn ? 'Your move (' + state.turn + ').' : 'Waiting for ' + state.turn + '…');
      return; // remote turns arrive via onState
    }
    if (humanTurn) { setStatus(state.turn.toUpperCase() + ' to move.'); return; }
    // AI turn (bot mode)
    setStatus(state.turn.toUpperCase() + ' (' + aiDifficulty + ' AI) is thinking…');
    ui.setInteractive(false);
    setTimeout(function () {
      var a = AI.chooseAction(state, state.turn, aiDifficulty);
      if (a) { state = E.applyAction(state, a); }
      loop();
    }, 120);
  }

  // committed by a human via the board
  function onAction(action) {
    if (state.winner) return;
    if (!humanColors[state.turn]) return;
    state = E.applyAction(state, action);
    if (mode === 'online' && net) { applying = true; NET.pushState(net.ref, state).finally(function () { applying = false; }); }
    loop();
  }

  // ---- online ----------------------------------------------------------
  function startOnline(promise) {
    setStatus('Connecting…');
    promise.then(function (room) {
      net = room; mode = 'online';
      humanColors = {}; humanColors[room.color] = true;
      ui.setPerspective(room.color);
      $('roomBox').style.display = 'block';
      $('roomCode').textContent = room.roomId;
      $('roomColor').textContent = room.color;
      unsub = NET.onState(room.ref, function (remote) {
        if (applying) return; // ignore the echo of our own write
        state = remote; loop();
      });
      setStatus('Room ' + room.roomId + ' — you are ' + room.color + '. Share the code.');
    }).catch(function (err) { setStatus('Online error: ' + err.message); });
  }

  function init() {
    ui = UI.create({ canvas: $('board'), onAction: onAction, canSelect: function (color) { return !!humanColors[color]; } });

    $('btnBot').onclick = function () {
      var diff = $('difficulty').value, side = $('playAs').value;
      var aic = side === 'white' ? 'black' : 'white';
      var hc = {}; hc[side] = true;
      newGame({ mode: 'bot', humanColors: hc, aiColor: aic, difficulty: diff, perspective: side });
    };
    $('btnHotseat').onclick = function () {
      newGame({ mode: 'hotseat', humanColors: { white: true, black: true }, perspective: 'white' });
    };
    $('btnFlip').onclick = function () {
      ui.setPerspective($('btnFlip').dataset.p === 'black' ? 'white' : 'black');
      $('btnFlip').dataset.p = $('btnFlip').dataset.p === 'black' ? 'white' : 'black';
    };
    $('btnCreate').onclick = function () {
      if (!NET.configured()) { setStatus('Online disabled — fill in ludus/firebase-config.js first.'); return; }
      startOnline(NET.createRoom(E.initialState()));
    };
    $('btnJoin').onclick = function () {
      if (!NET.configured()) { setStatus('Online disabled — fill in ludus/firebase-config.js first.'); return; }
      var code = $('joinCode').value; if (!code) { setStatus('Enter a room code.'); return; }
      startOnline(NET.joinRoom(code));
    };

    if (!NET.configured()) {
      $('btnCreate').title = $('btnJoin').title = 'Configure ludus/firebase-config.js to enable online play';
    }

    // default: start a bot game so the board isn't empty
    newGame({ mode: 'bot', humanColors: { white: true }, aiColor: 'black', difficulty: 'medium', perspective: 'white' });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.LudusGame = { newGame: newGame };
})();
