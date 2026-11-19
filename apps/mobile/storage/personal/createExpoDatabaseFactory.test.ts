import { deleteDatabaseAsync } from 'expo-sqlite';

import { expoDatabaseFactory } from './createExpoDatabaseFactory';

jest.mock('expo-sqlite', () => ({
  deleteDatabaseAsync: jest.fn(),
  openDatabaseAsync: jest.fn(),
}));

const deleteMock = jest.mocked(deleteDatabaseAsync);

describe('expoDatabaseFactory delete', () => {
  beforeEach(() => {
    deleteMock.mockReset();
    deleteMock.mockResolvedValue(undefined);
  });

  it('should delete the database file and its journal files', async () => {
    await expoDatabaseFactory.delete();

    expect(deleteMock.mock.calls.map(([name]) => name)).toEqual([
      'personal.db',
      'personal.db-journal',
      'personal.db-wal',
    ]);
  });

  it('should ignore a file that is not there and still delete the others', async () => {
    deleteMock.mockRejectedValue(new Error("Database 'x' not found"));

    await expect(expoDatabaseFactory.delete()).resolves.toBeUndefined();

    expect(deleteMock).toHaveBeenCalledTimes(3);
  });

  it('should pass up any other failure', async () => {
    deleteMock.mockRejectedValueOnce(new Error('Could not delete the file'));

    await expect(expoDatabaseFactory.delete()).rejects.toThrow('Could not delete the file');
  });
});
