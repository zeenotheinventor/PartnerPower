import { createPersonalRepository } from './createPersonalRepository';
import { migrate } from './migrations';
import { createNodeDatabase } from './testing/nodeSqlite';
import {
  describePersonalRepository,
  makeShippedCardsForTests,
  makeShippedQuestionsForTests,
} from './testing/describePersonalRepository';
import type {
  PersonalRepository,
  PersonalRepositoryOptions,
  ShippedCard,
  ShippedQuestion,
  SqlDatabase,
} from './types';

type TestOptions = Omit<PersonalRepositoryOptions, 'recoveredFromUnreadable'> & {
  shippedCards: ShippedCard[];
  shippedQuestions: ShippedQuestion[];
};

function makeOptions(): TestOptions {
  let nextUuid = 0;
  const shippedCards = makeShippedCardsForTests();
  const shippedQuestions = makeShippedQuestionsForTests();
  return {
    shippedCards,
    shippedQuestions,
    getShippedCards: () => shippedCards,
    getShippedQuestions: () => shippedQuestions,
    randomUUID: () => `00000000-0000-4000-8000-${String((nextUuid += 1)).padStart(12, '0')}`,
    now: () => 1,
  };
}

async function makeDatabase(): Promise<SqlDatabase> {
  const database = createNodeDatabase();
  await migrate(database);
  return database;
}

async function savedCardId(repository: PersonalRepository): Promise<string> {
  const saved = await repository.savePlayerCard({ category: 'c1', kind: 'solo', text: 'Card 1' });
  if (!saved.ok) throw new Error('The card was not saved');
  return saved.saved.id;
}

async function savedDeckId(repository: PersonalRepository): Promise<string> {
  const saved = await repository.saveDeck({ name: 'Deck 1', cardIds: ['starter-c1-01'] });
  if (!saved.ok) throw new Error('The deck was not saved');
  return saved.saved.id;
}

describePersonalRepository('SQLite', async (extra) => {
  const options = makeOptions();
  const repository = createPersonalRepository({
    database: await makeDatabase(),
    ...options,
    ...extra,
  });
  return {
    repository,
    shippedCards: options.shippedCards,
    shippedQuestions: options.shippedQuestions,
  };
});

describe('SQLite personal repository storage', () => {
  it('should skip a stored card whose row fails the core schema, and not throw', async () => {
    const database = await makeDatabase();
    const repository = createPersonalRepository({ database, ...makeOptions() });
    const savedId = await savedCardId(repository);
    await database.run(
      'INSERT INTO player_card (id, category, kind, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['not-a-player-id', 'c1', 'solo', 'Card 2', 1, 1],
    );

    const cards = await repository.listPlayerCards();

    expect(cards.map((card) => card.id)).toEqual([savedId]);
  });

  it('should keep a favourite and a deck entry for a missing card in storage', async () => {
    const database = await makeDatabase();
    const repository = createPersonalRepository({ database, ...makeOptions() });
    await repository.setFavourite('starter-c1-99', true);
    const deck = await repository.saveDeck({ name: 'Deck 1', cardIds: ['starter-c1-99'] });

    expect(await repository.listFavourites()).toEqual([]);
    expect(await database.all('SELECT card_id FROM favourite')).toEqual([
      { card_id: 'starter-c1-99' },
    ]);
    expect(await database.all('SELECT card_id FROM deck_card')).toEqual([
      { card_id: 'starter-c1-99' },
    ]);
    expect(deck.ok).toBe(true);
  });

  it('should remove the rows of a deleted card from every table, not only hide them', async () => {
    const database = await makeDatabase();
    const repository = createPersonalRepository({ database, ...makeOptions() });
    const cardId = await savedCardId(repository);
    await repository.setFavourite(cardId, true);
    await repository.saveDeck({ name: 'Deck 1', cardIds: [cardId, 'starter-c1-01'] });

    await repository.deletePlayerCard(cardId);

    expect(await database.all('SELECT * FROM player_card')).toEqual([]);
    expect(await database.all('SELECT * FROM favourite')).toEqual([]);
    expect(await database.all('SELECT card_id FROM deck_card')).toEqual([
      { card_id: 'starter-c1-01' },
    ]);
  });

  it('should write nothing when a delete fails part way', async () => {
    const database = await makeDatabase();
    const repository = createPersonalRepository({ database, ...makeOptions() });
    const cardId = await savedCardId(repository);
    await repository.setFavourite(cardId, true);
    await database.exec(
      'CREATE TRIGGER block_delete BEFORE DELETE ON player_card BEGIN SELECT RAISE(ABORT, "blocked"); END',
    );

    await expect(repository.deletePlayerCard(cardId)).rejects.toThrow();

    expect(await repository.listFavourites()).toEqual([cardId]);
  });

  it('should keep the rows of a deck when saving it fails part way', async () => {
    const database = await makeDatabase();
    const repository = createPersonalRepository({ database, ...makeOptions() });
    const deckId = await savedDeckId(repository);
    await database.exec(
      'CREATE TRIGGER block_insert BEFORE INSERT ON deck_card BEGIN SELECT RAISE(ABORT, "blocked"); END',
    );

    await expect(
      repository.saveDeck({ id: deckId, name: 'Deck 1', cardIds: ['starter-c1-02'] }),
    ).rejects.toThrow();

    expect(await repository.listDecks()).toEqual([
      { id: deckId, name: 'Deck 1', cardIds: ['starter-c1-01'] },
    ]);
  });
});

