import {
  biometricsChoiceSchema,
  isValidPin,
  lockAttemptsSchema,
  pinHashSchema,
  remainingWaitMilliseconds,
  triesLeftBeforeWait,
  waitAfterFailureMilliseconds,
} from '@getfreak/core';

import type { BiometricKind, LockService, LockServiceDependencies } from './types';

const saltByteCount = 16;

// The kind named when a phone has more than one.
const kindsInOrder: readonly BiometricKind[] = ['face', 'fingerprint', 'iris'];

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * The lock rules over secure storage. Whether the lock is on is read from whether a PIN hash is
 * stored, so there is no second flag that could disagree with it.
 *
 * The PIN is kept as `SHA-256(salt + ":" + PIN)` with a random salt. Four digits have only 10,000
 * values, so the hash alone would not hold against someone who could read the Keychain or
 * Keystore. What holds is that the item is readable only on this unlocked phone, and the wait after
 * wrong PINs. Wrong PINs never erase anything.
 *
 * Nothing here logs, and no error message holds a PIN or a hash.
 */
export function createLockService({
  secureStorage,
  biometricsDevice,
  hashText,
  getRandomBytes,
  now,
}: LockServiceDependencies): LockService {
  const hashPin = (salt: string, pin: string) => hashText(`${salt}:${pin}`);

  // Checks run one at a time, so two at once cannot both read the same count and each add one.
  let previousWork: Promise<unknown> = Promise.resolve();
  function inTurn<Result>(work: () => Promise<Result>): Promise<Result> {
    const turn = previousWork.then(work, work);
    previousWork = turn.catch(() => undefined);
    return turn;
  }

  const listeners = new Set<() => void>();
  const tellListeners = () => listeners.forEach((listener) => listener());

  const readAttempts = () => secureStorage.get('lockAttempts', lockAttemptsSchema);

  return {
    async isLockOn() {
      return (await secureStorage.get('lockPinHash', pinHashSchema)) !== undefined;
    },

    async setPin(pin) {
      if (!isValidPin(pin)) return { ok: false, reason: 'invalidPin' };
      const salt = toHex(getRandomBytes(saltByteCount));
      const hash = await hashPin(salt, pin);
      await secureStorage.set('lockPinHash', { salt, hash });
      await secureStorage.remove('lockAttempts');
      tellListeners();
      return { ok: true };
    },

    checkPin: (pin) =>
      inTurn(async () => {
        const stored = await secureStorage.get('lockPinHash', pinHashSchema);
        if (!stored) return { status: 'lockOff' };

        const attempts = await readAttempts();
        const remaining = attempts ? remainingWaitMilliseconds(attempts.waitEndsAt, now()) : 0;
        if (remaining > 0) return { status: 'waiting', remainingMilliseconds: remaining };

        if ((await hashPin(stored.salt, pin)) === stored.hash) {
          await secureStorage.remove('lockAttempts');
          return { status: 'correct' };
        }

        const failedCount = (attempts?.failedCount ?? 0) + 1;
        const wait = waitAfterFailureMilliseconds(failedCount);
        await secureStorage.set('lockAttempts', {
          failedCount,
          waitEndsAt: wait > 0 ? now() + wait : 0,
        });
        return wait > 0
          ? { status: 'waiting', remainingMilliseconds: wait }
          : { status: 'wrong', triesLeftBeforeWait: triesLeftBeforeWait(failedCount) };
      }),

    async getWaitRemainingMilliseconds() {
      const attempts = await readAttempts();
      return attempts ? remainingWaitMilliseconds(attempts.waitEndsAt, now()) : 0;
    },

    async clearPin() {
      // One after another, with the hash last. If a remove fails, the hash is still there, so the
      // lock stays on and nothing is half turned off with the PIN gone.
      await secureStorage.remove('lockBiometricsChoice');
      await secureStorage.remove('lockAttempts');
      await secureStorage.remove('lockPinHash');
      tellListeners();
    },

    async getBiometricsAvailability() {
      try {
        if (!(await biometricsDevice.hasHardware())) return { isAvailable: false };
        if (!(await biometricsDevice.isEnrolled())) return { isAvailable: false };
        const supported = await biometricsDevice.supportedKinds();
        const kinds = kindsInOrder.filter((candidate) => supported.includes(candidate));
        const [kind] = kinds;
        return kind ? { isAvailable: true, kind, kinds } : { isAvailable: false };
      } catch {
        return { isAvailable: false };
      }
    },

    async askForBiometrics(promptMessage) {
      let isPassed: boolean;
      try {
        isPassed = await biometricsDevice.authenticate(promptMessage);
      } catch {
        return false;
      }
      if (isPassed) {
        // The player is let in either way, so a failed reset is not reported.
        await inTurn(() => secureStorage.remove('lockAttempts')).catch(() => undefined);
      }
      return isPassed;
    },

    async getBiometricsChoice() {
      return (await secureStorage.get('lockBiometricsChoice', biometricsChoiceSchema)) ?? false;
    },

    setBiometricsChoice: (isChosen) => secureStorage.set('lockBiometricsChoice', isChosen),

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
