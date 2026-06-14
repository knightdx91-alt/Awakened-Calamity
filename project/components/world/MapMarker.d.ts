import * as React from 'react';

/**
 * The world-map place glyph — shape encodes type, optional hazard halo.
 * The brand's core iconography.
 *
 * @startingPoint section="Awakened Calamity" subtitle="World-map place markers" viewport="320x80"
 */
export interface MapMarkerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Place type → shape. Default 'safe'. */
  type?: 'safe' | 'hold' | 'route' | 'dungeon' | 'calamity' | 'hidden' | 'water' | 'under';
  /** Optional hazard ring. */
  hazard?: 'heat' | 'cold' | 'toxic' | 'gloom' | 'tempest';
  /** Caption under the marker. */
  label?: React.ReactNode;
  /** SVG box size in px. Default 40. */
  size?: number;
}

export function MapMarker(props: MapMarkerProps): JSX.Element;
