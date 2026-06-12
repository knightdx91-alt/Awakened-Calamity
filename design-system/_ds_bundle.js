/* @ds-bundle: {"format":3,"namespace":"AwakenedCalamityDesignSystem_475ed3","components":[{"name":"DialogueBox","sourcePath":"components/chrome/DialogueBox.jsx"},{"name":"FrButton","sourcePath":"components/chrome/FrButton.jsx"},{"name":"FrWindow","sourcePath":"components/chrome/FrWindow.jsx"},{"name":"MenuRow","sourcePath":"components/chrome/MenuRow.jsx"},{"name":"LaunchCard","sourcePath":"components/hub/LaunchCard.jsx"},{"name":"MeterBar","sourcePath":"components/meters/MeterBar.jsx"},{"name":"SurveillanceMeter","sourcePath":"components/meters/SurveillanceMeter.jsx"},{"name":"SystemNotify","sourcePath":"components/system/SystemNotify.jsx"},{"name":"AffinityBadge","sourcePath":"components/world/AffinityBadge.jsx"},{"name":"HazardChip","sourcePath":"components/world/HazardChip.jsx"},{"name":"MapMarker","sourcePath":"components/world/MapMarker.jsx"}],"sourceHashes":{"components/chrome/DialogueBox.jsx":"c612d1279dc8","components/chrome/FrButton.jsx":"290b982e66d6","components/chrome/FrWindow.jsx":"302f726391db","components/chrome/MenuRow.jsx":"01f1d4a13d1f","components/hub/LaunchCard.jsx":"3fbe63bdb308","components/meters/MeterBar.jsx":"87b71fc16118","components/meters/SurveillanceMeter.jsx":"5287fdc5aa7f","components/system/SystemNotify.jsx":"cd8044991b43","components/world/AffinityBadge.jsx":"a65f5fa91b58","components/world/HazardChip.jsx":"5d1229384975","components/world/MapMarker.jsx":"dd973a8d05bd","ui_kits/game/BattleScene.jsx":"59568ed80a80","ui_kits/game/GameWorld.jsx":"b39a4a705eaa","ui_kits/game/StartMenu.jsx":"c5c1fb0d3c44"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AwakenedCalamityDesignSystem_475ed3 = window.AwakenedCalamityDesignSystem_475ed3 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/chrome/DialogueBox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DialogueBox — the FireRed message window. Tan panel, pixel text with
 * generous line-height, and a blinking red advance-arrow in the corner.
 * `speaker` renders a small red name tag above the line.
 */
