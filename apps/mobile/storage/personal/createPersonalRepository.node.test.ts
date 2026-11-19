import { createPersonalRepository } from './createPersonalRepository';
import { migrate } from './migrations';
import { createNodeDatabase } from './testing/nodeSqlite';
import {
  describePersonalRepository,
  makeShippedCardsForTests,
} from './testing/describePersonalRepository';
import type {
  PersonalRepository,
  PersonalRepositoryOptions,
  ShippedCard,
  SqlDatabase,
} from './types';

type TestOptions = Omit<PersonalRepositoryOptions, 'recoveredFromUnreadable'> & {
  shippedCards: ShippedCard[];
};

function makeOptions(): TestOptions {
  let nextUuid = 0;
  const shippedCards = makeShippedCardsForTests();
  return {
    shippedCards,
    getShippedCards: () => shippedCards,
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
  return { repository, shippedCards: options.shippedCards };
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
