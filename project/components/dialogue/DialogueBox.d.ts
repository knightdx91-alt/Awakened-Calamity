import * as React from 'react';

/**
 * The in-world message window in the System OS skin — dark glass, cyan edge,
 * cyan speaker tag, blinking advance arrow.
 *
 * @startingPoint section="Awakened Calamity" subtitle="Dialogue message box" viewport="360x120"
 */
export interface DialogueBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The line of dialogue (supports \n). */
  text: React.ReactNode;
  /** Optional cyan speaker name tag. */
  speaker?: React.ReactNode;
  /** Show the blinking corner arrow. Default true. */
  showArrow?: boolean;
}

export function DialogueBox(props: DialogueBoxProps): JSX.Element;
