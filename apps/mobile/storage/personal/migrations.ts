import type { SqlDatabase } from './types';

/**
 * The steps that build `personal.db`, in order. Step N takes the database from version N to
 * version N + 1. They only go forward, and a step that has shipped is never edited: a change is a
 * new step at the end. The id lists in step 1 are the core category and card kind ids, written out
 * because a shipped step must not change when core does. A test checks they agree.
 */
export const personalMigrations: readonly string[] = [
  `
  CREATE TABLE player_card (
    id TEXT PRIMARY KEY NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('c1', 'c2', 'c3', 'c4')),
    kind TEXT NOT NULL CHECK (kind IN ('solo', 'together')),
    text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 140),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE favourite (
    card_id TEXT PRIMARY KEY NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE deck (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 30),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE deck_card (
    deck_id TEXT NOT NULL REFERENCES deck (id) ON DELETE CASCADE,
    card_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (deck_id, card_id)
  );
  `,
];

// Nothing here logs. A failed step reports SQLite's own message, which holds no stored text because
// a step only creates structure.
export async function migrate(
  database: SqlDatabase,
  migrations: readonly string[] = personalMigrations,
): Promise<void> {
  const [row] = await database.all<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion > migrations.length) {
    throw new Error('The database was made by a newer version of the app');
  }
  for (const [version, sql] of migrations.entries()) {
    if (version < currentVersion) continue;
    await database.transaction(async (transaction) => {
      await transaction.exec(sql);
      await transaction.exec(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
