import type { ReactNode } from 'react';

import type { ButtonVariant } from '../Button';

export type DialogProps = {
  visible: boolean;
  /** The question the dialog asks. It is also the dialog's accessible name. */
  title: string;
  /** A line under the title that says what the choice does. */
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  /** The look of the confirm button. `danger` is for a choice that destroys data. */
  confirmVariant?: Extract<ButtonVariant, 'primary' | 'danger'>;
  onConfirm: () => void;
  /** Called by the cancel button and by the Android back button. A tap on the scrim does nothing. */
  onCancel: () => void;
  /**
   * More to read under the line, such as a list. It scrolls with the line when the text size is
   * large, so the buttons always stay in view.
   */
  children?: ReactNode;
  /** A line in the danger colour above the buttons, announced when it appears. */
  error?: string;
  /** While true both buttons are disabled and the Android back button does nothing. */
  busy?: boolean;
};
