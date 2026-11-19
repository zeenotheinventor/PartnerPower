const keyByteCount = 32;

/** A random 256-bit key as 64 lowercase hex characters. The bytes come from the caller. */
export function createDatabaseKey(getRandomBytes: (byteCount: number) => Uint8Array): string {
  return Array.from(getRandomBytes(keyByteCount), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * SQLite reports a file it cannot read with the key as "file is not a database" (code 26).
 * Anything else, such as a full disk or a lock, says nothing about the key.
 */
export function isUnreadableDatabaseMessage(message: string): boolean {
  return /not a database|NOTADB|code 26/i.test(message);
}
