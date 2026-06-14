import React from 'react';

/**
 * SysMenuItem — a System OS menu row. Resting rows are dim cyan ink; the
 * selected row lights up with a cyan left-bar, faint wash, and glow. Optional
 * left glyph and right-aligned hint. Stack these inside a SysPanel to build
 * the pause menu and every sub-list.
 */
export function SysMenuItem({
  label,
  glyph,
  right,
  selected = false,
  accent = 'var(--os-edge)',
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const lit = selected || hover;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 9px',
        fontFamily: 'var(--font-pixel)',
        fontSize: 'var(--text-2xs)',
        lineHeight: 'var(--lh-tight)',
        color: lit ? '#eafaff' : 'var(--os-ink-dim)',
        borderLeft: `3px solid ${selected ? accent : 'transparent'}`,
        background: lit ? 'rgba(0,200,255,0.10)' : 'transparent',
        textShadow: lit ? `0 0 6px ${accent}` : 'none',
        cursor: 'pointer',
        transition: 'background var(--dur-fast), color var(--dur-fast)',
        ...style,
      }}
      {...rest}
    >
      {glyph != null && (
        <span style={{ width: '10px', flexShrink: 0, color: lit ? accent : 'var(--os-ink-dim)', textAlign: 'center' }}>{glyph}</span>
      )}
      <span style={{ flex: 1 }}>{label}</span>
      {right != null && (
        <span style={{ fontSize: 'var(--text-2xs)', color: lit ? accent : 'var(--os-ink-dim)', opacity: 0.85 }}>{right}</span>
      )}
    </div>
  );
}
