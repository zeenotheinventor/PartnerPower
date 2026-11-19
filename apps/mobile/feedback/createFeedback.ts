import { createSoundScheduler } from './soundScheduler';
import type { Feedback, FeedbackDevice, FeedbackMoment, FeedbackSwitches } from './types';

// Feedback is a nicety. If the sound or the haptic fails, the press still counts and nothing is
// reported, because an error could carry text from the screen.
function attempt(action: () => void) {
  try {
    action();
  } catch {
    // Deliberately ignored, see above.
  }
}

/**
 * Builds the call for each moment. A moment's sound and its haptic are fired in the same call,
 * sound first, so they land together. Each is skipped when its own switch is off. A press fires at
 * once, and a game moment waits for the sounds playing to finish, see `createSoundScheduler`.
 */
export function createFeedback(
  device: FeedbackDevice,
  { soundOn, hapticsOn }: FeedbackSwitches,
): Feedback {
  const scheduler = createSoundScheduler((moment: FeedbackMoment) => {
    if (soundOn) attempt(() => device.playSound(moment));
    if (hapticsOn) attempt(() => device.triggerHaptic(moment));
  }, soundOn);
  const press = (moment: FeedbackMoment) => () => scheduler.press(moment);
  const alarm = (moment: FeedbackMoment) => () => scheduler.alarm(moment);
  const gameMoment = (moment: FeedbackMoment) => () => scheduler.moment(moment);

  return {
    tap: press('tap'),
    done: press('done'),
    pass: press('pass'),
    toggleOn: press('toggleOn'),
    toggleOff: press('toggleOff'),
    select: press('select'),
    back: press('back'),
    locked: press('locked'),
    deal: gameMoment('deal'),
    stepUp: gameMoment('stepUp'),
    handover: gameMoment('handover'),
    sheetOpen: gameMoment('sheetOpen'),
    roundComplete: gameMoment('roundComplete'),
    timerEnd: alarm('timerEnd'),
    cancelHaptics: () => attempt(() => device.cancelHaptics()),
    cancelScheduled: scheduler.cancel,
  };
}
