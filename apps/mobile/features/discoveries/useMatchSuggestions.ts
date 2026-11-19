import { canOfferMatchesDeck, type Card, type Discovery } from '@getfreak/core';
import { useMemo } from 'react';

import { getStarterDeck } from '../decks/getStarterDeck';
import { matchSuggestions } from '../decks/matchSuggestions';
import { matchedItemsOf } from '../decks/matchedItems';

/** How many suggested dares the section shows. */
export const shownSuggestionCount = 5;

export type MatchSuggestions = {
  /** Up to five suggested dares, best first. Empty while there are too few to play. */
  dares: Card[];
  /** True when the suggestions are enough for a round, which is when the section offers to play. */
  canPlay: boolean;
};

/**
 * What the stored matches suggest, worked out on the phone from the shipped dares as they are now.
 * The shipped dares only, so a dare the player wrote is never suggested. With too few suggestions
 * for a round nothing is shown, because the section then points to a secret match instead.
 */
export function useMatchSuggestions(discoveries: readonly Discovery[]): MatchSuggestions {
  return useMemo(() => {
    const suggestions = matchSuggestions(getStarterDeck().cards, matchedItemsOf(discoveries));
    return canOfferMatchesDeck(suggestions)
      ? { dares: suggestions.slice(0, shownSuggestionCount), canPlay: true }
      : { dares: [], canPlay: false };
  }, [discoveries]);
}
