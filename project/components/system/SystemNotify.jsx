import React from 'react';

const TYPE = {
  info:    { border: 'var(--sys-cyan)',   ink: 'var(--sys-ink)',        label: 'var(--sys-cyan)',   glow: 'var(--glow-cyan)' },
  warning: { border: 'var(--sys-warn)',   ink: 'var(--sys-warn-ink)',   label: 'var(--sys-warn)',   glow: 'var(--glow-warn)' },
  danger:  { border: 'var(--sys-danger)', ink: 'var(--sys-danger-ink)', label: 'var(--sys-danger)', glow: 'var(--glow-danger)' },
};

/**
 * SystemNotify — the antagonist's voice. A near-black glass toast with a
 * neon border, the "[ THE SYSTEM ]" label, and a message in menacing
 * corporate cheer. Danger toasts pulse. This is the cold half of the brand.
 */
export function SystemNotify({
  type = 'info',             // 'info' | 'warning' | 'danger'
  label = '[ THE SYSTEM ]',
  message,
  children,
  style,
  ...rest
}) {
  const t = TYPE[type] || TYPE.info;

  return (
    <div
      style={{
        fontFamily: 'var(--font-pixel)',
        background: 'var(--sys-panel)',
        border: `1px solid ${t.border}`,
        borderRadius: 'var(--radius-md)',
        padding: '6px 10px',
        maxWidth: '220px',
        color: t.ink,
        boxShadow: t.glow,
        lineHeight: 'var(--lh-snug)',
        animation: type === 'danger' ? 'ac-sys-pulse 0.8s ease-in-out infinite alternate' : 'none',
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          fontSize: 'var(--text-2xs)',
          letterSpacing: 'var(--ls-normal)',
          color: t.label,
          opacity: 0.8,
          marginBottom: '3px',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 'var(--text-2xs)', lineHeight: 'var(--lh-normal)' }}>
        {message ?? children}
      </div>
      <style>{`@keyframes ac-sys-pulse{from{box-shadow:0 0 6px rgba(255,48,48,0.4)}to{box-shadow:0 0 14px rgba(255,48,48,0.85)}}
        @media (prefers-reduced-motion: reduce){[style*="ac-sys-pulse"]{animation:none!important}}`}</style>
    </div>
  );
}
