/* StartMenu — the FireRed right-side menu overlay, restyled to the survival
   set (Camp / Supplies / Affinities / System / Save). Composes MenuRow +
   FrWindow from the design-system bundle. The left "void" stays transparent
   so the world shows through. */

const { FrWindow, MenuRow, AffinityBadge, HazardChip } = window.AwakenedCalamityDesignSystem_475ed3;

const ITEMS = [
  { key: 'camp',     label: 'Camp',      desc: 'Drop a Camp Kit. Rest, craft,\nsave, cook. Costs in-game time.' },
  { key: 'supplies', label: 'Supplies',  desc: 'Your scavenged stock: kits,\nfood, tethers, hazard tonics.' },
  { key: 'affinity', label: 'Affinities',desc: 'Your party affinities and the\nhazards they defend against.' },
  { key: 'system',   label: 'System',    desc: 'View Surveillance, Audits, and\nthe offers you have refused.' },
  { key: 'save',     label: 'Save',      desc: 'Write to a save slot. A deep\ncheckpoint, if you trust it.' },
];

function SubPanel({ which }) {
  if (which === 'affinity') {
    return (
      <FrWindow title="AFFINITIES" variant="light" style={{ width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {['ember','tide','verdant','storm','frost'].map(a => <AffinityBadge key={a} affinity={a} size="sm" />)}
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
          <HazardChip hazard="heat" size="sm" /><HazardChip hazard="cold" size="sm" />
        </div>
      </FrWindow>
    );
  }
  if (which === 'supplies') {
    const rows = [['Camp Kit', '2'], ['Frost Tonic', '3'], ['Cooked Ration', '5'], ['Tether', '1']];
    return (
      <FrWindow title="SUPPLIES" variant="light" style={{ width: '100%' }}>
        {rows.map(([n, c]) => <MenuRow key={n} label={n} right={`×${c}`} />)}
      </FrWindow>
    );
  }
  return null;
}

function StartMenu({ onClose, onSystem }) {
  const [sel, setSel] = React.useState(0);
  const [open, setOpen] = React.useState(null);
  const item = ITEMS[sel];

  function activate(i) {
    const it = ITEMS[i];
    if (it.key === 'system') { onSystem && onSystem(); return; }
    if (it.key === 'affinity' || it.key === 'supplies') { setOpen(o => o === it.key ? null : it.key); }
    else { setOpen(null); }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 50 }}>
      <div style={{ flex: 1 }} onClick={onClose} />
      <div style={{ width: 132, display: 'flex', flexDirection: 'column', borderLeft: '2px solid #101010', borderTop: '2px solid #101010', borderBottom: '2px solid #101010', background: 'rgba(213,213,189,0.96)' }}>
        <div style={{ flex: 1 }}>
          {ITEMS.map((it, i) => (
            <MenuRow key={it.key} label={it.label} selected={i === sel}
              onClick={() => { setSel(i); activate(i); }} />
          ))}
        </div>
        {open && <div style={{ padding: 4 }}><SubPanel which={open} /></div>}
        <div style={{ background: '#2870c0', borderTop: '2px solid #101010', padding: '5px 7px', fontFamily: 'var(--font-pixel)', fontSize: 7, lineHeight: 1.6, color: '#fff', whiteSpace: 'pre-line', minHeight: 30 }}>
          {item.desc}
        </div>
      </div>
    </div>
  );
}

window.StartMenu = StartMenu;
