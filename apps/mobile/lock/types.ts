import type { SecureStorage } from '../storage';

/** The kinds of biometrics a phone can have. The screens name them in their own words. */
export type BiometricKind = 'face' | 'fingerprint' | 'iris';

export type BiometricsAvailability =
  { isAvailable: false } | { isAvailable: true; kind: BiometricKind };

/** What the phone can do with biometrics. The native module is behind this. */
export type BiometricsDevice = {
  hasHardware(): Promise<boolean>;
  /** True when the player has set up at least one face or fingerprint on the phone. */
  isEnrolled(): Promise<boolean>;
  supportedKinds(): Promise<BiometricKind[]>;
  /** Shows the phone's biometrics prompt. True only when the player passed it. */
  authenticate(promptMessage: string): Promise<boolean>;
};

export type SetPinResult = { ok: true } | { ok: false; reason: 'invalidPin' };

export type CheckPinResult =
  /** The PIN matched. The count of wrong PINs is back to zero. */
  | { status: 'correct' }
  /** The PIN did not match. The next try may go ahead at once. */
  | { status: 'wrong' }
  /**
   * No try is allowed until the wait ends. It is the result of the wrong PIN that started the wait,
   * and of every try made during it. A try made during a wait is not looked at and not counted.
   */
  | { status: 'waiting'; remainingMilliseconds: number }
  /** There is no PIN, so the lock is off. */
  | { status: 'lockOff' };

export type LockServiceDependencies = {
  secureStorage: SecureStorage;
  biometricsDevice: BiometricsDevice;
  /** SHA-256 of the text, as 64 lowercase hex characters. */
  hashText: (text: string) => Promise<string>;
  getRandomBytes: (byteCount: number) => Uint8Array;
  /** Milliseconds since 1970. */
  now: () => number;
};

/**
 * Every method that reads or writes secure storage rejects when secure storage cannot be reached
 * (on iOS, for one, while the phone is locked). The lock screen treats that as locked.
 */
export type LockService = {
  /** Whether the lock is on. It is on exactly when a PIN hash is stored. */
  isLockOn(): Promise<boolean>;
  /** Stores a salted hash of the PIN and starts the count of wrong PINs again. */
  setPin(pin: string): Promise<SetPinResult>;
  /** Checks the PIN, and records a wrong one and the wait it starts. */
  checkPin(pin: string): Promise<CheckPinResult>;
  /** The time left of a wait, so a restart shows it. 0 when nothing is being waited for. */
  getWaitRemainingMilliseconds(): Promise<number>;
  /** Turns the lock off: removes the PIN hash, the count of wrong PINs and the biometrics choice. */
  clearPin(): Promise<void>;
  /** Never rejects. Anything that goes wrong counts as not available. */
  getBiometricsAvailability(): Promise<BiometricsAvailability>;
  /**
   * Shows the biometrics prompt with the given text. True only when the player passed it, which also
   * starts the count of wrong PINs again. It never rejects, and a failure counts as not passed.
   */
  askForBiometrics(promptMessage: string): Promise<boolean>;
  /** Whether the player turned biometrics on. False until they do. */
  getBiometricsChoice(): Promise<boolean>;
  setBiometricsChoice(isChosen: boolean): Promise<void>;
};
