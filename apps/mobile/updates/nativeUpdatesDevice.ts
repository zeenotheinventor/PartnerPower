import * as Updates from 'expo-updates';

import type { LaunchedUpdate, UpdatesDevice } from './types';

// The update system is silent about trouble. Anything unexpected counts as not knowing, and the app
// carries on as if nothing had been updated. Nothing here logs.
export function getLaunchedUpdateFromNativeModule(): LaunchedUpdate | undefined {
  try {
    const { isEmbeddedLaunch, updateId } = Updates;
    if (typeof isEmbeddedLaunch !== 'boolean') return undefined;
    if (updateId !== null && typeof updateId !== 'string') return undefined;
    return { isEmbeddedLaunch, updateId };
  } catch {
    return undefined;
  }
}

export const nativeUpdatesDevice: UpdatesDevice = {
  getLaunchedUpdate: getLaunchedUpdateFromNativeModule,
};
