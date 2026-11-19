import type { Storage, StorageBackend } from './types';

// Nothing in this module logs. Stored values are personal, and parse or
// validation errors can echo them.
export function createStorage(
  backend: StorageBackend,
  clearPersonalStore: () => Promise<void> = () => Promise.resolve(),
): Storage {
  return {
    async get(key, schema) {
      const text = await backend.getItem(key);
      if (text === null) {
        return undefined;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return undefined;
      }
      const result = schema.safeParse(parsed);
      return result.success ? result.data : undefined;
    },
    set: (key, value) => backend.setItem(key, JSON.stringify(value)),
    remove: (key) => backend.removeItem(key),
    // Both are tried even if the first fails, so a failure leaves as little behind as it can. The
    // first error is reported, so the caller knows to try again.
    async clearAll() {
      const results = await Promise.allSettled([clearPersonalStore(), backend.clear()]);
      const failure = results.find((result) => result.status === 'rejected');
      if (failure) throw failure.reason;
    },
  };
}
