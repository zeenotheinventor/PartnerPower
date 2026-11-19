import backend from 'expo-sqlite/kv-store';

import { createStorage } from './createStorage';
import { personalStore } from './personal/nativePersonalStore';

// Clearing the key-value store and the personal store clears everything the app has stored.
export const storage = createStorage(backend, personalStore.clear);
