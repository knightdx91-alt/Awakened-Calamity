import React from 'react';

/**
 * FrButton — FireRed action / toggle button. Default is the tan-on-slate
 * resting state; hover and `active` invert to solid red with white text
 * (instant, no easing). Use `active` for the selected option in a group.
 */
export function FrButton({
  children,
  active = false,
  disabled = false,
  size = 'md',               // 'sm' | 'md'
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const lit = (hover || active) && !disabled;
  const pad = size === 'sm' ? '3px 7px' : '4px 8px';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: 'var(--font-pixel)',
        fontSize: 'var(--text-xs)',
        padding: pad,
        color: lit ? '#fff' : 'var(--fr-text)',
        background: lit ? 'var(--fr-red)' : 'var(--fr-body-lt)',
        border: `var(--bw-thin) solid ${lit ? 'var(--fr-red-dark)' : 'var(--fr-border)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-stamp)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        whiteSpace: 'nowrap',
        lineHeight: 'var(--lh-tight)',
        transition: 'background var(--dur-fast), color var(--dur-fast)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
