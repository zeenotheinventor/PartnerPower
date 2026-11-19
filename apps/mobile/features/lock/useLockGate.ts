import { countsAsBackground, shouldLock } from '@getfreak/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useLockService } from '../../lock';
import { isBiometricsPromptOpen } from '../lockSetup/useClearOnBackground';

export type LockPhase = 'checking' | 'locked' | 'unlocked';

type GateState = {
  phase: LockPhase;
  /** True once the first check has answered. The app is mounted from then on and never unmounted. */
  hasChecked: boolean;
};

/**
 * What the lock gate knows. The rules are the core's: a cold start always locks, and a return
 * after the time away that `shouldLock` names locks too. The iOS `inactive` state never starts the
 * time away.
 *
 * While the phase is `checking` nothing is shown of the app. That is the first read of whether the
 * lock is on, and again each time the app returns after enough time away, so the lock screen is
 * never late. A read that fails counts as locked, because the service rejects when secure storage
 * is out of reach and that must not let anyone in.
 */
export function useLockGate() {
  const lock = useLockService();
  const [state, setState] = useState<GateState>({ phase: 'checking', hasChecked: false });
  // Until the lock has been read, whether it is on is not known.
  const [isLockOn, setIsLockOn] = useState<boolean | undefined>(undefined);
  const [isAppAway, setIsAppAway] = useState(false);
  const wentToBackgroundAt = useRef<number | undefined>(undefined);
  // Each read gets a number, and only the newest one may change the phase.
  const latestCheck = useRef(0);
  // The phase again, for the app state listener, which must not read stale state.
  const currentPhase = useRef<LockPhase>('checking');

  // Reads whether the lock is on, and settles the phase when it answers.
  const readLock = useCallback(() => {
    latestCheck.current += 1;
    const thisCheck = latestCheck.current;
    lock
      .isLockOn()
      .catch(() => true)
      .then((isOn) => {
        if (thisCheck !== latestCheck.current) return;
        const phase = isOn ? 'locked' : 'unlocked';
        currentPhase.current = phase;
        setIsLockOn(isOn);
        setState({ phase, hasChecked: true });
      });
  }, [lock]);

  // The app comes back after enough time away, so it is covered again until the lock is read.
  const checkLock = useCallback(() => {
    currentPhase.current = 'checking';
    setState((previous) => ({ ...previous, phase: 'checking' }));
    readLock();
  }, [readLock]);

  // The first read. The phase starts as `checking`, so only the answer sets state.
  useEffect(readLock, [readLock]);

  // The lock can be turned on and off in Settings, so what the privacy cover and Android's
  // screen capture block follow is read again each time it changes.
  useEffect(
    () =>
      lock.subscribe(() => {
        lock
          .isLockOn()
          .catch(() => true)
          .then(setIsLockOn);
      }),
    [lock],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      // iOS reports inactive while its Face ID prompt is up, and that is not the player leaving.
      if (appState === 'inactive' && isBiometricsPromptOpen()) return;
      setIsAppAway(appState !== 'active');

      if (countsAsBackground(appState)) {
        wentToBackgroundAt.current ??= Date.now();
        return;
      }
      if (appState !== 'active') return;

      // A trip that never reached the background, such as the notification shade, has no start.
      const wentAt = wentToBackgroundAt.current;
      wentToBackgroundAt.current = undefined;
      // A lock screen that is already up stays as it is, with its own prompt and its own wait.
      if (wentAt === undefined || currentPhase.current === 'locked') return;
      if (shouldLock(wentAt, Date.now())) checkLock();
    });
    return () => subscription.remove();
  }, [checkLock]);

  const unlock = useCallback(() => {
    if (currentPhase.current !== 'locked') return;
    currentPhase.current = 'unlocked';
    setState({ phase: 'unlocked', hasChecked: true });
  }, []);

  return { ...state, isLockOn, isAppAway, unlock };
}
