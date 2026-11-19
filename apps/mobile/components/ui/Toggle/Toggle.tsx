import { Pressable, Text, View } from 'react-native';

import type { ToggleProps } from './types';

const trackClasses = {
  on: 'h-24 w-40 flex-row justify-end rounded-pill bg-accent p-4',
  off: 'h-24 w-40 flex-row justify-start rounded-pill bg-border p-4',
};

const knobClasses = {
  on: 'h-16 w-16 rounded-pill bg-on-accent',
  off: 'h-16 w-16 rounded-pill bg-muted',
};

// The whole row is the switch and its visible label is its accessible name. The track and knob
// only draw the state.
export function Toggle({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: ToggleProps) {
  const state = value ? 'on' : 'off';

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      className={`min-h-48 flex-row items-center justify-between gap-12 ${disabled ? 'opacity-50' : ''}`}
    >
      <View className="flex-1 gap-4">
        <Text className="type-body-bold text-foreground">{label}</Text>
        {description ? <Text className="type-body text-muted">{description}</Text> : null}
      </View>
      <View className={trackClasses[state]}>
        <View className={knobClasses[state]} />
      </View>
    </Pressable>
  );
}
