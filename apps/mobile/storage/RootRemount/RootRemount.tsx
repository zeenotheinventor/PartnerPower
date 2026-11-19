import { Fragment, useCallback, useState } from 'react';

import { RootRemountContext } from './RootRemountContext';
import type { RootRemountProps } from './types';

/**
 * Holds the providers that read stored data. `useRemountRoot` gives a function that mounts them all
 * again, so each reads from empty storage after clear everything. A provider that a later
 * milestone adds below this needs no reset method.
 */
export function RootRemount({ children }: RootRemountProps) {
  const [mountCount, setMountCount] = useState(0);
  const remountRoot = useCallback(() => setMountCount((count) => count + 1), []);

  return (
    <RootRemountContext.Provider value={remountRoot}>
      <Fragment key={mountCount}>{children}</Fragment>
    </RootRemountContext.Provider>
  );
}
