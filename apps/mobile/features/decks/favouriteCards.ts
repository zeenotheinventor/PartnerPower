import type { Card, Deck, PlayerCard } from '@getfreak/core';

/**
 * The cards that are favourites and still exist, which are the cards of the starter deck and the
 * player's dares. A favourite whose card has gone is left out, so the list never goes stale.
 */
export function favouriteCards(
  starterDeck: Deck,
  ownCards: readonly PlayerCard[],
  favouriteIds: ReadonlySet<string>,
): Card[] {
  return [...starterDeck.cards, ...ownCards].filter((card) => favouriteIds.has(card.id));
}
