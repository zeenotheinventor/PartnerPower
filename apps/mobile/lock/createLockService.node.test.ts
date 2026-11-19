import { createHash } from 'node:crypto';

import {
  biometricsChoiceSchema,
  lockAttemptsSchema,
  maximumWaitMilliseconds,
  pinHashSchema,
} from '@getfreak/core';

import { createInMemoryBackend } from '../storage/createInMemoryBackend';
import { createSecureStorage } from '../storage/createSecureStorage';
import { createLockService } from './createLockService';
import type { BiometricKind, BiometricsDevice, LockService } from './types';

const startOfDay = Date.UTC(2026, 10, 19, 9, 0, 0);
const rightPin = '4821';
const wrongPin = '1111';

type DeviceSetup = {
  hasHardware?: boolean;
  isEnrolled?: boolean;
  kinds?: BiometricKind[];
  isPassed?: boolean;
};

function createBiometricsDevice(setup: DeviceSetup = {}) {
  const authenticate = jest.fn(() => Promise.resolve(setup.isPassed ?? true));
  const device: BiometricsDevice = {
    hasHardware: async () => setup.hasHardware ?? true,
    isEnrolled: async () => setup.isEnrolled ?? true,
    supportedKinds: async () => setup.kinds ?? ['face'],
    authenticate,
  };
  return { device, authenticate };
}

function createFixture(deviceSetup?: DeviceSetup) {
  const secureBackend = createInMemoryBackend();
  const secureStorage = createSecureStorage(secureBackend);
  const clock = { now: startOfDay };
  let randomCall = 0;
  const { device, authenticate } = createBiometricsDevice(deviceSetup);
  const makeService = (biometricsDevice: BiometricsDevice = device): LockService =>
    createLockService({
      secureStorage,
      biometricsDevice,
      hashText: async (text) => createHash('sha256').update(text).digest('hex'),
      // A different salt each time it is asked for, as the real one gives.
      getRandomBytes: (byteCount) => {
        randomCall += 1;
        return Uint8Array.from({ length: byteCount }, (_, index) => (index + randomCall) % 256);
      },
      now: () => clock.now,
    });
  return { secureBackend, secureStorage, clock, authenticate, device, makeService };
}

async function getAttempts(fixture: ReturnType<typeof createFixture>) {
  return fixture.secureStorage.get('lockAttempts', lockAttemptsSchema);
}

describe('the lock being on', () => {
  it('should be off until a PIN is set', async () => {
    const lock = createFixture().makeService();

    expect(await lock.isLockOn()).toBe(false);
  });

  it('should be on once a PIN is set', async () => {
    const lock = createFixture().makeService();

    await lock.setPin(rightPin);

    expect(await lock.isLockOn()).toBe(true);
  });

  it('should read from the stored hash alone, so there is no flag that could disagree with it', async () => {
    const fixture = createFixture();
    await fixture.makeService().setPin(rightPin);

    expect([...fixture.secureBackend.entries.keys()]).toEqual(['lockPinHash']);
  });

  it('should be on in a fresh service over the same storage, as after a restart', async () => {
    const fixture = createFixture();
    await fixture.makeService().setPin(rightPin);

    expect(await fixture.makeService().isLockOn()).toBe(true);
  });

  it('should count a hash that fails its schema as no PIN', async () => {
    const fixture = createFixture();
    fixture.secureBackend.entries.set('lockPinHash', JSON.stringify({ salt: 'a', hash: 'b' }));

    expect(await fixture.makeService().isLockOn()).toBe(false);
  });

  it('should be off after the PIN is cleared', async () => {
    const lock = createFixture().makeService();
    await lock.setPin(rightPin);

    await lock.clearPin();

    expect(await lock.isLockOn()).toBe(false);
  });
});

