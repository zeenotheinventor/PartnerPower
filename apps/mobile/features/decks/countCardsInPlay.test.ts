import type { Card, Deck } from '@getfreak/core';

import { countCardsInPlay } from './countCardsInPlay';

const card = (id: string, category: Card['category'], effect?: Card['effect']): Card => ({
  id,
  category,
  kind: 'solo',
  text: `Card ${id}`,
  source: 'shipped',
  ...(effect === undefined ? {} : { effect }),
});

const deck: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [
    card('card-1', 'c1'),
    card('card-2', 'c1'),
    card('card-3', 'c2'),
    card('card-4', 'c3'),
    card('card-5', 'c1', { type: 'timer', seconds: 15 }),
    card('card-6', 'c2', { type: 'vibrate', seconds: 5 }),
  ],
};

describe('countCardsInPlay', () => {
  it('should count the cards of the categories that are on', () => {
    expect(countCardsInPlay(deck, ['c1', 'c2'])).toBe(4);
  });

  it('should count nothing from a category that is off', () => {
    expect(countCardsInPlay(deck, ['c4'])).toBe(0);
  });

  it('should leave out timer cards, because only the timer surprise deals them', () => {
    expect(countCardsInPlay(deck, ['c1'])).toBe(2);
  });

  it('should count a vibration card', () => {
    expect(countCardsInPlay(deck, ['c2'])).toBe(2);
  });
});