function DialogueBox({
  text,
  speaker,
  showArrow = true,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      background: 'var(--fr-body)',
      border: 'var(--border-window)',
      boxShadow: 'var(--shadow-window)',
      borderRadius: 'var(--radius-xl)',
      padding: '7px 12px 6px',
      fontFamily: 'var(--font-pixel)',
      ...style
    }
  }, rest), speaker != null && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--fr-red)',
      fontSize: 'var(--text-2xs)',
      marginBottom: '4px',
      letterSpacing: 'var(--ls-normal)'
    }
  }, speaker), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--lh-normal)',
      color: 'var(--fr-text)',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      minHeight: '26px'
    }
  }, text), showArrow && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      bottom: '3px',
      right: '6px',
      fontSize: 'var(--text-md)',
      color: 'var(--fr-red)',
      animation: 'ac-blink 0.6s step-end infinite'
    }
  }, '\u25BE'), /*#__PURE__*/React.createElement("style", null, `@keyframes ac-blink{0%,100%{opacity:1}50%{opacity:0}}
        @media (prefers-reduced-motion: reduce){[style*="ac-blink"]{animation:none!important}}`));
}
Object.assign(__ds_scope, { DialogueBox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/DialogueBox.jsx", error: String((e && e.message) || e) }); }

// components/chrome/FrButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * FrButton — FireRed action / toggle button. Default is the tan-on-slate
 * resting state; hover and `active` invert to solid red with white text
 * (instant, no easing). Use `active` for the selected option in a group.
 */
function FrButton({
  children,
  active = false,
  disabled = false,
  size = 'md',
  // 'sm' | 'md'
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const lit = (hover || active) && !disabled;
  const pad = size === 'sm' ? '3px 7px' : '4px 8px';
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
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
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { FrButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/FrButton.jsx", error: String((e && e.message) || e) }); }

// components/chrome/FrWindow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * FrWindow — the signature FireRed game-chrome panel: tan body, 3px slate
 * border, inset white highlight bevel, rounded corners, hard drop-shadow.
 * Optional red title bar. This is the base surface for nearly all warm UI.
 */
function FrWindow({
  title,
  variant = 'body',
  // 'body' (#d5d5bd) | 'light' (#f0f0d8)
  shadow = 'sm',
  // 'sm' | 'lg' | 'none'
  children,
  style,
  bodyStyle,
  ...rest
}) {
  const bg = variant === 'light' ? 'var(--fr-body-lt)' : 'var(--fr-body)';
  const drop = shadow === 'lg' ? 'var(--shadow-window-lg)' : shadow === 'none' ? 'var(--shadow-inset)' : 'var(--shadow-window)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: bg,
      border: 'var(--border-window)',
      boxShadow: drop,
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      fontFamily: 'var(--font-pixel)',
      color: 'var(--fr-text)',
      ...style
    }
  }, rest), title != null && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--fr-red)',
      color: '#fff',
      fontSize: 'var(--text-sm)',
      letterSpacing: 'var(--ls-normal)',
      padding: '6px 10px',
      borderBottom: 'var(--bw-thin) solid var(--fr-border)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: title != null ? '10px' : '8px',
      ...bodyStyle
    }
  }, children));
}
Object.assign(__ds_scope, { FrWindow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/FrWindow.jsx", error: String((e && e.message) || e) }); }

// components/chrome/MenuRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MenuRow — a FireRed start-menu / list row: a blinking-position cursor on
 * the left, a label, and a selected state (faint red wash + red left-border).
 * Compose several inside an FrWindow to build the start menu or a sub-menu.
 */
function MenuRow({
  label,
  selected = false,
  cursor = '\u25B8',
  // ▸
  right,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const lit = selected || hover;
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      fontFamily: 'var(--font-pixel)',
      fontSize: 'var(--text-xs)',
      color: 'var(--fr-text)',
      cursor: 'pointer',
      borderLeft: `3px solid ${lit ? 'var(--fr-red)' : 'transparent'}`,
      background: lit ? 'rgba(230,8,8,0.10)' : 'transparent',
      lineHeight: 'var(--lh-tight)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: '8px',
      color: 'var(--fr-red)',
      visibility: selected ? 'visible' : 'hidden'
    }
  }, cursor), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, label), right != null && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--fr-text-dim)',
      fontSize: 'var(--text-2xs)'
    }
  }, right));
}
Object.assign(__ds_scope, { MenuRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/MenuRow.jsx", error: String((e && e.message) || e) }); }

// components/hub/LaunchCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * LaunchCard — the dark-cyber hub card. Near-black panel with a double cyan
 * stroke, an icon tile, title + subtitle, and a › arrow. Lifts and brightens
 * on hover. The bridge surface between the warm game and the cold System.
 */
function LaunchCard({
  title,
  subtitle,
  icon,
  // glyph string or node
  href,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const Tag = href ? 'a' : 'div';
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
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
      ...style
    }
  }, rest), icon != null && /*#__PURE__*/React.createElement("div", {
    style: {
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
      color: 'var(--hub-cyan-hot)'
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xl)',
      fontWeight: 600,
      color: 'var(--hub-cyan-ttl)'
    }
  }, title), subtitle != null && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-lg)',
      color: 'var(--hub-ink-dim)',
      marginTop: '2px'
    }
  }, subtitle)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xl)',
      color: hover ? 'var(--hub-cyan)' : '#3a4a5a',
      flexShrink: 0
    }
  }, '\u203A'));
}
Object.assign(__ds_scope, { LaunchCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/hub/LaunchCard.jsx", error: String((e && e.message) || e) }); }

// components/meters/MeterBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STATE = {
  green: 'var(--meter-green)',
  yellow: 'var(--meter-yellow)',
  red: 'var(--meter-red)'
};

/**
 * MeterBar — the FireRed health/stat bar. Auto-colors green→yellow→red by
 * fill (HP style), or pass a fixed `color`. Used for HP, Stamina, Exposure.
 */
function MeterBar({
  value,
  max = 100,
  label,
  color = 'auto',
  // 'auto' | css color (e.g. var(--hz-heat))
  showText = true,
  width = 120,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  let fill;
  if (color === 'auto') {
    fill = pct > 0.5 ? STATE.green : pct > 0.2 ? STATE.yellow : STATE.red;
  } else {
    fill = color;
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--font-pixel)',
      width,
      ...style
    }
  }, rest), label != null && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 'var(--text-2xs)',
      color: 'var(--fr-text-dim)',
      marginBottom: '2px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--fr-text)'
    }
  }, label), showText && /*#__PURE__*/React.createElement("span", null, Math.round(value), "/", max)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--fr-tan)',
      border: '1px solid var(--fr-border)',
      borderRadius: 'var(--radius-sm)',
      height: '7px',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct * 100}%`,
      height: '100%',
      background: fill,
      transition: 'width var(--dur-med) var(--ease-snap)'
    }
  })));
}
Object.assign(__ds_scope, { MeterBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/meters/MeterBar.jsx", error: String((e && e.message) || e) }); }

// components/meters/SurveillanceMeter.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SurveillanceMeter — the spine mechanic, rendered cold. A near-black glass
 * gauge with a cyan→danger fill and a glowing tick. As Surveillance climbs,
 * the fill shifts toward red and the glow intensifies — the System notices.
 */
function SurveillanceMeter({
  value,
  // 0–100
  max = 100,
  label = 'SURVEILLANCE',
  width = 180,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const hot = pct >= 0.66;
  const mid = pct >= 0.33;
  const fill = hot ? 'var(--sys-danger)' : mid ? 'var(--sys-warn)' : 'var(--sys-cyan)';
  const ink = hot ? 'var(--sys-danger-ink)' : mid ? 'var(--sys-warn-ink)' : 'var(--sys-ink)';
  const glow = hot ? '0 0 10px rgba(255,48,48,0.6)' : mid ? '0 0 8px rgba(248,208,0,0.45)' : '0 0 8px rgba(0,200,255,0.5)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--font-pixel)',
      width,
      background: 'var(--sys-panel)',
      border: `1px solid ${fill}`,
      borderRadius: 'var(--radius-md)',
      padding: '6px 8px',
      boxShadow: glow,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 'var(--text-2xs)',
      letterSpacing: 'var(--ls-normal)',
      color: ink,
      marginBottom: '4px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.8
    }
  }, label), /*#__PURE__*/React.createElement("span", null, Math.round(pct * 100), "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '6px',
      background: 'rgba(0,0,0,0.5)',
      borderRadius: 'var(--radius-pill)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct * 100}%`,
      height: '100%',
      background: fill,
      boxShadow: `0 0 6px ${fill}`,
      transition: 'width var(--dur-slow) var(--ease-snap)'
    }
  })));
}
Object.assign(__ds_scope, { SurveillanceMeter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/meters/SurveillanceMeter.jsx", error: String((e && e.message) || e) }); }

// components/system/SystemNotify.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TYPE = {
  info: {
    border: 'var(--sys-cyan)',
    ink: 'var(--sys-ink)',
    label: 'var(--sys-cyan)',
    glow: 'var(--glow-cyan)'
  },
  warning: {
    border: 'var(--sys-warn)',
    ink: 'var(--sys-warn-ink)',
    label: 'var(--sys-warn)',
    glow: 'var(--glow-warn)'
  },
  danger: {
    border: 'var(--sys-danger)',
    ink: 'var(--sys-danger-ink)',
    label: 'var(--sys-danger)',
    glow: 'var(--glow-danger)'
  }
};

/**
 * SystemNotify — the antagonist's voice. A near-black glass toast with a
 * neon border, the "[ THE SYSTEM ]" label, and a message in menacing
 * corporate cheer. Danger toasts pulse. This is the cold half of the brand.
 */
function SystemNotify({
  type = 'info',
  // 'info' | 'warning' | 'danger'
  label = '[ THE SYSTEM ]',
  message,
  children,
  style,
  ...rest
}) {
  const t = TYPE[type] || TYPE.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
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
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-2xs)',
      letterSpacing: 'var(--ls-normal)',
      color: t.label,
      opacity: 0.8,
      marginBottom: '3px'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-2xs)',
      lineHeight: 'var(--lh-normal)'
    }
  }, message ?? children), /*#__PURE__*/React.createElement("style", null, `@keyframes ac-sys-pulse{from{box-shadow:0 0 6px rgba(255,48,48,0.4)}to{box-shadow:0 0 14px rgba(255,48,48,0.85)}}
        @media (prefers-reduced-motion: reduce){[style*="ac-sys-pulse"]{animation:none!important}}`));
}
Object.assign(__ds_scope, { SystemNotify });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/system/SystemNotify.jsx", error: String((e && e.message) || e) }); }

