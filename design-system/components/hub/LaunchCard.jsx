import React from 'react';

/**
 * LaunchCard — the dark-cyber hub card. Near-black panel with a double cyan
 * stroke, an icon tile, title + subtitle, and a › arrow. Lifts and brightens
 * on hover. The bridge surface between the warm game and the cold System.
 */
export function LaunchCard({
  title,
  subtitle,
  icon,                      // glyph string or node
  href,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const Tag = href ? 'a' : 'div';

  return (
    <Tag
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
        background: 'var(--hub-panel)',
        border: '1px solid #000',
        borderRadius: 'var(--radius-2xl)',
        boxShadow: hover ? 'var(--cyber-frame-hv)' : 'var(--cyber-frame)',
        transform: hover ? 'translateY(-2px)' : 'none',
        textDecoration: 'none',
        color: 'var(--hub-ink)',
        fontFamily: 'var(--font-mono)',
        cursor: 'pointer',
        transition: 'transform var(--dur-fast), box-shadow var(--dur-fast)',
        ...style,
      }}
      {...rest}
    >
      {icon != null && (
        <div
          style={{
            width: '40px',
            height: '40px',
            flexShrink: 0,
            background: '#0a1830',
            border: '1px solid var(--hub-cyan)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: 'var(--hub-cyan-hot)',
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--hub-cyan-ttl)' }}>
          {title}
        </div>
        {subtitle != null && (
          <div style={{ fontSize: 'var(--text-lg)', color: 'var(--hub-ink-dim)', marginTop: '2px' }}>
            {subtitle}
          </div>
        )}
      </div>
      <span style={{ fontSize: 'var(--text-xl)', color: hover ? 'var(--hub-cyan)' : '#3a4a5a', flexShrink: 0 }}>
        {'\u203A'}
      </span>
    </Tag>
  );
}
