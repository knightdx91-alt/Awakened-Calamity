import React from 'react';

const AFFINITIES = {
  ember:      { color: 'var(--aff-ember)',      name: 'Ember' },
  tide:       { color: 'var(--aff-tide)',       name: 'Tide' },
  verdant:    { color: 'var(--aff-verdant)',    name: 'Verdant' },
  storm:      { color: 'var(--aff-storm)',      name: 'Storm' },
  stone:      { color: 'var(--aff-stone)',      name: 'Stone' },
  frost:      { color: 'var(--aff-frost)',      name: 'Frost' },
  toxin:      { color: 'var(--aff-toxin)',      name: 'Toxin' },
  umbral:     { color: 'var(--aff-umbral)',     name: 'Umbral' },
  lumen:      { color: 'var(--aff-lumen)',      name: 'Lumen' },
  corruption: { color: 'var(--aff-corruption)', name: 'Corruption' },
  untethered: { color: 'var(--aff-untethered)', name: 'Untethered' },
};

/**
 * AffinityBadge — one of the 9 affinities (Ember, Tide, Verdant, Storm,
 * Stone, Frost, Toxin, Umbral, Lumen) or the 2 meta-types (Corruption,
 * Untethered). A solid-fill pill keyed to the affinity color.
 */
export function AffinityBadge({
  affinity,
  label,                     // override display text
  size = 'md',               // 'sm' | 'md'
  style,
  ...rest
}) {
  const a = AFFINITIES[affinity] || AFFINITIES.ember;
  const meta = affinity === 'corruption' || affinity === 'untethered';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-pixel)',
        fontSize: size === 'sm' ? 'var(--text-2xs)' : 'var(--text-xs)',
        color: '#0a0a12',
        background: a.color,
        border: meta ? '1px dashed rgba(0,0,0,0.55)' : '1px solid rgba(0,0,0,0.35)',
        borderRadius: 'var(--radius-sm)',
        padding: size === 'sm' ? '2px 6px' : '3px 8px',
        letterSpacing: 'var(--ls-normal)',
        lineHeight: 'var(--lh-tight)',
        ...style,
      }}
      {...rest}
    >
      {label ?? a.name}
    </span>
  );
}
