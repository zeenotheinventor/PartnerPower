import { lastShownUpdateIdSchema } from '@getfreak/core';

import type { Storage } from '../storage';
import type { UpdatesDevice } from './types';

/**
 * Whether to tell the player, now, that the app has updated. It is true once for each update the
 * app launches from, and never for the build that was installed, which has no update to announce.
 * It records the update as announced, and it never rejects and never logs. If the stored id cannot
 * be read the update counts as new, and if it cannot be written the player is told again next launch.
 */
export async function announceUpdateOnce(
  device: UpdatesDevice,
  storage: Storage,
): Promise<boolean> {
  let launchedUpdate;
  try {
    launchedUpdate = device.getLaunchedUpdate();
  } catch {
    return false;
  }
  if (!launchedUpdate || launchedUpdate.isEmbeddedLaunch || launchedUpdate.updateId === null) {
    return false;
  }

  const { updateId } = launchedUpdate;
  const lastShownUpdateId = await storage
    .get('lastShownUpdateId', lastShownUpdateIdSchema)
    .catch(() => undefined);
  if (lastShownUpdateId === updateId) return false;

  await storage.set('lastShownUpdateId', updateId).catch(() => {});
  return true;
}
