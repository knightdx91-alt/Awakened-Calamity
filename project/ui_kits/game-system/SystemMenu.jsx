/* SystemMenu — the pause menu, built as The System's interface. Left nav +
   right content, both dark-glass SysPanels over a scrim. Composes the
   design-system System/HUD primitives. */

const { SysPanel, SysMenuItem, SurveillanceMeter, AffinityBadge, HazardChip, VitalBar } =
  window.AwakenedCalamityDesignSystem_475ed3;

const SM_ITEMS = [
  { id: 'STATUS',     glyph: '◆', desc: 'Designation, Class, vitals,\nsurveillance and session data.' },
  { id: 'BONDS',      glyph: '❖', desc: 'The creatures you have\nbonded with.', right: '0' },
  { id: 'SUPPLIES',   glyph: '▣', desc: 'Camp Kits, Tethers,\ntonics and gear.', right: '12' },
  { id: 'AFFINITIES', glyph: '✦', desc: 'Nine Affinities and the\nhazards they defend.' },
  { id: 'REACHES',    glyph: '◇', desc: 'The Four Reaches.\nFast-travel is watched.', right: 'watched', warn: true },
  { id: 'SYSTEM',     glyph: '⌖', desc: 'Consult the System.\nIt is always watching.' },
  { id: 'SAVE',       glyph: '▼', desc: 'Write a checkpoint —\nif you trust it.' },
  { id: 'OPTIONS',    glyph: '⚙', desc: 'Display, controls\nand audio.' },
  { id: 'EXIT',       glyph: '✕', desc: 'Close the interface.' },
];

const AFFS = [
  ['ember','Ember','resists Cold'], ['tide','Tide','resists Heat'], ['verdant','Verdant','resists Toxic'],
  ['storm','Storm','resists Tempest'], ['stone','Stone','resists Toxic/Tempest'], ['frost','Frost','resists Heat'],
  ['toxin','Toxin','—'], ['umbral','Umbral','—'], ['lumen','Lumen','resists Gloom'],
  ['corruption','Corruption','the System cheats'], ['untethered','Untethered','resists Corruption'],
];
const REACHES = [
  ['Verdara','#3ac06a','The Verdant Reach','overgrown safe-belt','UNLOCKED'],
  ['Halveth','#5bd0e8','The Frozen Reach','cold wildlands','LOCKED'],
  ['Calderra','#ef6a2c','The Burning Reach','ember deep-zone','LOCKED'],
  ['Vael','#8a6cff','The Drowned Reach','gloom / corruption','LOCKED'],
];

function KV({ k, v, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7px', lineHeight: 2, color: 'var(--os-ink-dim)' }}>
      <span>{k}</span><span style={{ color: accent || 'var(--os-ink)' }}>{v}</span>
    </div>
  );
}
function Note({ children, color }) {
  return <div style={{ fontSize: '6.5px', lineHeight: 1.7, color: color || 'var(--os-ink-dim)', marginBottom: '8px' }}>{children}</div>;
}

