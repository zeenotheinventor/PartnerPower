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
  | 'lastShownUpdateId';

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
