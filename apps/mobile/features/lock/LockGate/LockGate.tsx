import { useEffect } from 'react';
import { BackHandler, Modal, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { LockScreen } from '../LockScreen';
import { PrivacyCover } from '../PrivacyCover';
import { useBlockScreenCapture } from '../useBlockScreenCapture';
import { useLockGate } from '../useLockGate';
import type { LockGateProps } from './types';

// The back button does nothing while the lock is up, so it cannot dismiss the lock screen or leave
// the app behind it.
const ignoreBackButton = () => {};

/**
 * The app lock, as an overlay above the navigator and not a route. The app stays mounted under it,
 * so a round in progress is where it was after unlocking, and the entry guard does not change.
 *
 * Nothing behind the lock can be reached. The app is hidden from screen readers and takes no
 * touches while the lock shows. The lock screen is a native `Modal`, so it also sits above any
 * dialog the app had open, takes the focus of a screen reader, and keeps the Android back button.
 *
 * While the lock is on, the app also hides its content from the app switcher: `PrivacyCover` on iOS
 * when the app goes inactive, and `FLAG_SECURE` on Android. Both stop when the lock is turned off.
 * The app is mounted only after the first read of the lock has answered, so no screen shows before
 * the lock screen on a cold start.
 */
export function LockGate({ children }: LockGateProps) {
  const { phase, hasChecked, isLockOn, isAppAway, unlock } = useLockGate();
  const isReducedMotion = useReducedMotion();
  useBlockScreenCapture(isLockOn);

  const isAppHidden = phase !== 'unlocked';
  // Locked, being checked, or away while the lock is on (and not known to be off).
  const isCoverShown = isAppHidden || (isAppAway && isLockOn !== false);

  useEffect(() => {
    if (!isAppHidden) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [isAppHidden]);

  return (
    <View className="flex-1">
      <View
        className={isAppHidden ? 'pointer-events-none flex-1' : 'flex-1'}
        accessibilityElementsHidden={isAppHidden}
        importantForAccessibility={isAppHidden ? 'no-hide-descendants' : 'auto'}
      >
        {hasChecked ? children : null}
      </View>
      {isCoverShown ? <PrivacyCover /> : null}
      <Modal
        visible={hasChecked && isCoverShown}
        transparent={false}
        statusBarTranslucent
        animationType={isReducedMotion || phase !== 'locked' ? 'none' : 'fade'}
        onRequestClose={ignoreBackButton}
      >
        {phase === 'locked' ? <LockScreen onUnlock={unlock} /> : <PrivacyCover />}
      </Modal>
    </View>
  );
}
