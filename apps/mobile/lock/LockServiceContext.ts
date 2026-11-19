import { createContext, useContext } from 'react';

import { lockService } from './defaultLockService';
import type { LockService } from './types';

/**
 * Gives a screen the lock service. The app uses the real one, so nothing needs mounting. A test
 * puts a fake above the screen with this context's provider.
 */
export const LockServiceContext = createContext<LockService>(lockService);

export function useLockService(): LockService {
  return useContext(LockServiceContext);
}
