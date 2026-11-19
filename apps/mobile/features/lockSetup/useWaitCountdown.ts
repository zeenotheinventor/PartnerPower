import { copy, fillCopy } from '@getfreak/content';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const tickMilliseconds = 1000;
const announceEverySeconds = 10;

function formatMinutesAndSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * The wait after too many wrong PINs, as a line that counts down. The line changes each second, but
 * a screen reader hears it only when the wait starts and then every 10 seconds, so it is not
 * flooded.
 */
export function useWaitCountdown() {
  const [waitEndsAt, setWaitEndsAt] = useState<number | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());

  const startWait = useCallback((remainingMilliseconds: number) => {
    const startedAt = Date.now();
    setNow(startedAt);
    setWaitEndsAt(startedAt + remainingMilliseconds);
  }, []);

  useEffect(() => {
    if (waitEndsAt === undefined) return;
    const timer = setInterval(() => {
      const tickedAt = Date.now();
      if (tickedAt >= waitEndsAt) setWaitEndsAt(undefined);
      else setNow(tickedAt);
    }, tickMilliseconds);
    return () => clearInterval(timer);
  }, [waitEndsAt]);

  const secondsLeft =
    waitEndsAt === undefined ? 0 : Math.max(Math.ceil((waitEndsAt - now) / 1000), 0);
  const message =
    waitEndsAt !== undefined && secondsLeft > 0
      ? fillCopy(copy.lock.wait, { time: formatMinutesAndSeconds(secondsLeft) })
      : undefined;

  // The line is read out again each time the count passes a multiple of 10 seconds.
  const announcementNumber = Math.ceil(secondsLeft / announceEverySeconds);
  const lastAnnouncementNumber = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (message === undefined) {
      lastAnnouncementNumber.current = undefined;
      return;
    }
    if (lastAnnouncementNumber.current === announcementNumber) return;
    lastAnnouncementNumber.current = announcementNumber;
    AccessibilityInfo.announceForAccessibility(message);
  }, [message, announcementNumber]);

  return { isWaiting: message !== undefined, message, startWait };
}
