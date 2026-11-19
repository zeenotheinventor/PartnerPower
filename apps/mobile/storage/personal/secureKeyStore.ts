import {
  deleteItemAsync,
  getItemAsync,
  setItemAsync,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY,
} from 'expo-secure-store';

import type { KeyStore } from './types';

// The closed list of secure items this module owns. FRK-53 adds the lock items beside it.
const databaseKeyItem = 'personalDatabaseKey';

// Readable only while the phone is unlocked and never copied to another device. Nothing here logs.
export const secureKeyStore: KeyStore = {
  read: async () => (await getItemAsync(databaseKeyItem)) ?? undefined,
  write: (key) =>
    setItemAsync(databaseKeyItem, key, { keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  delete: () => deleteItemAsync(databaseKeyItem),
};
