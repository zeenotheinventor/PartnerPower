import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

import type { CountdownProps } from './types';

// A screen reader is told the time left at these points, when the countdown is longer than the
// point, and again at zero. It is never told every second.
const announcedSecondsLeft = [30, 10];

type CountdownClockInput = Pick<
  CountdownProps,
  'seconds' | 'startedAt' | 'secondsText' | 'endText' | 'onEnd'
>;

function secondsLeftAt(endsAt: number, now: number) {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

// The digits change when the time left drops to a whole second below the one shown.
function millisecondsUntilNextSecond(endsAt: number, now: number) {
  const remaining = endsAt - now;
  return remaining - (Math.ceil(remaining / 1000) - 1) * 1000;
}

/**
 * The seconds left on a countdown that runs on real time: `startedAt` is a wall clock time, so a
 * phone that is locked or in the background does not pause it. The digits change on a timeout set
 * for the next whole second. While the app is not in the foreground the timeout is dropped, and
 * coming back works the time left out again from the clock. `resumeCount` goes up each time the app
 * comes back, so the bar can start again from the real time left.
 */
export function useCountdownClock({
  seconds,
  startedAt,
  secondsText,
  endText,
  onEnd,
}: CountdownClockInput) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    startedAt === null ? seconds : secondsLeftAt(startedAt + seconds * 1000, Date.now()),
  );
  const [resumeCount, setResumeCount] = useState(0);

  // The newest callbacks, so a new function on each render does not restart the clock.
  const latest = useRef({ secondsText, endText, onEnd });
  useEffect(() => {
    latest.current = { secondsText, endText, onEnd };
  });

  useEffect(() => {
    if (startedAt === null) return;
    const endsAt = startedAt + seconds * 1000;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    // Not known until the first refresh, which shows the time left without announcing it.
    let shownSecondsLeft: number | undefined;
    let hasEnded = false;

    const refresh = () => {
      clearTimeout(timeout);
      const now = Date.now();
      const nextSecondsLeft = secondsLeftAt(endsAt, now);
      if (nextSecondsLeft !== shownSecondsLeft) {
        const hasShownBefore = shownSecondsLeft !== undefined;
        shownSecondsLeft = nextSecondsLeft;
        setSecondsLeft(nextSecondsLeft);
        if (
          hasShownBefore &&
          announcedSecondsLeft.includes(nextSecondsLeft) &&
          nextSecondsLeft > 0
        ) {
          AccessibilityInfo.announceForAccessibility(latest.current.secondsText(nextSecondsLeft));
        }
      }
      if (nextSecondsLeft === 0) {
        if (hasEnded) return;
        hasEnded = true;
        AccessibilityInfo.announceForAccessibility(latest.current.endText);
        latest.current.onEnd?.();
        return;
      }
      timeout = setTimeout(refresh, millisecondsUntilNextSecond(endsAt, now));
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
        setResumeCount((count) => count + 1);
      } else {
        clearTimeout(timeout);
      }
    });
    refresh();

    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [seconds, startedAt]);

  // Before it starts the full time shows, whatever an earlier run left behind.
  return { secondsLeft: startedAt === null ? seconds : secondsLeft, resumeCount };
}
