import { pinHashSchema } from '@getfreak/core';

import { createClearEverything } from './clearEverything';
import { createInMemoryBackend } from './createInMemoryBackend';
import { createSecureStorage } from './createSecureStorage';
import { createStorage } from './createStorage';
import { ensureInstallMarker } from './installMarker';
import { createPersonalStore } from './personal/createPersonalStore';
import { createSecureKeyStore } from './personal/secureKeyStore';
import { createNodeDatabase } from './personal/testing/nodeSqlite';
import type { DatabaseFactory, SqlDatabase } from './personal/types';

type StepName = 'notifications' | 'secureStorage' | 'database' | 'keyValueStore';

const shippedQuestions = Array.from({ length: 150 }, (_, index) => ({
  id: `q-match-${String(index + 1).padStart(3, '0')}`,
  text: `Shipped question ${index + 1}`,
}));

/** Everything a phone holds, in memory, filled with a couple's data. */
async function createFilledPhone() {
  const keyValueBackend = createInMemoryBackend();
  const secureBackend = createInMemoryBackend();
  const events: string[] = [];
  const failing = new Set<StepName>();
  const failIfAsked = (step: StepName) => {
    if (failing.has(step)) throw new Error(`The ${step} step failed`);
  };

  // A database file that needs its key, like the real one.
  let currentFile: { key: string; database: SqlDatabase } | undefined;
  const factory: DatabaseFactory = {
    async open(key) {
      currentFile ??= { key, database: createNodeDatabase() };
      if (currentFile.key !== key) throw new Error('file is not a database');
      return currentFile.database;
    },
    async delete() {
      events.push('database');
      failIfAsked('database');
      currentFile = undefined;
    },
  };

  const secureStorage = createSecureStorage(secureBackend);
  let keyCount = 0;
  let uuidCount = 0;
  const personalStore = createPersonalStore({
    factory,
    keyStore: createSecureKeyStore(secureStorage),
    generateKey: () => String((keyCount += 1)).padStart(64, '0'),
    getShippedCards: () => [{ id: 'starter-c1-01', text: 'Shipped card 1' }],
    getShippedQuestions: () => shippedQuestions,
    randomUUID: () => `00000000-0000-4000-8000-${String((uuidCount += 1)).padStart(12, '0')}`,
    now: () => 1_700_000_000_000,
  });
  const storage = createStorage(
    {
      ...keyValueBackend,
      clear: async () => {
        events.push('keyValueStore');
        failIfAsked('keyValueStore');
        await keyValueBackend.clear();
      },
    },
    personalStore.clear,
  );

  await storage.set('entryConfirmation', true);
  await storage.set('playerNames', ['Name 1', 'Name 2']);
  await storage.set('soundOn', false);
  await storage.set('hapticsOn', true);
  await storage.set('questionPreferences', { saveDiscoveries: true });
  await storage.set('lastShownUpdateId', 'update-12');
  await storage.set('installMarker', true);

  await secureStorage.set('lockPinHash', { salt: 'a'.repeat(32), hash: 'b'.repeat(64) });
  await secureStorage.set('lockAttempts', { failedCount: 3, waitEndsAt: 0 });
  await secureStorage.set('lockBiometricsChoice', true);

  const repository = await personalStore.load();
  for (let number = 1; number <= 250; number += 1) {
    await repository.savePlayerCard({
      category: 'c1',
      kind: 'solo',
      text: `Player card ${number}`,
    });
  }
  await repository.addDiscoveries(
    shippedQuestions.map((question) => ({
      kind: 'match',
      questionId: question.id,
      strength: 'yes',
    })),
  );

  events.length = 0;
  const remountRoot = jest.fn(() => {
    events.push('remount');
  });
  const clearEverything = createClearEverything({
    cancelScheduledNotifications: async () => {
      events.push('notifications');
      failIfAsked('notifications');
    },
    secureStorage: {
      ...secureStorage,
      clearAll: async () => {
        events.push('secureStorage');
        failIfAsked('secureStorage');
        await secureStorage.clearAll();
      },
    },
    storage,
    remountRoot,
  });

  return {
    clearEverything,
    remountRoot,
    events,
    failing,
    keyValueBackend,
    secureBackend,
    secureStorage,
    storage,
    personalStore,
    hasDatabaseFile: () => currentFile !== undefined,
  };
}

