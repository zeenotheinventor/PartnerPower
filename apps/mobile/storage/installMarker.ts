import { entryConfirmationSchema } from '@getfreak/core';
import { z } from 'zod';

import type { SecureStorage, Storage } from './types';

const installMarkerSchema = z.literal(true);

/**
 * Makes a fresh install start clean. The key-value store goes when the app is deleted, but iOS
 * keeps Keychain items, so a reinstall could find an old PIN or database key. The marker lives in
 * the key-value store. When it is missing, secure storage is cleared first and the marker is
 * written after, so a launch that is cut short does it again. The exception is an upgrade from a
 * build that had no marker: a stored entry confirmation shows the app was not reinstalled, so the
 * marker is written and nothing is cleared.
 *
 * Run it before anything reads settings, the database key or the lock. It never throws. It gives
 * true when the marker is in place and false when it could not be made sure of, and then the
 * check runs again at the next launch. A marker that could not be read clears nothing, because
 * a failed read says nothing about whether this is a fresh install.
 *
 * Nothing here logs.
 */
export async function ensureInstallMarker({
  storage,
  secureStorage,
  isReleased = () => false,
}: {
  storage: Storage;
  secureStorage: SecureStorage;
  /**
   * True once the app has been let in without waiting for this check. Clearing then would delete
   * the database key or a PIN that the running app has already read, so it is skipped, along with
   * the marker write, and the next launch tries again. It is asked just before the clear.
   */
  isReleased?: () => boolean;
}): Promise<boolean> {
  try {
    const marker = await storage.get('installMarker', installMarkerSchema);
    if (marker === true) return true;
    // A phone that ran an earlier build has settings but no marker. That is an upgrade, and its
    // secure items (the database key) are its own, so nothing is cleared. A reinstall has an empty
    // key-value store, because that goes with the app.
    const isUpgrade =
      (await storage.get('entryConfirmation', entryConfirmationSchema)) !== undefined;
    if (isReleased()) return false;
    if (!isUpgrade) await secureStorage.clearAll();
    await storage.set('installMarker', true);
    return true;
  } catch {
    return false;
  }
}
