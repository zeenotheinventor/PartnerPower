export type ToastProps = {
  /** The line shown, and the name a screen reader gives it. */
  message: string;
  /** What a screen reader says it does when pressed. */
  dismissHint: string;
  /** Called once the toast has faded out, on its own after about 3 seconds or when tapped. */
  onDismiss: () => void;
};
