import * as React from 'react';

/**
 * The signature FireRed game-chrome panel — tan body, slate border, inset
 * white-highlight bevel, hard drop-shadow, optional red title bar.
 *
 * @startingPoint section="Awakened Calamity" subtitle="FireRed window panel" viewport="360x220"
 */
export interface FrWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional red title-bar text. */
  title?: React.ReactNode;
  /** Body shade. Default 'body'. */
  variant?: 'body' | 'light';
  /** Drop-shadow weight. Default 'sm'. */
  shadow?: 'sm' | 'lg' | 'none';
  /** Extra style on the inner padded body. */
  bodyStyle?: React.CSSProperties;
  children?: React.ReactNode;
}

export function FrWindow(props: FrWindowProps): JSX.Element;
