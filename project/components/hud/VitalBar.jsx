import React from 'react';

const KIND = {
  hp:      { color: 'var(--vital-hp)',      code: 'HP' },
  mana:    { color: 'var(--vital-mana)',    code: 'MP' },
  stamina: { color: 'var(--vital-stamina)', code: 'SP' },
};

/**
 * VitalBar — a compact, self-backed System HUD bar for a player vital
 * (HP / Mana / Stamina). Dark-glass backing + edge glow so it reads over
 * any terrain, bright or dark. This is the only kind of stat allowed on the
 * play screen; everything else lives in the Status menu.
 */
export function VitalBar({
  kind = 'hp',
  value,
  max = 100,
  width = 132,
  showValue = true,
  style,
  ...rest
}) {
  const k = KIND[kind] || KIND.hp;
  const pct = Math.max(0, Math.min(1, value / max));
  const low = kind === 'hp' && pct <= 0.25;
  const fill = low ? 'var(--vital-hp-low)' : k.color;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        width,
        padding: '3px 6px',
        background: 'var(--os-scrim)',
        border: '1px solid var(--os-line)',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
        fontFamily: 'var(--font-pixel)',
        ...style,
      }}
      {...rest}
    >
      <span style={{ fontSize: 'var(--text-2xs)', color: fill, width: '14px', flexShrink: 0, textShadow: `0 0 5px ${fill}` }}>
        {k.code}
      </span>
      <div
        style={{
          flex: 1,
          height: '6px',
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 'var(--radius-pill)',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            background: fill,
            boxShadow: `0 0 6px ${fill}`,
            transition: 'width var(--dur-med) var(--ease-snap)',
            animation: low ? 'ac-vital-flash 0.7s steps(2) infinite' : 'none',
          }}
        />
      </div>
      {showValue && (
        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--os-ink)', minWidth: '28px', textAlign: 'right', flexShrink: 0 }}>
          {Math.round(value)}
        </span>
      )}
      <style>{`@keyframes ac-vital-flash{0%{opacity:1}100%{opacity:0.55}}
        @media (prefers-reduced-motion: reduce){[style*="ac-vital-flash"]{animation:none!important}}`}</style>
    </div>
  );
}
