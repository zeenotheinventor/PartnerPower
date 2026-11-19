/** The moments that answer a press. Each one has a sound and a haptic of its own. */
export type PressMoment =
  'tap' | 'done' | 'pass' | 'toggleOn' | 'toggleOff' | 'select' | 'back' | 'locked';

/**
 * The moments the game makes by itself, with no press of their own. They are scheduled so that one
 * never lands on top of the sound of a press.
 */
export type GameMoment = 'deal' | 'stepUp' | 'handover' | 'sheetOpen' | 'roundComplete';

/**
 * A moment that must be heard and felt whatever else is playing, such as a timer running out. It
 * fires at once, never waits, and a press never cancels it.
 */
export type AlarmMoment = 'timerEnd';

/** The moments that give feedback. Each one has a sound and a haptic. */
export type FeedbackMoment = PressMoment | GameMoment | AlarmMoment;

/** The sounds the app has, one for each moment. Each one is a file in `assets/sounds`. */
export type FeedbackSound = FeedbackMoment;

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
  /** Drops a game moment that is still waiting for a press sound to finish. */
  cancelScheduled: () => void;
};

export type FeedbackSwitches = {
  soundOn: boolean;
  hapticsOn: boolean;
};