describe('setting a PIN', () => {
  it('should keep a salted SHA-256 hash and not the PIN', async () => {
    const fixture = createFixture();

    await fixture.makeService().setPin(rightPin);

    const stored = await fixture.secureStorage.get('lockPinHash', pinHashSchema);
    expect(stored).toBeDefined();
    expect(stored?.hash).toBe(
      createHash('sha256').update(`${stored?.salt}:${rightPin}`).digest('hex'),
    );
    expect(Object.keys(stored ?? {}).sort()).toEqual(['hash', 'salt']);
  });

  it('should use a new salt each time, so the same PIN gives a different hash', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    const first = await fixture.secureStorage.get('lockPinHash', pinHashSchema);

    await lock.setPin(rightPin);
    const second = await fixture.secureStorage.get('lockPinHash', pinHashSchema);

    expect(second?.salt).not.toBe(first?.salt);
    expect(second?.hash).not.toBe(first?.hash);
  });

  it.each([
    ['three digits', '123'],
    ['five digits', '12345'],
    ['letters', 'abcd'],
    ['empty', ''],
    ['a space', '12 4'],
  ])('should refuse a PIN of %s and store nothing', async (_description, pin) => {
    const fixture = createFixture();

    const result = await fixture.makeService().setPin(pin);

    expect(result).toEqual({ ok: false, reason: 'invalidPin' });
    expect(fixture.secureBackend.entries.size).toBe(0);
  });

  it('should leave the old PIN working when the new one is refused', async () => {
    const lock = createFixture().makeService();
    await lock.setPin(rightPin);

    await lock.setPin('12');

    expect(await lock.checkPin(rightPin)).toEqual({ status: 'correct' });
  });

  it('should replace the old PIN', async () => {
    const lock = createFixture().makeService();
    await lock.setPin(rightPin);

    await lock.setPin(wrongPin);

    expect(await lock.checkPin(rightPin)).toEqual({ status: 'wrong' });
    expect(await lock.checkPin(wrongPin)).toEqual({ status: 'correct' });
  });

  it('should start the count of wrong PINs again', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    await lock.checkPin(wrongPin);
    await lock.checkPin(wrongPin);

    await lock.setPin(rightPin);

    expect(await getAttempts(fixture)).toBeUndefined();
  });
});

describe('checking a PIN', () => {
  it('should accept the right PIN', async () => {
    const lock = createFixture().makeService();
    await lock.setPin(rightPin);

    expect(await lock.checkPin(rightPin)).toEqual({ status: 'correct' });
  });

  it('should refuse a wrong PIN', async () => {
    const lock = createFixture().makeService();
    await lock.setPin(rightPin);

    expect(await lock.checkPin(wrongPin)).toEqual({ status: 'wrong' });
  });

  it('should refuse text that is not a PIN, and count it', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);

    expect(await lock.checkPin('48210')).toEqual({ status: 'wrong' });
    expect((await getAttempts(fixture))?.failedCount).toBe(1);
  });

  it('should say the lock is off when there is no PIN, and record nothing', async () => {
    const fixture = createFixture();

    expect(await fixture.makeService().checkPin(rightPin)).toEqual({ status: 'lockOff' });
    expect(fixture.secureBackend.entries.size).toBe(0);
  });

  it('should record each wrong PIN in secure storage', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);

    await lock.checkPin(wrongPin);
    await lock.checkPin(wrongPin);

    expect(await getAttempts(fixture)).toEqual({ failedCount: 2, waitEndsAt: 0 });
  });

  it('should start again from zero after the right PIN, so only a run in a row counts', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    for (let attempt = 0; attempt < 4; attempt += 1) await lock.checkPin(wrongPin);

    await lock.checkPin(rightPin);

    expect(await getAttempts(fixture)).toBeUndefined();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect(await lock.checkPin(wrongPin)).toEqual({ status: 'wrong' });
    }
  });
});