function Content({ page, vitals, survey, onService }) {
  if (page === 'STATUS') {
    return (
      <React.Fragment>
        <KV k="DESIGNATION" v="SUBJECT-4471" />
        <KV k="CLASS" v="Unclassed" />
        <KV k="LOCATION" v="Mistwood Path" />
        <KV k="CREDITS" v="Cr 240" />
        <KV k="TIME AWAKE" v="01:24" />
        <KV k="BUILD" v="v0.9.82" />
        <div style={{ height: 1, background: 'var(--os-line)', margin: '8px 0' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <VitalBar kind="hp" value={vitals.hp} max={100} width={188} />
          <VitalBar kind="mana" value={vitals.mana} max={60} width={188} />
          <VitalBar kind="stamina" value={vitals.stamina} max={100} width={188} />
        </div>
        <div style={{ marginTop: 8 }}><SurveillanceMeter value={survey} width={188} /></div>
      </React.Fragment>
    );
  }
  if (page === 'SUPPLIES') {
    const rows = [['Camp Kits', 2], ['Food', 5], ['Tethers', 1], ['Tonics', 3], ['Materials', 14], ['Gear', 4], ['Key', 1]];
    return rows.map(([n, c]) => (
      <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7px', lineHeight: 2.1, color: 'var(--os-ink)' }}>
        <span>{n.toUpperCase()}</span><span style={{ color: 'var(--os-edge)' }}>×{c}</span>
      </div>
    ));
  }
  if (page === 'AFFINITIES') {
    return (
      <React.Fragment>
        <Note>Nine Affinities + two meta-types. Each is an attack flavor AND a defense vs. Exposure.</Note>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {AFFS.map(a => <AffinityBadge key={a[0]} affinity={a[0]} size="sm" />)}
        </div>
      </React.Fragment>
    );
  }
  if (page === 'REACHES') {
    return (
      <React.Fragment>
        <Note color="var(--sys-warn)">⚠ Fast-travel uses System protocol. Each jump raises Surveillance.</Note>
        {REACHES.map(r => (
          <div key={r[0]} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', borderBottom: '1px solid rgba(0,200,255,0.08)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: r[1], boxShadow: `0 0 5px ${r[1]}`, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '7px', color: r[1] }}>{r[0].toUpperCase()}</div>
              <div style={{ fontSize: '6px', color: 'var(--os-ink-dim)', marginTop: 2 }}>{r[2]} · {r[3]}</div>
            </div>
            <span style={{ fontSize: '6px', color: r[4] === 'LOCKED' ? 'var(--os-ink-dim)' : 'var(--meter-green)' }}>{r[4]}</span>
          </div>
        ))}
      </React.Fragment>
    );
  }
  if (page === 'SYSTEM') {
    const hot = survey >= 66, mid = survey >= 33;
    const acc = hot ? 'var(--sys-danger)' : mid ? 'var(--sys-warn)' : 'var(--sys-cyan)';
    const svc = [
      ['Emergency Restore', "Full vitals, one tap. We've got you.", 8],
      ['Fast-Travel', 'Jump to an unlocked landmark.', 6],
      ['Register Camp', 'Audit-proof your refuge — but flagged.', 10],
    ];
    return (
      <React.Fragment>
        <div style={{ fontSize: '6.5px', color: 'var(--os-ink)', opacity: 0.85, lineHeight: 1.8, marginBottom: 8 }}>
          Welcome, SUBJECT-4471. The System is here to help.
        </div>
        <SurveillanceMeter value={survey} width={188} label="SURVEILLANCE" />
        <div style={{ fontSize: '6px', color: acc, margin: '5px 0 8px' }}>
          AUDIT RISK: {hot ? 'CRITICAL — Constructs may spawn' : mid ? 'ELEVATED' : 'NOMINAL'}
        </div>
        <div style={{ fontSize: '6px', color: 'var(--os-ink-dim)', marginBottom: 5 }}>SERVICES — each request is logged</div>
        {svc.map(s => (
          <button key={s[0]} onClick={() => onService(s[2], s[0])}
            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'rgba(0,40,55,0.5)', border: '1px solid var(--sys-cyan)', borderRadius: 4, padding: '6px 7px', marginBottom: 5, cursor: 'pointer', fontFamily: 'var(--font-pixel)' }}>
            <div style={{ fontSize: '7px', color: 'var(--sys-cyan)' }}>{s[0]}</div>
            <div style={{ fontSize: '6px', color: 'var(--os-ink-dim)', marginTop: 3 }}>{s[1]} <span style={{ color: 'var(--sys-warn)' }}>(+{s[2]} Surveillance)</span></div>
          </button>
        ))}
      </React.Fragment>
    );
  }
  if (page === 'BONDS') {
    return <div style={{ fontSize: '7px', color: 'var(--os-ink-dim)', lineHeight: 2, textAlign: 'center', paddingTop: 20 }}>No bonds yet.<br /><br />You Awakened alone.<br />Weaken a creature and spend<br />a Tether to Bind it.</div>;
  }
  if (page === 'SAVE') {
    return (
      <React.Fragment>
        <KV k="SLOT" v="01" /><KV k="LOCATION" v="Mistwood Path" /><KV k="TIME AWAKE" v="01:24" />
        <div style={{ height: 1, background: 'var(--os-line)', margin: '8px 0' }} />
        <SysMenuItem glyph="▼" label="SAVE GAME" selected />
        <SysMenuItem glyph="▲" label="LOAD GAME" />
      </React.Fragment>
    );
  }
  if (page === 'OPTIONS') {
    const opts = [['TEXT SPEED', 'FAST'], ['BATTLE SCENE', 'ON'], ['DAMAGE NUMBERS', 'ON'], ['CONTROLS', 'D-PAD'], ['AUTOSAVE', '30s']];
    return opts.map(o => (
      <div key={o[0]} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7px', lineHeight: 2.2, color: 'var(--os-ink)' }}>
        <span>{o[0]}</span><span style={{ color: 'var(--os-edge)' }}>{o[1]}</span>
      </div>
    ));
  }
  return <div style={{ fontSize: '7px', color: 'var(--os-ink-dim)', paddingTop: 20, textAlign: 'center' }}>—</div>;
}

function SystemMenu({ vitals, survey, onClose, onService }) {
  const [sel, setSel] = React.useState(0);
  const item = SM_ITEMS[sel];

  function choose(i) {
    if (SM_ITEMS[i].id === 'EXIT') { onClose(); return; }
    setSel(i);
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', gap: 8, padding: 8,
      background: 'var(--os-scrim)', backdropFilter: 'blur(1px)', fontFamily: 'var(--font-pixel)' }}>
      {/* left nav */}
      <SysPanel title="[ THE SYSTEM ]" width={118} bodyStyle={{ padding: '4px 0' }} style={{ flexShrink: 0 }}>
        {SM_ITEMS.map((it, i) => (
          <SysMenuItem key={it.id} glyph={it.glyph} label={it.id} right={it.right}
            selected={i === sel} accent={it.warn ? 'var(--sys-warn)' : 'var(--os-edge)'}
            onClick={() => choose(i)} />
        ))}
      </SysPanel>
      {/* right content */}
      <SysPanel title={item.id} accent={item.warn ? 'var(--sys-warn)' : 'var(--os-edge)'}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ overflow: 'auto', flex: 1 }}>
        <Content page={item.id} vitals={vitals} survey={survey} onService={onService} />
      </SysPanel>
      {/* close */}
      <button onClick={onClose} title="Close (Start)"
        style={{ position: 'absolute', top: 12, right: 14, zIndex: 5, width: 18, height: 18, lineHeight: '14px',
          background: 'var(--os-glass)', color: 'var(--os-edge)', border: '1px solid var(--os-edge)',
          borderRadius: 3, cursor: 'pointer', fontFamily: 'var(--font-pixel)', fontSize: '8px' }}>✕</button>
    </div>
  );
}

window.SystemMenu = SystemMenu;
