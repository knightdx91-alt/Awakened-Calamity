import * as React from 'react';

/**
 * Compact self-backed System HUD bar for a player vital — dark-glass backing +
 * edge glow so it reads over any terrain. The only stat type allowed on the
 * play screen.
 *
 * @startingPoint section="Awakened Calamity" subtitle="Player vital HUD bar" viewport="200x40"
 */
export interface VitalBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which vital. Default 'hp'. */
  kind?: 'hp' | 'mana' | 'stamina';
  value: number;
  /** Default 100. */
  max?: number;
  /** Pixel width. Default 132. */
  width?: number;
  /** Show the numeric readout. Default true. */
  showValue?: boolean;
}

export function VitalBar(props: VitalBarProps): JSX.Element;
