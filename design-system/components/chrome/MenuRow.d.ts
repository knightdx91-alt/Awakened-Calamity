import * as React from 'react';

/** A FireRed start-menu / list row with positional cursor and selected wash. */
export interface MenuRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  /** Shows the red cursor + red left-border + wash. */
  selected?: boolean;
  /** Cursor glyph. Default '▸'. */
  cursor?: string;
  /** Optional right-aligned hint (e.g. a count or shortcut). */
  right?: React.ReactNode;
}

export function MenuRow(props: MenuRowProps): JSX.Element;
