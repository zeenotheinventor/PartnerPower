import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { startVibration, stopVibration } from '../../vibration/vibration';

/**
 * One run of the phone's vibration for a vibration card. `startedAt` is the time Go was pressed,
 * for the countdown, and stays set after the time is up so the countdown rests at zero. The
 * vibration stops when Stop is pressed, when the countdown ends, when the app leaves the
 * foreground (a call included) and when the card goes from the screen, which covers leaving the
 * screen and the round ending. It does not look at the haptics setting, because here the vibration
 * is the dare and not feedback.
 */
export function useVibrationRun(seconds: number) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(false);

  const finish = () => {
    isRunningRef.current = false;
    setIsRunning(false);
    stopVibration();
  };

  // Back to ready: the full time shows again, as it does on Stop.
  const halt = () => {
    finish();
    setStartedAt(null);
  };

  const go = () => {
    // A second press before the screen shows Stop must not start it again.
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsRunning(true);
    setStartedAt(Date.now());
    startVibration(seconds);
  };

  // The newest halt, so the listener and the cleanup below never hold an old one.
  const latestHalt = useRef(halt);
  useEffect(() => {
    latestHalt.current = halt;
  });

  useEffect(() => {
    if (!isRunning) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') latestHalt.current();
    });
    return () => subscription.remove();
  }, [isRunning]);

  useEffect(
    () => () => {
      if (isRunningRef.current) stopVibration();
    },
    [],
  );

  return { startedAt, isRunning, go, stop: halt, end: finish };
}
