import { countsAsBackground, shouldLock } from '@getfreak/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useLockService } from '../../lock';
import { isBiometricsPromptOpen } from '../lockSetup/useClearOnBackground';

// React Native provides this clock, which only counts up. The project's TypeScript libraries do not
// declare it.
declare const performance: { now(): number };

/**
 * The steady clock, which only counts up. If it is missing or answers with something that is not a
 * number, the phone's clock stands in, so the stamp is always a number.
 */
function steadyNow(): number {
  try {
    const steady = performance.now();
    return Number.isFinite(steady) ? steady : Date.now();
  } catch {
    return Date.now();
  }
}

/**
 * Whether the time away is up. The phone's clock can be set back to hide the time away, and the
 * steady clock can stop while the phone sleeps (a known gap, see the decisions), so it locks if
 * either one says the time is up. A gap that is not a finite number cannot be trusted, so it locks.
 */
function isTimeUp(wentAt: { wallClock: number; steadyClock: number }): boolean {
  const now = Date.now();
  const steadyTimeAway = steadyNow() - wentAt.steadyClock;
  if (!Number.isFinite(now - wentAt.wallClock) || !Number.isFinite(steadyTimeAway)) return true;
  return shouldLock(wentAt.wallClock, now) || shouldLock(now - steadyTimeAway, now);
}

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
  // When the app reached the background, on the phone's clock and on a clock that only counts up.
  const wentToBackgroundAt = useRef<{ wallClock: number; steadyClock: number } | undefined>(
    undefined,
  );
  // Each read gets a number, and only the newest one may change the phase.
  const latestCheck = useRef(0);
  // The same for the value of whether the lock is on, which two kinds of read can set.
  const latestValueRead = useRef(0);
  // The phase again, for the app state listener, which must not read stale state.
  const currentPhase = useRef<LockPhase>('checking');

  // A read that fails counts as on. Only the newest read may set `isLockOn`, so two reads that
  // answer out of order cannot leave the privacy cover or screen capture wrong.
  const readLockOn = useCallback(() => {
    latestValueRead.current += 1;
    const thisRead = latestValueRead.current;
    return lock
      .isLockOn()
      .catch(() => true)
      .then((isOn) => ({ isOn, isLatest: thisRead === latestValueRead.current }));
  }, [lock]);

  // Reads whether the lock is on, and settles the phase when it answers.
  const readLock = useCallback(() => {
    latestCheck.current += 1;
    const thisCheck = latestCheck.current;
    readLockOn().then(({ isOn, isLatest }) => {
      if (isLatest) setIsLockOn(isOn);
      if (thisCheck !== latestCheck.current) return;
      const phase = isOn ? 'locked' : 'unlocked';
      currentPhase.current = phase;
      setState({ phase, hasChecked: true });
    });
  }, [readLockOn]);

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
        readLockOn().then(({ isOn, isLatest }) => {
          if (isLatest) setIsLockOn(isOn);
        });
      }),
    [lock, readLockOn],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      // iOS reports inactive while its Face ID prompt is up, and that is not the player leaving.
      if (appState === 'inactive' && isBiometricsPromptOpen()) return;
      setIsAppAway(appState !== 'active');

      try {
        if (countsAsBackground(appState)) {
          wentToBackgroundAt.current ??= { wallClock: Date.now(), steadyClock: steadyNow() };
          return;
        }
        if (appState !== 'active') return;

        // A trip that never reached the background, such as the notification shade, has no start.
        const wentAt = wentToBackgroundAt.current;
        wentToBackgroundAt.current = undefined;
        // A lock screen that is already up stays as it is, with its own prompt and its own wait.
        if (wentAt === undefined || currentPhase.current === 'locked') return;
        if (isTimeUp(wentAt)) checkLock();
      } catch {
        // Whatever went wrong, the gate must still be able to lock, so it locks.
        wentToBackgroundAt.current = undefined;
        if (appState === 'active' && currentPhase.current !== 'locked') checkLock();
      }
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