// components/world/AffinityBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const AFFINITIES = {
  ember: {
    color: 'var(--aff-ember)',
    name: 'Ember'
  },
  tide: {
    color: 'var(--aff-tide)',
    name: 'Tide'
  },
  verdant: {
    color: 'var(--aff-verdant)',
    name: 'Verdant'
  },
  storm: {
    color: 'var(--aff-storm)',
    name: 'Storm'
  },
  stone: {
    color: 'var(--aff-stone)',
    name: 'Stone'
  },
  frost: {
    color: 'var(--aff-frost)',
    name: 'Frost'
  },
  toxin: {
    color: 'var(--aff-toxin)',
    name: 'Toxin'
  },
  umbral: {
    color: 'var(--aff-umbral)',
    name: 'Umbral'
  },
  lumen: {
    color: 'var(--aff-lumen)',
    name: 'Lumen'
  },
  corruption: {
    color: 'var(--aff-corruption)',
    name: 'Corruption'
  },
  untethered: {
    color: 'var(--aff-untethered)',
    name: 'Untethered'
  }
};

/**
 * AffinityBadge — one of the 9 affinities (Ember, Tide, Verdant, Storm,
 * Stone, Frost, Toxin, Umbral, Lumen) or the 2 meta-types (Corruption,
 * Untethered). A solid-fill pill keyed to the affinity color.
 */
