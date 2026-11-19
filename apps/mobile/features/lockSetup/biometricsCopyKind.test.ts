import type { BiometricsAvailability } from '../../lock';
import { biometricsCopyKind } from './biometricsCopyKind';

function available(...kinds: Array<'face' | 'fingerprint' | 'iris'>): BiometricsAvailability {
  const [kind] = kinds;
  if (!kind) throw new Error('A phone with biometrics has at least one kind.');
  return { isAvailable: true, kind, kinds };
}

describe('biometricsCopyKind', () => {
  describe('on iOS', () => {
    it('should call facial recognition Face ID', () => {
      expect(biometricsCopyKind(available('face'), 'ios')).toBe('faceId');
    });

    it('should call a fingerprint Touch ID', () => {
      expect(biometricsCopyKind(available('fingerprint'), 'ios')).toBe('touchId');
    });

    it('should use the general words for an iris reader', () => {
      expect(biometricsCopyKind(available('iris'), 'ios')).toBe('phoneUnlock');
    });
  });

  describe('on Android', () => {
    it('should call a fingerprint alone a fingerprint', () => {
      expect(biometricsCopyKind(available('fingerprint'), 'android')).toBe('fingerprint');
    });

    it('should call face alone face unlock', () => {
      expect(biometricsCopyKind(available('face'), 'android')).toBe('faceUnlock');
    });

    it('should use the general words when the phone has both, because either one works', () => {
      expect(biometricsCopyKind(available('face', 'fingerprint'), 'android')).toBe('phoneUnlock');
    });

    it('should use the general words for an iris reader', () => {
      expect(biometricsCopyKind(available('iris'), 'android')).toBe('phoneUnlock');
    });
  });

  it('should use the general words when the phone has no biometrics set up', () => {
    expect(biometricsCopyKind({ isAvailable: false }, 'ios')).toBe('phoneUnlock');
    expect(biometricsCopyKind({ isAvailable: false }, 'android')).toBe('phoneUnlock');
  });
});
