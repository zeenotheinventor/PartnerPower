import type { SecureStorage, Storage } from './types';

export type ClearEverythingResult = { ok: true } | { ok: false };

export type ClearEverythingDependencies = {
  /** Cancels every scheduled notification. The native module is behind this. */
  cancelScheduledNotifications: () => Promise<void>;
  secureStorage: SecureStorage;
  /** `clearAll` on it deletes the encrypted database and clears the key-value store. */
  storage: Storage;
  /** Remounts the root, so every provider reads from empty storage. */
  remountRoot: () => void;
};

/**
 * Makes the app as it is on first launch. In order: cancel the scheduled notifications,
 * delete the database and clear the key-value store, then clear secure storage (the PIN hash, the
 * biometrics choice, the wrong PIN count and the database key), write the install marker back, then
 * remount the root.
 *
 * Secure storage goes last, and only when every step before it worked, so a wipe that fails part
 * way (from Forgot PIN, say) leaves the PIN hash and the lock on, and never a lock that is quietly
 * off over data that is still there.
 *
 * Every step is safe to run twice. A step that fails does not stop the ones before secure storage,
 * so as little as possible is left behind, but nothing after it counts as done: the marker is not written and the
 * root is not remounted, and the result says it failed so the player can try again. It never
 * throws, and the result carries no error, because an error message can hold stored text.
 *
 * The marker is written back because clearing the key-value store removed it. Without it, the
 * next launch would take this for a fresh install and clear a PIN set since.
 *
 * Nothing here logs.
 */
export function createClearEverything({
  cancelScheduledNotifications,
  secureStorage,
  storage,
  remountRoot,
}: ClearEverythingDependencies): () => Promise<ClearEverythingResult> {
  return async () => {
    let hasFailed = false;
    const attempt = async (step: () => Promise<void>) => {
      try {
        await step();
      } catch {
        hasFailed = true;
      }
    };

    await attempt(cancelScheduledNotifications);
    await attempt(() => storage.clearAll());
    if (hasFailed) return { ok: false };
    await attempt(() => secureStorage.clearAll());
    if (hasFailed) return { ok: false };

    await attempt(() => storage.set('installMarker', true));
    if (hasFailed) return { ok: false };

    remountRoot();
    return { ok: true };
  };
}
