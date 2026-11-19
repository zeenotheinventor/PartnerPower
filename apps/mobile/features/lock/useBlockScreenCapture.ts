import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const captureKey = 'app-lock';

// A failure here must never block the app, and there is nothing to tell the player.
const ignoreFailure = () => {};

/**
 * Sets Android's `FLAG_SECURE` while `isBlocked` is true, so the app switcher shows a blank
 * thumbnail and screenshots are refused. It is lifted when `isBlocked` is false and when the
 * component goes. Until `isBlocked` is known (`undefined`) it changes nothing. iOS has no such
 * flag, and covers itself with `PrivacyCover` instead.
 */
export function useBlockScreenCapture(isBlocked: boolean | undefined) {
  useEffect(() => {
    if (Platform.OS !== 'android' || isBlocked === undefined) return;
    const change = isBlocked ? preventScreenCaptureAsync : allowScreenCaptureAsync;
    change(captureKey).catch(ignoreFailure);
  }, [isBlocked]);

  useEffect(
    () => () => {
      if (Platform.OS === 'android') allowScreenCaptureAsync(captureKey).catch(ignoreFailure);
    },
    [],
  );
}
