import type { SecretMatch } from '@getfreak/core';

/** What the reveal says about keeping the matches. Null says nothing, while it is not known. */
export type SavedLine = 'saved' | 'savingOff' | null;

export type SecretMatchRevealViewProps = {
  /** Mild to bold. A match holds its item and its strength, never who said maybe. */
  matches: readonly SecretMatch[];
  /** How many items the two rated. */
  total: number;
  savedLine: SavedLine;
  /** Opens the dares for you two link. Left out while there is nowhere for it to go. */
  onOpenDares?: () => void;
  onDone: () => void;
};
