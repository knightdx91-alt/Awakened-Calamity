import React from 'react';

/**
 * SurveillanceMeter — the spine mechanic, rendered cold. A near-black glass
 * gauge with a cyan→danger fill and a glowing tick. As Surveillance climbs,
 * the fill shifts toward red and the glow intensifies — the System notices.
 */
export function SurveillanceMeter({
  value,                     // 0–100
  max = 100,
  label = 'SURVEILLANCE',
  width = 180,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const hot = pct >= 0.66;
  const mid = pct >= 0.33;
  const fill = hot ? 'var(--sys-danger)' : mid ? 'var(--sys-warn)' : 'var(--sys-cyan)';
  const ink = hot ? 'var(--sys-danger-ink)' : mid ? 'var(--sys-warn-ink)' : 'var(--sys-ink)';
  const glow = hot
    ? '0 0 10px rgba(255,48,48,0.6)'
    : mid ? '0 0 8px rgba(248,208,0,0.45)'
    : '0 0 8px rgba(0,200,255,0.5)';

  return (
    <div
      style={{
        fontFamily: 'var(--font-pixel)',
        width,
        background: 'var(--sys-panel)',
        border: `1px solid ${fill}`,
        borderRadius: 'var(--radius-md)',
        padding: '6px 8px',
        boxShadow: glow,
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 'var(--text-2xs)',
          letterSpacing: 'var(--ls-normal)',
          color: ink,
          marginBottom: '4px',
        }}
      >
        <span style={{ opacity: 0.8 }}>{label}</span>
        <span>{Math.round(pct * 100)}%</span>
      </div>
      <div
        style={{
          height: '6px',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: 'var(--radius-pill)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            background: fill,
            boxShadow: `0 0 6px ${fill}`,
            transition: 'width var(--dur-slow) var(--ease-snap)',
          }}
        />
      </div>
    </div>
  );
}
