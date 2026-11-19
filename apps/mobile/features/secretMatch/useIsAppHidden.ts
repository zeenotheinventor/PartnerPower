import { useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// iOS takes the app switcher picture when the app goes inactive, before it reaches the background,
// so both count as hidden. The first status of an app that has only just started can be unknown,
// and that counts as shown.
const hiddenStatuses: readonly AppStateStatus[] = ['inactive', 'background'];

function subscribe(onChange: () => void) {
  const subscription = AppState.addEventListener('change', onChange);
  return () => subscription.remove();
}

const isHiddenNow = () => hiddenStatuses.includes(AppState.currentState);

/** True while the app is not in the foreground, so a screen can cover what it is showing. */
export function useIsAppHidden(): boolean {
  return useSyncExternalStore(subscribe, isHiddenNow);
}
