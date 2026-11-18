import type { ReactNode } from 'react';

export type ScreenProps = {
  children: ReactNode;
  /** Lets the content scroll when it is taller than the display. */
  scroll?: boolean;
  /** Moves the content up out of the way of the keyboard, for a screen with text fields. */
  avoidKeyboard?: boolean;
};
