import { migrate } from './migrations';
import type { DatabaseFactory, KeyStore, SqlDatabase } from './types';
import { UnreadableDatabaseError } from './UnreadableDatabaseError';

export type OpenedPersonalDatabase = {
  database: SqlDatabase;
  /** True when the old file could not be read and was deleted, so the store started empty. */
  recoveredFromUnreadable: boolean;
};

const keyPattern = /^[0-9a-f]{64}$/;

/** Opens with the key if the file can be read with it, and gives undefined if it cannot. */
async function openIfReadable(
  factory: DatabaseFactory,
  key: string,
): Promise<SqlDatabase | undefined> {
  try {
    return await factory.open(key);
  } catch (error) {
    if (error instanceof UnreadableDatabaseError) return undefined;
    throw error;
  }
}

// Nothing here logs. The key and the data are personal.
//
// The file is deleted only when the factory says the key does not open it. Any other failure
// (a full disk, a newer schema) is passed up and leaves the file and the key alone.
export async function openPersonalDatabase(options: {
  factory: DatabaseFactory;
  keyStore: KeyStore;
  generateKey: () => string;
}): Promise<OpenedPersonalDatabase> {
  const { factory, keyStore, generateKey } = options;
  const storedKey = await keyStore.read();
  const validStoredKey =
    storedKey !== undefined && keyPattern.test(storedKey) ? storedKey : undefined;

  if (validStoredKey !== undefined) {
    const database = await openIfReadable(factory, validStoredKey);
    if (database !== undefined) {
      await migrate(database);
      return { database, recoveredFromUnreadable: false };
    }
  }

  // Either this is the first launch, or the key is lost or wrong. A new file opens with any key.
  // A file that is already there was made with another key, so it cannot be read and is deleted.
  const key = generateKey();
  await keyStore.write(key);
  let recoveredFromUnreadable = validStoredKey !== undefined;
  let database = await openIfReadable(factory, key);
  if (database === undefined) {
    recoveredFromUnreadable = true;
    await factory.delete();
    database = await factory.open(key);
  }
  await migrate(database);
  return { database, recoveredFromUnreadable };
}
