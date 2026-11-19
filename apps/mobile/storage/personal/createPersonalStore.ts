import { createPersonalRepository } from './createPersonalRepository';
import { openPersonalDatabase, type OpenedPersonalDatabase } from './openPersonalDatabase';
import type {
  DatabaseFactory,
  KeyStore,
  PersonalRepository,
  PersonalRepositoryOptions,
} from './types';

export type PersonalStore = {
  /** Opens the database on the first call and gives the same repository after that. */
  load(): Promise<PersonalRepository>;
  /** Closes the database, deletes `personal.db` and its key. It is safe to run twice. */
  clear(): Promise<void>;
};

// Nothing here logs. The key and the data are personal.
export function createPersonalStore(
  options: Pick<PersonalRepositoryOptions, 'getShippedCards' | 'randomUUID' | 'now'> & {
    factory: DatabaseFactory;
    keyStore: KeyStore;
    generateKey: () => string;
  },
): PersonalStore {
  const { factory, keyStore, generateKey, ...repositoryOptions } = options;
  let loading:
    Promise<{ opened: OpenedPersonalDatabase; repository: PersonalRepository }> | undefined;

  function load() {
    loading ??= openPersonalDatabase({ factory, keyStore, generateKey }).then((opened) => ({
      opened,
      repository: createPersonalRepository({
        ...repositoryOptions,
        database: opened.database,
        recoveredFromUnreadable: opened.recoveredFromUnreadable,
      }),
    }));
    // A load that failed is tried again the next time, not remembered as failed.
    const attempt = loading;
    attempt.catch(() => {
      if (loading === attempt) loading = undefined;
    });
    return attempt.then(({ repository }) => repository);
  }

  return {
    load,
    async clear() {
      const pending = loading;
      loading = undefined;
      const current = await pending?.catch(() => undefined);
      await current?.opened.database.close();
      await factory.delete();
      await keyStore.delete();
    },
  };
}
