import React from 'react';

const HAZARDS = {
  heat:    { color: 'var(--hz-heat)',    name: 'Heat' },
  cold:    { color: 'var(--hz-cold)',    name: 'Cold' },
  toxic:   { color: 'var(--hz-toxic)',   name: 'Toxic' },
  gloom:   { color: 'var(--hz-gloom)',   name: 'Gloom' },
  tempest: { color: 'var(--hz-tempest)', name: 'Tempest' },
};

/**
 * HazardChip — one of the five player-facing biome hazards. The palette IS
 * the icon: a colored square + label. Used on zone cards, the HUD, and the
 * world map legend.
 */
export function HazardChip({
  hazard,                    // 'heat' | 'cold' | 'toxic' | 'gloom' | 'tempest'
  showLabel = true,
  size = 'md',               // 'sm' | 'md'
  style,
  ...rest
}) {
  const h = HAZARDS[hazard] || HAZARDS.heat;
  const sw = size === 'sm' ? 9 : 12;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontFamily: 'var(--font-pixel)',
        fontSize: 'var(--text-2xs)',
        color: 'var(--hub-ink)',
        background: 'rgba(0,0,0,0.35)',
        border: `1px solid ${h.color}`,
        borderRadius: 'var(--radius-pill)',
        padding: showLabel ? '2px 8px 2px 5px' : '3px',
        lineHeight: 'var(--lh-tight)',
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          width: sw,
          height: sw,
          background: h.color,
          borderRadius: '2px',
          boxShadow: `0 0 5px ${h.color}`,
          flexShrink: 0,
        }}
      />
      {showLabel && <span>{h.name}</span>}
    </span>
  );
}
