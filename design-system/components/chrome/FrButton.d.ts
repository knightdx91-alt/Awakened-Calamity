import * as React from 'react';

/** FireRed action / toggle button — inverts to solid red on hover or when active. */
export interface FrButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected state — renders the lit red fill. */
  active?: boolean;
  disabled?: boolean;
  /** Default 'md'. */
  size?: 'sm' | 'md';
  children?: React.ReactNode;
}

export function FrButton(props: FrButtonProps): JSX.Element;
