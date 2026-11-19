import { z } from 'zod';

import { createInMemoryBackend } from './createInMemoryBackend';
import { createSecureStorage } from './createSecureStorage';
import { secureKeys } from './types';

// The in-memory backend has the same three methods as the secure backend, plus a `clear` that the
// secure storage never calls.
const attemptsSchema = z.object({ failedCount: z.number(), waitEndsAt: z.number() });
const textSchema = z.string();

describe('secure storage', () => {
  it('should read back a value it wrote', async () => {
    const secureStorage = createSecureStorage(createInMemoryBackend());

    await secureStorage.set('lockAttempts', { failedCount: 3, waitEndsAt: 0 });

    expect(await secureStorage.get('lockAttempts', attemptsSchema)).toEqual({
      failedCount: 3,
      waitEndsAt: 0,
    });
  });

  it('should return undefined for an item that was never written', async () => {
    const secureStorage = createSecureStorage(createInMemoryBackend());

    expect(await secureStorage.get('lockPinHash', textSchema)).toBeUndefined();
  });

  it('should read a false value as false, not as absent', async () => {
    const secureStorage = createSecureStorage(createInMemoryBackend());

    await secureStorage.set('lockBiometricsChoice', false);

    expect(await secureStorage.get('lockBiometricsChoice', z.boolean())).toBe(false);
  });

  it('should return undefined when the stored text is not valid JSON', async () => {
    const backend = createInMemoryBackend();
    backend.entries.set('lockAttempts', '{not json');

    expect(await createSecureStorage(backend).get('lockAttempts', attemptsSchema)).toBeUndefined();
  });

  it('should treat a value that fails the schema as absent', async () => {
    const backend = createInMemoryBackend();
    backend.entries.set('lockAttempts', JSON.stringify({ failedCount: 'many', waitEndsAt: 0 }));

    expect(await createSecureStorage(backend).get('lockAttempts', attemptsSchema)).toBeUndefined();
  });

  it('should forget an item after it is removed', async () => {
    const secureStorage = createSecureStorage(createInMemoryBackend());
    await secureStorage.set('lockBiometricsChoice', true);

    await secureStorage.remove('lockBiometricsChoice');

    expect(await secureStorage.get('lockBiometricsChoice', z.boolean())).toBeUndefined();
  });

  it('should not complain when it removes an item that is not there', async () => {
    const secureStorage = createSecureStorage(createInMemoryBackend());

    await expect(secureStorage.remove('lockPinHash')).resolves.toBeUndefined();
  });

  it('should let a fresh instance over the same backend read what another wrote', async () => {
    const backend = createInMemoryBackend();
    await createSecureStorage(backend).set('lockBiometricsChoice', true);

    expect(await createSecureStorage(backend).get('lockBiometricsChoice', z.boolean())).toBe(true);
  });

  it('should keep each value under the stable name of its item', async () => {
    const backend = createInMemoryBackend();
    const secureStorage = createSecureStorage(backend);

    await secureStorage.set('personalDatabaseKey', 'a'.repeat(64));
    await secureStorage.set('lockBiometricsChoice', true);

    expect([...backend.entries.keys()].sort()).toEqual([
      'lockBiometricsChoice',
      'personalDatabaseKey',
    ]);
    expect(backend.entries.get('lockBiometricsChoice')).toBe('true');
  });
});

describe('secure storage clearAll', () => {
  async function fillEveryItem(secureStorage: ReturnType<typeof createSecureStorage>) {
    for (const key of secureKeys) {
      await secureStorage.set(key, `value for ${key}`);
    }
  }

  it('should remove every item, whatever the closed list holds', async () => {
    const backend = createInMemoryBackend();
    const secureStorage = createSecureStorage(backend);
    await fillEveryItem(secureStorage);

    await secureStorage.clearAll();

    expect(backend.entries.size).toBe(0);
  });

  it('should be safe to run twice', async () => {
    const secureStorage = createSecureStorage(createInMemoryBackend());
    await fillEveryItem(secureStorage);

    await secureStorage.clearAll();

    await expect(secureStorage.clearAll()).resolves.toBeUndefined();
  });

  it('should still remove the other items when one fails, and report the failure', async () => {
    const backend = createInMemoryBackend();
    const secureStorage = createSecureStorage({
      ...backend,
      removeItem: (key) =>
        key === 'lockPinHash'
          ? Promise.reject(new Error('The delete failed'))
          : backend.removeItem(key),
    });
    await fillEveryItem(secureStorage);

    await expect(secureStorage.clearAll()).rejects.toThrow('The delete failed');

    expect([...backend.entries.keys()]).toEqual(['lockPinHash']);
  });

  it('should finish the job when it is run again after a failure', async () => {
    const backend = createInMemoryBackend();
    let failing = true;
    const secureStorage = createSecureStorage({
      ...backend,
      removeItem: (key) =>
        failing && key === 'lockPinHash'
          ? Promise.reject(new Error('The delete failed'))
          : backend.removeItem(key),
    });
    await fillEveryItem(secureStorage);
    await secureStorage.clearAll().catch(() => undefined);
    failing = false;

    await secureStorage.clearAll();

    expect(backend.entries.size).toBe(0);
  });
});

describe('secure storage privacy', () => {
  const secretValue = 'SECRET-PIN-HASH-VALUE';
  const consoleMethods = ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const;

  function spyOnConsole() {
    return consoleMethods.map((method) => jest.spyOn(console, method).mockImplementation(() => {}));
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should not log a stored value when a read fails validation or parsing', async () => {
    const backend = createInMemoryBackend();
    const spies = spyOnConsole();
    const secureStorage = createSecureStorage(backend);

    backend.entries.set('lockPinHash', JSON.stringify({ hash: secretValue }));
    await secureStorage.get('lockPinHash', attemptsSchema);
    backend.entries.set('lockPinHash', `{${secretValue}`);
    await secureStorage.get('lockPinHash', attemptsSchema);

    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(secretValue);
    }
  });

  it('should not log a value when writing, removing or clearing it', async () => {
    const spies = spyOnConsole();
    const secureStorage = createSecureStorage(createInMemoryBackend());

    await secureStorage.set('lockPinHash', secretValue);
    await secureStorage.remove('lockPinHash');
    await secureStorage.set('lockPinHash', secretValue);
    await secureStorage.clearAll();

    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(secretValue);
    }
  });
});
