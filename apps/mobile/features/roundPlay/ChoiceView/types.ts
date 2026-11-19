import type { CategoryId } from '@getfreak/core';

export type ChoiceViewProps = {
  /** Asks the partner holding the phone to pick, such as "Pick a dare for Sam". */
  prompt: string;
  /** The card number line, such as "Card 14 of 20". */
  countLabel: string;
  /** Leave out for an endless round. */
  progress?: { number: number; length: number };
  /** The category both dares are in. */
  category: CategoryId;
  categoryName: string;
  /** The text of the two dares on offer. */
  options: readonly [string, string];
  /** Called with the index of the dare that was picked. */
  onChoose: (index: 0 | 1) => void;
  onEndRound: () => void;
};
