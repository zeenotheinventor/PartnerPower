import type { CategoryId } from '@getfreak/core';

export type ChipProps = {
  label: string;
  /** Fills the chip with the category colour. Without it the chip is neutral. */
  category?: CategoryId;
  /** Fills the chip with the accent colour. It wins over a category. */
  accent?: boolean;
  /** Makes the chip a button. */
  onPress?: () => void;
  /** The name of a pressable chip whose visible word needs its context, such as "Remove, {text}". */
  accessibilityLabel?: string;
  /** For a pressable chip. A category chip is filled when selected and outlined when it is not. */
  selected?: boolean;
};
