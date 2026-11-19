import { openPersonalDatabase } from './openPersonalDatabase';
import { personalMigrations } from './migrations';
import { createNodeDatabase } from './testing/nodeSqlite';
import { UnreadableDatabaseError } from './UnreadableDatabaseError';
import type { DatabaseFactory, KeyStore, SqlDatabase } from './types';

const firstKey = 'a'.repeat(64);
const secondKey = 'b'.repeat(64);

/** Stands in for the encrypted file. It opens only with the key it was made with. */
function createFakeFactory() {
  const state: { file?: { key: string; database: SqlDatabase }; deletions: number } = {
    deletions: 0,
  };
  const factory: DatabaseFactory = {
    async open(key) {
      state.file ??= { key, database: createNodeDatabase() };
      if (state.file?.key !== key) throw new UnreadableDatabaseError();
      return state.file.database;
    },
    async delete() {
      state.deletions += 1;
      state.file = undefined;
    },
  };
  return { factory, state };
}

function createFakeKeyStore(initial?: string): KeyStore & { stored: string | undefined } {
  const store = {
    stored: initial,
    read: async () => store.stored,
    write: async (key: string) => {
      store.stored = key;
    },
    delete: async () => {
      store.stored = undefined;
    },
  };
  return store;
}

function keysToGenerate(...keys: string[]) {
  const queue = [...keys];
  return () => {
    const next = queue.shift();
    if (next === undefined) throw new Error('No more keys were expected');
    return next;
  };
}

async function readUserVersion(database: SqlDatabase) {
  const [row] = await database.all<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? -1;
}

describe('openPersonalDatabase', () => {
  it('should make a key, store it and build the schema on the first launch', async () => {
    const { factory, state } = createFakeFactory();
    const keyStore = createFakeKeyStore();

    const opened = await openPersonalDatabase({
      factory,
      keyStore,
      generateKey: keysToGenerate(firstKey),
    });

    expect(keyStore.stored).toBe(firstKey);
    expect(state.file?.key).toBe(firstKey);
    expect(opened.recoveredFromUnreadable).toBe(false);
    expect(await readUserVersion(opened.database)).toBe(personalMigrations.length);
  });

  it('should open the same data with the stored key on a later launch', async () => {
    const { factory } = createFakeFactory();
    const keyStore = createFakeKeyStore();
    const first = await openPersonalDatabase({
      factory,
      keyStore,
      generateKey: keysToGenerate(firstKey),
    });
    await first.database.run('INSERT INTO favourite (card_id, created_at) VALUES (?, ?)', [
      'Card 1',
      1,
    ]);

    const second = await openPersonalDatabase({
      factory,
      keyStore,
      generateKey: keysToGenerate(),
    });

    expect(second.recoveredFromUnreadable).toBe(false);
    expect(await second.database.all('SELECT card_id FROM favourite')).toEqual([
      { card_id: 'Card 1' },
    ]);
  });

  it('should make the database again, empty, when the key is lost', async () => {
    const { factory, state } = createFakeFactory();
    const keyStore = createFakeKeyStore();
    const first = await openPersonalDatabase({
      factory,
      keyStore,
      generateKey: keysToGenerate(firstKey),
    });
    await first.database.run('INSERT INTO favourite (card_id, created_at) VALUES (?, ?)', [
      'Card 1',
      1,
    ]);
    await keyStore.delete();

    const recovered = await openPersonalDatabase({
      factory,
      keyStore,
      generateKey: keysToGenerate(secondKey),
    });

    expect(recovered.recoveredFromUnreadable).toBe(true);
    expect(await recovered.database.all('SELECT card_id FROM favourite')).toEqual([]);
    expect(keyStore.stored).toBe(secondKey);
    expect(state.file?.key).toBe(secondKey);
    expect(state.deletions).toBe(1);
  });

  it('should make the database again when the stored key does not open it', async () => {
    const { factory } = createFakeFactory();
    await factory.open(firstKey);
    const keyStore = createFakeKeyStore(secondKey);

    const recovered = await openPersonalDatabase({
      factory,
      keyStore,
      generateKey: keysToGenerate(firstKey.replace(/a/g, 'c')),
    });

    expect(recovered.recoveredFromUnreadable).toBe(true);
    expect(keyStore.stored).toBe('c'.repeat(64));
  });

  it('should treat a stored value that is not a key as no key', async () => {
    const { factory } = createFakeFactory();
    const keyStore = createFakeKeyStore('not a key');

    const opened = await openPersonalDatabase({
      factory,
      keyStore,
      generateKey: keysToGenerate(firstKey),
    });

    expect(keyStore.stored).toBe(firstKey);
    expect(opened.recoveredFromUnreadable).toBe(false);
  });

  it('should open a new file with the stored key when the file is gone, without a notice', async () => {
    const { factory } = createFakeFactory();
    const keyStore = createFakeKeyStore(firstKey);

    const opened = await openPersonalDatabase({
      factory,
      keyStore,
      generateKey: keysToGenerate(),
    });

    expect(opened.recoveredFromUnreadable).toBe(false);
    expect(keyStore.stored).toBe(firstKey);
  });

  it('should keep the file and fail when a migration cannot run, not make it again', async () => {
    const { factory, state } = createFakeFactory();
    const keyStore = createFakeKeyStore(firstKey);
    const database = await factory.open(firstKey);
    await database.exec(`PRAGMA user_version = ${personalMigrations.length + 1}`);

    await expect(
      openPersonalDatabase({ factory, keyStore, generateKey: keysToGenerate() }),
    ).rejects.toThrow('newer');

    expect(state.deletions).toBe(0);
    expect(keyStore.stored).toBe(firstKey);
  });

  it('should keep the file and fail on an error that does not mean the key is wrong', async () => {
    const { factory, state } = createFakeFactory();
    await factory.open(firstKey);
    const keyStore = createFakeKeyStore(firstKey);
    const failingFactory: DatabaseFactory = {
      ...factory,
      open: () => Promise.reject(new Error('The disk is full')),
    };

    await expect(
      openPersonalDatabase({
        factory: failingFactory,
        keyStore,
        generateKey: keysToGenerate(),
      }),
    ).rejects.toThrow('The disk is full');

    expect(state.deletions).toBe(0);
    expect(keyStore.stored).toBe(firstKey);
  });

  describe('privacy', () => {
    const consoleMethods = ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const;

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should not log the key on a first launch, a later launch or a recovery', async () => {
      const spies = consoleMethods.map((method) =>
        jest.spyOn(console, method).mockImplementation(() => {}),
      );
      const { factory } = createFakeFactory();
      const keyStore = createFakeKeyStore();
      await openPersonalDatabase({ factory, keyStore, generateKey: keysToGenerate(firstKey) });
      await openPersonalDatabase({ factory, keyStore, generateKey: keysToGenerate() });
      await keyStore.delete();
      await openPersonalDatabase({ factory, keyStore, generateKey: keysToGenerate(secondKey) });

      for (const spy of spies) {
        expect(JSON.stringify(spy.mock.calls)).not.toContain(firstKey);
        expect(JSON.stringify(spy.mock.calls)).not.toContain(secondKey);
        expect(spy).not.toHaveBeenCalled();
      }
    });
  });
});
