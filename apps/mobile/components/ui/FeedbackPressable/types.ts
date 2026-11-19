import type { PressableProps } from 'react-native';

import type { PressMoment } from '../../../feedback/types';

/** What a press sounds and feels like. `none` makes the control silent. */
export type PressFeedback = PressMoment | 'none';

export type FeedbackPressableProps = Omit<
  PressableProps,
  'onPress' | 'onPressIn' | 'onPressOut' | 'onLongPress' | 'disabled'
> & {
  onPress: () => void;
  /** The sound and haptic a press gives. It is the ordinary tap unless one is named. */
  feedback?: PressFeedback;
  /**
   * A disabled control is still pressable, so that a press can answer with the locked sound. It
   * does nothing else, and a screen reader still hears it as disabled.
   */
  disabled?: boolean;
};
