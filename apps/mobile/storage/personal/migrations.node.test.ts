import { categoryIds, cardKinds } from '@getfreak/core';

import { migrate, personalMigrations } from './migrations';
import { createNodeDatabase } from './testing/nodeSqlite';
import type { SqlDatabase } from './types';

async function readVersion(database: SqlDatabase): Promise<number> {
  const [row] = await database.all<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? -1;
}

async function readSchema(database: SqlDatabase): Promise<string[]> {
  const rows = await database.all<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return rows.map((row) => row.sql);
}

async function tableNames(database: SqlDatabase): Promise<string[]> {
  const rows = await database.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  );
  return rows.map((row) => row.name);
}

describe('personal database migrations', () => {
  it('should build the schema from an empty database', async () => {
    const database = createNodeDatabase();

    await migrate(database);

    expect(await tableNames(database)).toEqual(['deck', 'deck_card', 'favourite', 'player_card']);
    expect(await readVersion(database)).toBe(personalMigrations.length);
  });

  it('should do nothing when run again on a current database', async () => {
    const database = createNodeDatabase();
    await migrate(database);
    await database.run('INSERT INTO favourite (card_id, created_at) VALUES (?, ?)', ['Card 1', 1]);
    const schemaBefore = await readSchema(database);

    await migrate(database);

    expect(await readSchema(database)).toEqual(schemaBefore);
    expect(await database.all('SELECT card_id FROM favourite')).toEqual([{ card_id: 'Card 1' }]);
    expect(await readVersion(database)).toBe(personalMigrations.length);
  });

  describe.each(personalMigrations.map((_, version) => version))(
    'from an earlier version %i',
    (version) => {
      it('should reach the same schema as a new database, keeping rows', async () => {
        const fresh = createNodeDatabase();
        await migrate(fresh);
        const upgraded = createNodeDatabase();
        await migrate(upgraded, personalMigrations.slice(0, version));
        const kept = version === 0 ? [] : await upgraded.all('SELECT * FROM favourite');
        if (version > 0) {
          await upgraded.run('INSERT INTO favourite (card_id, created_at) VALUES (?, ?)', [
            'Card 1',
            1,
          ]);
        }

        await migrate(upgraded);

        expect(await readSchema(upgraded)).toEqual(await readSchema(fresh));
        expect(await readVersion(upgraded)).toBe(personalMigrations.length);
        if (version > 0) {
          expect(await upgraded.all('SELECT card_id FROM favourite')).toEqual([
            ...kept,
            { card_id: 'Card 1' },
          ]);
        }
      });
    },
  );

  it('should leave the earlier version intact when a step fails', async () => {
    const database = createNodeDatabase();
    const steps = [
      ...personalMigrations,
      'CREATE TABLE half_done (id TEXT); INSERT INTO missing_table VALUES (1);',
    ];

    await expect(migrate(database, steps)).rejects.toThrow();

    expect(await readVersion(database)).toBe(personalMigrations.length);
    expect(await tableNames(database)).not.toContain('half_done');
  });

  it('should refuse a database made by a newer version of the app', async () => {
    const database = createNodeDatabase();
    await database.exec(`PRAGMA user_version = ${personalMigrations.length + 1}`);

    await expect(migrate(database)).rejects.toThrow('newer');
  });
});

describe('personal database schema', () => {
  let database: SqlDatabase;

  beforeEach(async () => {
    database = createNodeDatabase();
    await migrate(database);
  });

  const insertCard = (category: string, kind: string, text: string) =>
    database.run(
      'INSERT INTO player_card (id, category, kind, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [`p-${category}-${kind}-${text.length}`, category, kind, text, 1, 1],
    );

  it.each(categoryIds)('should accept the core category %s', async (category) => {
    await expect(insertCard(category, 'solo', 'Card 1')).resolves.toBeUndefined();
  });

  it.each(cardKinds)('should accept the core kind %s', async (kind) => {
    await expect(insertCard('c1', kind, 'Card 1')).resolves.toBeUndefined();
  });

  it('should reject a category that is not a core id', async () => {
    await expect(insertCard('c5', 'solo', 'Card 1')).rejects.toThrow();
  });

  it('should reject a kind that is not a core kind', async () => {
    await expect(insertCard('c1', 'group', 'Card 1')).rejects.toThrow();
  });

  it('should accept card text of 1 and of 140 characters and reject 0 and 141', async () => {
    await expect(insertCard('c1', 'solo', 'a')).resolves.toBeUndefined();
    await expect(insertCard('c1', 'solo', 'a'.repeat(140))).resolves.toBeUndefined();
    await expect(insertCard('c1', 'solo', '')).rejects.toThrow();
    await expect(insertCard('c1', 'solo', 'a'.repeat(141))).rejects.toThrow();
  });

  it('should accept a deck name of 1 and of 30 characters and reject 0 and 31', async () => {
    const insertDeck = (id: string, name: string) =>
      database.run('INSERT INTO deck (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [
        id,
        name,
        1,
        1,
      ]);

    await expect(insertDeck('d-1', 'a')).resolves.toBeUndefined();
    await expect(insertDeck('d-2', 'a'.repeat(30))).resolves.toBeUndefined();
    await expect(insertDeck('d-3', '')).rejects.toThrow();
    await expect(insertDeck('d-4', 'a'.repeat(31))).rejects.toThrow();
  });

  it('should delete the cards of a deck with the deck', async () => {
    await database.run('INSERT INTO deck (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [
      'd-1',
      'Deck 1',
      1,
      1,
    ]);
    await database.run('INSERT INTO deck_card (deck_id, card_id, position) VALUES (?, ?, ?)', [
      'd-1',
      'Card 1',
      0,
    ]);

    await database.run('DELETE FROM deck WHERE id = ?', ['d-1']);

    expect(await database.all('SELECT * FROM deck_card')).toEqual([]);
  });

  it('should reject a deck card for a deck that does not exist', async () => {
    await expect(
      database.run('INSERT INTO deck_card (deck_id, card_id, position) VALUES (?, ?, ?)', [
        'd-missing',
        'Card 1',
        0,
      ]),
    ).rejects.toThrow();
  });

  it('should reject the same card twice in one deck', async () => {
    await database.run('INSERT INTO deck (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [
      'd-1',
      'Deck 1',
      1,
      1,
    ]);
    const insert = () =>
      database.run('INSERT INTO deck_card (deck_id, card_id, position) VALUES (?, ?, ?)', [
        'd-1',
        'Card 1',
        0,
      ]);
    await insert();

    await expect(insert()).rejects.toThrow();
  });
});
