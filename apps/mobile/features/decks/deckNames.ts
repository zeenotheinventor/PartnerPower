import { copy } from '@getfreak/content';
import type { CustomDeck } from '@getfreak/core';

import { customDeckIdOf } from './customDeckChoice';
import type { DeckChoice } from './types';

/**
 * What a deck is called wherever a deck is named. A custom deck is named by the player. It has no
 * name until the decks have been read, and none when it is not stored.
 */
export function deckNameOf(
  choice: DeckChoice,
  customDecks: readonly CustomDeck[] | undefined,
): string | undefined {
  if (choice === 'starter') return copy.decks.starter;
  if (choice === 'favourites') return copy.decks.favourites;
  if (choice === 'matches') return copy.decks.matches;
  return customDecks?.find((deck) => deck.id === customDeckIdOf(choice))?.name;
}
