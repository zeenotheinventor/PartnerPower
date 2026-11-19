import { Text, View } from 'react-native';

import { FeedbackPressable } from '../FeedbackPressable';
import type { SettingsRowProps } from './types';

const labelClasses = {
  default: 'type-body-bold text-foreground',
  danger: 'type-body-bold text-danger',
};

// The row is one button named by its label and its value, so the texts inside it are not read
// again on their own. The caption is its hint. The pressed highlight is the face inside the
// button, and it bleeds 8 into the card's padding, so the matching padding keeps the text where it
// was. The chevron is drawn from two borders of a turned square, as the Header's back chevron is.
export function SettingsRow({
  label,
  value,
  caption,
  onPress,
  tone = 'default',
  disabled = false,
  showChevron = true,
}: SettingsRowProps) {
  return (
    <FeedbackPressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={caption}
      disabled={disabled}
      onPress={onPress}
      className={`group -mx-8 ${disabled ? 'opacity-50' : ''}`}
    >
      <View className="min-h-48 flex-row items-center gap-12 rounded-lg px-8 py-4 group-active:bg-background">
        <View className="flex-1 gap-4">
          <Text className={labelClasses[tone]}>{label}</Text>
          {caption ? <Text className="type-caption text-muted">{caption}</Text> : null}
        </View>
        {value ? <Text className="type-body text-right text-muted">{value}</Text> : null}
        {showChevron ? (
          <View className="mr-4 h-12 w-12 rotate-45 border-r-4 border-t-4 border-muted" />
        ) : null}
      </View>
    </FeedbackPressable>
  );
}
