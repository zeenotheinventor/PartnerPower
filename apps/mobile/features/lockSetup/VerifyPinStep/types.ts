import type { BiometricsCopyKind } from '../biometricsCopyKind';

export type VerifyPinStepProps = {
  /** What the PIN is asked for, which the subtitle says. */
  purpose: 'change' | 'off';
  /** Shows the link that unlocks with biometrics instead, when the player turned them on. */
  canUseBiometrics: boolean;
  /** Which words name the biometrics, such as Face ID. */
  kind: BiometricsCopyKind;
  onBack: () => void;
  /** The current PIN was right, or biometrics passed, so the player may go on. */
  onVerified: () => void;
};
