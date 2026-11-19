import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from 'expo-crypto';

import { secureStorage } from '../storage';
import { createLockService } from './createLockService';
import { nativeBiometricsDevice } from './nativeBiometricsDevice';

// The one lock service the app uses. `digestStringAsync` gives lowercase hex.
export const lockService = createLockService({
  secureStorage,
  biometricsDevice: nativeBiometricsDevice,
  hashText: (text) => digestStringAsync(CryptoDigestAlgorithm.SHA256, text),
  getRandomBytes,
  now: Date.now,
});
