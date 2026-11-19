import type { ReactNode } from 'react';

export type CrashBoundaryProps = {
  children: ReactNode;
  /** Told about the error that was caught. The app passes the error reporter. */
  onError: (error: unknown) => void;
};

export type CrashScreenProps = {
  onRestart: () => void;
};
