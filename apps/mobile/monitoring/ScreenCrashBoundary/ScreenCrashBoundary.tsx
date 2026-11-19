import { usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { CrashBoundary } from '../CrashBoundary';
import { reportError } from '../reportError';

type ScreenCrashBoundaryProps = { children: ReactNode };

// The two screens a player can always be sent to. There is nowhere better to go from either, so
// starting again on one of them tries the same screen once more.
const firstScreens = ['/', '/welcome'];

/**
 * The crash boundary around one screen of the root navigator. The navigator stays mounted when a
 * screen fails, so "Start again" can leave the failed screen for the first one. That holds even
 * when the failed screen is the one the app was opened at.
 */
export function ScreenCrashBoundary({ children }: ScreenCrashBoundaryProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isOnAFirstScreen = firstScreens.includes(pathname);

  return (
    <CrashBoundary
      onError={reportError}
      onRestart={isOnAFirstScreen ? undefined : () => router.dismissTo('/')}
    >
      {children}
    </CrashBoundary>
  );
}
