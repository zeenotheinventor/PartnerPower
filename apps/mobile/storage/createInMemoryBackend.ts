import type { StorageBackend } from './types';

/** A backend that keeps everything in a map, so tests can run without the native module. */
export function createInMemoryBackend(): StorageBackend & { entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: async (key) => entries.get(key) ?? null,
    setItem: async (key, value) => {
      entries.set(key, value);
    },
    removeItem: async (key) => {
      entries.delete(key);
    },
    clear: async () => {
      entries.clear();
    },
  };
}
