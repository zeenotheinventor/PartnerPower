import { copy } from '@getfreak/content';
import { Text, View } from 'react-native';

export function PlaceholderScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-surface p-6">
      <Text accessibilityRole="header" className="text-4xl font-bold text-ink">
        {copy.appName}
      </Text>
      <Text className="mt-2 text-lg text-ink">{copy.placeholder.status}</Text>
    </View>
  );
}