describe('SQLite personal repository question and discovery storage', () => {
  const insertQuestionRow = (database: SqlDatabase, id: string, options: string | null) =>
    database.run(
      'INSERT INTO player_question (id, format, category, topic, text, options, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, 'guess', 'c1', 't1', 'Question 1', options, 1, 1],
    );

  it('should skip a stored question whose id fails the core schema, and not throw', async () => {
    const database = await makeDatabase();
    const repository = createPersonalRepository({ database, ...makeOptions() });
    await insertQuestionRow(
      database,
      'not-a-player-id',
      '[{"id":"o1","text":"A"},{"id":"o2","text":"B"}]',
    );
    await insertQuestionRow(
      database,
      'pq-00000000-0000-4000-8000-000000000002',
      '[{"id":"o1","text":"A"},{"id":"o2","text":"B"}]',
    );

    const questions = await repository.listPlayerQuestions();

    expect(questions.map((question) => question.id)).toEqual([
      'pq-00000000-0000-4000-8000-000000000002',
    ]);
  });

  it('should skip a stored question whose options are not valid JSON or fail the schema', async () => {
    const database = await makeDatabase();
    const repository = createPersonalRepository({ database, ...makeOptions() });
    await insertQuestionRow(database, 'pq-00000000-0000-4000-8000-000000000001', '{broken');
    await insertQuestionRow(database, 'pq-00000000-0000-4000-8000-000000000002', '[{"id":"o1"}]');

    expect(await repository.listPlayerQuestions()).toEqual([]);
  });

  it('should skip a discovery row that fails the core schema, and not throw', async () => {
    const database = await makeDatabase();
    const repository = createPersonalRepository({ database, ...makeOptions() });
    await repository.addDiscoveries([{ kind: 'agree', questionId: 'q-either-01', optionId: 'o1' }]);
    await database.run(
      'INSERT INTO discovery (kind, question_id, player, option_id, strength, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['match', 'q-match-01', '', null, 'yes', 1e20],
    );

    const discoveries = await repository.listDiscoveries();

    expect(discoveries.map((discovery) => discovery.kind)).toEqual(['agree']);
  });

  it('should keep a discovery for a missing question in storage', async () => {
    const database = await makeDatabase();
    const repository = createPersonalRepository({ database, ...makeOptions() });
    await repository.addDiscoveries([{ kind: 'agree', questionId: 'q-either-99', optionId: 'o1' }]);

    expect(await repository.listDiscoveries()).toEqual([]);
    expect(await database.all('SELECT question_id FROM discovery')).toEqual([
      { question_id: 'q-either-99' },
    ]);
  });

  it('should store a discovery with an empty player for a match and an agree', async () => {
    const database = await makeDatabase();
    const repository = createPersonalRepository({ database, ...makeOptions() });

    await repository.addDiscoveries([
      { kind: 'match', questionId: 'q-match-01', strength: 'maybe' },
      { kind: 'agree', questionId: 'q-either-01', optionId: 'o2' },
    ]);

    expect(await database.all('SELECT kind, player, option_id, strength FROM discovery')).toEqual([
      { kind: 'match', player: '', option_id: null, strength: 'maybe' },
      { kind: 'agree', player: '', option_id: 'o2', strength: null },
    ]);
  });

  it('should remove the discoveries of a deleted question from storage, not only hide them', async () => {
    const database = await makeDatabase();
    const repository = createPersonalRepository({ database, ...makeOptions() });
    const saved = await repository.savePlayerQuestion({
      format: 'ifYou',
      category: 'c1',
      topic: 't1',
      text: 'Question 1',
    });
    const questionId = saved.ok ? saved.saved.id : 'missing';
    await repository.addDiscoveries([{ kind: 'match', questionId, strength: 'yes' }]);

    await repository.deletePlayerQuestion(questionId);

    expect(await database.all('SELECT * FROM discovery')).toEqual([]);
    expect(await database.all('SELECT * FROM player_question')).toEqual([]);
  });

  it('should keep both the question and its discoveries when a delete fails part way', async () => {
    const database = await makeDatabase();
    const repository = createPersonalRepository({ database, ...makeOptions() });
    const saved = await repository.savePlayerQuestion({
      format: 'ifYou',
      category: 'c1',
      topic: 't1',
      text: 'Question 1',
    });
    const questionId = saved.ok ? saved.saved.id : 'missing';
    await repository.addDiscoveries([{ kind: 'match', questionId, strength: 'yes' }]);
    await database.exec(
      'CREATE TRIGGER block_delete BEFORE DELETE ON player_question BEGIN SELECT RAISE(ABORT, "blocked"); END',
    );

    await expect(repository.deletePlayerQuestion(questionId)).rejects.toThrow();

    expect(await repository.listDiscoveries()).toHaveLength(1);
    expect(await repository.listPlayerQuestions()).toHaveLength(1);
  });

  it('should add none of a batch of discoveries when one write fails', async () => {
    const database = await makeDatabase();
    const repository = createPersonalRepository({ database, ...makeOptions() });
    await database.exec(
      'CREATE TRIGGER block_insert BEFORE INSERT ON discovery WHEN NEW.kind = \'agree\' BEGIN SELECT RAISE(ABORT, "blocked"); END',
    );

    await expect(
      repository.addDiscoveries([
        { kind: 'match', questionId: 'q-match-01', strength: 'yes' },
        { kind: 'agree', questionId: 'q-either-01', optionId: 'o1' },
      ]),
    ).rejects.toThrow();

    expect(await database.all('SELECT * FROM discovery')).toEqual([]);
  });
});
