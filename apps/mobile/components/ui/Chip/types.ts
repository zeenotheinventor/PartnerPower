import type { CategoryId } from '@getfreak/core';

export type ChipProps = {
  label: string;
  /** What a screen reader says in place of the label, for a chip whose label alone is not clear. */
  accessibilityLabel?: string;
  /** Fills the chip with the category colour. Without it the chip is neutral. */
  category?: CategoryId;
  /** Fills the chip with the accent colour. It wins over a category. */
  accent?: boolean;
  /** Makes the chip a button. */
  onPress?: () => void;
  /** For a pressable chip. A category chip is filled when selected and outlined when it is not. */
  selected?: boolean;
};
