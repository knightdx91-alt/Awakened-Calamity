import * as React from 'react';

/** A System OS menu row — dim until selected/hovered, then cyan bar + glow. */
export interface SysMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  /** Optional left glyph. */
  glyph?: React.ReactNode;
  /** Optional right-aligned hint (count, lock, shortcut). */
  right?: React.ReactNode;
  selected?: boolean;
  /** Accent for the lit state. Default cyan. */
  accent?: string;
}

export function SysMenuItem(props: SysMenuItemProps): JSX.Element;
