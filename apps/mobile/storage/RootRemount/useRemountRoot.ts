import { useContext } from 'react';

import { RootRemountContext } from './RootRemountContext';

/** Gives the function that remounts the root, so every provider below it starts from empty storage. */
export function useRemountRoot(): () => void {
  const remountRoot = useContext(RootRemountContext);
  if (!remountRoot) {
    throw new Error('useRemountRoot needs a RootRemount above it');
  }
  return remountRoot;
}
