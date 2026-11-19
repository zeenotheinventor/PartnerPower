import { isDealable, type CategoryId, type Deck } from '@getfreak/core';

/** How many cards of the deck a round with these categories on can deal. */
export function countCardsInPlay(deck: Deck, enabledCategories: readonly CategoryId[]): number {
  return deck.cards.filter((card) => enabledCategories.includes(card.category) && isDealable(card))
    .length;
}
