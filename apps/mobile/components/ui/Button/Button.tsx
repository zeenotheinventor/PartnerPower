import { Pressable, Text, View } from 'react-native';

import { useFeedback } from '../../../feedback/FeedbackProvider';
import type { ButtonProps, ButtonVariant } from './types';

// The edge is a decorative view that starts 4px below the top of the button and runs to the
// bottom. The face is the label, which sits above it with a 4px margin. Pressing moves the face
// down by the height of the edge, so it looks pushed in and nothing shows above it.
const edgeClasses: Record<ButtonVariant, string> = {
  primary: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-lg bg-accent-deep',
  secondary: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-lg bg-border',
  danger: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-lg bg-danger-deep',
};

const faceClasses: Record<ButtonVariant, string> = {
  primary:
    'type-heading mb-4 rounded-lg bg-accent px-24 py-16 text-center text-on-accent group-active:translate-y-4',
  secondary:
    'type-heading mb-4 rounded-lg border-2 border-border bg-surface px-24 py-16 text-center text-foreground group-active:translate-y-4',
  danger:
    'type-heading mb-4 rounded-lg bg-danger px-24 py-16 text-center text-on-danger group-active:translate-y-4',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  feedback = 'tap',
}: ButtonProps) {
  const pressFeedback = useFeedback();
  const sizeClass = fullWidth ? 'w-full' : 'self-start';
  const disabledClass = disabled ? 'opacity-50' : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        // Fired first and never waited on, so the action is not delayed.
        if (feedback !== 'none') pressFeedback[feedback]();
        onPress();
      }}
      className={`group ${sizeClass} ${disabledClass}`}
    >
      <View className={edgeClasses[variant]} />
      <Text className={faceClasses[variant]}>{label}</Text>
    </Pressable>
  );
}
