import { parseDeck, type Deck } from '@getfreak/core';

import starterDeck from './decks/starter.json';

function loadDeck(input: unknown): Deck {
  const result = parseDeck(input);
  if (!result.success) {
    throw new Error(`The shipped deck is invalid:\n${result.errors.join('\n')}`);
  }
  return result.deck;
}

export const decks: readonly Deck[] = [loadDeck(starterDeck)];
