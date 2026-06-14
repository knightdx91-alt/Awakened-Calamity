import * as React from 'react';

/** One of the five player-facing biome hazards — a colored chip (palette = icon). */
export interface HazardChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  hazard: 'heat' | 'cold' | 'toxic' | 'gloom' | 'tempest';
  /** Show the hazard name. Default true. */
  showLabel?: boolean;
  /** Default 'md'. */
  size?: 'sm' | 'md';
}

export function HazardChip(props: HazardChipProps): JSX.Element;
