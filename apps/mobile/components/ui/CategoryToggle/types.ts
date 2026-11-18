import type { CategoryId } from '@getfreak/core';

export type CategoryToggleProps = {
  label: string;
  category: CategoryId;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Keeps the row as it is and announces it as disabled, but does not dim it. */
  locked?: boolean;
  /** What a screen reader says for a locked row, so a player hears why it does nothing. */
  lockedHint?: string;
};
