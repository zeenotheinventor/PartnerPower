export type ButtonVariant = 'primary' | 'secondary';

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
