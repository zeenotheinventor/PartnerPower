import { Text, View } from 'react-native';

import type { LineBoxProps } from './types';

/** A line of guidance in a bordered box, such as who looks and who waits. */
export function LineBox({ children }: LineBoxProps) {
  return (
    <View className="rounded-lg border-2 border-border bg-surface p-12">
      <Text className="type-body-bold text-foreground">{children}</Text>
    </View>
  );
}
