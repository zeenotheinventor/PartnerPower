import { parseDeck, type Deck } from '@getfreak/core';

import { decks } from './decks';

function cardIdsOf(shippedDecks: readonly Deck[]): string[] {
  return shippedDecks.flatMap((deck) => deck.cards.map((card) => card.id));
}

function duplicatesIn(ids: string[]): string[] {
  return ids.filter((id, index) => ids.indexOf(id) !== index);
}

// The starter deck is added to `decks` by FRK-10. Until then these tests run over an empty array,
// so the tests on a fixture below keep the checks honest.
describe('shipped decks', () => {
  it('should pass validation for every deck', () => {
    decks.forEach((deck) => expect(parseDeck(deck)).toEqual({ success: true, deck }));
  });

  it('should use each card id once across all decks', () => {
    expect(duplicatesIn(cardIdsOf(decks))).toEqual([]);
  });

  it('should give each deck an id of its own', () => {
    expect(duplicatesIn(decks.map((deck) => deck.id))).toEqual([]);
  });
});

describe('the deck checks', () => {
  const validDeck: Deck = {
    id: 'deck-one',
    version: 1,
    cards: [{ id: 'card-1', category: 'c1', kind: 'solo', text: 'Card text one' }],
  };
  const otherDeck: Deck = {
    id: 'deck-two',
    version: 1,
    cards: [{ id: 'card-2', category: 'c2', kind: 'together', text: 'Card text two' }],
  };

  it('should accept a valid fixture deck', () => {
    expect(parseDeck(validDeck).success).toBe(true);
  });

  it('should reject a fixture deck with an unknown category', () => {
    const brokenDeck = {
      ...validDeck,
      cards: [{ id: 'card-1', category: 'c9', kind: 'solo', text: 'Card text one' }],
    };

    expect(parseDeck(brokenDeck).success).toBe(false);
  });

  it('should find a card id used in two decks', () => {
    const clashingDeck: Deck = { ...otherDeck, cards: validDeck.cards };

    expect(duplicatesIn(cardIdsOf([validDeck, clashingDeck]))).toEqual(['card-1']);
    expect(duplicatesIn(cardIdsOf([validDeck, otherDeck]))).toEqual([]);
  });
});
