/* @ds-bundle: {"format":3,"namespace":"AwakenedCalamityDesignSystem_475ed3","components":[{"name":"DialogueBox","sourcePath":"components/dialogue/DialogueBox.jsx"},{"name":"LaunchCard","sourcePath":"components/hub/LaunchCard.jsx"},{"name":"ExposureTag","sourcePath":"components/hud/ExposureTag.jsx"},{"name":"VitalBar","sourcePath":"components/hud/VitalBar.jsx"},{"name":"MeterBar","sourcePath":"components/meters/MeterBar.jsx"},{"name":"SurveillanceMeter","sourcePath":"components/meters/SurveillanceMeter.jsx"},{"name":"SysMenuItem","sourcePath":"components/system/SysMenuItem.jsx"},{"name":"SysPanel","sourcePath":"components/system/SysPanel.jsx"},{"name":"SystemNotify","sourcePath":"components/system/SystemNotify.jsx"},{"name":"AffinityBadge","sourcePath":"components/world/AffinityBadge.jsx"},{"name":"HazardChip","sourcePath":"components/world/HazardChip.jsx"},{"name":"MapMarker","sourcePath":"components/world/MapMarker.jsx"}],"sourceHashes":{"components/dialogue/DialogueBox.jsx":"781688b3ad17","components/hub/LaunchCard.jsx":"3fbe63bdb308","components/hud/ExposureTag.jsx":"92aac6472bcc","components/hud/VitalBar.jsx":"1831c5088838","components/meters/MeterBar.jsx":"c6712bcc91ed","components/meters/SurveillanceMeter.jsx":"5287fdc5aa7f","components/system/SysMenuItem.jsx":"facabbdbedb5","components/system/SysPanel.jsx":"c92ee17d4dc8","components/system/SystemNotify.jsx":"cd8044991b43","components/world/AffinityBadge.jsx":"a65f5fa91b58","components/world/HazardChip.jsx":"5d1229384975","components/world/MapMarker.jsx":"dd973a8d05bd","ui_kits/game-system/SystemMenu.jsx":"044d61c9ba16"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AwakenedCalamityDesignSystem_475ed3 = window.AwakenedCalamityDesignSystem_475ed3 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/dialogue/DialogueBox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DialogueBox — the in-world message window, rendered in the System OS skin:
 * dark glass, a thin cyan edge, a cyan speaker tag, pixel text, and a blinking
 * cyan advance-arrow. NPC lines read on the same dark surface the System uses —
 * in this world there is no UI that isn't the interface.
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
      background: 'var(--os-glass)',
      border: '1px solid var(--os-edge)',
      boxShadow: 'var(--os-glow)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 12px 7px',
      fontFamily: 'var(--font-pixel)',
      ...style
    }
  }, rest), speaker != null && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--os-edge)',
      fontSize: 'var(--text-2xs)',
      marginBottom: '5px',
      letterSpacing: 'var(--ls-normal)',
      textShadow: '0 0 6px var(--os-edge)'
    }
  }, speaker), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--lh-normal)',
      color: 'var(--os-ink)',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      minHeight: '26px'
    }
  }, text), showArrow && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      bottom: '4px',
      right: '7px',
      fontSize: 'var(--text-md)',
      color: 'var(--os-edge)',
      textShadow: '0 0 6px var(--os-edge)',
      animation: 'ac-dlg-blink 0.6s step-end infinite'
    }
  }, '\u25BE'), /*#__PURE__*/React.createElement("style", null, `@keyframes ac-dlg-blink{0%,100%{opacity:1}50%{opacity:0}}
        @media (prefers-reduced-motion: reduce){[style*="ac-dlg-blink"]{animation:none!important}}`));
}
Object.assign(__ds_scope, { DialogueBox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/dialogue/DialogueBox.jsx", error: String((e && e.message) || e) }); }

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

// components/hud/ExposureTag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const HZ = {
  heat: {
    color: 'var(--hz-heat)',
    name: 'HEAT'
  },
  cold: {
    color: 'var(--hz-cold)',
    name: 'COLD'
  },
  toxic: {
    color: 'var(--hz-toxic)',
    name: 'TOXIC'
  },
  gloom: {
    color: 'var(--hz-gloom)',
    name: 'GLOOM'
  },
  tempest: {
    color: 'var(--hz-tempest)',
    name: 'TEMPEST'
  }
};

/**
 * ExposureTag — the conditional hazard readout. Renders ONLY while the player
 * is actively taking a biome hazard; it pulses in the hazard's color to pull
 * the eye (it's a threat). Hidden state returns null, so it can be mounted
 * unconditionally in the HUD and driven by `hazard`.
 */
function ExposureTag({
  hazard,
  // falsy → renders nothing
  value,
  // 0–100 exposure
  width = 132,
  style,
  ...rest
}) {
  if (!hazard) return null;
  const h = HZ[hazard] || HZ.heat;
  const pct = Math.max(0, Math.min(1, (value ?? 100) / 100));
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      width,
      padding: '3px 6px',
      background: 'var(--os-scrim)',
      border: `1px solid ${h.color}`,
      borderRadius: '4px',
      boxShadow: `0 0 8px ${h.color}`,
      fontFamily: 'var(--font-pixel)',
      animation: 'ac-expo-pulse 0.9s ease-in-out infinite alternate',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: '9px',
      height: '9px',
      flexShrink: 0,
      background: h.color,
      borderRadius: '2px',
      boxShadow: `0 0 6px ${h.color}`
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xs)',
      color: h.color,
      flexShrink: 0
    }
  }, h.name), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: '5px',
      background: 'rgba(0,0,0,0.55)',
      borderRadius: 'var(--radius-pill)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct * 100}%`,
      height: '100%',
      background: h.color,
      boxShadow: `0 0 6px ${h.color}`
    }
  })), /*#__PURE__*/React.createElement("style", null, `@keyframes ac-expo-pulse{from{box-shadow:0 0 5px ${'rgba(0,0,0,0)'}}to{box-shadow:0 0 12px currentColor}}
        @media (prefers-reduced-motion: reduce){[style*="ac-expo-pulse"]{animation:none!important}}`));
}
Object.assign(__ds_scope, { ExposureTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/hud/ExposureTag.jsx", error: String((e && e.message) || e) }); }

// components/hud/VitalBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const KIND = {
  hp: {
    color: 'var(--vital-hp)',
    code: 'HP'
  },
  mana: {
    color: 'var(--vital-mana)',
    code: 'MP'
  },
  stamina: {
    color: 'var(--vital-stamina)',
    code: 'SP'
  }
};

/**
 * VitalBar — a compact, self-backed System HUD bar for a player vital
 * (HP / Mana / Stamina). Dark-glass backing + edge glow so it reads over
 * any terrain, bright or dark. This is the only kind of stat allowed on the
 * play screen; everything else lives in the Status menu.
 */
function VitalBar({
  kind = 'hp',
  value,
  max = 100,
  width = 132,
  showValue = true,
  style,
  ...rest
}) {
  const k = KIND[kind] || KIND.hp;
  const pct = Math.max(0, Math.min(1, value / max));
  const low = kind === 'hp' && pct <= 0.25;
  const fill = low ? 'var(--vital-hp-low)' : k.color;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      width,
      padding: '3px 6px',
      background: 'var(--os-scrim)',
      border: '1px solid var(--os-line)',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
      fontFamily: 'var(--font-pixel)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xs)',
      color: fill,
      width: '14px',
      flexShrink: 0,
      textShadow: `0 0 5px ${fill}`
    }
  }, k.code), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: '6px',
      background: 'rgba(0,0,0,0.55)',
      borderRadius: 'var(--radius-pill)',
      overflow: 'hidden',
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct * 100}%`,
      height: '100%',
      background: fill,
      boxShadow: `0 0 6px ${fill}`,
      transition: 'width var(--dur-med) var(--ease-snap)',
      animation: low ? 'ac-vital-flash 0.7s steps(2) infinite' : 'none'
    }
  })), showValue && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xs)',
      color: 'var(--os-ink)',
      minWidth: '28px',
      textAlign: 'right',
      flexShrink: 0
    }
  }, Math.round(value)), /*#__PURE__*/React.createElement("style", null, `@keyframes ac-vital-flash{0%{opacity:1}100%{opacity:0.55}}
        @media (prefers-reduced-motion: reduce){[style*="ac-vital-flash"]{animation:none!important}}`));
}
Object.assign(__ds_scope, { VitalBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/hud/VitalBar.jsx", error: String((e && e.message) || e) }); }

// components/meters/MeterBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STATE = {
  green: 'var(--meter-green)',
  yellow: 'var(--meter-yellow)',
  red: 'var(--meter-red)'
};

/**
 * MeterBar — a generic labeled stat bar in the System OS skin. Auto-colors
 * green→yellow→red by fill (HP style), or pass a fixed `color`. Dark track,
 * cyan-ink label. For the on-screen vitals HUD use VitalBar; use MeterBar for
 * menu/readout bars (XP, durability, generic stats).
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
      color: 'var(--os-ink-dim)',
      marginBottom: '2px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--os-ink)'
    }
  }, label), showText && /*#__PURE__*/React.createElement("span", null, Math.round(value), "/", max)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,0.5)',
      border: '1px solid var(--os-line)',
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

// components/system/SysMenuItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SysMenuItem — a System OS menu row. Resting rows are dim cyan ink; the
 * selected row lights up with a cyan left-bar, faint wash, and glow. Optional
 * left glyph and right-aligned hint. Stack these inside a SysPanel to build
 * the pause menu and every sub-list.
 */
function SysMenuItem({
  label,
  glyph,
  right,
  selected = false,
  accent = 'var(--os-edge)',
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
      gap: '8px',
      padding: '6px 9px',
      fontFamily: 'var(--font-pixel)',
      fontSize: 'var(--text-2xs)',
      lineHeight: 'var(--lh-tight)',
      color: lit ? '#eafaff' : 'var(--os-ink-dim)',
      borderLeft: `3px solid ${selected ? accent : 'transparent'}`,
      background: lit ? 'rgba(0,200,255,0.10)' : 'transparent',
      textShadow: lit ? `0 0 6px ${accent}` : 'none',
      cursor: 'pointer',
      transition: 'background var(--dur-fast), color var(--dur-fast)',
      ...style
    }
  }, rest), glyph != null && /*#__PURE__*/React.createElement("span", {
    style: {
      width: '10px',
      flexShrink: 0,
      color: lit ? accent : 'var(--os-ink-dim)',
      textAlign: 'center'
    }
  }, glyph), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, label), right != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xs)',
      color: lit ? accent : 'var(--os-ink-dim)',
      opacity: 0.85
    }
  }, right));
}
Object.assign(__ds_scope, { SysMenuItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/system/SysMenuItem.jsx", error: String((e && e.message) || e) }); }

// components/system/SysPanel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Bracket({
  pos,
  color
}) {
  const base = {
    position: 'absolute',
    width: '8px',
    height: '8px',
    pointerEvents: 'none'
  };
  const map = {
    tl: {
      top: '-1px',
      left: '-1px',
      borderTop: `2px solid ${color}`,
      borderLeft: `2px solid ${color}`
    },
    tr: {
      top: '-1px',
      right: '-1px',
      borderTop: `2px solid ${color}`,
      borderRight: `2px solid ${color}`
    },
    bl: {
      bottom: '-1px',
      left: '-1px',
      borderBottom: `2px solid ${color}`,
      borderLeft: `2px solid ${color}`
    },
    br: {
      bottom: '-1px',
      right: '-1px',
      borderBottom: `2px solid ${color}`,
      borderRight: `2px solid ${color}`
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...base,
      ...map[pos]
    }
  });
}

/**
 * SysPanel — the System OS surface: dark holographic glass, a 1px cyan edge
 * with glow, corner brackets, faint scanlines, and an optional bracketed
 * title bar. The base container for every in-game menu and dialog. Pass a
 * warn/danger `accent` to recolor the edge + brackets for alerts.
 */
function SysPanel({
  title,
  accent = 'var(--os-edge)',
  width,
  brackets = true,
  scanlines = true,
  children,
  style,
  bodyStyle,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      width,
      background: 'var(--os-glass)',
      border: `1px solid ${accent}`,
      borderRadius: 'var(--radius-sm)',
      boxShadow: 'var(--os-glow)',
      fontFamily: 'var(--font-pixel)',
      color: 'var(--os-ink)',
      ...style
    }
  }, rest), title != null && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 9px',
      borderBottom: `1px solid ${accent}`,
      fontSize: 'var(--text-2xs)',
      letterSpacing: 'var(--ls-wide)',
      color: accent,
      textShadow: `0 0 6px ${accent}`
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      padding: '10px',
      ...bodyStyle
    }
  }, children), scanlines && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      borderRadius: 'var(--radius-sm)',
      background: 'repeating-linear-gradient(0deg, var(--os-line) 0 1px, transparent 1px 3px)',
      opacity: 0.5,
      mixBlendMode: 'screen'
    }
  }), brackets && ['tl', 'tr', 'bl', 'br'].map(p => /*#__PURE__*/React.createElement(Bracket, {
    key: p,
    pos: p,
    color: accent
  })));
}
Object.assign(__ds_scope, { SysPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/system/SysPanel.jsx", error: String((e && e.message) || e) }); }

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

// ui_kits/game-system/SystemMenu.jsx
try { (() => {
/* SystemMenu — the pause menu, built as The System's interface. Left nav +
   right content, both dark-glass SysPanels over a scrim. Composes the
   design-system System/HUD primitives. */

const {
  SysPanel,
  SysMenuItem,
  SurveillanceMeter,
  AffinityBadge,
  HazardChip,
  VitalBar
} = window.AwakenedCalamityDesignSystem_475ed3;
const SM_ITEMS = [{
  id: 'STATUS',
  glyph: '◆',
  desc: 'Designation, Class, vitals,\nsurveillance and session data.'
}, {
  id: 'BONDS',
  glyph: '❖',
  desc: 'The creatures you have\nbonded with.',
  right: '0'
}, {
  id: 'SUPPLIES',
  glyph: '▣',
  desc: 'Camp Kits, Tethers,\ntonics and gear.',
  right: '12'
}, {
  id: 'AFFINITIES',
  glyph: '✦',
  desc: 'Nine Affinities and the\nhazards they defend.'
}, {
  id: 'REACHES',
  glyph: '◇',
  desc: 'The Four Reaches.\nFast-travel is watched.',
  right: 'watched',
  warn: true
}, {
  id: 'SYSTEM',
  glyph: '⌖',
  desc: 'Consult the System.\nIt is always watching.'
}, {
  id: 'SAVE',
  glyph: '▼',
  desc: 'Write a checkpoint —\nif you trust it.'
}, {
  id: 'OPTIONS',
  glyph: '⚙',
  desc: 'Display, controls\nand audio.'
}, {
  id: 'EXIT',
  glyph: '✕',
  desc: 'Close the interface.'
}];
const AFFS = [['ember', 'Ember', 'resists Cold'], ['tide', 'Tide', 'resists Heat'], ['verdant', 'Verdant', 'resists Toxic'], ['storm', 'Storm', 'resists Tempest'], ['stone', 'Stone', 'resists Toxic/Tempest'], ['frost', 'Frost', 'resists Heat'], ['toxin', 'Toxin', '—'], ['umbral', 'Umbral', '—'], ['lumen', 'Lumen', 'resists Gloom'], ['corruption', 'Corruption', 'the System cheats'], ['untethered', 'Untethered', 'resists Corruption']];
const REACHES = [['Verdara', '#3ac06a', 'The Verdant Reach', 'overgrown safe-belt', 'UNLOCKED'], ['Halveth', '#5bd0e8', 'The Frozen Reach', 'cold wildlands', 'LOCKED'], ['Calderra', '#ef6a2c', 'The Burning Reach', 'ember deep-zone', 'LOCKED'], ['Vael', '#8a6cff', 'The Drowned Reach', 'gloom / corruption', 'LOCKED']];
function KV({
  k,
  v,
  accent
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '7px',
      lineHeight: 2,
      color: 'var(--os-ink-dim)'
    }
  }, /*#__PURE__*/React.createElement("span", null, k), /*#__PURE__*/React.createElement("span", {
    style: {
      color: accent || 'var(--os-ink)'
    }
  }, v));
}
function Note({
  children,
  color
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '6.5px',
      lineHeight: 1.7,
      color: color || 'var(--os-ink-dim)',
      marginBottom: '8px'
    }
  }, children);
}
function Content({
  page,
  vitals,
  survey,
  onService
}) {
  if (page === 'STATUS') {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(KV, {
      k: "DESIGNATION",
      v: "SUBJECT-4471"
    }), /*#__PURE__*/React.createElement(KV, {
      k: "CLASS",
      v: "Unclassed"
    }), /*#__PURE__*/React.createElement(KV, {
      k: "LOCATION",
      v: "Mistwood Path"
    }), /*#__PURE__*/React.createElement(KV, {
      k: "CREDITS",
      v: "Cr 240"
    }), /*#__PURE__*/React.createElement(KV, {
      k: "TIME AWAKE",
      v: "01:24"
    }), /*#__PURE__*/React.createElement(KV, {
      k: "BUILD",
      v: "v0.9.82"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 1,
        background: 'var(--os-line)',
        margin: '8px 0'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement(VitalBar, {
      kind: "hp",
      value: vitals.hp,
      max: 100,
      width: 188
    }), /*#__PURE__*/React.createElement(VitalBar, {
      kind: "mana",
      value: vitals.mana,
      max: 60,
      width: 188
    }), /*#__PURE__*/React.createElement(VitalBar, {
      kind: "stamina",
      value: vitals.stamina,
      max: 100,
      width: 188
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement(SurveillanceMeter, {
      value: survey,
      width: 188
    })));
  }
  if (page === 'SUPPLIES') {
    const rows = [['Camp Kits', 2], ['Food', 5], ['Tethers', 1], ['Tonics', 3], ['Materials', 14], ['Gear', 4], ['Key', 1]];
    return rows.map(([n, c]) => /*#__PURE__*/React.createElement("div", {
      key: n,
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '7px',
        lineHeight: 2.1,
        color: 'var(--os-ink)'
      }
    }, /*#__PURE__*/React.createElement("span", null, n.toUpperCase()), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--os-edge)'
      }
    }, "\xD7", c)));
  }
  if (page === 'AFFINITIES') {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Note, null, "Nine Affinities + two meta-types. Each is an attack flavor AND a defense vs. Exposure."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4
      }
    }, AFFS.map(a => /*#__PURE__*/React.createElement(AffinityBadge, {
      key: a[0],
      affinity: a[0],
      size: "sm"
    }))));
  }
  if (page === 'REACHES') {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Note, {
      color: "var(--sys-warn)"
    }, "\u26A0 Fast-travel uses System protocol. Each jump raises Surveillance."), REACHES.map(r => /*#__PURE__*/React.createElement("div", {
      key: r[0],
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '4px 0',
        borderBottom: '1px solid rgba(0,200,255,0.08)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: 2,
        background: r[1],
        boxShadow: `0 0 5px ${r[1]}`,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '7px',
        color: r[1]
      }
    }, r[0].toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '6px',
        color: 'var(--os-ink-dim)',
        marginTop: 2
      }
    }, r[2], " \xB7 ", r[3])), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '6px',
        color: r[4] === 'LOCKED' ? 'var(--os-ink-dim)' : 'var(--meter-green)'
      }
    }, r[4]))));
  }
  if (page === 'SYSTEM') {
    const hot = survey >= 66,
      mid = survey >= 33;
    const acc = hot ? 'var(--sys-danger)' : mid ? 'var(--sys-warn)' : 'var(--sys-cyan)';
    const svc = [['Emergency Restore', "Full vitals, one tap. We've got you.", 8], ['Fast-Travel', 'Jump to an unlocked landmark.', 6], ['Register Camp', 'Audit-proof your refuge — but flagged.', 10]];
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '6.5px',
        color: 'var(--os-ink)',
        opacity: 0.85,
        lineHeight: 1.8,
        marginBottom: 8
      }
    }, "Welcome, SUBJECT-4471. The System is here to help."), /*#__PURE__*/React.createElement(SurveillanceMeter, {
      value: survey,
      width: 188,
      label: "SURVEILLANCE"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '6px',
        color: acc,
        margin: '5px 0 8px'
      }
    }, "AUDIT RISK: ", hot ? 'CRITICAL — Constructs may spawn' : mid ? 'ELEVATED' : 'NOMINAL'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '6px',
        color: 'var(--os-ink-dim)',
        marginBottom: 5
      }
    }, "SERVICES \u2014 each request is logged"), svc.map(s => /*#__PURE__*/React.createElement("button", {
      key: s[0],
      onClick: () => onService(s[2], s[0]),
      style: {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'rgba(0,40,55,0.5)',
        border: '1px solid var(--sys-cyan)',
        borderRadius: 4,
        padding: '6px 7px',
        marginBottom: 5,
        cursor: 'pointer',
        fontFamily: 'var(--font-pixel)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '7px',
        color: 'var(--sys-cyan)'
      }
    }, s[0]), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '6px',
        color: 'var(--os-ink-dim)',
        marginTop: 3
      }
    }, s[1], " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--sys-warn)'
      }
    }, "(+", s[2], " Surveillance)")))));
  }
  if (page === 'BONDS') {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '7px',
        color: 'var(--os-ink-dim)',
        lineHeight: 2,
        textAlign: 'center',
        paddingTop: 20
      }
    }, "No bonds yet.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("br", null), "You Awakened alone.", /*#__PURE__*/React.createElement("br", null), "Weaken a creature and spend", /*#__PURE__*/React.createElement("br", null), "a Tether to Bind it.");
  }
  if (page === 'SAVE') {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(KV, {
      k: "SLOT",
      v: "01"
    }), /*#__PURE__*/React.createElement(KV, {
      k: "LOCATION",
      v: "Mistwood Path"
    }), /*#__PURE__*/React.createElement(KV, {
      k: "TIME AWAKE",
      v: "01:24"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 1,
        background: 'var(--os-line)',
        margin: '8px 0'
      }
    }), /*#__PURE__*/React.createElement(SysMenuItem, {
      glyph: "\u25BC",
      label: "SAVE GAME",
      selected: true
    }), /*#__PURE__*/React.createElement(SysMenuItem, {
      glyph: "\u25B2",
      label: "LOAD GAME"
    }));
  }
  if (page === 'OPTIONS') {
    const opts = [['TEXT SPEED', 'FAST'], ['BATTLE SCENE', 'ON'], ['DAMAGE NUMBERS', 'ON'], ['CONTROLS', 'D-PAD'], ['AUTOSAVE', '30s']];
    return opts.map(o => /*#__PURE__*/React.createElement("div", {
      key: o[0],
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '7px',
        lineHeight: 2.2,
        color: 'var(--os-ink)'
      }
    }, /*#__PURE__*/React.createElement("span", null, o[0]), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--os-edge)'
      }
    }, o[1])));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '7px',
      color: 'var(--os-ink-dim)',
      paddingTop: 20,
      textAlign: 'center'
    }
  }, "\u2014");
}
function SystemMenu({
  vitals,
  survey,
  onClose,
  onService
}) {
  const [sel, setSel] = React.useState(0);
  const item = SM_ITEMS[sel];
  function choose(i) {
    if (SM_ITEMS[i].id === 'EXIT') {
      onClose();
      return;
    }
    setSel(i);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 40,
      display: 'flex',
      gap: 8,
      padding: 8,
      background: 'var(--os-scrim)',
      backdropFilter: 'blur(1px)',
      fontFamily: 'var(--font-pixel)'
    }
  }, /*#__PURE__*/React.createElement(SysPanel, {
    title: "[ THE SYSTEM ]",
    width: 118,
    bodyStyle: {
      padding: '4px 0'
    },
    style: {
      flexShrink: 0
    }
  }, SM_ITEMS.map((it, i) => /*#__PURE__*/React.createElement(SysMenuItem, {
    key: it.id,
    glyph: it.glyph,
    label: it.id,
    right: it.right,
    selected: i === sel,
    accent: it.warn ? 'var(--sys-warn)' : 'var(--os-edge)',
    onClick: () => choose(i)
  }))), /*#__PURE__*/React.createElement(SysPanel, {
    title: item.id,
    accent: item.warn ? 'var(--sys-warn)' : 'var(--os-edge)',
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    },
    bodyStyle: {
      overflow: 'auto',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Content, {
    page: item.id,
    vitals: vitals,
    survey: survey,
    onService: onService
  })), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    title: "Close (Start)",
    style: {
      position: 'absolute',
      top: 12,
      right: 14,
      zIndex: 5,
      width: 18,
      height: 18,
      lineHeight: '14px',
      background: 'var(--os-glass)',
      color: 'var(--os-edge)',
      border: '1px solid var(--os-edge)',
      borderRadius: 3,
      cursor: 'pointer',
      fontFamily: 'var(--font-pixel)',
      fontSize: '8px'
    }
  }, "\u2715"));
}
window.SystemMenu = SystemMenu;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/game-system/SystemMenu.jsx", error: String((e && e.message) || e) }); }

__ds_ns.DialogueBox = __ds_scope.DialogueBox;

__ds_ns.LaunchCard = __ds_scope.LaunchCard;

__ds_ns.ExposureTag = __ds_scope.ExposureTag;

__ds_ns.VitalBar = __ds_scope.VitalBar;

__ds_ns.MeterBar = __ds_scope.MeterBar;

__ds_ns.SurveillanceMeter = __ds_scope.SurveillanceMeter;

__ds_ns.SysMenuItem = __ds_scope.SysMenuItem;

__ds_ns.SysPanel = __ds_scope.SysPanel;

__ds_ns.SystemNotify = __ds_scope.SystemNotify;

__ds_ns.AffinityBadge = __ds_scope.AffinityBadge;

__ds_ns.HazardChip = __ds_scope.HazardChip;

__ds_ns.MapMarker = __ds_scope.MapMarker;

})();
