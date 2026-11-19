import { maximumMatchesDeckCards, suggestDares, type Card, type MatchedItem } from '@getfreak/core';

/**
 * The dares a couple's matches suggest, best first, up to what the matches deck holds. Pass the
 * shipped dares only: a dare the player wrote carries no tags, so it is never suggested.
 */
export function matchSuggestions(
  shippedCards: readonly Card[],
  matchedItems: readonly MatchedItem[],
): Card[] {
  return suggestDares(matchedItems, shippedCards, { limit: maximumMatchesDeckCards });
}
