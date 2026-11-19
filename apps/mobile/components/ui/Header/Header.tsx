import { Text, View } from 'react-native';

import { FeedbackPressable } from '../FeedbackPressable';
import type { HeaderProps } from './types';

// The chevron is drawn from two borders of a turned square, so it follows the theme colours.
export function Header({ title, subtitle, trailing, backLabel, onBack }: HeaderProps) {
  return (
    <View className="flex-row items-center gap-12">
      {onBack ? (
        <FeedbackPressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          feedback="back"
          onPress={onBack}
          className="h-48 w-48 items-center justify-center rounded-lg border-2 border-border bg-surface"
        >
          <View className="ml-4 h-12 w-12 rotate-45 border-b-4 border-l-4 border-foreground" />
        </FeedbackPressable>
      ) : null}
      <View className="flex-1">
        <Text accessibilityRole="header" className="type-title text-foreground">
          {title}
        </Text>
        {subtitle ? <Text className="type-body text-muted">{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}
