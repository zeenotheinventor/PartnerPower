import { limits } from '@getfreak/core';

import type {
  PersonalRepository,
  PersonalRepositoryOptions,
  QuestionDraft,
  ShippedCard,
  ShippedQuestion,
} from '../types';

export type RepositoryFixture = {
  repository: PersonalRepository;
  /** The shipped cards the repository reads on every call. A test changes them to simulate a deck update. */
  shippedCards: ShippedCard[];
  /** The shipped questions the repository reads on every call. A test changes them to simulate a deck update. */
  shippedQuestions: ShippedQuestion[];
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

export function makeShippedQuestionsForTests(): ShippedQuestion[] {
  return [
    { id: 'q-if-01', text: 'Shipped question 1' },
    { id: 'q-either-01' },
    { id: 'q-guess-01', text: 'Shipped question 3' },
    { id: 'q-match-01', text: 'Shipped question 4' },
  ];
}

const questionIdPattern = /^pq-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const cardIdPattern = /^p-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The behaviour every repository must have, so the real one and the in-memory one cannot drift. */
export function describePersonalRepository(name: string, createFixture: CreateFixture) {
  describe(`${name} personal repository`, () => {
    let repository: PersonalRepository;
    let shippedCards: ShippedCard[];
    let shippedQuestions: ShippedQuestion[];

    beforeEach(async () => {
      ({ repository, shippedCards, shippedQuestions } = await createFixture({}));
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

      it('should keep several missing cards in their stored order through a save', async () => {
        const deck = await addDeck('Deck 1', [
          'starter-c1-01',
          'z-missing',
          'a-missing',
          'starter-c1-02',
        ]);

        await repository.saveDeck({
          id: deck.id,
          name: 'Deck 1',
          cardIds: ['starter-c1-02', 'starter-c1-01'],
        });
        shippedCards.push(
          { id: 'a-missing', text: 'Shipped card a' },
          { id: 'z-missing', text: 'Shipped card z' },
        );

        expect((await repository.listDecks())[0]?.cardIds).toEqual([
          'starter-c1-02',
          'starter-c1-01',
          'z-missing',
          'a-missing',
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

    describe('player questions', () => {
      const statement: QuestionDraft = {
        format: 'ifYou',
        category: 'c2',
        topic: 't3',
        text: 'Question 1',
      };
      const guess: QuestionDraft = {
        format: 'guess',
        category: 'c1',
        topic: 't1',
        text: 'Question 2',
        options: ['Option 1', 'Option 2', 'Option 3'],
      };
      const eitherOr: QuestionDraft = {
        format: 'eitherOr',
        category: 'c4',
        topic: 't6',
        text: 'Question 3',
        options: ['Option 1', 'Option 2'],
      };

      async function addQuestion(draft: QuestionDraft) {
        const result = await repository.savePlayerQuestion(draft);
        if (!result.ok) throw new Error('The question was not saved');
        return result.saved;
      }

      it('should list no questions when none are stored', async () => {
        expect(await repository.listPlayerQuestions()).toEqual([]);
      });

      it('should save a statement question with a pq- UUID id and list it', async () => {
        const result = await repository.savePlayerQuestion(statement);

        expect(result).toEqual({
          ok: true,
          saved: {
            id: expect.stringMatching(questionIdPattern),
            format: 'ifYou',
            category: 'c2',
            topic: 't3',
            text: 'Question 1',
            source: 'player',
          },
        });
        expect(await repository.listPlayerQuestions()).toEqual([result.ok && result.saved]);
      });

      it('should save an option question with positional option ids and list it', async () => {
        const saved = await addQuestion(guess);

        expect(saved).toEqual(
          expect.objectContaining({
            format: 'guess',
            options: [
              { id: 'o1', text: 'Option 1' },
              { id: 'o2', text: 'Option 2' },
              { id: 'o3', text: 'Option 3' },
            ],
          }),
        );
        expect(await repository.listPlayerQuestions()).toEqual([saved]);
      });

      it('should save an either-or question without text', async () => {
        const saved = await addQuestion({ ...eitherOr, text: '  ' });

        expect(saved).not.toHaveProperty('text');
        expect(await repository.listPlayerQuestions()).toEqual([saved]);
      });

      it('should store the text and the options tidied', async () => {
        const saved = await addQuestion({
          ...guess,
          text: '  Question \t 2\n here ',
          options: ['  Option  1 ', 'Option\n2'],
        });

        expect(saved).toEqual(
          expect.objectContaining({
            text: 'Question 2 here',
            options: [
              { id: 'o1', text: 'Option 1' },
              { id: 'o2', text: 'Option 2' },
            ],
          }),
        );
        expect(await repository.listPlayerQuestions()).toEqual([saved]);
      });

      it('should list questions in the order they were added', async () => {
        await addQuestion(statement);
        await addQuestion(guess);
        await addQuestion(eitherOr);

        const texts = (await repository.listPlayerQuestions()).map((question) => question.text);

        expect(texts).toEqual(['Question 1', 'Question 2', 'Question 3']);
      });

      it('should reject empty text for a format that needs it, and store nothing', async () => {
        const result = await repository.savePlayerQuestion({ ...statement, text: ' \n ' });

        expect(result).toEqual({ ok: false, reason: 'invalid', problems: ['empty'] });
        expect(await repository.listPlayerQuestions()).toEqual([]);
      });

      it('should accept text at the limit and reject text over it', async () => {
        const atLimit = await repository.savePlayerQuestion({
          ...statement,
          text: 'a'.repeat(limits.cardTextLength),
        });
        const overLimit = await repository.savePlayerQuestion({
          ...statement,
          text: 'b'.repeat(limits.cardTextLength + 1),
        });

        expect(atLimit.ok).toBe(true);
        expect(overLimit).toEqual({ ok: false, reason: 'invalid', problems: ['tooLong'] });
      });

      it('should reject a repeat of a shipped question, ignoring case and spacing', async () => {
        const result = await repository.savePlayerQuestion({
          ...statement,
          text: ' SHIPPED   question 1 ',
        });

        expect(result).toEqual({ ok: false, reason: 'invalid', problems: ['duplicate'] });
      });

      it('should reject a repeat of another player question', async () => {
        await addQuestion(statement);

        const result = await repository.savePlayerQuestion({ ...guess, text: 'question  1' });

        expect(result).toEqual({ ok: false, reason: 'invalid', problems: ['duplicate'] });
      });

      it('should reject an empty, long or repeated option', async () => {
        const empty = await repository.savePlayerQuestion({ ...guess, options: ['Option 1', ' '] });
        const long = await repository.savePlayerQuestion({
          ...guess,
          options: ['Option 1', 'c'.repeat(limits.cardTextLength + 1)],
        });
        const repeated = await repository.savePlayerQuestion({
          ...guess,
          options: ['Option 1', ' option   1 '],
        });

        expect(empty).toEqual({ ok: false, reason: 'invalid', problems: ['empty'] });
        expect(long).toEqual({ ok: false, reason: 'invalid', problems: ['tooLong'] });
        expect(repeated).toEqual({ ok: false, reason: 'invalid', problems: ['duplicate'] });
        expect(await repository.listPlayerQuestions()).toEqual([]);
      });

      it('should reject an option count the format does not allow', async () => {
        const problem = { ok: false, reason: 'invalid', problems: ['optionCount'] };

        expect(await repository.savePlayerQuestion({ ...guess, options: ['Option 1'] })).toEqual(
          problem,
        );
        expect(
          await repository.savePlayerQuestion({
            ...guess,
            options: ['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5'],
          }),
        ).toEqual(problem);
        expect(
          await repository.savePlayerQuestion({
            ...eitherOr,
            options: ['Option 1', 'Option 2', 'Option 3'],
          }),
        ).toEqual(problem);
        expect(
          await repository.savePlayerQuestion({ ...statement, options: ['Option 1', 'Option 2'] }),
        ).toEqual(problem);
        expect(await repository.savePlayerQuestion({ ...guess, options: undefined })).toEqual(
          problem,
        );
        expect(await repository.listPlayerQuestions()).toEqual([]);
      });

      it('should change a question in place, keeping its id and place in the list', async () => {
        const first = await addQuestion(statement);
        await addQuestion(guess);

        const result = await repository.savePlayerQuestion({
          ...statement,
          id: first.id,
          category: 'c4',
          text: 'Question 1 changed',
        });

        expect(result).toEqual({
          ok: true,
          saved: { ...first, category: 'c4', text: 'Question 1 changed' },
        });
        const questions = await repository.listPlayerQuestions();
        expect(questions.map((question) => question.text)).toEqual([
          'Question 1 changed',
          'Question 2',
        ]);
        expect(questions[0]?.id).toBe(first.id);
      });

      it('should not count a question as a repeat of itself when it is saved again', async () => {
        const question = await addQuestion(statement);

        const result = await repository.savePlayerQuestion({ ...statement, id: question.id });

        expect(result.ok).toBe(true);
      });

      it('should save a question with an unknown id as a new question with a new id', async () => {
        const unknownId = 'pq-00000000-0000-4000-8000-000000000000';

        const result = await repository.savePlayerQuestion({ ...statement, id: unknownId });

        expect(result.ok && result.saved.id).not.toBe(unknownId);
        expect(await repository.listPlayerQuestions()).toHaveLength(1);
      });

      it('should hold the most questions the limit allows and refuse one more', async () => {
        for (let index = 1; index <= limits.playerQuestions; index += 1) {
          await addQuestion({ ...statement, text: `Question ${index}` });
        }

        const extra = await repository.savePlayerQuestion({ ...statement, text: 'One more' });
        const questions = await repository.listPlayerQuestions();
        const change = await repository.savePlayerQuestion({
          ...statement,
          id: questions[0]?.id,
          text: 'Question 1 changed',
        });

        expect(extra).toEqual({ ok: false, reason: 'limit' });
        expect(questions).toHaveLength(limits.playerQuestions);
        expect(change.ok).toBe(true);
      });

      it('should delete a question and its discoveries, and leave the others', async () => {
        const doomed = await addQuestion(guess);
        const kept = await addQuestion(eitherOr);
        await repository.addDiscoveries([
          { kind: 'agree', questionId: doomed.id, optionId: 'o1' },
          { kind: 'answer', questionId: doomed.id, optionId: 'o2', answererName: 'Name 1' },
          { kind: 'agree', questionId: kept.id, optionId: 'o1' },
        ]);

        await repository.deletePlayerQuestion(doomed.id);

        expect((await repository.listPlayerQuestions()).map((question) => question.id)).toEqual([
          kept.id,
        ]);
        expect(
          (await repository.listDiscoveries()).map((discovery) => discovery.questionId),
        ).toEqual([kept.id]);
      });

      it('should not bring the discoveries of a deleted question back under a new question', async () => {
        const doomed = await addQuestion(statement);
        await repository.addDiscoveries([
          { kind: 'match', questionId: doomed.id, strength: 'yes' },
        ]);
        await repository.deletePlayerQuestion(doomed.id);

        await addQuestion(statement);

        expect(await repository.listDiscoveries()).toEqual([]);
      });

      it('should not bring the discoveries of a deleted question back when its id is known again', async () => {
        const doomed = await addQuestion(statement);
        await repository.addDiscoveries([
          { kind: 'match', questionId: doomed.id, strength: 'yes' },
        ]);
        await repository.deletePlayerQuestion(doomed.id);

        shippedQuestions.push({ id: doomed.id });

        expect(await repository.listDiscoveries()).toEqual([]);
      });

      it('should delete the discoveries of a question when a change gives it another format', async () => {
        const question = await addQuestion(guess);
        await repository.addDiscoveries([
          { kind: 'answer', questionId: question.id, optionId: 'o1', answererName: 'Name 1' },
        ]);

        await repository.savePlayerQuestion({ ...eitherOr, id: question.id });
        await repository.savePlayerQuestion({ ...guess, id: question.id });

        expect(await repository.listDiscoveries()).toEqual([]);
        shippedQuestions.push({ id: question.id });
        expect(await repository.listDiscoveries()).toEqual([]);
      });

      it('should delete the discoveries of a question when a change leaves it fewer options', async () => {
        const question = await addQuestion(guess);
        await repository.addDiscoveries([
          { kind: 'agree', questionId: question.id, optionId: 'o1' },
        ]);

        await repository.savePlayerQuestion({ ...guess, id: question.id, options: ['A', 'B'] });
        await repository.savePlayerQuestion({ ...guess, id: question.id });
        shippedQuestions.push({ id: question.id });

        expect(await repository.listDiscoveries()).toEqual([]);
      });

      it('should keep the discoveries of a question when a change keeps its format and options', async () => {
        const question = await addQuestion(guess);
        await repository.addDiscoveries([
          { kind: 'agree', questionId: question.id, optionId: 'o3' },
        ]);

        await repository.savePlayerQuestion({
          ...guess,
          id: question.id,
          text: 'Question 2 changed',
          options: ['A', 'B', 'C', 'D'],
        });

        expect(await repository.listDiscoveries()).toEqual([
          expect.objectContaining({ kind: 'agree', optionId: 'o3' }),
        ]);
      });

      it('should skip a discovery whose option the question no longer has', async () => {
        const question = await addQuestion(guess);
        await repository.addDiscoveries([
          { kind: 'agree', questionId: question.id, optionId: 'o2' },
          { kind: 'answer', questionId: question.id, optionId: 'o9', answererName: 'Name 1' },
        ]);

        expect(await repository.listDiscoveries()).toEqual([
          expect.objectContaining({ kind: 'agree', optionId: 'o2' }),
        ]);
      });

      it('should do nothing when an unknown question is deleted', async () => {
        const question = await addQuestion(statement);

        await repository.deletePlayerQuestion('pq-00000000-0000-4000-8000-000000000000');

        expect(await repository.listPlayerQuestions()).toEqual([question]);
      });
    });

    describe('discoveries', () => {
      const match = { kind: 'match', questionId: 'q-match-01', strength: 'yes' } as const;
      const agree = { kind: 'agree', questionId: 'q-either-01', optionId: 'o1' } as const;
      const answer = {
        kind: 'answer',
        questionId: 'q-guess-01',
        optionId: 'o2',
        answererName: 'Name 1',
      } as const;
      const date = '1970-01-01T00:00:00.001Z';

      it('should list no discoveries when none are stored', async () => {
        expect(await repository.listDiscoveries()).toEqual([]);
      });

      it('should add discoveries of each kind, stamped with the time, in the order added', async () => {
        await repository.addDiscoveries([match, agree, answer]);

        expect(await repository.listDiscoveries()).toEqual([
          { ...match, date },
          { ...agree, date },
          { ...answer, date },
        ]);
      });

      it('should replace a discovery with the same key, so a strength can change', async () => {
        await repository.addDiscoveries([match, agree]);

        await repository.addDiscoveries([{ ...match, strength: 'maybe' }]);

        expect(await repository.listDiscoveries()).toEqual([
          { ...agree, date },
          { ...match, strength: 'maybe', date },
        ]);
      });

      it('should list a repeated discovery once when it is added twice in one call', async () => {
        await repository.addDiscoveries([agree, agree]);

        expect(await repository.listDiscoveries()).toHaveLength(1);
      });

      it('should keep a discovery for each partner who answered the same question', async () => {
        await repository.addDiscoveries([
          answer,
          { ...answer, answererName: 'Name 2', optionId: 'o1' },
        ]);

        expect(await repository.listDiscoveries()).toHaveLength(2);
      });

      it('should replace the answer of one partner and leave the other', async () => {
        await repository.addDiscoveries([
          answer,
          { ...answer, answererName: 'Name 2', optionId: 'o1' },
        ]);

        await repository.addDiscoveries([{ ...answer, optionId: 'o1' }]);

        expect(await repository.listDiscoveries()).toEqual([
          { ...answer, answererName: 'Name 2', optionId: 'o1', date },
          { ...answer, optionId: 'o1', date },
        ]);
      });

      it('should skip a draft that fails the schema and add the others', async () => {
        await repository.addDiscoveries([
          // @ts-expect-error A draft that a screen could build with a slip.
          { kind: 'match', questionId: 'q-match-01', strength: 'sure' },
          agree,
        ]);

        expect(await repository.listDiscoveries()).toEqual([{ ...agree, date }]);
      });

      it('should remove one discovery by its key and leave the others', async () => {
        await repository.addDiscoveries([match, agree, answer]);

        await repository.removeDiscovery({ kind: 'agree', questionId: 'q-either-01' });
        await repository.removeDiscovery({
          kind: 'answer',
          questionId: 'q-guess-01',
          answererName: 'Name 2',
        });

        expect((await repository.listDiscoveries()).map((discovery) => discovery.kind)).toEqual([
          'match',
          'answer',
        ]);
      });

      it('should remove the discovery of the partner named in the key', async () => {
        await repository.addDiscoveries([answer, { ...answer, answererName: 'Name 2' }]);

        await repository.removeDiscovery({
          kind: 'answer',
          questionId: 'q-guess-01',
          answererName: 'Name 2',
        });

        expect(await repository.listDiscoveries()).toEqual([{ ...answer, date }]);
      });

      it('should clear every discovery, even for missing questions, and leave the questions', async () => {
        const question = await repository.savePlayerQuestion({
          format: 'ifYou',
          category: 'c1',
          topic: 't1',
          text: 'Question 1',
        });
        await repository.addDiscoveries([
          match,
          agree,
          { kind: 'match', questionId: 'q-gone', strength: 'yes' },
        ]);

        await repository.clearDiscoveries();

        shippedQuestions.push({ id: 'q-gone', text: 'Shipped question 9' });
        expect(await repository.listDiscoveries()).toEqual([]);
        expect(await repository.listPlayerQuestions()).toEqual([question.ok && question.saved]);
      });

      it('should store the name of the partner trimmed, and key on the trimmed name', async () => {
        await repository.addDiscoveries([{ ...answer, answererName: '  Name 1 ' }]);
        await repository.addDiscoveries([{ ...answer, optionId: 'o1' }]);

        expect(await repository.listDiscoveries()).toEqual([{ ...answer, optionId: 'o1', date }]);

        await repository.removeDiscovery({
          kind: 'answer',
          questionId: 'q-guess-01',
          answererName: ' Name 1  ',
        });

        expect(await repository.listDiscoveries()).toEqual([]);
      });

      it('should skip an answer whose name is only spaces', async () => {
        await repository.addDiscoveries([{ ...answer, answererName: '   ' }, agree]);

        expect(await repository.listDiscoveries()).toEqual([{ ...agree, date }]);
      });

      it('should list the discovery of a player question', async () => {
        const saved = await repository.savePlayerQuestion({
          format: 'ifYou',
          category: 'c1',
          topic: 't1',
          text: 'Question 1',
        });
        const questionId = saved.ok ? saved.saved.id : 'missing';

        await repository.addDiscoveries([{ kind: 'match', questionId, strength: 'maybe' }]);

        expect(await repository.listDiscoveries()).toEqual([
          { kind: 'match', questionId, strength: 'maybe', date },
        ]);
      });

      it('should skip a discovery whose question no longer exists, and bring it back with the question', async () => {
        await repository.addDiscoveries([
          match,
          { kind: 'agree', questionId: 'q-either-99', optionId: 'o1' },
        ]);

        expect(await repository.listDiscoveries()).toEqual([{ ...match, date }]);

        shippedQuestions.push({ id: 'q-either-99' });

        expect(await repository.listDiscoveries()).toEqual([
          { ...match, date },
          { kind: 'agree', questionId: 'q-either-99', optionId: 'o1', date },
        ]);
      });

      it('should hold a few hundred discoveries, some for missing questions', async () => {
        const drafts = Array.from({ length: 400 }, (_, index) => ({
          kind: 'match' as const,
          questionId: index % 4 === 0 ? `q-gone-${index}` : `q-here-${index}`,
          strength: 'yes' as const,
        }));
        shippedQuestions.push(
          ...drafts
            .filter((draft) => draft.questionId.startsWith('q-here-'))
            .map((draft) => ({ id: draft.questionId })),
        );
        await repository.addDiscoveries(drafts);

        const listed = await repository.listDiscoveries();

        expect(listed).toHaveLength(300);
        expect(listed.every((discovery) => discovery.questionId.startsWith('q-here-'))).toBe(true);
      });
    });

    describe('privacy of questions and discoveries', () => {
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should not log question text, options or names', async () => {
        const spies = (['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map((method) =>
          jest.spyOn(console, method).mockImplementation(() => {}),
        );

        const saved = await repository.savePlayerQuestion({
          format: 'guess',
          category: 'c1',
          topic: 't1',
          text: 'SECRET-QUESTION-TEXT',
          options: ['SECRET-OPTION-1', 'SECRET-OPTION-2'],
        });
        await repository.savePlayerQuestion({
          format: 'ifYou',
          category: 'c1',
          topic: 't1',
          text: 'SECRET-QUESTION-TEXT',
        });
        const questionId = saved.ok ? saved.saved.id : 'missing';
        await repository.addDiscoveries([
          { kind: 'answer', questionId, optionId: 'o1', answererName: 'SECRET-NAME' },
        ]);
        await repository.listDiscoveries();
        await repository.removeDiscovery({
          kind: 'answer',
          questionId,
          answererName: 'SECRET-NAME',
        });
        await repository.deletePlayerQuestion(questionId);

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
