import { decks } from '@getfreak/content';
import type { Deck } from '@getfreak/core';

// Until a deck ships there is nothing to deal, and the round that starts from this is already over.
const deckWithoutCards: Deck = { id: 'no-cards', version: 1, cards: [] };

/** The deck the app ships, which a round is dealt from unless another deck is chosen. */
export function getStarterDeck(): Deck {
  const [firstDeck = deckWithoutCards] = decks;
  return firstDeck;
}
