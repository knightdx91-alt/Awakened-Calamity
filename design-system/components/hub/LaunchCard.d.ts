import * as React from 'react';

/**
 * The dark-cyber hub card — double cyan stroke, icon tile, title/subtitle, ›.
 *
 * @startingPoint section="Awakened Calamity" subtitle="Hub launch card" viewport="360x90"
 */
export interface LaunchCardProps extends React.HTMLAttributes<HTMLElement> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Icon glyph or node shown in the tile. */
  icon?: React.ReactNode;
  /** If set, renders as an anchor. */
  href?: string;
}

export function LaunchCard(props: LaunchCardProps): JSX.Element;
