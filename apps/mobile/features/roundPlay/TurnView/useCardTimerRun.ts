import { useState } from 'react';

import { useFeedback } from '../../../feedback/FeedbackProvider';

/**
 * One run of the countdown on a card with a time on it. `startedAt` is the time Start was pressed
 * and stays set after the time is up, so the countdown rests at zero. Stop goes back to ready with
 * the full time. The run holds nothing outside the countdown, so leaving the screen needs no
 * cleanup, and nothing else on the card waits for it. The end gives the same alarm as the timer
 * surprise.
 */
export function useCardTimerRun() {
  const { timerEnd } = useFeedback();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const start = () => {
    setIsRunning(true);
    setStartedAt(Date.now());
  };

  const stop = () => {
    setIsRunning(false);
    setStartedAt(null);
  };

  const end = () => {
    setIsRunning(false);
    timerEnd();
  };

  return { startedAt, isRunning, start, stop, end };
}
