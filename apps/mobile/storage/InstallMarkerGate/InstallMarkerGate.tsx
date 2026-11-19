import { useEffect, useState } from 'react';

import { storage as defaultStorage } from '../defaultStorage';
import { secureStorage as defaultSecureStorage } from '../defaultSecureStorage';
import { ensureInstallMarker } from '../installMarker';
import type { InstallMarkerGateProps } from './types';

/** How long the check may take before the children are let in without it. */
export const installCheckTimeoutMilliseconds = 3000;

/**
 * Runs the install marker check and renders its children only once it is done, so nothing reads
 * settings, the database key or the lock before a fresh install has cleared old secure items.
 * A check that could not finish, or that has not answered after a few seconds because a native
 * call never returns, still lets the children in, because the app is never blocked. A check that
 * failed runs again at the next launch.
 */
export function InstallMarkerGate({
  children,
  storage = defaultStorage,
  secureStorage = defaultSecureStorage,
}: InstallMarkerGateProps) {
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    // Set when the children are let in without the check, so a slow check does not clear secure
    // storage under them.
    let isReleased = false;
    const timer = setTimeout(() => {
      isReleased = true;
      if (isCurrent) setIsChecked(true);
    }, installCheckTimeoutMilliseconds);
    ensureInstallMarker({ storage, secureStorage, isReleased: () => isReleased }).then(() => {
      if (isCurrent) setIsChecked(true);
    });
    return () => {
      isCurrent = false;
      isReleased = true;
      clearTimeout(timer);
    };
  }, [storage, secureStorage]);

  return isChecked ? children : null;
}
