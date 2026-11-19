import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { SqlDatabase } from '../types';

/**
 * A database for tests, on the `node:sqlite` that ships with Node. It is not encrypted, so it
 * proves the schema, the migrations and the repository, and nothing about the key.
 */
export function createNodeDatabase(path = ':memory:'): SqlDatabase {
  const database = new DatabaseSync(path);
  const executor = {
    exec: async (sql: string) => {
      database.exec(sql);
    },
    run: async (sql: string, params: readonly SQLInputValue[] = []) => {
      database.prepare(sql).run(...params);
    },
    all: async <Row>(sql: string, params: readonly SQLInputValue[] = []) =>
      // node:sqlite types a row loosely. The caller names the shape it selected.
      database.prepare(sql).all(...params) as Row[],
  };
  return {
    ...executor,
    transaction: async (work) => {
      database.exec('BEGIN');
      try {
        await work(executor);
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
    close: async () => {
      database.close();
    },
  };
}
