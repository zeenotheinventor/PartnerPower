import type { CategoryId, QuestionReveal } from '@getfreak/core';

export type AnswerRowsProps = {
  reveal: Extract<QuestionReveal, { kind: 'answers' }>;
  /** By player index. */
  playerNames: readonly [string, string];
  /** The drinker's chip is in this category's colour. */
  category: CategoryId;
};