describe('the wait after wrong PINs', () => {
  async function makeFiveWrongTries(lock: LockService) {
    const results = [];
    for (let attempt = 0; attempt < 5; attempt += 1) results.push(await lock.checkPin(wrongPin));
    return results;
  }

  it('should start a wait of 30 seconds on the fifth wrong PIN in a row, and not before', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);

    const results = await makeFiveWrongTries(lock);

    expect(results.slice(0, 4)).toEqual(Array(4).fill({ status: 'wrong' }));
    expect(results[4]).toEqual({ status: 'waiting', remainingMilliseconds: 30_000 });
  });

  it('should count every try when several are made at once, so a burst cannot get past the count', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);

    const results = await Promise.all(Array.from({ length: 5 }, () => lock.checkPin(wrongPin)));

    expect(results.at(-1)).toEqual({ status: 'waiting', remainingMilliseconds: 30_000 });
    expect((await getAttempts(fixture))?.failedCount).toBe(5);
  });

  it('should keep the count and the end of the wait in secure storage', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);

    await makeFiveWrongTries(lock);

    expect(await getAttempts(fixture)).toEqual({
      failedCount: 5,
      waitEndsAt: startOfDay + 30_000,
    });
  });

  it('should refuse even the right PIN during the wait, and not count the try', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    await makeFiveWrongTries(lock);
    fixture.clock.now = startOfDay + 10_000;

    expect(await lock.checkPin(rightPin)).toEqual({
      status: 'waiting',
      remainingMilliseconds: 20_000,
    });
    expect(await lock.checkPin(wrongPin)).toEqual({
      status: 'waiting',
      remainingMilliseconds: 20_000,
    });
    expect((await getAttempts(fixture))?.failedCount).toBe(5);
  });

  it('should accept the right PIN once the wait has ended', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    await makeFiveWrongTries(lock);
    fixture.clock.now = startOfDay + 30_000;

    expect(await lock.checkPin(rightPin)).toEqual({ status: 'correct' });
    expect(await getAttempts(fixture)).toBeUndefined();
  });

  it('should keep the wait across a restart, which is a new service over the same storage', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    await makeFiveWrongTries(lock);
    fixture.clock.now = startOfDay + 5_000;

    const afterRestart = fixture.makeService();

    expect(await afterRestart.checkPin(rightPin)).toEqual({
      status: 'waiting',
      remainingMilliseconds: 25_000,
    });
    expect(await afterRestart.getWaitRemainingMilliseconds()).toBe(25_000);
  });

  it('should wait 60 seconds after the tenth wrong PIN, with no wait on the six in between', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    await makeFiveWrongTries(lock);
    fixture.clock.now = startOfDay + 30_000;

    const results = await makeFiveWrongTries(lock);

    expect(results.slice(0, 4)).toEqual(Array(4).fill({ status: 'wrong' }));
    expect(results[4]).toEqual({ status: 'waiting', remainingMilliseconds: 60_000 });
  });

  it('should never ask for a wait longer than the longest wait', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    await fixture.secureStorage.set('lockAttempts', { failedCount: 49, waitEndsAt: 0 });

    const result = await lock.checkPin(wrongPin);

    expect(result).toEqual({ status: 'waiting', remainingMilliseconds: maximumWaitMilliseconds });
  });

  it('should report no wait when nothing is being waited for', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    await lock.checkPin(wrongPin);

    expect(await lock.getWaitRemainingMilliseconds()).toBe(0);
  });

  it('should count a record that fails its schema as no wrong PINs', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    fixture.secureBackend.entries.set('lockAttempts', JSON.stringify({ failedCount: 'many' }));

    expect(await lock.checkPin(wrongPin)).toEqual({ status: 'wrong' });
    expect(await getAttempts(fixture)).toEqual({ failedCount: 1, waitEndsAt: 0 });
  });

  it('should never erase the PIN or anything else, however many wrong PINs there are', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    await lock.setBiometricsChoice(true);

    for (let attempt = 0; attempt < 12; attempt += 1) {
      await lock.checkPin(wrongPin);
      fixture.clock.now += maximumWaitMilliseconds;
    }

    expect(await lock.isLockOn()).toBe(true);
    expect(await lock.getBiometricsChoice()).toBe(true);
    expect(await lock.checkPin(rightPin)).toEqual({ status: 'correct' });
  });
});

