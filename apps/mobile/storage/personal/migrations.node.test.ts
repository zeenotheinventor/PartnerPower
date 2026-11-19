import { categoryIds, cardKinds, playableFormats, topicIds } from '@getfreak/core';

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

    expect(await tableNames(database)).toEqual([
      'deck',
      'deck_card',
      'discovery',
      'favourite',
      'player_card',
      'player_question',
    ]);
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

describe('question and discovery tables', () => {
  let database: SqlDatabase;

  beforeEach(async () => {
    database = createNodeDatabase();
    await migrate(database);
  });

  const insertQuestion = (
    overrides: Partial<{
      id: string;
      format: string;
      category: string;
      topic: string;
      text: string | null;
      options: string | null;
    }> = {},
  ) => {
    const row = {
      id: 'pq-1',
      format: 'ifYou',
      category: 'c1',
      topic: 't1',
      text: 'Question 1',
      options: null,
      ...overrides,
    };
    return database.run(
      'INSERT INTO player_question (id, format, category, topic, text, options, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [row.id, row.format, row.category, row.topic, row.text, row.options, 1, 1],
    );
  };

  const insertDiscovery = (row: {
    kind: string;
    questionId?: string;
    player?: string;
    optionId?: string | null;
    strength?: string | null;
  }) =>
    database.run(
      'INSERT INTO discovery (kind, question_id, player, option_id, strength, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        row.kind,
        row.questionId ?? 'q-1',
        row.player ?? '',
        row.optionId ?? null,
        row.strength ?? null,
        1,
      ],
    );

  it.each(playableFormats)('should accept the core format %s', async (format) => {
    const options = format === 'ifYou' || format === 'neverHave' ? null : '[]';
    await expect(insertQuestion({ format, options })).resolves.toBeUndefined();
  });

  it('should reject a format that is not a round format', async () => {
    await expect(insertQuestion({ format: 'secretMatch' })).rejects.toThrow();
  });

  it.each(categoryIds)('should accept the core category %s', async (category) => {
    await expect(insertQuestion({ category })).resolves.toBeUndefined();
  });

  it('should reject a category that is not a core id', async () => {
    await expect(insertQuestion({ category: 'c5' })).rejects.toThrow();
  });

  it.each(topicIds)('should accept the core topic %s', async (topic) => {
    await expect(insertQuestion({ topic })).resolves.toBeUndefined();
  });

  it('should reject a topic that is not a core id', async () => {
    await expect(insertQuestion({ topic: 't7' })).rejects.toThrow();
  });

  it('should accept question text of 1 and of 140 characters and reject 0 and 141', async () => {
    await expect(insertQuestion({ id: 'pq-1', text: 'a' })).resolves.toBeUndefined();
    await expect(insertQuestion({ id: 'pq-2', text: 'a'.repeat(140) })).resolves.toBeUndefined();
    await expect(insertQuestion({ id: 'pq-3', text: '' })).rejects.toThrow();
    await expect(insertQuestion({ id: 'pq-4', text: 'a'.repeat(141) })).rejects.toThrow();
  });

  it('should require text except for either-or questions', async () => {
    await expect(insertQuestion({ text: null })).rejects.toThrow();
    await expect(
      insertQuestion({ format: 'eitherOr', text: null, options: '[]' }),
    ).resolves.toBeUndefined();
  });

  it('should hold options for the option formats only', async () => {
    await expect(insertQuestion({ format: 'ifYou', options: '[]' })).rejects.toThrow();
    await expect(insertQuestion({ format: 'guess', options: null })).rejects.toThrow();
  });

  it('should reject the same question id twice', async () => {
    await insertQuestion();

    await expect(insertQuestion()).rejects.toThrow();
  });

  it('should accept one discovery of each kind', async () => {
    await expect(insertDiscovery({ kind: 'match', strength: 'yes' })).resolves.toBeUndefined();
    await expect(insertDiscovery({ kind: 'agree', optionId: 'o1' })).resolves.toBeUndefined();
    await expect(
      insertDiscovery({ kind: 'answer', player: 'Name 1', optionId: 'o1' }),
    ).resolves.toBeUndefined();
  });

  it('should reject a kind that is not a discovery kind', async () => {
    await expect(insertDiscovery({ kind: 'guess', optionId: 'o1' })).rejects.toThrow();
  });

  it('should reject a match without a strength or with an option', async () => {
    await expect(insertDiscovery({ kind: 'match' })).rejects.toThrow();
    await expect(insertDiscovery({ kind: 'match', strength: 'sure' })).rejects.toThrow();
    await expect(
      insertDiscovery({ kind: 'match', strength: 'yes', optionId: 'o1' }),
    ).rejects.toThrow();
  });

  it('should reject an agree or answer without an option, or with a strength', async () => {
    await expect(insertDiscovery({ kind: 'agree' })).rejects.toThrow();
    await expect(
      insertDiscovery({ kind: 'agree', optionId: 'o1', strength: 'yes' }),
    ).rejects.toThrow();
    await expect(insertDiscovery({ kind: 'answer', player: 'Name 1' })).rejects.toThrow();
  });

  it('should require a player for an answer and none for a match or agree', async () => {
    await expect(insertDiscovery({ kind: 'answer', optionId: 'o1' })).rejects.toThrow();
    await expect(
      insertDiscovery({ kind: 'agree', player: 'Name 1', optionId: 'o1' }),
    ).rejects.toThrow();
    await expect(
      insertDiscovery({ kind: 'match', player: 'Name 1', strength: 'yes' }),
    ).rejects.toThrow();
  });

  it('should reject a second discovery with the same kind, question and player', async () => {
    await insertDiscovery({ kind: 'agree', optionId: 'o1' });

    await expect(insertDiscovery({ kind: 'agree', optionId: 'o2' })).rejects.toThrow();
  });

  it('should keep a discovery of each partner for one question', async () => {
    await insertDiscovery({ kind: 'answer', player: 'Name 1', optionId: 'o1' });

    await expect(
      insertDiscovery({ kind: 'answer', player: 'Name 2', optionId: 'o2' }),
    ).resolves.toBeUndefined();
  });
});
