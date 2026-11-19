import type { Card, CustomDeck, Deck, PlayerCard } from '@getfreak/core';

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
});
