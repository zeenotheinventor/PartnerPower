import type { Deck, PlayedCard } from '@getfreak/core';

export type PlayedCardsProps = {
  /** The cards of the round in the order they were played. */
  history: readonly PlayedCard[];
  /** The deck the round started from. It holds the text of each card. */
  deck: Deck;
  /** The two player names, in player order. */
  players: readonly [string, string];
};
