import { z } from 'zod';

import type { SecureStorage } from '../types';
import type { KeyStore } from './types';

const databaseKeySchema = z.string().regex(/^[0-9a-f]{64}$/);

/**
 * The database key kept in secure storage. A stored value that is not 64 hex characters counts as
 * absent. Nothing here logs.
 */
export function createSecureKeyStore(secureStorage: SecureStorage): KeyStore {
  return {
    read: () => secureStorage.get('personalDatabaseKey', databaseKeySchema),
    write: (key) => secureStorage.set('personalDatabaseKey', key),
    delete: () => secureStorage.remove('personalDatabaseKey'),
  };
}
