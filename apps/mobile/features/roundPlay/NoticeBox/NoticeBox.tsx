import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Text, View } from 'react-native';

import type { NoticeBoxProps } from './types';

// A short confirmation drawn at the top of the screen that follows an action. Android reads the
// live region. iOS has no live regions, so the message is announced when the box first shows.
export function NoticeBox({ message }: NoticeBoxProps) {
  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <View
      accessible
      role="status"
      accessibilityLiveRegion="polite"
      className="self-stretch rounded-lg border-2 border-accent bg-surface p-12"
    >
      <Text className="type-body-bold text-foreground">{message}</Text>
    </View>
  );
}
