/** The sounds the app has. Each one is a file in `assets/sounds`. */
export type FeedbackSound = 'tap' | 'done' | 'pass';

/** The moments that give feedback. A moment may have a sound, a haptic, or both. */
export type FeedbackMoment = FeedbackSound | 'roundComplete';

/**
 * What the phone does, with no rules about when. Both calls return at once and report no result.
 * The device is the only code that touches the native audio and haptics modules.
 */
export type FeedbackDevice = {
  playSound: (sound: FeedbackSound) => void;
  triggerHaptic: (moment: FeedbackMoment) => void;
  /** Drops the pulses of a pattern that has not finished, such as the end of round run. */
  cancelHaptics: () => void;
};

/** One call per moment. The call fires the sound and the haptic together, and never throws. */
export type Feedback = Record<FeedbackMoment, () => void> & {
  /** Stops the rest of a haptic pattern that is still running. */
  cancelHaptics: () => void;
};

export type FeedbackSwitches = {
  soundOn: boolean;
  hapticsOn: boolean;
};
