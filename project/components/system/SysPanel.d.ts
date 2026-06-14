import * as React from 'react';

/**
 * The System OS surface — dark holographic glass, cyan edge + glow, corner
 * brackets, scanlines, optional bracketed title. Base container for every
 * in-game menu and dialog.
 *
 * @startingPoint section="Awakened Calamity" subtitle="System OS panel" viewport="320x200"
 */
export interface SysPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Bracketed title-bar content. */
  title?: React.ReactNode;
  /** Edge + bracket color — pass a warn/danger token for alerts. Default cyan. */
  accent?: string;
  width?: number | string;
  /** Show corner brackets. Default true. */
  brackets?: boolean;
  /** Show scanline overlay. Default true. */
  scanlines?: boolean;
  /** Extra style on the padded body. */
  bodyStyle?: React.CSSProperties;
  children?: React.ReactNode;
}

export function SysPanel(props: SysPanelProps): JSX.Element;
