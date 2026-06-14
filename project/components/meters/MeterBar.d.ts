import * as React from 'react';

/**
 * Generic labeled stat bar (System OS skin) — auto green→yellow→red by fill, or fixed color.
 *
 * @startingPoint section="Awakened Calamity" subtitle="HP / stat meter bar" viewport="200x60"
 */
export interface MeterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  /** Default 100. */
  max?: number;
  label?: React.ReactNode;
  /** 'auto' (HP-style green/yellow/red) or any css color. Default 'auto'. */
  color?: 'auto' | string;
  /** Show the value/max readout. Default true. */
  showText?: boolean;
  /** Pixel width. Default 120. */
  width?: number;
}

export function MeterBar(props: MeterBarProps): JSX.Element;
