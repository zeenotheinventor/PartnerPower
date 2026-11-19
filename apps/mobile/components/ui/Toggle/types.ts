export type ToggleProps = {
  label: string;
  /** A line under the label. A screen reader says it as the hint of the switch. */
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};
