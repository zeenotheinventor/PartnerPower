import type { Card, Deck, PlayerCard } from '@getfreak/core';

import { favouriteCards } from './favouriteCards';

const starterDeck: Deck = {
  id: 'starter-deck',
  version: 1,
  cards: [
    { id: 'card-1', category: 'c1', kind: 'solo', text: 'Card 1', source: 'shipped' },
    { id: 'card-2', category: 'c2', kind: 'solo', text: 'Card 2', source: 'shipped' },
  ],
};

const ownCards: PlayerCard[] = [
  { id: 'p-1', category: 'c3', kind: 'together', text: 'Own 1', source: 'player' },
];

const idsOf = (cards: readonly Card[]) => cards.map((card) => card.id);

describe('favouriteCards', () => {
  it('should list the favourite cards of the starter deck, then the favourite dares', () => {
    const cards = favouriteCards(starterDeck, ownCards, new Set(['p-1', 'card-2']));

    expect(idsOf(cards)).toEqual(['card-2', 'p-1']);
  });

  it('should leave out an id that matches no card', () => {
    const cards = favouriteCards(starterDeck, ownCards, new Set(['card-1', 'gone']));

    expect(idsOf(cards)).toEqual(['card-1']);
  });

  it('should list nothing when there are no favourites', () => {
    expect(favouriteCards(starterDeck, ownCards, new Set())).toEqual([]);
  });
});
