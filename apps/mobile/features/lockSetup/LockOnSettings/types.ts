import type { BiometricsAvailability } from '../../../lock';

export type LockOnSettingsProps = {
  /** What the phone has. The biometrics switch is disabled when it has none set up. */
  availability: BiometricsAvailability;
  /** Whether the player turned biometrics on, as it was when the screen opened. */
  isBiometricsOn: boolean;
  /** Leaves for Settings, from the back button or after the lock is turned off. */
  onExit: () => void;
};
