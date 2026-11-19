import type { CategoryId, SurpriseId } from '@getfreak/core';

export type SurpriseViewProps = {
  /** Which surprise is being revealed. Its name comes from the content package. */
  surprise: SurpriseId;
  /** The rule line of the surprise, already filled with the names, category and cost. */
  rule: string;
  /** Says who the surprise is for, such as "Sam's turn". */
  turnLine: string;
  /** Only for a category jump: the category it jumps to, which the step up markers show. */
  reachedCategory?: CategoryId;
  /** A line to confirm what just happened, shown first on the screen. */
  notice?: string;
  onContinue: () => void;
};
