import { createSqlDatabase, type NativeConnection } from './createSqlDatabase';

function createRecordingConnection() {
  const calls: string[] = [];
  const gates: (() => void)[] = [];
  const connection: NativeConnection = {
    execAsync: async (sql) => {
      calls.push(sql);
      if (sql === 'FAIL') throw new Error('The statement failed');
    },
    runAsync: async (sql) => {
      calls.push(sql);
      await new Promise<void>((resolve) => gates.push(() => resolve()));
    },
    getAllAsync: async <Row>(sql: string) => {
      calls.push(sql);
      return [] as Row[];
    },
    closeAsync: async () => {
      calls.push('close');
    },
  };
  return { connection, calls, gates };
}

describe('createSqlDatabase', () => {
  it('should commit a transaction whose work finishes', async () => {
    const { connection, calls } = createRecordingConnection();
    const database = createSqlDatabase(connection);

    await database.transaction(async (transaction) => {
      await transaction.exec('STEP 1');
    });

    expect(calls).toEqual(['BEGIN IMMEDIATE', 'STEP 1', 'COMMIT']);
  });

  it('should roll back and pass on the error when the work fails', async () => {
    const { connection, calls } = createRecordingConnection();
    const database = createSqlDatabase(connection);

    await expect(
      database.transaction(async (transaction) => {
        await transaction.exec('STEP 1');
        await transaction.exec('FAIL');
      }),
    ).rejects.toThrow('The statement failed');

    expect(calls).toEqual(['BEGIN IMMEDIATE', 'STEP 1', 'FAIL', 'ROLLBACK']);
  });

  it('should keep a statement from outside out of a transaction that is still running', async () => {
    const { connection, calls, gates } = createRecordingConnection();
    const database = createSqlDatabase(connection);

    const transaction = database.transaction(async (inside) => {
      await inside.run('INSIDE');
    });
    const outside = database.exec('OUTSIDE');
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 0));
    expect(calls).toEqual(['BEGIN IMMEDIATE', 'INSIDE']);

    gates[0]?.();
    await transaction;
    await outside;

    expect(calls).toEqual(['BEGIN IMMEDIATE', 'INSIDE', 'COMMIT', 'OUTSIDE']);
  });

  it('should still run the next statement after one fails', async () => {
    const { connection, calls } = createRecordingConnection();
    const database = createSqlDatabase(connection);

    await expect(database.exec('FAIL')).rejects.toThrow();
    await database.exec('NEXT');

    expect(calls).toEqual(['FAIL', 'NEXT']);
  });

  it('should close the connection', async () => {
    const { connection, calls } = createRecordingConnection();

    await createSqlDatabase(connection).close();

    expect(calls).toEqual(['close']);
  });
});
