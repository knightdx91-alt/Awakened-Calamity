import * as React from 'react';

/**
 * The System's notification toast — neon glass, "[ THE SYSTEM ]" label,
 * menacing corporate cheer. Danger pulses. The cold half of the brand.
 *
 * @startingPoint section="Awakened Calamity" subtitle="System notification toast" viewport="260x110"
 */
export interface SystemNotifyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Severity. Default 'info'. */
  type?: 'info' | 'warning' | 'danger';
  /** Override the bracketed label. Default '[ THE SYSTEM ]'. */
  label?: React.ReactNode;
  /** Body text (or pass children). */
  message?: React.ReactNode;
  children?: React.ReactNode;
}

export function SystemNotify(props: SystemNotifyProps): JSX.Element;
