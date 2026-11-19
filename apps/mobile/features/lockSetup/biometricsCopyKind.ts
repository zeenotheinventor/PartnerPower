import { copy } from '@getfreak/content';

import type { BiometricsAvailability } from '../../lock';

/** The name of one set of biometrics lines in the content, such as `faceId`. */
export type BiometricsCopyKind = keyof typeof copy.biometrics.kinds;

/**
 * Which words to use for the biometrics this phone has. iOS names them: facial recognition is Face
 * ID and a fingerprint is Touch ID. Android has no one name, so a single fingerprint or a single
 * face unlock is named, and anything else, such as a phone that has both, gets the general words.
 * So does a phone with none set up, because then there is no kind to name.
 */
export function biometricsCopyKind(
  availability: BiometricsAvailability,
  platform: string,
): BiometricsCopyKind {
  if (!availability.isAvailable) return 'phoneUnlock';
  const { kind, kinds } = availability;
  if (platform === 'ios') {
    if (kind === 'face') return 'faceId';
    return kind === 'fingerprint' ? 'touchId' : 'phoneUnlock';
  }
  if (kinds.length !== 1) return 'phoneUnlock';
  if (kind === 'fingerprint') return 'fingerprint';
  return kind === 'face' ? 'faceUnlock' : 'phoneUnlock';
}
