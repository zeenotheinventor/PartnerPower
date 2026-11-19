import type { ReactNode } from 'react';

export type PinEntryStepProps = {
  title: string;
  subtitle?: string;
  /** Shows a back button in the header when given. */
  onBack?: () => void;
  /**
   * Called with the whole PIN once the fourth digit has been seen on the dots. It answers with an
   * error line to show, or nothing. The dots clear when it answers. A step that moves on does so
   * from here.
   */
  onSubmit: (pin: string) => Promise<string | undefined>;
  /** An error line shown from the start, such as the one for PINs that did not match. */
  initialError?: string;
  /** A neutral line, such as the countdown of a wait. */
  message?: string;
  /** Disables the keypad, such as during a wait. */
  disabled?: boolean;
  /** Under the keypad, such as a link to unlock with biometrics. */
  below?: ReactNode;
};
