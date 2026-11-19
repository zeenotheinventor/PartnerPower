import { createInMemoryBackend } from '../../storage/createInMemoryBackend';
import { createSecureStorage } from '../../storage/createSecureStorage';
import { createLockService } from '../createLockService';
import type { BiometricKind } from '../types';
import { sha256Hex } from './sha256Hex';

export type TestLockSetup = {
  hasHardware?: boolean;
  isEnrolled?: boolean;
  kinds?: BiometricKind[];
  /** What the biometrics prompt answers. */
  isPromptPassed?: boolean;
};

/**
 * The real lock service over in-memory secure storage and a stand-in phone, so a screen test runs
 * the real rules (the wait after wrong PINs, what turning the lock off removes) with nothing
 * native. The clock is `Date.now`, so a test that uses fake timers moves it.
 */
export function createTestLock(setup: TestLockSetup = {}) {
  const secureBackend = createInMemoryBackend();
  const secureStorage = createSecureStorage(secureBackend);
  const prompt = { isPassed: setup.isPromptPassed ?? true };
  const authenticate = jest.fn(() => Promise.resolve(prompt.isPassed));
  let randomCall = 0;
  const lock = createLockService({
    secureStorage,
    biometricsDevice: {
      hasHardware: async () => setup.hasHardware ?? true,
      isEnrolled: async () => setup.isEnrolled ?? true,
      supportedKinds: async () => setup.kinds ?? ['face'],
      authenticate,
    },
    hashText: async (text) => sha256Hex(text),
    getRandomBytes: (byteCount) => {
      randomCall += 1;
      return Uint8Array.from({ length: byteCount }, (_, index) => (index + randomCall) % 256);
    },
    now: Date.now,
  });
  return {
    lock,
    secureBackend,
    authenticate,
    /** Changes what the biometrics prompt answers from now on. */
    setPromptPassed: (isPassed: boolean) => {
      prompt.isPassed = isPassed;
    },
  };
}
