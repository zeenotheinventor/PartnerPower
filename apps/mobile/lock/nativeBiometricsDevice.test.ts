import {
  authenticateAsync,
  hasHardwareAsync,
  isEnrolledAsync,
  supportedAuthenticationTypesAsync,
} from 'expo-local-authentication';

import { nativeBiometricsDevice } from './nativeBiometricsDevice';

// The numbers are the ones the module uses for its `AuthenticationType` values.
jest.mock('expo-local-authentication', () => ({
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([2])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

describe('nativeBiometricsDevice', () => {
  it('should pass on what the phone says about hardware and set up', async () => {
    jest.mocked(hasHardwareAsync).mockResolvedValueOnce(false);
    jest.mocked(isEnrolledAsync).mockResolvedValueOnce(false);

    expect(await nativeBiometricsDevice.hasHardware()).toBe(false);
    expect(await nativeBiometricsDevice.isEnrolled()).toBe(false);
  });

  it('should name each type the phone supports', async () => {
    jest.mocked(supportedAuthenticationTypesAsync).mockResolvedValueOnce([2, 1, 3]);

    expect(await nativeBiometricsDevice.supportedKinds()).toEqual(['face', 'fingerprint', 'iris']);
  });

  it('should show the prompt with the text, without the phone passcode as a way round', async () => {
    await nativeBiometricsDevice.authenticate('Unlock');

    expect(authenticateAsync).toHaveBeenCalledWith({
      promptMessage: 'Unlock',
      disableDeviceFallback: true,
      fallbackLabel: '',
    });
  });

  it('should say it passed only when the phone says it succeeded', async () => {
    jest.mocked(authenticateAsync).mockResolvedValueOnce({ success: true });
    expect(await nativeBiometricsDevice.authenticate('Unlock')).toBe(true);

    jest.mocked(authenticateAsync).mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    expect(await nativeBiometricsDevice.authenticate('Unlock')).toBe(false);
  });
});
