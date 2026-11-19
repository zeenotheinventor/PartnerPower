import { soundMilliseconds } from './soundMilliseconds';
import type { FeedbackMoment } from './types';

export type SoundScheduler = {
  /** A press answers the player at once, and restarts its own sound if it is already playing. */
  press: (moment: FeedbackMoment) => void;
  /** A game moment waits for the sounds already playing to finish, and then fires. */
  moment: (moment: FeedbackMoment) => void;
  /**
   * An alarm fires at once and never waits. It overlaps a sound that is playing, and neither a press
   * nor `cancel` drops it, because the player must not miss it.
   */
  alarm: (moment: FeedbackMoment) => void;
  /** Drops a game moment that is still waiting. */
  cancel: () => void;
};

/**
 * The rule that keeps sounds from piling into noise.
 *
 * - A press fires at once. It never waits, so the app always answers a touch.
 * - A game moment, such as the deal after Done, waits until every sound already playing has ended,
 *   and then fires. If nothing is playing it fires at once.
 * - With sound off nothing is heard, so nothing is waited for: no sound advances the busy window,
 *   and a game moment fires at once with its haptic.
 * - An alarm, such as a timer ending, fires at once even over a playing sound. It is never held back
 *   and never skipped, and it still makes game moments wait for its sound to end.
 * - Only one game moment waits. A newer one replaces it, because only the latest screen matters.
 * - A press that lands while a game moment waits skips it. The player has moved on, and the moment
 *   would arrive late and on top of the new press.
 */
export function createSoundScheduler(
  fire: (moment: FeedbackMoment) => void,
  soundOn: boolean,
): SoundScheduler {
  let busyUntil = 0;
  let waiting: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    if (waiting !== undefined) clearTimeout(waiting);
    waiting = undefined;
  };

  const play = (moment: FeedbackMoment) => {
    if (soundOn) busyUntil = Math.max(busyUntil, Date.now() + soundMilliseconds[moment]);
    fire(moment);
  };

  return {
    press: (moment) => {
      cancel();
      play(moment);
    },
    alarm: play,
    moment: (moment) => {
      cancel();
      const wait = busyUntil - Date.now();
      if (wait <= 0) {
        play(moment);
        return;
      }
      waiting = setTimeout(() => {
        waiting = undefined;
        play(moment);
      }, wait);
    },
    cancel,
  };
}
