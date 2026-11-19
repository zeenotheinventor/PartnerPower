import { createDatabaseKey, isUnreadableDatabaseMessage } from './databaseKey';

describe('createDatabaseKey', () => {
  it('should make 64 lowercase hex characters from 32 random bytes', () => {
    const bytes = Uint8Array.from({ length: 32 }, (_, index) => index * 8);
    let requested = 0;

    const key = createDatabaseKey((count) => {
      requested = count;
      return bytes;
    });

    expect(requested).toBe(32);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key.startsWith('0008101820283038')).toBe(true);
  });

  it('should pad small byte values to two characters', () => {
    expect(createDatabaseKey(() => new Uint8Array(32))).toBe('0'.repeat(64));
  });
});

describe('isUnreadableDatabaseMessage', () => {
  it.each([
    'file is not a database',
    'Error code 26: file is not a database',
    'SQLITE_NOTADB',
    'file is encrypted or is not a database',
  ])('should recognise "%s" as a key that does not open the file', (message) => {
    expect(isUnreadableDatabaseMessage(message)).toBe(true);
  });

  it.each(['database or disk is full', 'database is locked', 'no such table: favourite'])(
    'should not treat "%s" as a wrong key',
    (message) => {
      expect(isUnreadableDatabaseMessage(message)).toBe(false);
    },
  );
});
