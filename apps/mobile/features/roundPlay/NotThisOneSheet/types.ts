import type { CategoryId } from '@getfreak/core';

export type SheetCategory = {
  category: CategoryId;
  name: string;
  isOn: boolean;
};

export type NotThisOneSheetProps = {
  visible: boolean;
  /** Every category the round was set up with, in order, whether or not it is still on. */
  categories: readonly SheetCategory[];
  onSkip: () => void;
  onSwitchOff: (category: CategoryId) => void;
  onClose: () => void;
};
