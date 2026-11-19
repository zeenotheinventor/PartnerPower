import { Pressable } from 'react-native';

import { useFeedback } from '../../../feedback/FeedbackProvider';
import type { FeedbackPressableProps } from './types';

/**
 * The one pressable of the app. Every control that can be pressed goes through it, so every press
 * gives its sound and haptic. A test fails if a screen uses a raw `Pressable`.
 *
 * It does not pass `disabled` to the native Pressable, because that drops the press. It sets the
 * disabled accessibility state itself and answers a press with the locked feedback instead.
 */
export function FeedbackPressable({
  feedback = 'tap',
  disabled = false,
  onPress,
  accessibilityState,
  ...pressableProps
}: FeedbackPressableProps) {
  const pressFeedback = useFeedback();

  return (
    <Pressable
      {...pressableProps}
      accessibilityState={{ ...accessibilityState, disabled }}
      onPress={() => {
        // Fired first and never waited on, so the action is not delayed.
        if (disabled) {
          if (feedback !== 'none') pressFeedback.locked();
          return;
        }
        if (feedback !== 'none') pressFeedback[feedback]();
        onPress();
      }}
    />
  );
}
