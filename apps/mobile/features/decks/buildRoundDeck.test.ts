import type { Card, Deck, PlayerCard } from '@getfreak/core';

import { buildRoundDeck } from './buildRoundDeck';

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
      });

      expect(deck.cards).toEqual([]);
    });
  });
});
