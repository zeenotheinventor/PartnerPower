import { useEffect } from 'react';

import { hideSplashScreen } from '../SplashReveal/hideSplashScreen';

/** Long enough for a slow start to finish, short enough that a stuck one does not look like a crash. */
export const splashSafetyNetMilliseconds = 5000;

/** Hides the splash screen after a few seconds even if loading never settles. Renders nothing. */
export function SplashSafetyNet() {
  useEffect(() => {
    const timer = setTimeout(() => void hideSplashScreen(), splashSafetyNetMilliseconds);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
