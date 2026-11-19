import { createInMemoryBackend } from '../createInMemoryBackend';
import { createSecureStorage } from '../createSecureStorage';
import { createSecureKeyStore } from './secureKeyStore';

const databaseKey = '0123456789abcdef'.repeat(4);

describe('the database key store', () => {
  it('should read back the key it wrote', async () => {
    const keyStore = createSecureKeyStore(createSecureStorage(createInMemoryBackend()));

    await keyStore.write(databaseKey);

    expect(await keyStore.read()).toBe(databaseKey);
  });

  it('should find no key on a fresh install', async () => {
    const keyStore = createSecureKeyStore(createSecureStorage(createInMemoryBackend()));

    expect(await keyStore.read()).toBeUndefined();
  });

  it('should keep the key in the item it always used', async () => {
    const backend = createInMemoryBackend();

    await createSecureKeyStore(createSecureStorage(backend)).write(databaseKey);

    expect([...backend.entries.keys()]).toEqual(['personalDatabaseKey']);
  });

  it('should forget the key after it is deleted, and be safe to delete twice', async () => {
    const keyStore = createSecureKeyStore(createSecureStorage(createInMemoryBackend()));
    await keyStore.write(databaseKey);

    await keyStore.delete();
    await keyStore.delete();

    expect(await keyStore.read()).toBeUndefined();
  });

  it('should still read a key that FRK-41 wrote as bare text, so an upgrade keeps its database', async () => {
    const backend = createInMemoryBackend();
    backend.entries.set('personalDatabaseKey', databaseKey);

    expect(await createSecureKeyStore(createSecureStorage(backend)).read()).toBe(databaseKey);
  });

  it('should read a bare key made only of digits, which is also valid JSON for a number', async () => {
    const backend = createInMemoryBackend();
    const digitsOnlyKey = '1234567890'.repeat(7).slice(0, 64);
    backend.entries.set('personalDatabaseKey', digitsOnlyKey);

    expect(await createSecureKeyStore(createSecureStorage(backend)).read()).toBe(digitsOnlyKey);
  });

  it('should write the key as JSON after reading a bare one, and read that back', async () => {
    const backend = createInMemoryBackend();
    const keyStore = createSecureKeyStore(createSecureStorage(backend));
    backend.entries.set('personalDatabaseKey', databaseKey);

    await keyStore.write(databaseKey);

    expect(backend.entries.get('personalDatabaseKey')).toBe(JSON.stringify(databaseKey));
    expect(await keyStore.read()).toBe(databaseKey);
  });

  it.each([
    ['too short', JSON.stringify('abc123')],
    ['not hex', JSON.stringify('z'.repeat(64))],
    ['not text', JSON.stringify(12345)],
    ['not JSON', 'abc'],
  ])('should treat a stored key that is %s as absent', async (_description, stored) => {
    const backend = createInMemoryBackend();
    backend.entries.set('personalDatabaseKey', stored);

    expect(await createSecureKeyStore(createSecureStorage(backend)).read()).toBeUndefined();
  });

  it('should be cleared with the other secure items', async () => {
    const backend = createInMemoryBackend();
    const secureStorage = createSecureStorage(backend);
    await createSecureKeyStore(secureStorage).write(databaseKey);

    await secureStorage.clearAll();

    expect(await createSecureKeyStore(secureStorage).read()).toBeUndefined();
  });
});