describe('clearEverything', () => {
  it('should empty every store of a phone that holds a couple’s data, and remount the root', async () => {
    const phone = await createFilledPhone();
    expect((await (await phone.personalStore.load()).listPlayerCards()).length).toBe(250);
    expect((await (await phone.personalStore.load()).listDiscoveries()).length).toBe(150);

    const result = await phone.clearEverything();

    expect(result).toEqual({ ok: true });
    expect(phone.secureBackend.entries.size).toBe(0);
    expect(phone.hasDatabaseFile()).toBe(false);
    expect([...phone.keyValueBackend.entries.keys()]).toEqual(['installMarker']);
    expect(phone.remountRoot).toHaveBeenCalledTimes(1);
  });

  it('should cancel notifications, then clear the database and the key-value store, then secure storage last, then remount', async () => {
    const phone = await createFilledPhone();

    await phone.clearEverything();

    // The database and the key-value store are cleared together by `storage.clearAll`, so they
    // may finish in either order.
    expect(phone.events.slice(0, 1)).toEqual(['notifications']);
    expect(phone.events.slice(1, 3).sort()).toEqual(['database', 'keyValueStore']);
    expect(phone.events.slice(3)).toEqual(['secureStorage', 'remount']);
  });

  it('should start the database again empty, with a new key, after the root remounts', async () => {
    const phone = await createFilledPhone();
    await phone.clearEverything();

    const repository = await phone.personalStore.load();

    expect(await repository.listPlayerCards()).toEqual([]);
    expect(await repository.listDiscoveries()).toEqual([]);
    expect(phone.secureBackend.entries.get('personalDatabaseKey')).toBe(
      JSON.stringify('0'.repeat(63) + '2'),
    );
  });

  it('should be safe to run twice', async () => {
    const phone = await createFilledPhone();
    await phone.clearEverything();

    const secondResult = await phone.clearEverything();

    expect(secondResult).toEqual({ ok: true });
    expect(phone.secureBackend.entries.size).toBe(0);
    expect([...phone.keyValueBackend.entries.keys()]).toEqual(['installMarker']);
  });

  it('should keep the install marker, so the next launch does not clear a PIN set since', async () => {
    const phone = await createFilledPhone();
    await phone.clearEverything();
    await phone.secureStorage.set('lockPinHash', { salt: 'c'.repeat(32), hash: 'd'.repeat(64) });

    await ensureInstallMarker({ storage: phone.storage, secureStorage: phone.secureStorage });

    expect(phone.secureBackend.entries.has('lockPinHash')).toBe(true);
  });

  it.each<StepName>(['notifications', 'secureStorage', 'database', 'keyValueStore'])(
    'should return a failure, not throw, and not remount, when the %s step fails',
    async (step) => {
      const phone = await createFilledPhone();
      phone.failing.add(step);

      const result = await phone.clearEverything();

      expect(result).toEqual({ ok: false });
      expect(phone.remountRoot).not.toHaveBeenCalled();
    },
  );

  it('should still clear the database and the key-value store when notifications fail, so as little as possible is left behind', async () => {
    const phone = await createFilledPhone();
    phone.failing.add('notifications');

    await phone.clearEverything();

    expect(phone.hasDatabaseFile()).toBe(false);
    expect(phone.keyValueBackend.entries.has('playerNames')).toBe(false);
  });

  it.each<StepName>(['notifications', 'database', 'keyValueStore'])(
    'should keep the PIN hash, and so the lock, when the %s step fails',
    async (step) => {
      const phone = await createFilledPhone();
      phone.failing.add(step);

      const result = await phone.clearEverything();

      expect(result).toEqual({ ok: false });
      expect(phone.events).not.toContain('secureStorage');
      expect(await phone.secureStorage.get('lockPinHash', pinHashSchema)).toBeDefined();
    },
  );

  it('should finish when it is run again after a failure part way', async () => {
    const phone = await createFilledPhone();
    phone.failing.add('database');
    const failedResult = await phone.clearEverything();
    expect(failedResult).toEqual({ ok: false });
    expect(phone.hasDatabaseFile()).toBe(true);
    expect(phone.remountRoot).not.toHaveBeenCalled();
    phone.failing.clear();

    const retryResult = await phone.clearEverything();

    expect(retryResult).toEqual({ ok: true });
    expect(phone.hasDatabaseFile()).toBe(false);
    expect(phone.secureBackend.entries.size).toBe(0);
    expect([...phone.keyValueBackend.entries.keys()]).toEqual(['installMarker']);
    expect(phone.remountRoot).toHaveBeenCalledTimes(1);
  });

  it('should not write the install marker when a step failed', async () => {
    const phone = await createFilledPhone();
    phone.failing.add('database');

    await phone.clearEverything();

    expect(phone.keyValueBackend.entries.has('installMarker')).toBe(false);
  });

  it('should not put a stored value or an error message in its result or in the console', async () => {
    const phone = await createFilledPhone();
    phone.failing.add('database');
    const consoleMethods = ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const;
    const spies = consoleMethods.map((method) =>
      jest.spyOn(console, method).mockImplementation(() => {}),
    );

    const failedResult = await phone.clearEverything();
    phone.failing.clear();
    const retryResult = await phone.clearEverything();

    const spokenText = JSON.stringify([
      failedResult,
      retryResult,
      ...spies.map((spy) => spy.mock.calls),
    ]);
    expect(spokenText).not.toContain('Name 1');
    expect(spokenText).not.toContain('Player card');
    expect(spokenText).not.toContain('step failed');
    jest.restoreAllMocks();
  });
});
