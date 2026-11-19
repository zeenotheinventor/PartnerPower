/** Thrown by a database factory when the key does not open the file that is there. */
export class UnreadableDatabaseError extends Error {
  constructor() {
    super('The database cannot be read with this key');
    this.name = 'UnreadableDatabaseError';
  }
}
