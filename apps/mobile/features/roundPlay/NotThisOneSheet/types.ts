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
  /** The skip row's title. It says "card" by default. */
  skipTitle?: string;
  /** The skip row's hint. It says a new card is drawn by default. */
  skipHint?: string;
  onSkip: () => void;
  onSwitchOff: (category: CategoryId) => void;
  onClose: () => void;
};
