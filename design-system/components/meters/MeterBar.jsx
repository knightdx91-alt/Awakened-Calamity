import React from 'react';

const STATE = {
  green:  'var(--meter-green)',
  yellow: 'var(--meter-yellow)',
  red:    'var(--meter-red)',
};

/**
 * MeterBar — the FireRed health/stat bar. Auto-colors green→yellow→red by
 * fill (HP style), or pass a fixed `color`. Used for HP, Stamina, Exposure.
 */
export function MeterBar({
  value,
  max = 100,
  label,
  color = 'auto',            // 'auto' | css color (e.g. var(--hz-heat))
  showText = true,
  width = 120,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  let fill;
  if (color === 'auto') {
    fill = pct > 0.5 ? STATE.green : pct > 0.2 ? STATE.yellow : STATE.red;
  } else {
    fill = color;
  }

  return (
    <div style={{ fontFamily: 'var(--font-pixel)', width, ...style }} {...rest}>
      {label != null && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 'var(--text-2xs)',
            color: 'var(--fr-text-dim)',
            marginBottom: '2px',
          }}
        >
          <span style={{ color: 'var(--fr-text)' }}>{label}</span>
          {showText && <span>{Math.round(value)}/{max}</span>}
        </div>
      )}
      <div
        style={{
          background: 'var(--fr-tan)',
          border: '1px solid var(--fr-border)',
          borderRadius: 'var(--radius-sm)',
          height: '7px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            background: fill,
            transition: 'width var(--dur-med) var(--ease-snap)',
          }}
        />
      </div>
    </div>
  );
}
