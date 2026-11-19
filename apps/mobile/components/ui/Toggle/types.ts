export type ToggleProps = {
  label: string;
  /** A line under the label. A screen reader says it as the hint of the switch. */
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Keeps the switch on and announces it as disabled, but does not dim it. */
  locked?: boolean;
  /** What a screen reader says for a locked switch, so a player hears why it does nothing. */
  lockedHint?: string;
};
