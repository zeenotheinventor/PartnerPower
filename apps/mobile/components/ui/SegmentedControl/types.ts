export type SegmentedControlOption<Value extends string | number> = {
  value: Value;
  label: string;
};

export type SegmentedControlProps<Value extends string | number> = {
  /** Shown above the options, and what a screen reader says for the group. */
  label: string;
  options: readonly SegmentedControlOption<Value>[];
  /** Undefined while nothing has been chosen, and then no option is checked. */
  value: Value | undefined;
  onValueChange: (value: Value) => void;
};
