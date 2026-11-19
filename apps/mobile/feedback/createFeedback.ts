import type {
  Feedback,
  FeedbackDevice,
  FeedbackMoment,
  FeedbackSound,
  FeedbackSwitches,
} from './types';

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
 * Builds the call for each moment. A press sound and its haptic are fired in the same call, sound
 * first, so they land together. Each is skipped when its own switch is off.
 */
export function createFeedback(
  device: FeedbackDevice,
  { soundOn, hapticsOn }: FeedbackSwitches,
): Feedback {
  const fire = (moment: FeedbackMoment, sound?: FeedbackSound) => () => {
    if (soundOn && sound) attempt(() => device.playSound(sound));
    if (hapticsOn) attempt(() => device.triggerHaptic(moment));
  };

  return {
    tap: fire('tap', 'tap'),
    done: fire('done', 'done'),
    pass: fire('pass', 'pass'),
    roundComplete: fire('roundComplete'),
  };
}
