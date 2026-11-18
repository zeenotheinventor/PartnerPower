import type { CategoryId } from '@getfreak/core';

export type SteppingUpViewProps = {
  category: CategoryId;
  categoryName: string;
  /** What passing costs in the new category. */
  penalty: number;
  onContinue: () => void;
};