describe('biometrics availability', () => {
  it('should be available with the kind the phone has, when there is hardware and a face or finger set up', async () => {
    const lock = createFixture({ kinds: ['fingerprint'] }).makeService();

    expect(await lock.getBiometricsAvailability()).toEqual({
      isAvailable: true,
      kind: 'fingerprint',
    });
  });

  it.each<[string, DeviceSetup]>([
    ['there is no hardware', { hasHardware: false }],
    ['nothing is set up on the phone', { isEnrolled: false }],
    ['the phone reports no kind', { kinds: [] }],
  ])('should not be available when %s', async (_description, setup) => {
    const lock = createFixture(setup).makeService();

    expect(await lock.getBiometricsAvailability()).toEqual({ isAvailable: false });
  });

  it('should name face first when the phone has several kinds', async () => {
    const lock = createFixture({ kinds: ['iris', 'fingerprint', 'face'] }).makeService();

    expect(await lock.getBiometricsAvailability()).toEqual({ isAvailable: true, kind: 'face' });
  });

  it('should name fingerprint before iris', async () => {
    const lock = createFixture({ kinds: ['iris', 'fingerprint'] }).makeService();

    expect(await lock.getBiometricsAvailability()).toEqual({
      isAvailable: true,
      kind: 'fingerprint',
    });
  });

  it('should count a phone that fails to answer as not available, and not reject', async () => {
    const fixture = createFixture();
    const failingDevice: BiometricsDevice = {
      ...fixture.device,
      isEnrolled: () => Promise.reject(new Error('The device failed')),
    };

    expect(await fixture.makeService(failingDevice).getBiometricsAvailability()).toEqual({
      isAvailable: false,
    });
  });
});

describe('asking for biometrics', () => {
  it('should show the prompt with the given text and say it passed', async () => {
    const fixture = createFixture({ isPassed: true });

    const isPassed = await fixture.makeService().askForBiometrics('Unlock');

    expect(isPassed).toBe(true);
    expect(fixture.authenticate).toHaveBeenCalledWith('Unlock');
  });

  it('should say it did not pass when the player fails or cancels', async () => {
    const lock = createFixture({ isPassed: false }).makeService();

    expect(await lock.askForBiometrics('Unlock')).toBe(false);
  });

  it('should not reject when the phone fails, and say it did not pass', async () => {
    const fixture = createFixture();
    const failingDevice: BiometricsDevice = {
      ...fixture.device,
      authenticate: () => Promise.reject(new Error('The device failed')),
    };

    expect(await fixture.makeService(failingDevice).askForBiometrics('Unlock')).toBe(false);
  });

  it('should start the count of wrong PINs again when it passes, and during a wait too', async () => {
    const fixture = createFixture({ isPassed: true });
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    for (let attempt = 0; attempt < 5; attempt += 1) await lock.checkPin(wrongPin);

    await lock.askForBiometrics('Unlock');

    expect(await getAttempts(fixture)).toBeUndefined();
    expect(await lock.getWaitRemainingMilliseconds()).toBe(0);
  });

  it('should leave the count alone when it does not pass', async () => {
    const fixture = createFixture({ isPassed: false });
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    await lock.checkPin(wrongPin);

    await lock.askForBiometrics('Unlock');

    expect((await getAttempts(fixture))?.failedCount).toBe(1);
  });
});

