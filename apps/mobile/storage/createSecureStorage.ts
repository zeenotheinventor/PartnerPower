import { secureKeys, type SecureBackend, type SecureStorage } from './types';

// Nothing in this module logs. Secure items are the PIN hash, the database key and the wrong PIN
// count, and parse or validation errors can echo them.
export function createSecureStorage(backend: SecureBackend): SecureStorage {
  return {
    async get(key, schema) {
      const text = await backend.getItem(key);
      if (text === null) {
        return undefined;
      }
      try {
        const result = schema.safeParse(JSON.parse(text));
        if (result.success) return result.data;
      } catch {
        // Not JSON. It may still be plain text, below.
      }
      // FRK-41 wrote the database key as bare text, not as JSON, and a phone that upgrades keeps
      // it. So a value that is not valid JSON for the schema is tried once as plain text. An item
      // with an object or boolean schema never matches text, so only a text item can be read so.
      const asText = schema.safeParse(text);
      return asText.success ? asText.data : undefined;
    },
    set: (key, value) => backend.setItem(key, JSON.stringify(value)),
    remove: (key) => backend.removeItem(key),
    // Every item is tried even if one fails, so a failure leaves as little behind as it can. The
    // first error is reported, so the caller knows to try again. Removing a missing item is fine.
    async clearAll() {
      const results = await Promise.allSettled(secureKeys.map((key) => backend.removeItem(key)));
      const failure = results.find((result) => result.status === 'rejected');
      if (failure) throw failure.reason;
    },
  };
}
