import {
  authenticateAsync,
  AuthenticationType,
  hasHardwareAsync,
  isEnrolledAsync,
  supportedAuthenticationTypesAsync,
} from 'expo-local-authentication';

import type { BiometricKind, BiometricsDevice } from './types';

const kindByAuthenticationType: Partial<Record<AuthenticationType, BiometricKind>> = {
  [AuthenticationType.FACIAL_RECOGNITION]: 'face',
  [AuthenticationType.FINGERPRINT]: 'fingerprint',
  [AuthenticationType.IRIS]: 'iris',
};

// This file needs the native module, so a test checks it against a stand-in. What the phone really
// shows is only seen on a device.
export const nativeBiometricsDevice: BiometricsDevice = {
  hasHardware: () => hasHardwareAsync(),
  isEnrolled: () => isEnrolledAsync(),
  supportedKinds: async () =>
    (await supportedAuthenticationTypesAsync()).flatMap((type) => {
      const kind = kindByAuthenticationType[type];
      return kind ? [kind] : [];
    }),
  // The phone's own passcode is not offered, because biometrics are an extra on top of the PIN
  // and never a way round it. An empty fallback label hides the passcode button on iOS.
  authenticate: async (promptMessage) =>
    (
      await authenticateAsync({
        promptMessage,
        disableDeviceFallback: true,
        fallbackLabel: '',
      })
    ).success,
};
