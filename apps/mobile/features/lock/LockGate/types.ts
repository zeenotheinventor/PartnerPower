import type { ReactNode } from 'react';

export type LockGateProps = {
  /** The app. It stays mounted while the lock shows, so nothing is lost behind it. */
  children: ReactNode;
};
