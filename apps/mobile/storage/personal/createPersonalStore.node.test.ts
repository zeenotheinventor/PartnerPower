import { createPersonalStore } from './createPersonalStore';
import { createNodeDatabase } from './testing/nodeSqlite';
import { UnreadableDatabaseError } from './UnreadableDatabaseError';
import type { DatabaseFactory, KeyStore, SqlDatabase } from './types';

function createFakes() {
  const state: {
    file?: { key: string; database: SqlDatabase };
    storedKey?: string;
    closedCount: number;
  } = { closedCount: 0 };
  const factory: DatabaseFactory = {
    async open(key) {
      if (state.file === undefined) {
        const inner = createNodeDatabase();
        state.file = {
          key,
          database: {
            ...inner,
            close: async () => {
              state.closedCount += 1;
              await inner.close();
            },
          },
        };
      }
      if (state.file.key !== key) throw new UnreadableDatabaseError();
      return state.file.database;
    },
    async delete() {
      state.file = undefined;
    },
  };
  const keyStore: KeyStore = {
    read: async () => state.storedKey,
    write: async (key) => {
      state.storedKey = key;
    },
    delete: async () => {
      state.storedKey = undefined;
    },
  };
  let keyCount = 0;
  const makeStore = () =>
    createPersonalStore({
      factory,
      keyStore,
      generateKey: () => String((keyCount += 1)).padStart(64, '0'),
      getShippedCards: () => [{ id: 'starter-c1-01', text: 'Shipped card 1' }],
      randomUUID: () => '00000000-0000-4000-8000-000000000001',
      now: () => 1,
    });
  return { state, makeStore };
}

describe('createPersonalStore', () => {
  it('should open the database once however many times it is loaded', async () => {
    const { state, makeStore } = createFakes();
    const store = makeStore();

    const [first, second] = await Promise.all([store.load(), store.load()]);

    expect(first).toBe(second);
    expect(state.file?.key).toBe('1'.padStart(64, '0'));
  });

  it('should load a working repository', async () => {
    const { makeStore } = createFakes();
    const repository = await makeStore().load();

    await repository.setFavourite('starter-c1-01', true);

    expect(await repository.listFavourites()).toEqual(['starter-c1-01']);
  });

  it('should report a recovery in the loaded repository', async () => {
    const { state, makeStore } = createFakes();
    await (await makeStore().load()).setFavourite('starter-c1-01', true);
    state.storedKey = undefined;

    const repository = await makeStore().load();

    expect(repository.takeRecoveryNotice()).toBe(true);
    expect(await repository.listFavourites()).toEqual([]);
  });

  it('should try again on the next load after a load fails', async () => {
    const { makeStore, state } = createFakes();
    const store = makeStore();
    state.storedKey = '1'.padStart(64, '0');
    state.file = {
      key: state.storedKey,
      database: { ...createNodeDatabase(), all: () => Promise.reject(new Error('Not now')) },
    };

    await expect(store.load()).rejects.toThrow();
    state.file = undefined;

    await expect(store.load()).resolves.toBeDefined();
  });

  describe('clear', () => {
    it('should close the database, delete the file and delete the key', async () => {
      const { state, makeStore } = createFakes();
      const store = makeStore();
      await store.load();

      await store.clear();

      expect(state.closedCount).toBe(1);
      expect(state.file).toBeUndefined();
      expect(state.storedKey).toBeUndefined();
    });

    it('should leave an empty store with a new key for the next load', async () => {
      const { state, makeStore } = createFakes();
      const store = makeStore();
      await (await store.load()).setFavourite('starter-c1-01', true);

      await store.clear();
      const repository = await store.load();

      expect(await repository.listFavourites()).toEqual([]);
      expect(repository.takeRecoveryNotice()).toBe(false);
      expect(state.storedKey).toBe('2'.padStart(64, '0'));
    });

    it('should clear a key that was stored before anything was loaded', async () => {
      const { state, makeStore } = createFakes();
      await (await makeStore().load()).setFavourite('starter-c1-01', true);

      await makeStore().clear();

      expect(state.file).toBeUndefined();
      expect(state.storedKey).toBeUndefined();
    });

    it('should be safe to run twice', async () => {
      const { makeStore } = createFakes();
      const store = makeStore();
      await store.load();

      await store.clear();

      await expect(store.clear()).resolves.toBeUndefined();
    });

    it('should wait for a load that is still opening, then clear what it opened', async () => {
      const { state, makeStore } = createFakes();
      const store = makeStore();
      const loading = store.load();

      await store.clear();
      await loading;

      expect(state.file).toBeUndefined();
      expect(state.storedKey).toBeUndefined();
    });

    it('should still delete the key and the file when a load had failed', async () => {
      const { state, makeStore } = createFakes();
      const store = makeStore();
      state.storedKey = '1'.padStart(64, '0');
      state.file = {
        key: state.storedKey,
        database: { ...createNodeDatabase(), all: () => Promise.reject(new Error('Not now')) },
      };
      await store.load().catch(() => undefined);

      await store.clear();

      expect(state.file).toBeUndefined();
      expect(state.storedKey).toBeUndefined();
    });
  });
});
