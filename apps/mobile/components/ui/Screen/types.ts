import type { ReactNode } from 'react';

export type ScreenProps = {
  children: ReactNode;
  /** Lets the content scroll when it is taller than the display. */
  scroll?: boolean;
};
