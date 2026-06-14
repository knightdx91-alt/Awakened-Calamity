import React from 'react';

/**
 * DialogueBox — the in-world message window, rendered in the System OS skin:
 * dark glass, a thin cyan edge, a cyan speaker tag, pixel text, and a blinking
 * cyan advance-arrow. NPC lines read on the same dark surface the System uses —
 * in this world there is no UI that isn't the interface.
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
        background: 'var(--os-glass)',
        border: '1px solid var(--os-edge)',
        boxShadow: 'var(--os-glow)',
        borderRadius: 'var(--radius-sm)',
        padding: '8px 12px 7px',
        fontFamily: 'var(--font-pixel)',
        ...style,
      }}
      {...rest}
    >
      {speaker != null && (
        <div
          style={{
            color: 'var(--os-edge)',
            fontSize: 'var(--text-2xs)',
            marginBottom: '5px',
            letterSpacing: 'var(--ls-normal)',
            textShadow: '0 0 6px var(--os-edge)',
          }}
        >
          {speaker}
        </div>
      )}
      <div
        style={{
          fontSize: 'var(--text-xs)',
          lineHeight: 'var(--lh-normal)',
          color: 'var(--os-ink)',
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
            bottom: '4px',
            right: '7px',
            fontSize: 'var(--text-md)',
            color: 'var(--os-edge)',
            textShadow: '0 0 6px var(--os-edge)',
            animation: 'ac-dlg-blink 0.6s step-end infinite',
          }}
        >
          {'\u25BE'}
        </span>
      )}
      <style>{`@keyframes ac-dlg-blink{0%,100%{opacity:1}50%{opacity:0}}
        @media (prefers-reduced-motion: reduce){[style*="ac-dlg-blink"]{animation:none!important}}`}</style>
    </div>
  );
}
