export type DialogProps = {
  visible: boolean;
  /** The question the dialog asks. It is also the dialog's accessible name. */
  title: string;
  /** A line under the title that says what the choice does. */
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  /** Called by the cancel button and by the Android back button. A tap on the scrim does nothing. */
  onCancel: () => void;
};
