/* GameWorld — a clean, generated GBA-style top-down tile scene rendered as a
   pixel grid (no third-party art). 15×13 metatiles at 16px = 240×208 logical.
   A simple two-tone player sprite stands at center. */

const TILE = 16;
const COLS = 15, ROWS = 13;

// 0 grass · 1 path · 2 water · 3 tree · 4 tall grass · 5 sand · 6 rock · 7 corrupted void
const MAP = [
  3,3,0,0,0,4,4,0,0,0,0,3,3,3,3,
  3,0,0,1,1,1,1,1,1,1,0,0,0,3,3,
  0,0,1,1,0,0,0,0,0,1,1,0,0,0,3,
  0,4,1,0,0,6,6,0,0,0,1,0,4,4,0,
  0,4,1,0,6,6,6,0,0,0,1,0,4,4,0,
  0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,
  2,2,0,1,1,1,1,1,1,1,0,0,7,7,7,
  2,2,2,0,0,1,0,0,0,0,0,7,7,7,7,
  2,2,2,2,0,1,0,4,4,0,0,7,7,7,7,
  2,2,2,0,0,1,1,0,0,0,0,0,7,7,7,
  0,0,0,0,5,5,1,0,0,3,0,0,0,3,3,
  0,3,0,5,5,5,1,1,0,3,3,0,3,3,3,
  3,3,0,0,5,5,5,0,0,0,3,3,3,3,3,
];

const COLORS = {
  0: ['#5ea845', '#67b34d'],   // grass (checker)
  1: ['#cda86a', '#c19f60'],   // path
  2: ['#3f8ad0', '#357fc5'],   // water
  3: ['#2d6b34', '#256029'],   // tree
  4: ['#479a37', '#3f8e30'],   // tall grass
  5: ['#e2cd86', '#d8c178'],   // sand
  6: ['#8c867a', '#7d776b'],   // rock
  7: ['#2a1840', '#341f4e'],   // corrupted void
};

function Tile({ t, x, y }) {
  const [a, b] = COLORS[t] || COLORS[0];
  const checker = (x + y) % 2 === 0 ? a : b;
  return (
    <div style={{ position: 'absolute', left: x * TILE, top: y * TILE, width: TILE, height: TILE, background: checker }}>
      {t === 3 && (
        <div style={{ position: 'absolute', inset: '2px 3px', background: '#256029', borderRadius: '40% 40% 30% 30%', boxShadow: 'inset 0 -3px 0 #1c4a22' }} />
      )}
      {t === 4 && (
        <div style={{ position: 'absolute', left: 2, top: 8, right: 2, bottom: 0, background: 'repeating-linear-gradient(90deg,#357f28 0 2px,transparent 2px 4px)' }} />
      )}
      {t === 7 && (
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 6px #7a3df0', opacity: 0.6 }} />
      )}
    </div>
  );
}

function Player() {
  // centered, simple hooded figure: dark cloak + warm face pixel
  const px = Math.floor(COLS / 2) * TILE;
  const py = Math.floor(ROWS / 2) * TILE;
  return (
    <svg width={TILE} height={TILE} viewBox="0 0 16 16" style={{ position: 'absolute', left: px, top: py, imageRendering: 'pixelated', filter: 'drop-shadow(0 2px 1px rgba(0,0,0,.4))' }}>
      <rect x="5" y="2" width="6" height="5" fill="#2a2f3a" />
      <rect x="6" y="4" width="4" height="3" fill="#e8c69a" />
      <rect x="4" y="7" width="8" height="6" fill="#b53a32" />
      <rect x="4" y="7" width="8" height="2" fill="#d0463c" />
      <rect x="5" y="13" width="2" height="2" fill="#2a2f3a" />
      <rect x="9" y="13" width="2" height="2" fill="#2a2f3a" />
    </svg>
  );
}

function GameWorld({ children }) {
  return (
    <div style={{
      position: 'relative', width: COLS * TILE, height: ROWS * TILE,
      imageRendering: 'pixelated', background: '#5ea845', overflow: 'hidden',
    }}>
      {MAP.map((t, i) => <Tile key={i} t={t} x={i % COLS} y={Math.floor(i / COLS)} />)}
      <Player />
      {children}
    </div>
  );
}

window.GameWorld = GameWorld;
