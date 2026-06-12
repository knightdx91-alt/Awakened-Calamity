import React from 'react';

/**
 * MenuRow — a FireRed start-menu / list row: a blinking-position cursor on
 * the left, a label, and a selected state (faint red wash + red left-border).
 * Compose several inside an FrWindow to build the start menu or a sub-menu.
 */
export function MenuRow({
  label,
  selected = false,
  cursor = '\u25B8',          // ▸
  right,
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
        gap: '4px',
        padding: '4px 10px',
        fontFamily: 'var(--font-pixel)',
        fontSize: 'var(--text-xs)',
        color: 'var(--fr-text)',
        cursor: 'pointer',
        borderLeft: `3px solid ${lit ? 'var(--fr-red)' : 'transparent'}`,
        background: lit ? 'rgba(230,8,8,0.10)' : 'transparent',
        lineHeight: 'var(--lh-tight)',
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          width: '8px',
          color: 'var(--fr-red)',
          visibility: selected ? 'visible' : 'hidden',
        }}
      >
        {cursor}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {right != null && (
        <span style={{ color: 'var(--fr-text-dim)', fontSize: 'var(--text-2xs)' }}>{right}</span>
      )}
    </div>
  );
}
