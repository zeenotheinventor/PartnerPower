import { Pressable, Text, View } from 'react-native';

import type { ButtonProps, ButtonVariant } from './types';

// The edge is a decorative view that starts 4px below the top of the button and runs to the
// bottom. The face is the label, which sits above it with a 4px margin. Pressing moves the face
// down by the height of the edge, so it looks pushed in and nothing shows above it.
const edgeClasses: Record<ButtonVariant, string> = {
  primary: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-lg bg-accent-deep',
  secondary: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-lg bg-border',
};

const faceClasses: Record<ButtonVariant, string> = {
  primary:
    'type-heading mb-4 rounded-lg bg-accent px-24 py-16 text-center text-on-accent group-active:translate-y-4',
  secondary:
    'type-heading mb-4 rounded-lg border-2 border-border bg-surface px-24 py-16 text-center text-foreground group-active:translate-y-4',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
}: ButtonProps) {
  const sizeClass = fullWidth ? 'w-full' : 'self-start';
  const disabledClass = disabled ? 'opacity-50' : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`group ${sizeClass} ${disabledClass}`}
    >
      <View className={edgeClasses[variant]} />
      <Text className={faceClasses[variant]}>{label}</Text>
    </Pressable>
  );
}
