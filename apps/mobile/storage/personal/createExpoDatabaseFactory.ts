import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { isUnreadableDatabaseMessage } from './databaseKey';
import { createSqlDatabase } from './createSqlDatabase';
import type { DatabaseFactory } from './types';
import { UnreadableDatabaseError } from './UnreadableDatabaseError';

export const personalDatabaseName = 'personal.db';
export const personalDatabaseFileNames = [
  personalDatabaseName,
  `${personalDatabaseName}-journal`,
  `${personalDatabaseName}-wal`,
];

const hexKeyPattern = /^[0-9a-f]{64}$/;

// This file needs the native SQLCipher build, so no test runs it. Its parts are tested apart: the
// wrapper in `createSqlDatabase`, the key in `databaseKey`, and the recovery in
// `openPersonalDatabase`.
//
// Nothing here logs, and an error from SQLite is not passed up when it could hold the key.
async function openWithKey(key: string): Promise<SQLiteDatabase> {
  if (!hexKeyPattern.test(key)) throw new Error('The database key is not 64 hex characters');
  const connection = await openDatabaseAsync(personalDatabaseName);
  try {
    // The raw key form, so SQLCipher uses these bytes as they are and runs no password derivation.
    await connection.execAsync(`PRAGMA key = "x'${key}'"`);
    await connection.execAsync('PRAGMA foreign_keys = ON');
    // The key is checked on the first read, so read something to learn that it is wrong now.
    await connection.getAllAsync('SELECT count(*) FROM sqlite_master');
    return connection;
  } catch (error) {
    await connection.closeAsync().catch(() => undefined);
    if (error instanceof Error && isUnreadableDatabaseMessage(error.message)) {
      throw new UnreadableDatabaseError();
    }
    // The original error is dropped on purpose, because it can echo the statement that holds the key.
    // eslint-disable-next-line preserve-caught-error
    throw new Error('The database could not be opened');
  }
}

export const expoDatabaseFactory: DatabaseFactory = {
  async open(key) {
    const connection = await openWithKey(key);
    return createSqlDatabase({
      execAsync: (sql) => connection.execAsync(sql),
      runAsync: (sql, params) => connection.runAsync(sql, [...params]),
      getAllAsync: (sql, params) => connection.getAllAsync(sql, [...params]),
      closeAsync: () => connection.closeAsync(),
    });
  },
  async delete() {
    // The journal files can hold pieces of the data after a crash, so they go too.
    for (const fileName of personalDatabaseFileNames) {
      try {
        await deleteDatabaseAsync(fileName);
      } catch (error) {
        // A file that is not there is what the caller wanted. Any other failure is passed up.
        if (!(error instanceof Error && /not found/i.test(error.message))) throw error;
      }
    }
  },
};
