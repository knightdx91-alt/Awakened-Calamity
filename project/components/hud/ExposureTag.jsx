import React from 'react';

const HZ = {
  heat:    { color: 'var(--hz-heat)',    name: 'HEAT' },
  cold:    { color: 'var(--hz-cold)',    name: 'COLD' },
  toxic:   { color: 'var(--hz-toxic)',   name: 'TOXIC' },
  gloom:   { color: 'var(--hz-gloom)',   name: 'GLOOM' },
  tempest: { color: 'var(--hz-tempest)', name: 'TEMPEST' },
};

/**
 * ExposureTag — the conditional hazard readout. Renders ONLY while the player
 * is actively taking a biome hazard; it pulses in the hazard's color to pull
 * the eye (it's a threat). Hidden state returns null, so it can be mounted
 * unconditionally in the HUD and driven by `hazard`.
 */
export function ExposureTag({
  hazard,                    // falsy → renders nothing
  value,                     // 0–100 exposure
  width = 132,
  style,
  ...rest
}) {
  if (!hazard) return null;
  const h = HZ[hazard] || HZ.heat;
  const pct = Math.max(0, Math.min(1, (value ?? 100) / 100));

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        width,
        padding: '3px 6px',
        background: 'var(--os-scrim)',
        border: `1px solid ${h.color}`,
        borderRadius: '4px',
        boxShadow: `0 0 8px ${h.color}`,
        fontFamily: 'var(--font-pixel)',
        animation: 'ac-expo-pulse 0.9s ease-in-out infinite alternate',
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: '9px', height: '9px', flexShrink: 0, background: h.color, borderRadius: '2px', boxShadow: `0 0 6px ${h.color}` }} />
      <span style={{ fontSize: 'var(--text-2xs)', color: h.color, flexShrink: 0 }}>{h.name}</span>
      <div style={{ flex: 1, height: '5px', background: 'rgba(0,0,0,0.55)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: h.color, boxShadow: `0 0 6px ${h.color}` }} />
      </div>
      <style>{`@keyframes ac-expo-pulse{from{box-shadow:0 0 5px ${'rgba(0,0,0,0)'}}to{box-shadow:0 0 12px currentColor}}
        @media (prefers-reduced-motion: reduce){[style*="ac-expo-pulse"]{animation:none!important}}`}</style>
    </div>
  );
}
