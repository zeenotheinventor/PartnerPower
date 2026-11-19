import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Text, View } from 'react-native';

import type { LostDaresNoticeProps } from './types';

// Android reads the live region. iOS has no live regions, so the message is announced when the box
// first shows.
export function LostDaresNotice({ message }: LostDaresNoticeProps) {
  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <View
      accessible
      role="status"
      accessibilityLiveRegion="polite"
      className="rounded-lg border-2 border-border bg-surface p-12"
    >
      <Text className="type-body-bold text-foreground">{message}</Text>
    </View>
  );
}
