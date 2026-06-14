import * as React from 'react';

/**
 * The Surveillance gauge rendered cold — cyan→warn→danger as it fills, with
 * intensifying neon glow. The game's spine mechanic.
 *
 * @startingPoint section="Awakened Calamity" subtitle="Surveillance gauge" viewport="220x60"
 */
export interface SurveillanceMeterProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;             // 0–100
  max?: number;
  label?: React.ReactNode;
  /** Pixel width. Default 180. */
  width?: number;
}

export function SurveillanceMeter(props: SurveillanceMeterProps): JSX.Element;
