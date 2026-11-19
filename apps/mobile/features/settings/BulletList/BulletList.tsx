import { Text, View } from 'react-native';

import type { BulletListProps } from './types';

// The bullet is a small decorative dot, so a screen reader reads the label and then each item.
export function BulletList({ label, items }: BulletListProps) {
  return (
    <View className="gap-4">
      <Text className="type-caption uppercase text-muted">{label}</Text>
      {items.map((item) => (
        <View key={item} className="flex-row items-start gap-8">
          <View className="mt-8 h-8 w-8 rounded-pill bg-muted" />
          <Text className="type-body flex-1 text-foreground">{item}</Text>
        </View>
      ))}
    </View>
  );
}
