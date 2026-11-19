import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

// iOS reports the app as inactive while its Face ID prompt is up, and that is not the player
// leaving. While the app waits on a biometrics prompt, the change is ignored.
let openPromptCount = 0;

/** Whether the phone's biometrics prompt is up, so a change of app state is the prompt and not the player leaving. */
export function isBiometricsPromptOpen(): boolean {
  return openPromptCount > 0;
}

/** Runs a biometrics prompt, and tells `useClearOnBackground` that the app is not being left. */
export async function whileBiometricsPromptIsOpen<Result>(
  runPrompt: () => Promise<Result>,
): Promise<Result> {
  openPromptCount += 1;
  try {
    return await runPrompt();
  } finally {
    openPromptCount -= 1;
  }
}

/**
 * Calls `onBackground` when the app leaves the foreground, for the background and for iOS's
 * inactive state. A screen that holds a PIN, or the proof that the current PIN was typed, uses it to
 * forget both, so nothing typed waits on screen for whoever picks the phone up next.
 */
export function useClearOnBackground(onBackground: () => void) {
  const latest = useRef(onBackground);
  useEffect(() => {
    latest.current = onBackground;
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (openPromptCount > 0) return;

      if (state === 'background' || state === 'inactive') latest.current();
    });
    return () => subscription.remove();
  }, []);
}
