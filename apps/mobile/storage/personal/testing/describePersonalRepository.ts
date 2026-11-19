import { limits } from '@getfreak/core';

import type { PersonalRepository, PersonalRepositoryOptions, ShippedCard } from '../types';

export type RepositoryFixture = {
  repository: PersonalRepository;
  /** The shipped cards the repository reads on every call. A test changes them to simulate a deck update. */
  shippedCards: ShippedCard[];
};

type CreateFixture = (
  options: Pick<PersonalRepositoryOptions, 'recoveredFromUnreadable'>,
) => Promise<RepositoryFixture>;

export function makeShippedCardsForTests(): ShippedCard[] {
  return [
    { id: 'starter-c1-01', text: 'Shipped card 1' },
    { id: 'starter-c1-02', text: 'Shipped card 2' },
  ];
}

const cardIdPattern = /^p-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The behaviour every repository must have, so the real one and the in-memory one cannot drift. */
export function describePersonalRepository(name: string, createFixture: CreateFixture) {
  describe(`${name} personal repository`, () => {
    let repository: PersonalRepository;
    let shippedCards: ShippedCard[];

    beforeEach(async () => {
      ({ repository, shippedCards } = await createFixture({}));
    });

    async function addCard(text: string, category: 'c1' | 'c2' | 'c3' | 'c4' = 'c1') {
      const result = await repository.savePlayerCard({ category, kind: 'solo', text });
      if (!result.ok) throw new Error('The card was not saved');
      return result.saved;
    }

    async function addDeck(deckName: string, cardIds: string[]) {
      const result = await repository.saveDeck({ name: deckName, cardIds });
      if (!result.ok) throw new Error('The deck was not saved');
      return result.saved;
    }

    describe('player cards', () => {
      it('should list no cards when none are stored', async () => {
        expect(await repository.listPlayerCards()).toEqual([]);
      });

      it('should save a card with a p- UUID id and list it', async () => {
        const result = await repository.savePlayerCard({
          category: 'c2',
          kind: 'together',
          text: 'Card 1',
        });

        expect(result).toEqual({
          ok: true,
          saved: {
            id: expect.stringMatching(cardIdPattern),
            category: 'c2',
            kind: 'together',
            text: 'Card 1',
            source: 'player',
          },
        });
        expect(await repository.listPlayerCards()).toEqual([
          expect.objectContaining({ text: 'Card 1' }),
        ]);
      });

      it('should store the text tidied', async () => {
        const card = await addCard('  Card \t 1\n here ');

        expect(card.text).toBe('Card 1 here');
        expect((await repository.listPlayerCards())[0]?.text).toBe('Card 1 here');
      });

      it('should list cards in the order they were added', async () => {
        await addCard('Card 1');
        await addCard('Card 2');
        await addCard('Card 3');

        const texts = (await repository.listPlayerCards()).map((card) => card.text);

        expect(texts).toEqual(['Card 1', 'Card 2', 'Card 3']);
      });

      it('should reject empty text and not store it', async () => {
        const result = await repository.savePlayerCard({
          category: 'c1',
          kind: 'solo',
          text: '  \n ',
        });

        expect(result).toEqual({ ok: false, reason: 'invalid', problems: ['empty'] });
        expect(await repository.listPlayerCards()).toEqual([]);
      });

      it('should accept text at the limit and reject text over it', async () => {
        const atLimit = await repository.savePlayerCard({
          category: 'c1',
          kind: 'solo',
          text: 'a'.repeat(limits.cardTextLength),
        });
        const overLimit = await repository.savePlayerCard({
          category: 'c1',
          kind: 'solo',
          text: 'a'.repeat(limits.cardTextLength + 1),
        });

        expect(atLimit.ok).toBe(true);
        expect(overLimit).toEqual({ ok: false, reason: 'invalid', problems: ['tooLong'] });
      });

      it('should reject a repeat of a shipped card, ignoring case and spacing', async () => {
        const result = await repository.savePlayerCard({
          category: 'c1',
          kind: 'solo',
          text: ' SHIPPED   card 1 ',
        });

        expect(result).toEqual({ ok: false, reason: 'invalid', problems: ['duplicate'] });
      });

      it('should reject a repeat of another player card', async () => {
        await addCard('Card 1');

        const result = await repository.savePlayerCard({
          category: 'c3',
          kind: 'together',
          text: 'card  1',
        });

        expect(result).toEqual({ ok: false, reason: 'invalid', problems: ['duplicate'] });
      });

      it('should change a card in place, keeping its id and place in the list', async () => {
        const first = await addCard('Card 1');
        await addCard('Card 2');

        const result = await repository.savePlayerCard({
          id: first.id,
          category: 'c4',
          kind: 'together',
          text: 'Card 1 changed',
        });

        expect(result).toEqual({
          ok: true,
          saved: { ...first, category: 'c4', kind: 'together', text: 'Card 1 changed' },
        });
        const cards = await repository.listPlayerCards();
        expect(cards.map((card) => card.text)).toEqual(['Card 1 changed', 'Card 2']);
        expect(cards[0]?.id).toBe(first.id);
      });

      it('should not count a card as a repeat of itself when it is saved again', async () => {
        const card = await addCard('Card 1');

        const result = await repository.savePlayerCard({
          id: card.id,
          category: 'c1',
          kind: 'solo',
          text: 'Card 1',
        });

        expect(result.ok).toBe(true);
      });

      it('should save a card with an unknown id as a new card with a new id', async () => {
        const result = await repository.savePlayerCard({
          id: 'p-00000000-0000-4000-8000-000000000000',
          category: 'c1',
          kind: 'solo',
          text: 'Card 1',
        });

        expect(result.ok && result.saved.id).not.toBe('p-00000000-0000-4000-8000-000000000000');
        expect(await repository.listPlayerCards()).toHaveLength(1);
      });

      it('should hold the most cards the limit allows and refuse one more', async () => {
        for (let index = 1; index <= limits.playerCards; index += 1) {
          await addCard(`Card ${index}`);
        }

        const extra = await repository.savePlayerCard({
          category: 'c1',
          kind: 'solo',
          text: 'One more card',
        });
        const cards = await repository.listPlayerCards();
        const change = await repository.savePlayerCard({
          id: cards[0]?.id,
          category: 'c1',
          kind: 'solo',
          text: 'Card 1 changed',
        });

        expect(extra).toEqual({ ok: false, reason: 'limit' });
        expect(cards).toHaveLength(limits.playerCards);
        expect(change.ok).toBe(true);
      });

      it('should remove a deleted card from the list, the favourites and the decks', async () => {
        const doomed = await addCard('Card 1');
        const kept = await addCard('Card 2');
        await repository.setFavourite(doomed.id, true);
        await repository.setFavourite(kept.id, true);
        await addDeck('Deck 1', [kept.id, doomed.id, 'starter-c1-01']);

        await repository.deletePlayerCard(doomed.id);

        expect((await repository.listPlayerCards()).map((card) => card.id)).toEqual([kept.id]);
        expect(await repository.listFavourites()).toEqual([kept.id]);
        expect((await repository.listDecks())[0]?.cardIds).toEqual([kept.id, 'starter-c1-01']);
      });

      it('should not bring a deleted card back into a deck or favourites later', async () => {
        const doomed = await addCard('Card 1');
        await repository.setFavourite(doomed.id, true);
        await addDeck('Deck 1', [doomed.id]);
        await repository.deletePlayerCard(doomed.id);

        const replacement = await addCard('Card 1');

        expect(replacement.id).not.toBe(doomed.id);
        expect(await repository.listFavourites()).toEqual([]);
        expect((await repository.listDecks())[0]?.cardIds).toEqual([]);
      });

      it('should do nothing when an unknown card is deleted', async () => {
        const card = await addCard('Card 1');

        await repository.deletePlayerCard('p-00000000-0000-4000-8000-000000000000');

        expect(await repository.listPlayerCards()).toEqual([card]);
      });
    });

    describe('favourites', () => {
      it('should list no favourites when none are stored', async () => {
        expect(await repository.listFavourites()).toEqual([]);
      });

      it('should favourite a shipped card and a player card, in the order set', async () => {
        const card = await addCard('Card 1');

        await repository.setFavourite(card.id, true);
        await repository.setFavourite('starter-c1-01', true);

        expect(await repository.listFavourites()).toEqual([card.id, 'starter-c1-01']);
      });

      it('should list a card once however many times it is favourited', async () => {
        await repository.setFavourite('starter-c1-01', true);
        await repository.setFavourite('starter-c1-01', true);

        expect(await repository.listFavourites()).toEqual(['starter-c1-01']);
      });

      it('should remove a favourite and leave the others', async () => {
        await repository.setFavourite('starter-c1-01', true);
        await repository.setFavourite('starter-c1-02', true);

        await repository.setFavourite('starter-c1-01', false);

        expect(await repository.listFavourites()).toEqual(['starter-c1-02']);
      });

      it('should skip a favourite whose card no longer exists, and bring it back with the card', async () => {
        await repository.setFavourite('starter-c1-02', true);
        await repository.setFavourite('starter-c1-99', true);

        expect(await repository.listFavourites()).toEqual(['starter-c1-02']);

        shippedCards.push({ id: 'starter-c1-99', text: 'Shipped card 99' });

        expect(await repository.listFavourites()).toEqual(['starter-c1-02', 'starter-c1-99']);
      });
    });

    describe('decks', () => {
      it('should list no decks when none are stored', async () => {
        expect(await repository.listDecks()).toEqual([]);
      });

      it('should save a deck with a d- UUID id, a trimmed name and its cards in order', async () => {
        const result = await repository.saveDeck({
          name: '  Deck 1 ',
          cardIds: ['starter-c1-02', 'starter-c1-01'],
        });

        expect(result).toEqual({
          ok: true,
          saved: {
            id: expect.stringMatching(/^d-[0-9a-f-]{36}$/),
            name: 'Deck 1',
            cardIds: ['starter-c1-02', 'starter-c1-01'],
          },
        });
        expect(await repository.listDecks()).toEqual([result.ok && result.saved]);
      });

      it('should list decks in the order they were added', async () => {
        await addDeck('Deck 1', []);
        await addDeck('Deck 2', []);

        expect((await repository.listDecks()).map((deck) => deck.name)).toEqual([
          'Deck 1',
          'Deck 2',
        ]);
      });

      it('should reject an empty name', async () => {
        const result = await repository.saveDeck({ name: '   ', cardIds: [] });

        expect(result).toEqual({ ok: false, reason: 'invalid', problems: ['empty'] });
        expect(await repository.listDecks()).toEqual([]);
      });

      it('should accept a name at the limit and reject one over it', async () => {
        const atLimit = await repository.saveDeck({
          name: 'a'.repeat(limits.deckNameLength),
          cardIds: [],
        });
        const overLimit = await repository.saveDeck({
          name: 'a'.repeat(limits.deckNameLength + 1),
          cardIds: [],
        });

        expect(atLimit.ok).toBe(true);
        expect(overLimit).toEqual({ ok: false, reason: 'invalid', problems: ['tooLong'] });
      });

      it('should keep a card once when a deck lists it twice', async () => {
        const deck = await addDeck('Deck 1', ['starter-c1-01', 'starter-c1-02', 'starter-c1-01']);

        expect(deck.cardIds).toEqual(['starter-c1-01', 'starter-c1-02']);
      });

      it('should hold the most cards the limit allows and refuse one more', async () => {
        const manyIds = Array.from({ length: limits.cardsPerCustomDeck }, (_, i) => `x-${i}`);

        const atLimit = await repository.saveDeck({ name: 'Deck 1', cardIds: manyIds });
        const overLimit = await repository.saveDeck({
          name: 'Deck 2',
          cardIds: [...manyIds, 'x-extra'],
        });

        expect(atLimit.ok).toBe(true);
        expect(overLimit).toEqual({ ok: false, reason: 'limit' });
        expect(await repository.listDecks()).toHaveLength(1);
      });

      it('should hold the most decks the limit allows and refuse one more', async () => {
        for (let index = 1; index <= limits.customDecks; index += 1) {
          await addDeck(`Deck ${index}`, []);
        }
        const decks = await repository.listDecks();

        const extra = await repository.saveDeck({ name: 'One more deck', cardIds: [] });
        const rename = await repository.saveDeck({
          id: decks[0]?.id,
          name: 'Deck 1 renamed',
          cardIds: [],
        });

        expect(extra).toEqual({ ok: false, reason: 'limit' });
        expect(decks).toHaveLength(limits.customDecks);
        expect(rename.ok).toBe(true);
      });

      it('should change a deck in place, replacing its name and cards', async () => {
        const deck = await addDeck('Deck 1', ['starter-c1-01', 'starter-c1-02']);
        await addDeck('Deck 2', []);

        const result = await repository.saveDeck({
          id: deck.id,
          name: 'Deck 1 renamed',
          cardIds: ['starter-c1-02'],
        });

        expect(result).toEqual({
          ok: true,
          saved: { id: deck.id, name: 'Deck 1 renamed', cardIds: ['starter-c1-02'] },
        });
        const decks = await repository.listDecks();
        expect(decks.map((listed) => listed.name)).toEqual(['Deck 1 renamed', 'Deck 2']);
        expect(decks[0]?.cardIds).toEqual(['starter-c1-02']);
      });

      it('should delete a deck and leave the others', async () => {
        const doomed = await addDeck('Deck 1', ['starter-c1-01']);
        await addDeck('Deck 2', []);

        await repository.deleteDeck(doomed.id);

        expect((await repository.listDecks()).map((deck) => deck.name)).toEqual(['Deck 2']);
      });

      it('should skip a card that no longer exists when a deck is read', async () => {
        const card = await addCard('Card 1');
        await addDeck('Deck 1', ['starter-c1-01', card.id, 'starter-c1-02']);
        shippedCards.splice(0, 1);

        const [deck] = await repository.listDecks();

        expect(deck?.cardIds).toEqual([card.id, 'starter-c1-02']);
      });

      it('should bring a skipped card back to its place when the card returns', async () => {
        await addDeck('Deck 1', ['starter-c1-01', 'starter-c1-99', 'starter-c1-02']);

        expect((await repository.listDecks())[0]?.cardIds).toEqual([
          'starter-c1-01',
          'starter-c1-02',
        ]);

        shippedCards.push({ id: 'starter-c1-99', text: 'Shipped card 99' });

        expect((await repository.listDecks())[0]?.cardIds).toEqual([
          'starter-c1-01',
          'starter-c1-99',
          'starter-c1-02',
        ]);
      });

      it('should keep a card that is missing now through a save of the deck', async () => {
        const deck = await addDeck('Deck 1', ['starter-c1-01', 'starter-c1-99', 'starter-c1-02']);

        await repository.saveDeck({
          id: deck.id,
          name: 'Deck 1',
          cardIds: ['starter-c1-02', 'starter-c1-01'],
        });
        shippedCards.push({ id: 'starter-c1-99', text: 'Shipped card 99' });

        expect((await repository.listDecks())[0]?.cardIds).toEqual([
          'starter-c1-02',
          'starter-c1-01',
          'starter-c1-99',
        ]);
      });
    });

    describe('privacy', () => {
      const secretText = 'SECRET-CARD-TEXT';
      const secretName = 'SECRET-DECK-NAME';

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should not log card text or deck names when saving, rejecting or deleting', async () => {
        const spies = (['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map((method) =>
          jest.spyOn(console, method).mockImplementation(() => {}),
        );

        const card = await addCard(secretText);
        await repository.savePlayerCard({ category: 'c1', kind: 'solo', text: secretText });
        await repository.saveDeck({ name: secretName, cardIds: [card.id] });
        await repository.listDecks();
        await repository.deletePlayerCard(card.id);

        for (const spy of spies) {
          expect(spy).not.toHaveBeenCalled();
        }
      });
    });

    describe('the notice that the data was cleared', () => {
      it('should not be due when the database opened normally', () => {
        expect(repository.takeRecoveryNotice()).toBe(false);
      });

      it('should be due once after a recovery, then not again', async () => {
        const recovered = await createFixture({ recoveredFromUnreadable: true });

        expect(recovered.repository.takeRecoveryNotice()).toBe(true);
        expect(recovered.repository.takeRecoveryNotice()).toBe(false);
      });
    });
  });
}
