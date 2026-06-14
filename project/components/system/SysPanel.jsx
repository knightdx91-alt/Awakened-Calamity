import React from 'react';

function Bracket({ pos, color }) {
  const base = { position: 'absolute', width: '8px', height: '8px', pointerEvents: 'none' };
  const map = {
    tl: { top: '-1px', left: '-1px', borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
    tr: { top: '-1px', right: '-1px', borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
    bl: { bottom: '-1px', left: '-1px', borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
    br: { bottom: '-1px', right: '-1px', borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` },
  };
  return <span style={{ ...base, ...map[pos] }} />;
}

/**
 * SysPanel — the System OS surface: dark holographic glass, a 1px cyan edge
 * with glow, corner brackets, faint scanlines, and an optional bracketed
 * title bar. The base container for every in-game menu and dialog. Pass a
 * warn/danger `accent` to recolor the edge + brackets for alerts.
 */
export function SysPanel({
  title,
  accent = 'var(--os-edge)',
  width,
  brackets = true,
  scanlines = true,
  children,
  style,
  bodyStyle,
  ...rest
}) {
  return (
    <div
      style={{
        position: 'relative',
        width,
        background: 'var(--os-glass)',
        border: `1px solid ${accent}`,
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--os-glow)',
        fontFamily: 'var(--font-pixel)',
        color: 'var(--os-ink)',
        ...style,
      }}
      {...rest}
    >
      {title != null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 9px',
            borderBottom: `1px solid ${accent}`,
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--ls-wide)',
            color: accent,
            textShadow: `0 0 6px ${accent}`,
          }}
        >
          {title}
        </div>
      )}
      <div style={{ position: 'relative', padding: '10px', ...bodyStyle }}>{children}</div>
      {scanlines && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'var(--radius-sm)',
            background: 'repeating-linear-gradient(0deg, var(--os-line) 0 1px, transparent 1px 3px)',
            opacity: 0.5, mixBlendMode: 'screen',
          }}
        />
      )}
      {brackets && ['tl', 'tr', 'bl', 'br'].map((p) => <Bracket key={p} pos={p} color={accent} />)}
    </div>
  );
}
