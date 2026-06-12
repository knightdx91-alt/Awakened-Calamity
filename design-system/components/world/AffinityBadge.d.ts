import * as React from 'react';

/** One of the 9 affinities or 2 meta-types — a solid pill keyed to its color. */
export interface AffinityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  affinity:
    | 'ember' | 'tide' | 'verdant' | 'storm' | 'stone'
    | 'frost' | 'toxin' | 'umbral' | 'lumen'
    | 'corruption' | 'untethered';
  /** Override the display text. */
  label?: React.ReactNode;
  /** Default 'md'. */
  size?: 'sm' | 'md';
}

export function AffinityBadge(props: AffinityBadgeProps): JSX.Element;
