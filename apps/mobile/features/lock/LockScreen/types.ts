export type LockScreenProps = {
  /** The right PIN was typed, or biometrics passed, or there is no PIN left to ask for. */
  onUnlock: () => void;
};
