/** `danger` is only for the action that destroys data, such as Clear everything. */
export type ButtonVariant = 'primary' | 'secondary' | 'danger';

/** What a press sounds and feels like. `none` makes the button silent. */
export type ButtonFeedback = 'tap' | 'done' | 'pass' | 'none';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  disabled?: boolean;
  /** The sound and haptic a press gives. It is the ordinary tap unless one is named. */
  feedback?: ButtonFeedback;
};
