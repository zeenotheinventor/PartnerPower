import type { Deck, PlayerCard } from '@getfreak/core';

import { withOwnCards } from './withOwnCards';

const deck: Deck = {
  id: 'test-deck',
  version: 3,
  cards: [{ id: 'card-1', category: 'c1', kind: 'solo', text: 'Card 1', source: 'shipped' }],
};

const ownCard: PlayerCard = {
  id: 'p-00000000-0000-4000-8000-000000000001',
  category: 'c3',
  kind: 'together',
  text: 'Placeholder dare 1',
  source: 'player',
};

describe('withOwnCards', () => {
  it('should add the dares after the cards of the deck', () => {
    expect(withOwnCards(deck, [ownCard]).cards).toEqual([...deck.cards, ownCard]);
  });

  it('should keep the id and the version of the deck', () => {
    const mixed = withOwnCards(deck, [ownCard]);

    expect(mixed.id).toBe('test-deck');
    expect(mixed.version).toBe(3);
  });

  it('should give back the deck itself when there are no dares', () => {
    expect(withOwnCards(deck, [])).toBe(deck);
  });

  it('should leave the deck it was given as it was', () => {
    withOwnCards(deck, [ownCard]);

    expect(deck.cards).toHaveLength(1);
  });
});
