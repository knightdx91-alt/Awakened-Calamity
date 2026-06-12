import React from 'react';

/**
 * DialogueBox — the FireRed message window. Tan panel, pixel text with
 * generous line-height, and a blinking red advance-arrow in the corner.
 * `speaker` renders a small red name tag above the line.
 */
export function DialogueBox({
  text,
  speaker,
  showArrow = true,
  style,
  ...rest
}) {
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--fr-body)',
        border: 'var(--border-window)',
        boxShadow: 'var(--shadow-window)',
        borderRadius: 'var(--radius-xl)',
        padding: '7px 12px 6px',
        fontFamily: 'var(--font-pixel)',
        ...style,
      }}
      {...rest}
    >
      {speaker != null && (
        <div
          style={{
            color: 'var(--fr-red)',
            fontSize: 'var(--text-2xs)',
            marginBottom: '4px',
            letterSpacing: 'var(--ls-normal)',
          }}
        >
          {speaker}
        </div>
      )}
      <div
        style={{
          fontSize: 'var(--text-xs)',
          lineHeight: 'var(--lh-normal)',
          color: 'var(--fr-text)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          minHeight: '26px',
        }}
      >
        {text}
      </div>
      {showArrow && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '3px',
            right: '6px',
            fontSize: 'var(--text-md)',
            color: 'var(--fr-red)',
            animation: 'ac-blink 0.6s step-end infinite',
          }}
        >
          {'\u25BE'}
        </span>
      )}
      <style>{`@keyframes ac-blink{0%,100%{opacity:1}50%{opacity:0}}
        @media (prefers-reduced-motion: reduce){[style*="ac-blink"]{animation:none!important}}`}</style>
    </div>
  );
}
