import React from 'react';

const NODE = {
  safe:     { color: 'var(--node-safe)',     name: 'Safe Zone' },
  hold:     { color: 'var(--node-hold)',     name: 'Holdfast' },
  route:    { color: 'var(--node-route)',    name: 'Route' },
  dungeon:  { color: 'var(--node-dungeon)',  name: 'Dungeon' },
  calamity: { color: 'var(--node-calamity)', name: 'Calamity' },
  hidden:   { color: 'var(--node-hidden)',   name: 'Hidden' },
  water:    { color: 'var(--node-water)',    name: 'Sea / Coast' },
  under:    { color: 'var(--node-under)',    name: 'Underwater' },
};
const HZ = {
  heat: 'var(--hz-heat)', cold: 'var(--hz-cold)', toxic: 'var(--hz-toxic)',
  gloom: 'var(--hz-gloom)', tempest: 'var(--hz-tempest)',
};

function star(cx, cy, R, p) {
  let d = '';
  for (let i = 0; i < p * 2; i++) {
    const r = i % 2 ? R * 0.45 : R;
    const a = (Math.PI / p) * i - Math.PI / 2;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1);
  }
  return d + 'Z';
}

/**
 * MapMarker — the world-map's geometric place glyph. Shape encodes type
 * (diamond=Safe, rotated square=Holdfast, circle=route, triangle=dungeon,
 * star=Calamity, dashed circle=Hidden, rings=water/underwater); an optional
 * hazard halo rings it. This is the brand's core iconography.
 */
export function MapMarker({
  type = 'safe',
  hazard,                    // optional 'heat' | 'cold' | 'toxic' | 'gloom' | 'tempest'
  label,
  size = 40,
  style,
  ...rest
}) {
  const n = NODE[type] || NODE.safe;
  const c = size / 2;
  const haloColor = hazard ? HZ[hazard] : null;

  let shape;
  switch (type) {
    case 'safe':
      shape = <path d={`M${c} ${c-10} L${c+10} ${c} L${c} ${c+10} L${c-10} ${c} Z`} fill={n.color} stroke="#fff" strokeWidth="1.5" />;
      break;
    case 'hold':
      shape = <rect x={c-7} y={c-7} width="14" height="14" fill={n.color} stroke="#3a1d00" strokeWidth="1.5" transform={`rotate(45 ${c} ${c})`} />;
      break;
    case 'route':
      shape = <circle cx={c} cy={c} r="4.6" fill={n.color} stroke="#fff" strokeWidth="1.4" />;
      break;
    case 'dungeon':
      shape = <path d={`M${c} ${c-8} L${c+7.2} ${c+5.6} L${c-7.2} ${c+5.6} Z`} fill={n.color} stroke="#1c0a30" strokeWidth="1.2" />;
      break;
    case 'calamity':
      shape = <path d={star(c, c, 11, 5)} fill={n.color} stroke="#3a0008" strokeWidth="1.2" />;
      break;
    case 'hidden':
      shape = (
        <g>
          <circle cx={c} cy={c} r="7" fill="none" stroke={n.color} strokeWidth="2" strokeDasharray="2 3" />
          <text x={c} y={c+3.5} textAnchor="middle" fontSize="9" fill={n.color} fontFamily="var(--font-pixel)">?</text>
        </g>
      );
      break;
    case 'water':
      shape = <circle cx={c} cy={c} r="5" fill={n.color} stroke="#fff" strokeWidth="1.4" />;
      break;
    case 'under':
      shape = <circle cx={c} cy={c} r="5.5" fill="none" stroke={n.color} strokeWidth="2" strokeDasharray="3 2" />;
      break;
    default:
      shape = <circle cx={c} cy={c} r="5" fill={n.color} />;
  }

  const svg = (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', overflow: 'visible' }}>
      {haloColor && <circle cx={c} cy={c} r="13" fill="none" stroke={haloColor} strokeWidth="2" opacity="0.6" />}
      {shape}
    </svg>
  );

  if (label == null) {
    return <span style={{ display: 'inline-block', ...style }} {...rest}>{svg}</span>;
  }
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px', ...style }} {...rest}>
      {svg}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--hub-ink)', whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  );
}
