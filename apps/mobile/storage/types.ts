import type { ZodType } from 'zod';

/**
 * Every key the app may store. To add one (custom cards, favourites, answers),
 * add its name here and a schema for its value in `core`. Never rename an
 * existing key, because the string is what is written to the device.
 */
export type StorageKey =
  | 'entryConfirmation'
  | 'playerNames'
  | 'soundOn'
  | 'hapticsOn'
  | 'questionPreferences'
  | 'lastShownUpdateId'
  | 'reminder'
  | 'installMarker';

export type StorageBackend = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
};

export type Storage = {
  get<T>(key: StorageKey, schema: ZodType<T>): Promise<T | undefined>;
  set<T>(key: StorageKey, value: T): Promise<void>;
  remove(key: StorageKey): Promise<void>;
  clearAll(): Promise<void>;
};

/**
 * Every item the app may keep in secure storage, which is the phone's Keychain or Keystore. The
 * list is the source of the type, so `clearAll` always reaches every item. Never rename an
 * existing one, because the string is the name of the item on the device.
 */
export const secureKeys = [
  'personalDatabaseKey',
  'lockPinHash',
  'lockAttempts',
  'lockBiometricsChoice',
] as const;

export type SecureKey = (typeof secureKeys)[number];

/** Reads and writes text under a name. The native module is behind this. */
export type SecureBackend = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type SecureStorage = {
  get<T>(key: SecureKey, schema: ZodType<T>): Promise<T | undefined>;
  set<T>(key: SecureKey, value: T): Promise<void>;
  remove(key: SecureKey): Promise<void>;
  /** Removes every secure item. It tries all of them, then reports the first failure. */
  clearAll(): Promise<void>;
};
