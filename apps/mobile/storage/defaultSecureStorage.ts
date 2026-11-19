import {
  deleteItemAsync,
  getItemAsync,
  setItemAsync,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY,
} from 'expo-secure-store';

import { createSecureStorage } from './createSecureStorage';

// Every secure item is readable only while the phone is unlocked and never copied to another
// device. Nothing here logs.
export const secureStorage = createSecureStorage({
  getItem: (key) => getItemAsync(key),
  setItem: (key, value) =>
    setItemAsync(key, value, { keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  removeItem: (key) => deleteItemAsync(key),
});
