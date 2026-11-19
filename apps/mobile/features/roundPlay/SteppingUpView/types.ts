import type { CategoryId } from '@getfreak/core';

export type SteppingUpViewProps = {
  category: CategoryId;
  categoryName: string;
  /** What passing costs in the new category. */
  penalty: number;
  /** A line to confirm what just happened, shown first on the screen. */
  notice?: string;
  onContinue: () => void;
};
