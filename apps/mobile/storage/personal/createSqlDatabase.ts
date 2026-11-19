import type { SqlDatabase, SqlExecutor } from './types';

type Params = readonly (string | number | null)[];

/** What this module needs from one open connection. `expo-sqlite` gives it. */
export type NativeConnection = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: Params): Promise<unknown>;
  getAllAsync<Row>(sql: string, params: Params): Promise<Row[]>;
  closeAsync(): Promise<void>;
};

/**
 * Wraps one connection as a `SqlDatabase`. The connection is the one that was given the key, and
 * `expo-sqlite`'s own `withExclusiveTransactionAsync` opens another connection without the key, so
 * a transaction is run here with BEGIN and COMMIT instead. A queue keeps a statement from
 * elsewhere from running inside a transaction that is still open.
 */
export function createSqlDatabase(connection: NativeConnection): SqlDatabase {
  let tail: Promise<unknown> = Promise.resolve();

  function inQueue<Result>(task: () => Promise<Result>): Promise<Result> {
    const result = tail.then(task);
    tail = result.catch(() => undefined);
    return result;
  }

  const executor: SqlExecutor = {
    exec: (sql) => connection.execAsync(sql),
    run: async (sql, params = []) => {
      await connection.runAsync(sql, params);
    },
    all: (sql, params = []) => connection.getAllAsync(sql, params),
  };

  return {
    exec: (sql) => inQueue(() => executor.exec(sql)),
    run: (sql, params) => inQueue(() => executor.run(sql, params)),
    all: (sql, params) => inQueue(() => executor.all(sql, params)),
    // `work` must use the executor it is given, never `database.exec` and the like, or it waits
    // on the queue it is holding and never finishes.
    transaction: (work) =>
      inQueue(async () => {
        await connection.execAsync('BEGIN IMMEDIATE');
        try {
          await work(executor);
          await connection.execAsync('COMMIT');
        } catch (error) {
          // A failed ROLLBACK must not hide the error that caused it.
          await connection.execAsync('ROLLBACK').catch(() => undefined);
          throw error;
        }
      }),
    close: () => inQueue(() => connection.closeAsync()),
  };
}
