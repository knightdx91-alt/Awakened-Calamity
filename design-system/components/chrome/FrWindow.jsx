import React from 'react';

/**
 * FrWindow — the signature FireRed game-chrome panel: tan body, 3px slate
 * border, inset white highlight bevel, rounded corners, hard drop-shadow.
 * Optional red title bar. This is the base surface for nearly all warm UI.
 */
export function FrWindow({
  title,
  variant = 'body',          // 'body' (#d5d5bd) | 'light' (#f0f0d8)
  shadow = 'sm',             // 'sm' | 'lg' | 'none'
  children,
  style,
  bodyStyle,
  ...rest
}) {
  const bg = variant === 'light' ? 'var(--fr-body-lt)' : 'var(--fr-body)';
  const drop =
    shadow === 'lg' ? 'var(--shadow-window-lg)'
    : shadow === 'none' ? 'var(--shadow-inset)'
    : 'var(--shadow-window)';

  return (
    <div
      style={{
        background: bg,
        border: 'var(--border-window)',
        boxShadow: drop,
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        fontFamily: 'var(--font-pixel)',
        color: 'var(--fr-text)',
        ...style,
      }}
      {...rest}
    >
      {title != null && (
        <div
          style={{
            background: 'var(--fr-red)',
            color: '#fff',
            fontSize: 'var(--text-sm)',
            letterSpacing: 'var(--ls-normal)',
            padding: '6px 10px',
            borderBottom: 'var(--bw-thin) solid var(--fr-border)',
          }}
        >
          {title}
        </div>
      )}
      <div style={{ padding: title != null ? '10px' : '8px', ...bodyStyle }}>
        {children}
      </div>
    </div>
  );
}
