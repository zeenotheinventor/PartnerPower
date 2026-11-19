import { copy, fillCopy } from '@getfreak/content';

/** How many cards a deck has, as the picker and the Favourites view say it. */
export function deckCountText(count: number): string {
  return fillCopy(count === 1 ? copy.decks.countOne : copy.decks.count, { count });
}
