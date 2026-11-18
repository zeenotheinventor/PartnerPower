import type { CategoryId } from '@getfreak/core';

export type ChipProps = {
  label: string;
  /** Fills the chip with the category colour. Without it the chip is neutral. */
  category?: CategoryId;
  /** Makes the chip a button. */
  onPress?: () => void;
  /** For a pressable chip. A category chip is filled when selected and outlined when it is not. */
  selected?: boolean;
};
