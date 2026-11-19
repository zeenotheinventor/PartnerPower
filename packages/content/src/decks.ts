import { parseDeck, type Deck } from '@getfreak/core';

import starterDeck from './decks/starter.json';
import { findUnknownTags } from './interestTags';

function loadDeck(input: unknown): Deck {
  const result = parseDeck(input);
  if (!result.success) {
    throw new Error(`The shipped deck is invalid:\n${result.errors.join('\n')}`);
  }
  const unknownTags = findUnknownTags(result.deck.cards);
  if (unknownTags.length > 0) {
    throw new Error(`The shipped deck has unknown tags:\n${unknownTags.join('\n')}`);
  }
  return result.deck;
}

export const decks: readonly Deck[] = [loadDeck(starterDeck)];
