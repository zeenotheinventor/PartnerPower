import { copy } from '@getfreak/content';

import type { DeckChoice } from './types';

/** What each deck is called wherever a deck is named. */
export const deckNames: Record<DeckChoice, string> = {
  starter: copy.decks.starter,
  favourites: copy.decks.favourites,
};
