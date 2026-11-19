import { z } from 'zod';

import { createInMemoryBackend } from './createInMemoryBackend';
import { createStorage } from './createStorage';

const namesSchema = z.tuple([z.string(), z.string()]);
const flagSchema = z.boolean();

describe('storage', () => {
  it('should read back a value it wrote', async () => {
    const storage = createStorage(createInMemoryBackend());

    await storage.set('playerNames', ['Name 1', 'Name 2']);

    expect(await storage.get('playerNames', namesSchema)).toEqual(['Name 1', 'Name 2']);
  });

  it('should return undefined for a key that was never written', async () => {
    const storage = createStorage(createInMemoryBackend());

    expect(await storage.get('entryConfirmation', flagSchema)).toBeUndefined();
  });

  it('should read a false value as false, not as absent', async () => {
    const storage = createStorage(createInMemoryBackend());

    await storage.set('entryConfirmation', false);

    expect(await storage.get('entryConfirmation', flagSchema)).toBe(false);
  });

  it('should return undefined when the stored text is not valid JSON', async () => {
    const backend = createInMemoryBackend();
    backend.entries.set('entryConfirmation', '{not json');
    const storage = createStorage(backend);

    expect(await storage.get('entryConfirmation', flagSchema)).toBeUndefined();
  });

  it('should treat a value that fails the schema as absent', async () => {
    const backend = createInMemoryBackend();
    backend.entries.set('entryConfirmation', JSON.stringify('yes'));
    const storage = createStorage(backend);

    expect(await storage.get('entryConfirmation', flagSchema)).toBeUndefined();
  });

  it('should forget a value after it is removed', async () => {
    const storage = createStorage(createInMemoryBackend());
    await storage.set('entryConfirmation', true);

    await storage.remove('entryConfirmation');

    expect(await storage.get('entryConfirmation', flagSchema)).toBeUndefined();
  });

  it('should remove every stored value on clearAll', async () => {
    const backend = createInMemoryBackend();
    const storage = createStorage(backend);
    await storage.set('entryConfirmation', true);
    await storage.set('playerNames', ['Name 1', 'Name 2']);

    await storage.clearAll();

    expect(backend.entries.size).toBe(0);
    expect(await storage.get('entryConfirmation', flagSchema)).toBeUndefined();
    expect(await storage.get('playerNames', namesSchema)).toBeUndefined();
  });

  it('should let a fresh instance over the same backend read what another wrote', async () => {
    const backend = createInMemoryBackend();
    await createStorage(backend).set('playerNames', ['Name 1', 'Name 2']);

    const afterRestart = createStorage(backend);

    expect(await afterRestart.get('playerNames', namesSchema)).toEqual(['Name 1', 'Name 2']);
  });

  it('should keep each value under a stable key string', async () => {
    const backend = createInMemoryBackend();
    const storage = createStorage(backend);

    await storage.set('entryConfirmation', true);
    await storage.set('playerNames', ['Name 1', 'Name 2']);

    expect([...backend.entries.keys()].sort()).toEqual(['entryConfirmation', 'playerNames']);
    expect(backend.entries.get('entryConfirmation')).toBe('true');
  });
});

describe('storage clearAll with a personal store', () => {
  it('should clear the personal store as well as the key-value entries', async () => {
    const backend = createInMemoryBackend();
    const clearPersonalStore = jest.fn(() => Promise.resolve());
    const storage = createStorage(backend, clearPersonalStore);
    await storage.set('entryConfirmation', true);

    await storage.clearAll();

    expect(clearPersonalStore).toHaveBeenCalledTimes(1);
    expect(backend.entries.size).toBe(0);
  });

  it('should still clear the key-value entries when the personal store fails, and report it', async () => {
    const backend = createInMemoryBackend();
    const storage = createStorage(backend, () => Promise.reject(new Error('The delete failed')));
    await storage.set('entryConfirmation', true);

    await expect(storage.clearAll()).rejects.toThrow('The delete failed');

    expect(backend.entries.size).toBe(0);
  });

  it('should still clear the personal store when the key-value store fails, and report it', async () => {
    const clearPersonalStore = jest.fn(() => Promise.resolve());
    const storage = createStorage(
      { ...createInMemoryBackend(), clear: () => Promise.reject(new Error('The clear failed')) },
      clearPersonalStore,
    );

    await expect(storage.clearAll()).rejects.toThrow('The clear failed');

    expect(clearPersonalStore).toHaveBeenCalledTimes(1);
  });
});

describe('storage privacy', () => {
  const secretName = 'SECRET-NAME-VALUE';
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
    const storage = createStorage(backend);
    backend.entries.set('playerNames', JSON.stringify([secretName, 2]));
    await storage.get('playerNames', namesSchema);
    backend.entries.set('playerNames', `{${secretName}`);
    await storage.get('playerNames', namesSchema);

    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(secretName);
    }
  });

  it('should not log a value when writing it', async () => {
    const spies = spyOnConsole();
    const storage = createStorage(createInMemoryBackend());

    await storage.set('playerNames', [secretName, 'Name 2']);

    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(secretName);
    }
  });
});
