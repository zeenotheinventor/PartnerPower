import type { Deck, PlayerCard } from '@getfreak/core';

/** The deck with the player's dares dealt in among its cards. The deck is not changed. */
export function withOwnCards(deck: Deck, ownCards: readonly PlayerCard[]): Deck {
  if (ownCards.length === 0) return deck;
  return { ...deck, cards: [...deck.cards, ...ownCards] };
}
