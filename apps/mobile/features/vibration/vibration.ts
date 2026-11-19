import { Platform, Vibration } from 'react-native';

// React Native's Vibration is a fixed buzz of about 400 ms on an iPhone, whatever is asked for.
const iPhoneBuzzMilliseconds = 400;

/** An iPad cannot vibrate, and neither can the web. */
export function isVibrationSupported(): boolean {
  if (Platform.OS === 'android') return true;
  return Platform.OS === 'ios' && !Platform.isPad;
}

/**
 * Vibrates for `seconds`. Android vibrates once for the whole time. An iPhone buzzes about every
 * 400 ms, because its pattern numbers are the pauses between fixed buzzes, so the pauses are the
 * buzz length and the buzzes run on from each other. The count is rounded up.
 */
export function startVibration(seconds: number): void {
  if (Platform.OS === 'android') {
    Vibration.vibrate(seconds * 1000);
    return;
  }
  const buzzCount = Math.ceil((seconds * 1000) / iPhoneBuzzMilliseconds);
  Vibration.vibrate([0, ...Array<number>(buzzCount - 1).fill(iPhoneBuzzMilliseconds)]);
}

export function stopVibration(): void {
  Vibration.cancel();
}
