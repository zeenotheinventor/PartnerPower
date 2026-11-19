import { useMemo } from 'react';

import { cancelScheduledNotifications } from './cancelScheduledNotifications';
import { createClearEverything, type ClearEverythingResult } from './clearEverything';
import { secureStorage } from './defaultSecureStorage';
import { storage } from './defaultStorage';
import { useRemountRoot } from './RootRemount';

/**
 * Gives the function behind Clear everything. It needs a `RootRemount` above it, and it never
 * throws, so a screen shows its own message when the result says it failed.
 */
export function useClearEverything(): () => Promise<ClearEverythingResult> {
  const remountRoot = useRemountRoot();
  return useMemo(
    () =>
      createClearEverything({ cancelScheduledNotifications, secureStorage, storage, remountRoot }),
    [remountRoot],
  );
}
