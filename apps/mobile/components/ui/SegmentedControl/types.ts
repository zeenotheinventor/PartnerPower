export type SegmentedControlOption<Value extends string | number> = {
  value: Value;
  label: string;
};

export type SegmentedControlProps<Value extends string | number> = {
  /** Shown above the options, and what a screen reader says for the group. */
  label: string;
  options: readonly SegmentedControlOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
};
