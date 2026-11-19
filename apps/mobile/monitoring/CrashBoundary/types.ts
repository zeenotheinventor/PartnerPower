import type { ReactNode } from 'react';

export type CrashBoundaryProps = {
  children: ReactNode;
  /** Told about the error that was caught. The app passes the error reporter. */
  onError: (error: unknown) => void;
  /**
   * What "Start again" does. Without it, everything below is mounted afresh. With it, the crash
   * screen stays until whatever this does takes the failed screen away.
   */
  onRestart?: () => void;
};

export type CrashScreenProps = {
  onRestart: () => void;
};
