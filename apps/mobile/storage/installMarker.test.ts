import { createInMemoryBackend } from './createInMemoryBackend';
import { createSecureStorage } from './createSecureStorage';
import { createStorage } from './createStorage';
import { ensureInstallMarker } from './installMarker';

const oldSecureItems = {
  personalDatabaseKey: JSON.stringify('0123456789abcdef'.repeat(4)),
  lockPinHash: JSON.stringify({ salt: 'a'.repeat(32), hash: 'b'.repeat(64) }),
  lockAttempts: JSON.stringify({ failedCount: 4, waitEndsAt: 0 }),
  lockBiometricsChoice: 'true',
};

function createFixture() {
  const keyValueBackend = createInMemoryBackend();
  const secureBackend = createInMemoryBackend();
  return {
    keyValueBackend,
    secureBackend,
    storage: createStorage(keyValueBackend),
    secureStorage: createSecureStorage(secureBackend),
  };
}

function leaveOldSecureItemsBehind(secureBackend: ReturnType<typeof createInMemoryBackend>) {
  for (const [name, value] of Object.entries(oldSecureItems)) {
    secureBackend.entries.set(name, value);
  }
}

describe('ensureInstallMarker', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should clear the old secure items a deleted app left behind, then write the marker', async () => {
    const { secureBackend, keyValueBackend, storage, secureStorage } = createFixture();
    leaveOldSecureItemsBehind(secureBackend);

    const isReady = await ensureInstallMarker({ storage, secureStorage });

    expect(isReady).toBe(true);
    expect(secureBackend.entries.size).toBe(0);
    expect(keyValueBackend.entries.get('installMarker')).toBe('true');
  });

  it('should clear nothing on an upgrade from a build with no marker, and write the marker', async () => {
    const { secureBackend, keyValueBackend, storage, secureStorage } = createFixture();
    keyValueBackend.entries.set('entryConfirmation', 'true');
    keyValueBackend.entries.set('playerNames', JSON.stringify(['Name 1', 'Name 2']));
    leaveOldSecureItemsBehind(secureBackend);

    const isReady = await ensureInstallMarker({ storage, secureStorage });

    expect(isReady).toBe(true);
    expect(Object.fromEntries(secureBackend.entries)).toEqual(oldSecureItems);
    expect(keyValueBackend.entries.get('installMarker')).toBe('true');
  });

  it('should clear on a reinstall, where the key-value store is empty but the Keychain is not', async () => {
    const { secureBackend, keyValueBackend, storage, secureStorage } = createFixture();
    leaveOldSecureItemsBehind(secureBackend);

    await ensureInstallMarker({ storage, secureStorage });

    expect(secureBackend.entries.size).toBe(0);
    expect([...keyValueBackend.entries.keys()]).toEqual(['installMarker']);
  });

  it('should clear on a reinstall even when other settings were left, but no entry confirmation', async () => {
    const { secureBackend, keyValueBackend, storage, secureStorage } = createFixture();
    keyValueBackend.entries.set('soundOn', 'false');
    leaveOldSecureItemsBehind(secureBackend);

    await ensureInstallMarker({ storage, secureStorage });

    expect(secureBackend.entries.size).toBe(0);
  });

  it('should clear nothing when the entry confirmation cannot be read', async () => {
    const { secureBackend, keyValueBackend, secureStorage } = createFixture();
    leaveOldSecureItemsBehind(secureBackend);
    const storage = createStorage({
      ...keyValueBackend,
      getItem: (key) =>
        key === 'entryConfirmation'
          ? Promise.reject(new Error('The read failed'))
          : keyValueBackend.getItem(key),
    });

    const isReady = await ensureInstallMarker({ storage, secureStorage });

    expect(isReady).toBe(false);
    expect(Object.fromEntries(secureBackend.entries)).toEqual(oldSecureItems);
  });

  it('should skip the clear and the marker once the app has been let in, so the next launch retries', async () => {
    const { secureBackend, keyValueBackend, storage, secureStorage } = createFixture();
    leaveOldSecureItemsBehind(secureBackend);

    const isReady = await ensureInstallMarker({ storage, secureStorage, isReleased: () => true });

    expect(isReady).toBe(false);
    expect(Object.fromEntries(secureBackend.entries)).toEqual(oldSecureItems);
    expect(keyValueBackend.entries.has('installMarker')).toBe(false);
  });

  it('should write the marker on a fresh install with nothing left behind', async () => {
    const { keyValueBackend, storage, secureStorage } = createFixture();

    await ensureInstallMarker({ storage, secureStorage });

    expect(keyValueBackend.entries.get('installMarker')).toBe('true');
  });

  it('should leave the secure items alone when the marker is there', async () => {
    const { secureBackend, keyValueBackend, storage, secureStorage } = createFixture();
    keyValueBackend.entries.set('installMarker', 'true');
    leaveOldSecureItemsBehind(secureBackend);

    const isReady = await ensureInstallMarker({ storage, secureStorage });

    expect(isReady).toBe(true);
    expect(Object.fromEntries(secureBackend.entries)).toEqual(oldSecureItems);
  });

  it('should not clear again at a later launch, so a PIN set since then is kept', async () => {
    const { secureBackend, storage, secureStorage } = createFixture();
    await ensureInstallMarker({ storage, secureStorage });
    secureBackend.entries.set('lockPinHash', oldSecureItems.lockPinHash);

    await ensureInstallMarker({ storage, secureStorage });

    expect(secureBackend.entries.get('lockPinHash')).toBe(oldSecureItems.lockPinHash);
  });

  it('should treat a marker that is not true as missing', async () => {
    const { secureBackend, keyValueBackend, storage, secureStorage } = createFixture();
    keyValueBackend.entries.set('installMarker', '"yes"');
    leaveOldSecureItemsBehind(secureBackend);

    await ensureInstallMarker({ storage, secureStorage });

    expect(secureBackend.entries.size).toBe(0);
    expect(keyValueBackend.entries.get('installMarker')).toBe('true');
  });

  it('should clear the secure items before it writes the marker', async () => {
    const { secureBackend, keyValueBackend, secureStorage } = createFixture();
    leaveOldSecureItemsBehind(secureBackend);
    const markerWasWrittenWhenSecureItemsRemained: boolean[] = [];
    const watchedBackend = {
      ...keyValueBackend,
      setItem: async (key: string, value: string) => {
        markerWasWrittenWhenSecureItemsRemained.push(secureBackend.entries.size > 0);
        await keyValueBackend.setItem(key, value);
      },
    };

    await ensureInstallMarker({ storage: createStorage(watchedBackend), secureStorage });

    expect(markerWasWrittenWhenSecureItemsRemained).toEqual([false]);
  });

  it('should not write the marker when clearing secure storage fails, so the next launch tries again', async () => {
    const { secureBackend, keyValueBackend, storage } = createFixture();
    leaveOldSecureItemsBehind(secureBackend);
    const failingSecureStorage = createSecureStorage({
      ...secureBackend,
      removeItem: () => Promise.reject(new Error('The delete failed')),
    });

    const isReady = await ensureInstallMarker({ storage, secureStorage: failingSecureStorage });

    expect(isReady).toBe(false);
    expect(keyValueBackend.entries.has('installMarker')).toBe(false);
  });

  it('should clear nothing when the marker cannot be read, because that does not say it is a fresh install', async () => {
    const { secureBackend, keyValueBackend, secureStorage } = createFixture();
    leaveOldSecureItemsBehind(secureBackend);
    const unreadableStorage = createStorage({
      ...keyValueBackend,
      getItem: () => Promise.reject(new Error('The read failed')),
    });

    const isReady = await ensureInstallMarker({ storage: unreadableStorage, secureStorage });

    expect(isReady).toBe(false);
    expect(Object.fromEntries(secureBackend.entries)).toEqual(oldSecureItems);
  });

  it('should report false, not throw, when the marker cannot be written', async () => {
    const { keyValueBackend, secureStorage } = createFixture();
    const unwritableStorage = createStorage({
      ...keyValueBackend,
      setItem: () => Promise.reject(new Error('The write failed')),
    });

    await expect(ensureInstallMarker({ storage: unwritableStorage, secureStorage })).resolves.toBe(
      false,
    );
  });

  it('should not log anything, including what it clears', async () => {
    const { secureBackend, storage, secureStorage } = createFixture();
    leaveOldSecureItemsBehind(secureBackend);
    const spies = (['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map((method) =>
      jest.spyOn(console, method).mockImplementation(() => {}),
    );

    await ensureInstallMarker({ storage, secureStorage });

    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
});
