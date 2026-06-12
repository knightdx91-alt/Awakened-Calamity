/* BattleScene — the Tempo + Intervention battle. Single-active layout with
   enemy/player info boxes, a Tempo gauge, the 2×2 action grid, and the cold
   System Intervention panel whose "help" raises Surveillance. Composes
   FrWindow, MeterBar, FrButton, AffinityBadge, SystemNotify from the bundle. */

const { FrWindow: BFrWindow, MeterBar: BMeterBar, FrButton: BFrButton, AffinityBadge: BAffinityBadge } = window.AwakenedCalamityDesignSystem_475ed3;

function Creature({ kind }) {
  // abstract, original pixel blobs keyed to affinity color
  const c = kind === 'umbral'
    ? { body: '#6b4fd0', dark: '#4a32a0', eye: '#d8c6ff' }
    : { body: '#ef6a2c', dark: '#c14a18', eye: '#ffe2b0' };
  return (
    <svg width="56" height="56" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))' }}>
      <rect x="4" y="5" width="8" height="7" rx="1" fill={c.body} />
      <rect x="4" y="9" width="8" height="3" fill={c.dark} />
      <rect x="3" y="3" width="3" height="4" fill={c.body} />
      <rect x="10" y="3" width="3" height="4" fill={c.body} />
      <rect x="6" y="7" width="2" height="2" fill={c.eye} />
      <rect x="9" y="7" width="2" height="2" fill={c.eye} />
      <rect x="5" y="12" width="2" height="2" fill={c.dark} />
      <rect x="9" y="12" width="2" height="2" fill={c.dark} />
    </svg>
  );
}

function InfoBox({ name, level, hp, max, affinity, style }) {
  return (
    <div style={{ background: 'var(--fr-body)', border: '2px solid var(--fr-border)', boxShadow: 'inset 0 0 0 2px #fff, 2px 2px 0 rgba(0,0,0,.35)', borderRadius: 8, padding: '5px 8px', minWidth: 116, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, fontWeight: 700, color: 'var(--fr-text)' }}>{name}</span>
        <BAffinityBadge affinity={affinity} size="sm" />
      </div>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--fr-text-dim)', marginBottom: 3 }}>Lv {level}</div>
      <BMeterBar value={hp} max={max} width={104} showText={false} />
    </div>
  );
}

const ACTIONS = ['Strike', 'Bind', 'Item', 'Flee'];

function BattleScene({ onSurveillance, onExit }) {
  const [enemyHP, setEnemyHP] = React.useState(70);
  const [playerHP, setPlayerHP] = React.useState(58);
  const [tempo, setTempo] = React.useState(40);
  const [msg, setMsg] = React.useState('A wild UMBRAL WISP blocks the path.');
  const [sel, setSel] = React.useState(0);

  function act(a) {
    if (a === 'Strike') { setEnemyHP(h => Math.max(0, h - 22)); setTempo(20); setMsg('CINDERLING strikes! Heavy recovery — Tempo drained.'); }
    else if (a === 'Bind') { setMsg('You spend a Tether. Bind chance 31% — it resists the System.'); }
    else if (a === 'Item') { setMsg('You have 3 Frost Tonics. Not now.'); }
    else { setMsg('You can\'t flee an Audit-watched field.'); }
  }
  function restore() {
    setPlayerHP(100);
    setMsg('Emergency Restore applied. HP full.');
    onSurveillance && onSurveillance();
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 60, fontFamily: 'var(--font-pixel)' }}>
      {/* field */}
      <div style={{ position: 'relative', flex: 1, background: 'linear-gradient(to bottom,#5090d0 0%,#70b8e8 50%,#90d070 100%)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <InfoBox name="WISP" level={14} hp={enemyHP} max={70} affinity="umbral" />
        </div>
        <div style={{ position: 'absolute', top: 18, right: 28 }}><Creature kind="umbral" /></div>
        <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
          <InfoBox name="CINDERLING" level={16} hp={playerHP} max={100} affinity="ember" />
        </div>
        <div style={{ position: 'absolute', bottom: 22, left: 26 }}><Creature kind="ember" /></div>

        {/* Tempo gauge */}
        <div style={{ position: 'absolute', bottom: 6, left: 8, width: 96 }}>
          <div style={{ fontSize: 6, color: '#fff', textShadow: '0 1px 2px #0008', marginBottom: 2 }}>TEMPO</div>
          <div style={{ height: 5, background: 'rgba(0,0,0,.4)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${tempo}%`, height: '100%', background: '#f8d000', boxShadow: '0 0 5px #f8d000' }} />
          </div>
        </div>

        {/* System Intervention panel (cold) */}
        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,6,20,.93)', border: '1px solid #00ccff', borderRadius: 6, boxShadow: '0 0 8px rgba(0,200,255,.4)', padding: '5px 7px', width: 96 }}>
          <div style={{ fontSize: 5.5, letterSpacing: 1, color: '#00ccff', marginBottom: 4 }}>[ THE SYSTEM ]</div>
          <button onClick={restore} style={{ width: '100%', fontFamily: 'var(--font-pixel)', fontSize: 6, color: '#001018', background: '#00ccff', border: 'none', borderRadius: 4, padding: '4px 3px', cursor: 'pointer', lineHeight: 1.4 }}>
            Emergency Restore<br /><span style={{ opacity: .7 }}>(Cr + Surveillance)</span>
          </button>
        </div>
      </div>

      {/* bottom: message + action grid */}
      <div style={{ height: 96, background: 'var(--fr-body)', borderTop: '3px solid var(--fr-border)', display: 'flex' }}>
        <div style={{ flex: 1.3, padding: '8px 10px', borderRight: '2px solid var(--fr-tan)', fontSize: 8, lineHeight: 1.7, color: 'var(--fr-text)', display: 'flex', alignItems: 'center' }}>
          {msg}
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 6 }}>
          {ACTIONS.map((a, i) => (
            <BFrButton key={a} active={i === sel} onClick={() => { setSel(i); act(a); }}>{a}</BFrButton>
          ))}
        </div>
      </div>
      <button onClick={onExit} style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-pixel)', fontSize: 6, background: 'rgba(0,0,0,.5)', color: '#fff', border: '1px solid rgba(255,255,255,.3)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', zIndex: 5 }}>← leave demo battle</button>
    </div>
  );
}

window.BattleScene = BattleScene;
