import type { BiometricsAvailability } from '../../../lock';

export type TurnOnFlowProps = {
  /** What the phone has. The offer of biometrics is made only when it has some set up. */
  availability: BiometricsAvailability;
  /** Leaves the lock setup for Settings, whether the lock was turned on or the player cancelled. */
  onExit: () => void;
};
