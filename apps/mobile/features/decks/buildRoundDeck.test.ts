import {
  maximumMatchesDeckCards,
  type Card,
  type CustomDeck,
  type Deck,
  type MatchedItem,
  type PlayerCard,
} from '@getfreak/core';

import { isVibrationSupported } from '../vibration/vibration';
import { buildRoundDeck } from './buildRoundDeck';
import { customDeckChoice } from './customDeckChoice';

const shippedCard = (id: string, category: Card['category'] = 'c1'): Card => ({
  id,
  category,
  kind: 'solo',
  text: `Card ${id}`,
  source: 'shipped',
});

const starterDeck: Deck = {
  id: 'starter-deck',
  version: 2,
  cards: [shippedCard('card-1'), shippedCard('card-2', 'c2'), shippedCard('card-3', 'c3')],
};

const ownCard = (id: string, category: PlayerCard['category'] = 'c1'): PlayerCard => ({
  id,
  category,
  kind: 'solo',
  text: `Own ${id}`,
  source: 'player',
});

const ownCards = [ownCard('p-1'), ownCard('p-2', 'c4')];

describe('buildRoundDeck', () => {
  describe('for the starter deck', () => {
    it('should be the starter deck itself when no dares are mixed in', () => {
      const deck = buildRoundDeck({
        choice: 'starter',
        starterDeck,
        ownCards,
        mixInOwnCards: false,
        favouriteIds: new Set(),
        customDecks: [],
        matchedItems: [],
      });

      expect(deck).toBe(starterDeck);
    });

    it('should deal the dares in after the starter cards when they are mixed in', () => {
      const deck = buildRoundDeck({
        choice: 'starter',
        starterDeck,
        ownCards,
        mixInOwnCards: true,
        favouriteIds: new Set(['card-1']),
        customDecks: [],
        matchedItems: [],
      });

      expect(deck.cards).toEqual([...starterDeck.cards, ...ownCards]);
    });
  });

  describe('for the favourites', () => {
    it('should hold only the cards that are favourites', () => {
      const deck = buildRoundDeck({
        choice: 'favourites',
        starterDeck,
        ownCards,
        mixInOwnCards: true,
        favouriteIds: new Set(['card-2', 'p-1']),
        customDecks: [],
        matchedItems: [],
      });

      expect(deck.cards.map((card) => card.id)).toEqual(['card-2', 'p-1']);
    });

    it('should leave out a favourite whose card no longer exists', () => {
      const deck = buildRoundDeck({
        choice: 'favourites',
        starterDeck,
        ownCards,
        mixInOwnCards: false,
        favouriteIds: new Set(['card-1', 'removed-card', 'p-deleted']),
        customDecks: [],
        matchedItems: [],
      });

      expect(deck.cards.map((card) => card.id)).toEqual(['card-1']);
    });

    it('should take the favourite dares whether or not the dares are mixed in', () => {
      const withoutMix = buildRoundDeck({
        choice: 'favourites',
        starterDeck,
        ownCards,
        mixInOwnCards: false,
        favouriteIds: new Set(['p-2']),
        customDecks: [],
        matchedItems: [],
      });

      expect(withoutMix.cards.map((card) => card.id)).toEqual(['p-2']);
    });

    it('should be an empty deck when nothing is a favourite', () => {
      const deck = buildRoundDeck({
        choice: 'favourites',
        starterDeck,
        ownCards,
        mixInOwnCards: true,
        favouriteIds: new Set(),
        customDecks: [],
        matchedItems: [],
      });

      expect(deck.cards).toEqual([]);
    });
  });

  describe('for a custom deck', () => {
    const customDeck = (cardIds: string[]): CustomDeck => ({
      id: 'd-1',
      name: 'Placeholder deck',
      cardIds,
    });
    const build = (customDecks: CustomDeck[], mixInOwnCards = true) =>
      buildRoundDeck({
        choice: customDeckChoice('d-1'),
        starterDeck,
        ownCards,
        mixInOwnCards,
        favouriteIds: new Set(['card-1']),
        customDecks,
        matchedItems: [],
      });

    it('should hold only the cards the deck lists, whether or not dares are mixed in', () => {
      const deck = build([customDeck(['card-3', 'p-1'])]);

      expect(deck.cards.map((card) => card.id)).toEqual(['card-3', 'p-1']);
    });

    it('should leave out a card that no longer exists', () => {
      const deck = build([customDeck(['card-2', 'removed-card', 'p-deleted'])]);

      expect(deck.cards.map((card) => card.id)).toEqual(['card-2']);
    });

    it('should be an empty deck when it lists no cards', () => {
      expect(build([customDeck([])]).cards).toEqual([]);
    });

    it('should be an empty deck when no stored deck has the chosen id', () => {
      expect(build([]).cards).toEqual([]);
    });

    it('should not take cards from another custom deck', () => {
      const other: CustomDeck = { id: 'd-2', name: 'Another deck', cardIds: ['card-1'] };

      const deck = build([other, customDeck(['card-2'])]);

      expect(deck.cards.map((card) => card.id)).toEqual(['card-2']);
    });
  });

  describe('for your matches', () => {
    const taggedCard = (id: string, tags: string[], category: Card['category'] = 'c1'): Card => ({
      ...shippedCard(id, category),
      tags,
    });
    const taggedDeck: Deck = {
      id: 'tagged-deck',
      version: 1,
      cards: [
        taggedCard('t-1', ['tag-a']),
        taggedCard('t-2', ['tag-a', 'tag-b']),
        taggedCard('t-3', ['tag-z']),
        shippedCard('untagged'),
      ],
    };
    const yesOnA: MatchedItem = { strength: 'yes', tags: ['tag-a'] };
    const build = (matchedItems: MatchedItem[], deck: Deck = taggedDeck, mixInOwnCards = true) =>
      buildRoundDeck({
        choice: 'matches',
        starterDeck: deck,
        ownCards,
        mixInOwnCards,
        favouriteIds: new Set(['t-3']),
        customDecks: [],
        matchedItems,
      });

    it('should hold the dares the matches suggest, best first', () => {
      const deck = build([yesOnA, { strength: 'maybe', tags: ['tag-b'] }]);

      expect(deck.cards.map((card) => card.id)).toEqual(['t-2', 't-1']);
    });

    it('should be the matches deck with its own id', () => {
      expect(build([yesOnA]).id).toBe('matches');
    });

    it('should hold up to the most the matches deck holds', () => {
      const manyCards = Array.from({ length: maximumMatchesDeckCards + 5 }, (_, index) =>
        taggedCard(`many-${String(index).padStart(2, '0')}`, ['tag-a']),
      );

      const deck = build([yesOnA], { id: 'many', version: 1, cards: manyCards });

      expect(deck.cards).toHaveLength(maximumMatchesDeckCards);
    });

    it('should never hold a dare the player wrote, however it is mixed in', () => {
      const deck = build([yesOnA], taggedDeck, true);

      expect(deck.cards.map((card) => card.id).filter((id) => id.startsWith('p-'))).toEqual([]);
    });

    it('should be an empty deck when nothing is matched', () => {
      expect(build([]).cards).toEqual([]);
    });

    it('should follow the matches it is given, because it is built each time', () => {
      expect(build([yesOnA]).cards.map((card) => card.id)).toEqual(['t-1', 't-2']);
      expect(build([{ strength: 'yes', tags: ['tag-z'] }]).cards.map((card) => card.id)).toEqual([
        't-3',
      ]);
    });
  });

  describe('for a phone that cannot vibrate', () => {
    const vibrationCard: Card = {
      ...shippedCard('card-v', 'c2'),
      effect: { type: 'vibrate', seconds: 10 },
    };
    const deckWithVibration: Deck = {
      ...starterDeck,
      cards: [...starterDeck.cards, vibrationCard],
    };
    const build = (choice: Parameters<typeof buildRoundDeck>[0]['choice']) =>
      buildRoundDeck({
        choice,
        starterDeck: deckWithVibration,
        ownCards: [],
        mixInOwnCards: false,
        favouriteIds: new Set(['card-1', 'card-v']),
        customDecks: [{ id: 'one', name: 'One', cardIds: ['card-1', 'card-v'] }],
        matchedItems: [],
      });
    const idsOf = (deck: Deck) => deck.cards.map((card) => card.id);
    const choices = [
      ['the starter deck', 'starter'],
      ['the favourites', 'favourites'],
      ['a custom deck', customDeckChoice('one')],
    ] as const;

    afterEach(() => {
      jest.mocked(isVibrationSupported).mockReturnValue(false);
    });

    it.each(choices)('should leave the vibration card out of %s', (_name, choice) => {
      jest.mocked(isVibrationSupported).mockReturnValue(false);

      expect(idsOf(build(choice))).not.toContain('card-v');
    });

    it.each(choices)(
      'should keep the vibration card in %s on a phone that can',
      (_name, choice) => {
        jest.mocked(isVibrationSupported).mockReturnValue(true);

        expect(idsOf(build(choice))).toContain('card-v');
      },
    );
  });
});
