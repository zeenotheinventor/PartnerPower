import type { CategoryId } from '@getfreak/core';

export type TurnViewProps = {
  /** Whose turn it is, or that it is both players. */
  turnLabel: string;
  /** The card number line, such as "Card 7 of 20". */
  countLabel: string;
  /** Leave out for an endless round, which has no end to measure against. */
  progress?: { number: number; length: number };
  category: CategoryId;
  categoryName: string;
  text: string;
  penaltyLine: string;
  onDone: () => void;
  onPass: () => void;
  onEndRound: () => void;
};