describe('the biometrics choice', () => {
  it('should be off until the player turns it on', async () => {
    expect(await createFixture().makeService().getBiometricsChoice()).toBe(false);
  });

  it('should keep what was set, across a restart', async () => {
    const fixture = createFixture();
    await fixture.makeService().setBiometricsChoice(true);

    expect(await fixture.makeService().getBiometricsChoice()).toBe(true);

    await fixture.makeService().setBiometricsChoice(false);

    expect(await fixture.makeService().getBiometricsChoice()).toBe(false);
  });

  it('should keep the choice in secure storage, as a boolean', async () => {
    const fixture = createFixture();

    await fixture.makeService().setBiometricsChoice(true);

    expect(await fixture.secureStorage.get('lockBiometricsChoice', biometricsChoiceSchema)).toBe(
      true,
    );
  });

  it('should count a stored value that is not a boolean as off', async () => {
    const fixture = createFixture();
    fixture.secureBackend.entries.set('lockBiometricsChoice', '"yes"');

    expect(await fixture.makeService().getBiometricsChoice()).toBe(false);
  });

  it('should be removed with the PIN, so turning the lock on again starts with biometrics off', async () => {
    const lock = createFixture().makeService();
    await lock.setPin(rightPin);
    await lock.setBiometricsChoice(true);

    await lock.clearPin();

    expect(await lock.getBiometricsChoice()).toBe(false);
  });
});

describe('clearing the PIN', () => {
  it('should remove the hash, the wrong PIN count and the biometrics choice', async () => {
    const fixture = createFixture();
    const lock = fixture.makeService();
    await lock.setPin(rightPin);
    await lock.checkPin(wrongPin);
    await lock.setBiometricsChoice(true);

    await lock.clearPin();

    expect(fixture.secureBackend.entries.size).toBe(0);
  });

  it('should be safe to run twice, and when there is no PIN', async () => {
    const lock = createFixture().makeService();

    await lock.clearPin();
    await expect(lock.clearPin()).resolves.toBeUndefined();
  });

  it('should leave the database key alone', async () => {
    const fixture = createFixture();
    await fixture.secureStorage.set('personalDatabaseKey', 'a'.repeat(64));
    const lock = fixture.makeService();
    await lock.setPin(rightPin);

    await lock.clearPin();

    expect([...fixture.secureBackend.entries.keys()]).toEqual(['personalDatabaseKey']);
  });
});

describe('lock privacy', () => {
  const consoleMethods = ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should not log the PIN, the hash, the salt or any stored value in any operation', async () => {
    const spies = consoleMethods.map((method) =>
      jest.spyOn(console, method).mockImplementation(() => {}),
    );
    const fixture = createFixture();
    const lock = fixture.makeService();

    await lock.setPin(rightPin);
    await lock.checkPin(wrongPin);
    await lock.checkPin(rightPin);
    for (let attempt = 0; attempt < 6; attempt += 1) await lock.checkPin(wrongPin);
    await lock.getBiometricsAvailability();
    await lock.askForBiometrics('Unlock');
    await lock.setBiometricsChoice(true);
    await lock.getBiometricsChoice();
    await lock.getWaitRemainingMilliseconds();
    const stored = await fixture.secureStorage.get('lockPinHash', pinHashSchema);
    await lock.clearPin();

    const loggedText = JSON.stringify(spies.map((spy) => spy.mock.calls));
    expect(stored).toBeDefined();
    expect(loggedText).not.toContain(rightPin);
    expect(loggedText).not.toContain(wrongPin);
    expect(loggedText).not.toContain(stored?.hash ?? 'missing');
    expect(loggedText).not.toContain(stored?.salt ?? 'missing');
  });

  it('should not put the PIN in the message of an error it throws', async () => {
    const fixture = createFixture();
    const failingSecureStorage = createSecureStorage({
      ...fixture.secureBackend,
      getItem: () => Promise.reject(new Error('The read failed')),
    });
    const lock = createLockService({
      secureStorage: failingSecureStorage,
      biometricsDevice: fixture.device,
      hashText: async (text) => createHash('sha256').update(text).digest('hex'),
      getRandomBytes: (byteCount) => new Uint8Array(byteCount),
      now: () => startOfDay,
    });

    const error = await lock.checkPin(rightPin).catch((caught: unknown) => caught);

    expect(String(error)).not.toContain(rightPin);
  });
});
