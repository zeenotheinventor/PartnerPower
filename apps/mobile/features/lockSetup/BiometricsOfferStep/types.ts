import type { BiometricsCopyKind } from '../biometricsCopyKind';

export type BiometricsOfferStepProps = {
  /** Which words to use, such as Face ID or fingerprint. */
  kind: BiometricsCopyKind;
  /**
   * Asks the phone for biometrics once, to prove it works, and saves the choice only when it did.
   * It answers whether that worked. When it did, the flow moves on, so the step does nothing more.
   */
  onUse: () => Promise<boolean>;
  /** Leaves without biometrics. Nothing is saved. */
  onNotNow: () => void;
};
