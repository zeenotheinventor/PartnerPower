import backend from 'expo-sqlite/kv-store';

import { createStorage } from './createStorage';

// The app's key-value store holds only what this module writes, so clearing it
// clears everything the app has stored.
export const storage = createStorage(backend);