function AffinityBadge({
  affinity,
  label,
  // override display text
  size = 'md',
  // 'sm' | 'md'
  style,
  ...rest
}) {
  const a = AFFINITIES[affinity] || AFFINITIES.ember;
  const meta = affinity === 'corruption' || affinity === 'untethered';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
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
      ...style
    }
  }, rest), label ?? a.name);
}
Object.assign(__ds_scope, { AffinityBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/world/AffinityBadge.jsx", error: String((e && e.message) || e) }); }

// components/world/HazardChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const HAZARDS = {
  heat: {
    color: 'var(--hz-heat)',
    name: 'Heat'
  },
  cold: {
    color: 'var(--hz-cold)',
    name: 'Cold'
  },
  toxic: {
    color: 'var(--hz-toxic)',
    name: 'Toxic'
  },
  gloom: {
    color: 'var(--hz-gloom)',
    name: 'Gloom'
  },
  tempest: {
    color: 'var(--hz-tempest)',
    name: 'Tempest'
  }
};

/**
 * HazardChip — one of the five player-facing biome hazards. The palette IS
 * the icon: a colored square + label. Used on zone cards, the HUD, and the
 * world map legend.
 */
function HazardChip({
  hazard,
  // 'heat' | 'cold' | 'toxic' | 'gloom' | 'tempest'
  showLabel = true,
  size = 'md',
  // 'sm' | 'md'
  style,
  ...rest
}) {
  const h = HAZARDS[hazard] || HAZARDS.heat;
  const sw = size === 'sm' ? 9 : 12;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
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
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: sw,
      height: sw,
      background: h.color,
      borderRadius: '2px',
      boxShadow: `0 0 5px ${h.color}`,
      flexShrink: 0
    }
  }), showLabel && /*#__PURE__*/React.createElement("span", null, h.name));
}
Object.assign(__ds_scope, { HazardChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/world/HazardChip.jsx", error: String((e && e.message) || e) }); }

// components/world/MapMarker.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const NODE = {
  safe: {
    color: 'var(--node-safe)',
    name: 'Safe Zone'
  },
  hold: {
    color: 'var(--node-hold)',
    name: 'Holdfast'
  },
  route: {
    color: 'var(--node-route)',
    name: 'Route'
  },
  dungeon: {
    color: 'var(--node-dungeon)',
    name: 'Dungeon'
  },
  calamity: {
    color: 'var(--node-calamity)',
    name: 'Calamity'
  },
  hidden: {
    color: 'var(--node-hidden)',
    name: 'Hidden'
  },
  water: {
    color: 'var(--node-water)',
    name: 'Sea / Coast'
  },
  under: {
    color: 'var(--node-under)',
    name: 'Underwater'
  }
};
const HZ = {
  heat: 'var(--hz-heat)',
  cold: 'var(--hz-cold)',
  toxic: 'var(--hz-toxic)',
  gloom: 'var(--hz-gloom)',
  tempest: 'var(--hz-tempest)'
};
function star(cx, cy, R, p) {
  let d = '';
  for (let i = 0; i < p * 2; i++) {
    const r = i % 2 ? R * 0.45 : R;
    const a = Math.PI / p * i - Math.PI / 2;
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
function MapMarker({
  type = 'safe',
  hazard,
  // optional 'heat' | 'cold' | 'toxic' | 'gloom' | 'tempest'
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
      shape = /*#__PURE__*/React.createElement("path", {
        d: `M${c} ${c - 10} L${c + 10} ${c} L${c} ${c + 10} L${c - 10} ${c} Z`,
        fill: n.color,
        stroke: "#fff",
        strokeWidth: "1.5"
      });
      break;
    case 'hold':
      shape = /*#__PURE__*/React.createElement("rect", {
        x: c - 7,
        y: c - 7,
        width: "14",
        height: "14",
        fill: n.color,
        stroke: "#3a1d00",
        strokeWidth: "1.5",
        transform: `rotate(45 ${c} ${c})`
      });
      break;
    case 'route':
      shape = /*#__PURE__*/React.createElement("circle", {
        cx: c,
        cy: c,
        r: "4.6",
        fill: n.color,
        stroke: "#fff",
        strokeWidth: "1.4"
      });
      break;
    case 'dungeon':
      shape = /*#__PURE__*/React.createElement("path", {
        d: `M${c} ${c - 8} L${c + 7.2} ${c + 5.6} L${c - 7.2} ${c + 5.6} Z`,
        fill: n.color,
        stroke: "#1c0a30",
        strokeWidth: "1.2"
      });
      break;
    case 'calamity':
      shape = /*#__PURE__*/React.createElement("path", {
        d: star(c, c, 11, 5),
        fill: n.color,
        stroke: "#3a0008",
        strokeWidth: "1.2"
      });
      break;
    case 'hidden':
      shape = /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
        cx: c,
        cy: c,
        r: "7",
        fill: "none",
        stroke: n.color,
        strokeWidth: "2",
        strokeDasharray: "2 3"
      }), /*#__PURE__*/React.createElement("text", {
        x: c,
        y: c + 3.5,
        textAnchor: "middle",
        fontSize: "9",
        fill: n.color,
        fontFamily: "var(--font-pixel)"
      }, "?"));
      break;
    case 'water':
      shape = /*#__PURE__*/React.createElement("circle", {
        cx: c,
        cy: c,
        r: "5",
        fill: n.color,
        stroke: "#fff",
        strokeWidth: "1.4"
      });
      break;
    case 'under':
      shape = /*#__PURE__*/React.createElement("circle", {
        cx: c,
        cy: c,
        r: "5.5",
        fill: "none",
        stroke: n.color,
        strokeWidth: "2",
        strokeDasharray: "3 2"
      });
      break;
    default:
      shape = /*#__PURE__*/React.createElement("circle", {
        cx: c,
        cy: c,
        r: "5",
        fill: n.color
      });
  }
  const svg = /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    style: {
      display: 'block',
      overflow: 'visible'
    }
  }, haloColor && /*#__PURE__*/React.createElement("circle", {
    cx: c,
    cy: c,
    r: "13",
    fill: "none",
    stroke: haloColor,
    strokeWidth: "2",
    opacity: "0.6"
  }), shape);
  if (label == null) {
    return /*#__PURE__*/React.createElement("span", _extends({
      style: {
        display: 'inline-block',
        ...style
      }
    }, rest), svg);
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
      ...style
    }
  }, rest), svg, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      color: 'var(--hub-ink)',
      whiteSpace: 'nowrap'
    }
  }, label));
}
Object.assign(__ds_scope, { MapMarker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/world/MapMarker.jsx", error: String((e && e.message) || e) }); }

// ui_kits/game/BattleScene.jsx
try { (() => {
/* BattleScene — the Tempo + Intervention battle. Single-active layout with
   enemy/player info boxes, a Tempo gauge, the 2×2 action grid, and the cold
   System Intervention panel whose "help" raises Surveillance. Composes
   FrWindow, MeterBar, FrButton, AffinityBadge, SystemNotify from the bundle. */

const {
  FrWindow: BFrWindow,
  MeterBar: BMeterBar,
  FrButton: BFrButton,
  AffinityBadge: BAffinityBadge
} = window.AwakenedCalamityDesignSystem_475ed3;
function Creature({
  kind
}) {
  // abstract, original pixel blobs keyed to affinity color
  const c = kind === 'umbral' ? {
    body: '#6b4fd0',
    dark: '#4a32a0',
    eye: '#d8c6ff'
  } : {
    body: '#ef6a2c',
    dark: '#c14a18',
    eye: '#ffe2b0'
  };
  return /*#__PURE__*/React.createElement("svg", {
    width: "56",
    height: "56",
    viewBox: "0 0 16 16",
    style: {
      imageRendering: 'pixelated',
      filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))'
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "5",
    width: "8",
    height: "7",
    rx: "1",
    fill: c.body
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "9",
    width: "8",
    height: "3",
    fill: c.dark
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "3",
    height: "4",
    fill: c.body
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "3",
    width: "3",
    height: "4",
    fill: c.body
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "7",
    width: "2",
    height: "2",
    fill: c.eye
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "7",
    width: "2",
    height: "2",
    fill: c.eye
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "12",
    width: "2",
    height: "2",
    fill: c.dark
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "12",
    width: "2",
    height: "2",
    fill: c.dark
  }));
}
function InfoBox({
  name,
  level,
  hp,
  max,
  affinity,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--fr-body)',
      border: '2px solid var(--fr-border)',
      boxShadow: 'inset 0 0 0 2px #fff, 2px 2px 0 rgba(0,0,0,.35)',
      borderRadius: 8,
      padding: '5px 8px',
      minWidth: 116,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-pixel)',
      fontSize: 8,
      fontWeight: 700,
      color: 'var(--fr-text)'
    }
  }, name), /*#__PURE__*/React.createElement(BAffinityBadge, {
    affinity: affinity,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-pixel)',
      fontSize: 7,
      color: 'var(--fr-text-dim)',
      marginBottom: 3
    }
  }, "Lv ", level), /*#__PURE__*/React.createElement(BMeterBar, {
    value: hp,
    max: max,
    width: 104,
    showText: false
  }));
}
const ACTIONS = ['Strike', 'Bind', 'Item', 'Flee'];
function BattleScene({
  onSurveillance,
  onExit
}) {
  const [enemyHP, setEnemyHP] = React.useState(70);
  const [playerHP, setPlayerHP] = React.useState(58);
  const [tempo, setTempo] = React.useState(40);
  const [msg, setMsg] = React.useState('A wild UMBRAL WISP blocks the path.');
  const [sel, setSel] = React.useState(0);
  function act(a) {
    if (a === 'Strike') {
      setEnemyHP(h => Math.max(0, h - 22));
      setTempo(20);
      setMsg('CINDERLING strikes! Heavy recovery — Tempo drained.');
    } else if (a === 'Bind') {
      setMsg('You spend a Tether. Bind chance 31% — it resists the System.');
    } else if (a === 'Item') {
      setMsg('You have 3 Frost Tonics. Not now.');
    } else {
      setMsg('You can\'t flee an Audit-watched field.');
    }
  }
  function restore() {
    setPlayerHP(100);
    setMsg('Emergency Restore applied. HP full.');
    onSurveillance && onSurveillance();
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 60,
      fontFamily: 'var(--font-pixel)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      background: 'linear-gradient(to bottom,#5090d0 0%,#70b8e8 50%,#90d070 100%)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 8,
      left: 8
    }
  }, /*#__PURE__*/React.createElement(InfoBox, {
    name: "WISP",
    level: 14,
    hp: enemyHP,
    max: 70,
    affinity: "umbral"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 18,
      right: 28
    }
  }, /*#__PURE__*/React.createElement(Creature, {
    kind: "umbral"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 8,
      right: 8
    }
  }, /*#__PURE__*/React.createElement(InfoBox, {
    name: "CINDERLING",
    level: 16,
    hp: playerHP,
    max: 100,
    affinity: "ember"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 22,
      left: 26
    }
  }, /*#__PURE__*/React.createElement(Creature, {
    kind: "ember"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 6,
      left: 8,
      width: 96
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 6,
      color: '#fff',
      textShadow: '0 1px 2px #0008',
      marginBottom: 2
    }
  }, "TEMPO"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 5,
      background: 'rgba(0,0,0,.4)',
      borderRadius: 99,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${tempo}%`,
      height: '100%',
      background: '#f8d000',
      boxShadow: '0 0 5px #f8d000'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 8,
      right: 8,
      background: 'rgba(0,6,20,.93)',
      border: '1px solid #00ccff',
      borderRadius: 6,
      boxShadow: '0 0 8px rgba(0,200,255,.4)',
      padding: '5px 7px',
      width: 96
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 5.5,
      letterSpacing: 1,
      color: '#00ccff',
      marginBottom: 4
    }
  }, "[ THE SYSTEM ]"), /*#__PURE__*/React.createElement("button", {
    onClick: restore,
    style: {
      width: '100%',
      fontFamily: 'var(--font-pixel)',
      fontSize: 6,
      color: '#001018',
      background: '#00ccff',
      border: 'none',
      borderRadius: 4,
      padding: '4px 3px',
      cursor: 'pointer',
      lineHeight: 1.4
    }
  }, "Emergency Restore", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .7
    }
  }, "(Cr + Surveillance)")))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 96,
      background: 'var(--fr-body)',
      borderTop: '3px solid var(--fr-border)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1.3,
      padding: '8px 10px',
      borderRight: '2px solid var(--fr-tan)',
      fontSize: 8,
      lineHeight: 1.7,
      color: 'var(--fr-text)',
      display: 'flex',
      alignItems: 'center'
    }
  }, msg), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 4,
      padding: 6
    }
  }, ACTIONS.map((a, i) => /*#__PURE__*/React.createElement(BFrButton, {
    key: a,
    active: i === sel,
    onClick: () => {
      setSel(i);
      act(a);
    }
  }, a)))), /*#__PURE__*/React.createElement("button", {
    onClick: onExit,
    style: {
      position: 'absolute',
      top: 6,
      left: '50%',
      transform: 'translateX(-50%)',
      fontFamily: 'var(--font-pixel)',
      fontSize: 6,
      background: 'rgba(0,0,0,.5)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,.3)',
      borderRadius: 4,
      padding: '2px 6px',
      cursor: 'pointer',
      zIndex: 5
    }
  }, "\u2190 leave demo battle"));
}
window.BattleScene = BattleScene;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/game/BattleScene.jsx", error: String((e && e.message) || e) }); }

// ui_kits/game/GameWorld.jsx
try { (() => {
/* GameWorld — a clean, generated GBA-style top-down tile scene rendered as a
   pixel grid (no third-party art). 15×13 metatiles at 16px = 240×208 logical.
   A simple two-tone player sprite stands at center. */

const TILE = 16;
const COLS = 15,
  ROWS = 13;

// 0 grass · 1 path · 2 water · 3 tree · 4 tall grass · 5 sand · 6 rock · 7 corrupted void
const MAP = [3, 3, 0, 0, 0, 4, 4, 0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 3, 3, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 3, 0, 4, 1, 0, 0, 6, 6, 0, 0, 0, 1, 0, 4, 4, 0, 0, 4, 1, 0, 6, 6, 6, 0, 0, 0, 1, 0, 4, 4, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 2, 2, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 7, 7, 7, 2, 2, 2, 0, 0, 1, 0, 0, 0, 0, 0, 7, 7, 7, 7, 2, 2, 2, 2, 0, 1, 0, 4, 4, 0, 0, 7, 7, 7, 7, 2, 2, 2, 0, 0, 1, 1, 0, 0, 0, 0, 0, 7, 7, 7, 0, 0, 0, 0, 5, 5, 1, 0, 0, 3, 0, 0, 0, 3, 3, 0, 3, 0, 5, 5, 5, 1, 1, 0, 3, 3, 0, 3, 3, 3, 3, 3, 0, 0, 5, 5, 5, 0, 0, 0, 3, 3, 3, 3, 3];
const COLORS = {
  0: ['#5ea845', '#67b34d'],
  // grass (checker)
  1: ['#cda86a', '#c19f60'],
  // path
  2: ['#3f8ad0', '#357fc5'],
  // water
  3: ['#2d6b34', '#256029'],
  // tree
  4: ['#479a37', '#3f8e30'],
  // tall grass
  5: ['#e2cd86', '#d8c178'],
  // sand
  6: ['#8c867a', '#7d776b'],
  // rock
  7: ['#2a1840', '#341f4e'] // corrupted void
};
function Tile({
  t,
  x,
  y
}) {
  const [a, b] = COLORS[t] || COLORS[0];
  const checker = (x + y) % 2 === 0 ? a : b;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: x * TILE,
      top: y * TILE,
      width: TILE,
      height: TILE,
      background: checker
    }
  }, t === 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: '2px 3px',
      background: '#256029',
      borderRadius: '40% 40% 30% 30%',
      boxShadow: 'inset 0 -3px 0 #1c4a22'
    }
  }), t === 4 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 2,
      top: 8,
      right: 2,
      bottom: 0,
      background: 'repeating-linear-gradient(90deg,#357f28 0 2px,transparent 2px 4px)'
    }
  }), t === 7 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      boxShadow: 'inset 0 0 6px #7a3df0',
      opacity: 0.6
    }
  }));
}
function Player() {
  // centered, simple hooded figure: dark cloak + warm face pixel
  const px = Math.floor(COLS / 2) * TILE;
  const py = Math.floor(ROWS / 2) * TILE;
  return /*#__PURE__*/React.createElement("svg", {
    width: TILE,
    height: TILE,
    viewBox: "0 0 16 16",
    style: {
      position: 'absolute',
      left: px,
      top: py,
      imageRendering: 'pixelated',
      filter: 'drop-shadow(0 2px 1px rgba(0,0,0,.4))'
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "2",
    width: "6",
    height: "5",
    fill: "#2a2f3a"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "4",
    width: "4",
    height: "3",
    fill: "#e8c69a"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "7",
    width: "8",
    height: "6",
    fill: "#b53a32"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "7",
    width: "8",
    height: "2",
    fill: "#d0463c"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "13",
    width: "2",
    height: "2",
    fill: "#2a2f3a"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "13",
    width: "2",
    height: "2",
    fill: "#2a2f3a"
  }));
}
function GameWorld({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: COLS * TILE,
      height: ROWS * TILE,
      imageRendering: 'pixelated',
      background: '#5ea845',
      overflow: 'hidden'
    }
  }, MAP.map((t, i) => /*#__PURE__*/React.createElement(Tile, {
    key: i,
    t: t,
    x: i % COLS,
    y: Math.floor(i / COLS)
  })), /*#__PURE__*/React.createElement(Player, null), children);
}
window.GameWorld = GameWorld;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/game/GameWorld.jsx", error: String((e && e.message) || e) }); }

// ui_kits/game/StartMenu.jsx
try { (() => {
/* StartMenu — the FireRed right-side menu overlay, restyled to the survival
   set (Camp / Supplies / Affinities / System / Save). Composes MenuRow +
   FrWindow from the design-system bundle. The left "void" stays transparent
   so the world shows through. */

const {
  FrWindow,
  MenuRow,
  AffinityBadge,
  HazardChip
} = window.AwakenedCalamityDesignSystem_475ed3;
const ITEMS = [{
  key: 'camp',
  label: 'Camp',
  desc: 'Drop a Camp Kit. Rest, craft,\nsave, cook. Costs in-game time.'
}, {
  key: 'supplies',
  label: 'Supplies',
  desc: 'Your scavenged stock: kits,\nfood, tethers, hazard tonics.'
}, {
  key: 'affinity',
  label: 'Affinities',
  desc: 'Your party affinities and the\nhazards they defend against.'
}, {
  key: 'system',
  label: 'System',
  desc: 'View Surveillance, Audits, and\nthe offers you have refused.'
}, {
  key: 'save',
  label: 'Save',
  desc: 'Write to a save slot. A deep\ncheckpoint, if you trust it.'
}];
function SubPanel({
  which
}) {
  if (which === 'affinity') {
    return /*#__PURE__*/React.createElement(FrWindow, {
      title: "AFFINITIES",
      variant: "light",
      style: {
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 5
      }
    }, ['ember', 'tide', 'verdant', 'storm', 'frost'].map(a => /*#__PURE__*/React.createElement(AffinityBadge, {
      key: a,
      affinity: a,
      size: "sm"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 5,
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement(HazardChip, {
      hazard: "heat",
      size: "sm"
    }), /*#__PURE__*/React.createElement(HazardChip, {
      hazard: "cold",
      size: "sm"
    })));
  }
  if (which === 'supplies') {
    const rows = [['Camp Kit', '2'], ['Frost Tonic', '3'], ['Cooked Ration', '5'], ['Tether', '1']];
    return /*#__PURE__*/React.createElement(FrWindow, {
      title: "SUPPLIES",
      variant: "light",
      style: {
        width: '100%'
      }
    }, rows.map(([n, c]) => /*#__PURE__*/React.createElement(MenuRow, {
      key: n,
      label: n,
      right: `×${c}`
    })));
  }
  return null;
}
function StartMenu({
  onClose,
  onSystem
}) {
  const [sel, setSel] = React.useState(0);
  const [open, setOpen] = React.useState(null);
  const item = ITEMS[sel];
  function activate(i) {
    const it = ITEMS[i];
    if (it.key === 'system') {
      onSystem && onSystem();
      return;
    }
    if (it.key === 'affinity' || it.key === 'supplies') {
      setOpen(o => o === it.key ? null : it.key);
    } else {
      setOpen(null);
    }
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      zIndex: 50
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    },
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 132,
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '2px solid #101010',
      borderTop: '2px solid #101010',
      borderBottom: '2px solid #101010',
      background: 'rgba(213,213,189,0.96)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, ITEMS.map((it, i) => /*#__PURE__*/React.createElement(MenuRow, {
    key: it.key,
    label: it.label,
    selected: i === sel,
    onClick: () => {
      setSel(i);
      activate(i);
    }
  }))), open && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 4
    }
  }, /*#__PURE__*/React.createElement(SubPanel, {
    which: open
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#2870c0',
      borderTop: '2px solid #101010',
      padding: '5px 7px',
      fontFamily: 'var(--font-pixel)',
      fontSize: 7,
      lineHeight: 1.6,
      color: '#fff',
      whiteSpace: 'pre-line',
      minHeight: 30
    }
  }, item.desc)));
}
window.StartMenu = StartMenu;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/game/StartMenu.jsx", error: String((e && e.message) || e) }); }

__ds_ns.DialogueBox = __ds_scope.DialogueBox;

__ds_ns.FrButton = __ds_scope.FrButton;

__ds_ns.FrWindow = __ds_scope.FrWindow;

__ds_ns.MenuRow = __ds_scope.MenuRow;

__ds_ns.LaunchCard = __ds_scope.LaunchCard;

__ds_ns.MeterBar = __ds_scope.MeterBar;

__ds_ns.SurveillanceMeter = __ds_scope.SurveillanceMeter;

__ds_ns.SystemNotify = __ds_scope.SystemNotify;

__ds_ns.AffinityBadge = __ds_scope.AffinityBadge;

__ds_ns.HazardChip = __ds_scope.HazardChip;

__ds_ns.MapMarker = __ds_scope.MapMarker;

})();
