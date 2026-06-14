import * as React from 'react';

/**
 * Conditional hazard exposure readout — renders ONLY while a biome hazard is
 * active, pulsing in the hazard's color. Returns null when `hazard` is falsy,
 * so it can be mounted unconditionally and driven by props.
 */
export interface ExposureTagProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Active hazard, or falsy to render nothing. */
  hazard?: 'heat' | 'cold' | 'toxic' | 'gloom' | 'tempest' | null | false;
  /** Exposure 0–100. */
  value?: number;
  /** Pixel width. Default 132. */
  width?: number;
}

export function ExposureTag(props: ExposureTagProps): JSX.Element | null;
